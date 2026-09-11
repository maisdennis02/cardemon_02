"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type ActionState } from "./actions";
import { PasswordInput } from "@/components/password-input";
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
        <PasswordInput
          name="currentPassword"
          label={c.currentPassword}
          required
          autoComplete="current-password"
        />
        <PasswordInput
          name="newPassword"
          label={c.newPassword}
          required
          minLength={8}
          placeholder={t.auth.passwordPlaceholderMin}
          autoComplete="new-password"
        />
        <PasswordInput
          name="confirmPassword"
          label={c.confirmPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
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
