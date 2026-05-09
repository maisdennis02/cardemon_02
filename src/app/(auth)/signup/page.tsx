"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type ActionResult } from "../actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signup, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold">Sign up</h1>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="name"
          type="text"
          placeholder="Your name (optional)"
          className="rounded border px-3 py-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="you@restaurant.com"
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 chars)"
          className="rounded border px-3 py-2"
        />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
