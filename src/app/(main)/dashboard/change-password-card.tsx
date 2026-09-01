"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type ActionState } from "./actions";
import { useT } from "@/i18n/provider";

export function ChangePasswordCard() {
  const t = useT();
  const c = t.dashboard.changePassword;
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields on success so the new password isn't left sitting in
  // the form; the success message stays until the next submit.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="card">
      <h2 className="mb-1 text-lg font-bold">{c.title}</h2>
      <p className="mb-4 text-sm text-gray-600">{c.description}</p>
      <form ref={formRef} action={action} className="flex max-w-sm flex-col gap-4">
        <label className="label">
          {c.currentPassword}
          <input
            name="currentPassword"
            type="password"
            required
            className="input"
            autoComplete="current-password"
          />
        </label>
        <label className="label">
          {c.newPassword}
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            placeholder={t.auth.passwordPlaceholderMin}
            className="input"
            autoComplete="new-password"
          />
        </label>
        <label className="label">
          {c.confirmPassword}
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="input"
            autoComplete="new-password"
          />
        </label>
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && !state.error && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{c.success}</p>
        )}
        <div>
          <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
            {pending ? c.saving : c.submit}
          </button>
        </div>
      </form>
    </section>
  );
}
