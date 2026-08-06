"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ActionResult } from "../actions";
import { Logo } from "@/components/logo";
import { useT } from "@/i18n/provider";

export default function ForgotPasswordPage() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50/60 px-6 py-10">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
          {t.auth.forgot.title}
        </h1>
        <p className="mb-6 text-sm text-gray-600">{t.auth.forgot.lead}</p>

        {state.ok ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            {t.auth.forgot.sent}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
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
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? t.auth.forgot.sending : t.auth.forgot.submit}
            </button>
          </form>
        )}
      </div>
      <p className="mt-4 text-sm text-gray-600">
        <Link
          href="/login"
          className="font-bold text-[color:var(--color-brand)] hover:underline"
        >
          {t.auth.backToLogin}
        </Link>
      </p>
    </main>
  );
}
