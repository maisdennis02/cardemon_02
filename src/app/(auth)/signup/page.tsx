"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type ActionResult } from "../actions";
import { Logo } from "@/components/logo";
import { useT } from "@/i18n/provider";

export default function SignupPage() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signup, {});

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50/60 px-6 py-10">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
          {t.auth.signupTitle}
        </h1>
        <p className="mb-6 text-sm text-gray-600">{t.auth.signupLead}</p>
        <form action={formAction} className="flex flex-col gap-4">
          <label className="label">
            {t.auth.name}
            <span className="label-hint">{t.auth.nameOptional}</span>
            <input
              name="name"
              type="text"
              placeholder={t.auth.namePlaceholder}
              className="input"
              autoComplete="name"
            />
          </label>
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
          <label className="label">
            {t.auth.password}
            <span className="label-hint">{t.auth.passwordHintMin}</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="input"
              autoComplete="new-password"
            />
          </label>
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? t.auth.creatingAccount : t.auth.createAccount}
          </button>
        </form>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        {t.auth.alreadyHaveAccount}{" "}
        <Link
          href="/login"
          className="font-bold text-[color:var(--color-brand)] hover:underline"
        >
          {t.common.logIn}
        </Link>
      </p>
    </main>
  );
}
