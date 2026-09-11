"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type ActionResult } from "../actions";
import { GoogleAuth } from "../google-auth";
import { Logo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { useT } from "@/i18n/provider";

function LoginForm() {
  const t = useT();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const resetSuccess = params.get("reset") === "success";
  // Auth.js sends OAuth failures back to `pages.signIn` with ?error=… — the
  // only way a rejected Google sign-in ever surfaces to the owner.
  const oauthError = params.get("error");
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(login, {});

  return (
    <div className="flex flex-col gap-4">
      {resetSuccess && !state.error && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t.auth.reset.successQuery}
        </p>
      )}
      {oauthError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {t.auth.errors.googleSignInFailed}
        </p>
      )}
      <GoogleAuth callbackUrl={callbackUrl} />
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="label">
          {t.auth.email}
          <input
            name="email"
            type="email"
            required
            placeholder={t.auth.emailPlaceholder}
            className="input"
            autoComplete="email"
          />
        </label>
        <PasswordInput
          name="password"
          label={
            <span className="flex items-center justify-between gap-2">
              <span>{t.auth.password}</span>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-[color:var(--color-brand)] hover:underline"
              >
                {t.auth.forgotLink}
              </Link>
            </span>
          }
          required
          minLength={8}
          placeholder={t.auth.passwordPlaceholderMin}
          autoComplete="current-password"
        />
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? t.auth.signingIn : t.common.logIn}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50/60 px-6 py-10">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
          {t.auth.loginTitle}
        </h1>
        <p className="mb-6 text-sm text-gray-600">{t.auth.loginLead}</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        {t.auth.noAccount}{" "}
        <Link
          href="/signup"
          className="font-bold text-[color:var(--color-brand)] hover:underline"
        >
          {t.common.signUp}
        </Link>
      </p>
    </main>
  );
}
