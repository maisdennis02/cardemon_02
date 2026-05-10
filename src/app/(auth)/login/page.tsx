"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type ActionResult } from "../actions";
import { Logo } from "@/components/logo";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="label">
        Email
        <input
          name="email"
          type="email"
          required
          placeholder="you@restaurant.com"
          className="input"
          autoComplete="email"
        />
      </label>
      <label className="label">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="input"
          autoComplete="current-password"
        />
      </label>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50/60 px-6 py-10">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
          Welcome back
        </h1>
        <p className="mb-6 text-sm text-gray-600">Log in to manage your menu.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        No account?{" "}
        <Link
          href="/signup"
          className="font-bold text-[color:var(--color-brand)] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}
