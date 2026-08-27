"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";
import { useT } from "@/i18n/provider";

// Two-step inline confirmation (no browser confirm() dialog): the first click
// only reveals the real delete button, so a stray click can't destroy data.
export function DeleteAccountCard() {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const d = t.dashboard.dangerZone;

  return (
    <section className="card border-red-200">
      <h2 className="mb-1 text-lg font-bold text-red-700">{d.title}</h2>
      <p className="mb-4 text-sm text-gray-600">{d.description}</p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn btn-sm border border-red-300 text-red-700 hover:bg-red-50"
        >
          {d.deleteButton}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">{d.confirmPrompt}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => deleteAccount())}
              className="btn btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {d.confirmButton}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="btn btn-ghost btn-sm"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
