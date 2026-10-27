"use client";

import { useActionState, useState } from "react";
import { changePassword, type ActionState } from "./actions";
import { PasswordInput } from "@/components/password-input";
import { useT } from "@/i18n/provider";

export function ChangePasswordCard() {
  const t = useT();
  const c = t.dashboard.changePassword;
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, {});
  // Controlled, so an error answer (wrong current password, mismatch) does
  // not wipe what was typed (React resets an uncontrolled form after every
  // submit).
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Clear the fields on success so the new password isn't left sitting in
  // the form; the success message stays until the next submit. Done while
  // rendering, on the new answer, rather than in an effect.
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <section className="card">
      <h2 className="mb-1 text-lg font-bold">{c.title}</h2>
      <p className="mb-4 text-sm text-gray-600">{c.description}</p>
      <form action={action} className="flex max-w-sm flex-col gap-4">
        <PasswordInput
          name="currentPassword"
          value={currentPassword}
          onChange={setCurrentPassword}
          label={c.currentPassword}
          required
          autoComplete="current-password"
        />
        <PasswordInput
          name="newPassword"
          value={newPassword}
          onChange={setNewPassword}
          label={c.newPassword}
          required
          minLength={8}
          placeholder={t.auth.passwordPlaceholderMin}
          autoComplete="new-password"
        />
        <PasswordInput
          name="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
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
