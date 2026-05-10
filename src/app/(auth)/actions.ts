"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getDictionary, getLocale } from "@/i18n";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type ActionResult = { error?: string; ok?: boolean };

async function authT() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return dict.auth;
}

export async function signup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const t = await authT();
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.code === "too_small" && issue.path[0] === "password") {
      return { error: t.errors.passwordTooShort };
    }
    return { error: t.errors.invalidInput };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: t.errors.accountExists };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: { email, passwordHash, name: parsed.data.name },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: t.errors.signinFailedAfterSignup };
    throw err;
  }

  return { ok: true };
}

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const t = await authT();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: t.errors.invalidLogin };

  // Restrict callbackUrl to same-origin paths to prevent open-redirect.
  const rawCallback = String(formData.get("callbackUrl") ?? "");
  const redirectTo = /^\/[^/]/.test(rawCallback) ? rawCallback : "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") return { error: t.errors.invalidLogin };
      return { error: t.errors.signinFailed };
    }
    throw err;
  }
  return { ok: true };
}
