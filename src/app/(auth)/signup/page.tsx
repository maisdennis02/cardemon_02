"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type ActionResult } from "../actions";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signup, {});

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50/60 px-6 py-10">
      <div className="mb-6">
        <Logo size="lg" />
      </div>
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
          Create your account
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Free to start. Set up your menu in five minutes.
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <label className="label">
            Name
            <span className="label-hint">Optional.</span>
            <input
              name="name"
              type="text"
              placeholder="Your name"
              className="input"
              autoComplete="name"
            />
          </label>
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
            <span className="label-hint">At least 8 characters.</span>
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
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-[color:var(--color-brand)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </main>
  );
}
