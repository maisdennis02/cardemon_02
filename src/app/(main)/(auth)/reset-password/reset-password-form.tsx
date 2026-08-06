"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPassword, type ActionResult } from "../actions";
import { useT } from "@/i18n/provider";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    resetPassword,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      router.replace("/login?reset=success");
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="label">
        {t.auth.reset.newPassword}
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={t.auth.passwordPlaceholderMin}
          className="input"
          autoComplete="new-password"
        />
      </label>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? t.auth.reset.resetting : t.auth.reset.submit}
      </button>
    </form>
  );
}
