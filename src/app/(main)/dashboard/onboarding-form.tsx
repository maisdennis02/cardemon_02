"use client";

import { useActionState, useState } from "react";
import { createRestaurant, type ActionState } from "./actions";
import { useLocale, useT } from "@/i18n/provider";
import { MicButton } from "@/components/voice/mic-button";

export function OnboardingForm() {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState<ActionState, FormData>(createRestaurant, {});
  const [name, setName] = useState("");

  const ob = t.dashboard.onboarding;

  return (
    <section className="card">
      <h1 className="mb-1 text-2xl font-bold text-[color:var(--color-navy)]">
        {ob.title}
      </h1>
      <p className="mb-6 text-sm text-gray-600">{ob.lead}</p>

      <form action={action} className="flex flex-col gap-4">
        <label className="label">
          {ob.nameLabel}
          <span className="flex items-center gap-2">
            <input
              name="name"
              required
              autoFocus
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ob.namePlaceholder}
              className="input min-w-0"
            />
            <MicButton
              value={name}
              onChange={(v) => setName(v.slice(0, 120))}
              lang={locale}
              label={ob.micLabel}
            />
          </span>
        </label>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary self-start">
          {pending ? ob.submitting : ob.submit}
        </button>
      </form>
    </section>
  );
}
