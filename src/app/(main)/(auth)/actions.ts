"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { track } from "@vercel/analytics/server";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { getDictionary, getLocale } from "@/i18n";
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  lookupPasswordResetToken,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

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

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: { email, passwordHash, name: parsed.data.name },
  });
  track("signup").catch(() => {});

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

// In-memory rate limit: at most one reset email per address per 60s. Survives
// across requests in a single process; ample for a single-instance deploy.
// Replace with a shared store (Redis/Upstash) if we ever scale horizontally.
const RESET_THROTTLE_MS = 60_000;
const lastResetRequestAt = new Map<string, number>();

const requestResetSchema = z.object({ email: z.string().email() });

export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  // Anti-enumeration: report the same success regardless of validation or
  // whether the account exists. We DO swallow zod errors here for the same
  // reason — a malformed address shouldn't tell the attacker anything.
  if (!parsed.success) return { ok: true };

  const email = parsed.data.email.toLowerCase();

  const now = Date.now();
  const last = lastResetRequestAt.get(email) ?? 0;
  if (now - last < RESET_THROTTLE_MS) {
    return { ok: true };
  }
  lastResetRequestAt.set(email, now);

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    try {
      const rawToken = await issuePasswordResetToken(user.id);
      await sendPasswordResetEmail({ to: email, dict, rawToken });
    } catch (err) {
      // Log but still report ok — don't reveal infra issues to clients.
      console.error("[requestPasswordReset] failed:", err);
    }
  }

  return { ok: true };
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function resetPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const t = await authT();
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.code === "too_small" && issue.path[0] === "password") {
      return { error: t.errors.passwordTooShort };
    }
    return { error: t.errors.invalidInput };
  }

  const lookup = await lookupPasswordResetToken(parsed.data.token);
  if (!lookup.ok) {
    return {
      error: lookup.reason === "expired" ? t.reset.tokenExpired : t.reset.tokenInvalid,
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: lookup.userId },
    data: { passwordHash },
  });
  await consumePasswordResetToken(parsed.data.token);

  return { ok: true };
}
