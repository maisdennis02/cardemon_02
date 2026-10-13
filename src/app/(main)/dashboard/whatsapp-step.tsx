"use client";

import { useActionState, useState } from "react";
import { saveWhatsappNumber, type ActionState } from "./actions";
import { useLocale, useT } from "@/i18n/provider";
import { MicButton } from "@/components/voice/mic-button";

// The "whatsapp" next step: the number is saved right here, without the
// settings form (which also wants name and address). The action normalizes
// dictated numbers like "11 91234-5678".
export function WhatsappStep({ restaurantId }: { restaurantId: string }) {
  const t = useT();
  const locale = useLocale();
  const h = t.dashboard.home;
  const [state, action, pending] = useActionState<ActionState, FormData>(saveWhatsappNumber, {});
  const [number, setNumber] = useState("");

  return (
    <section
      aria-labelledby="whatsapp-step-title"
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--color-brand-100)] border-l-4 border-l-[color:var(--color-brand)] bg-[color:var(--color-cream-deep)] p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="whatsapp-step-title"
          className="text-base font-bold text-[color:var(--color-navy)] sm:text-lg"
        >
          {h.whatsappTitle}
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">{h.whatsappLead}</p>
      </div>

      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <span className="flex flex-1 items-center gap-2">
          <input
            name="whatsappNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={30}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            aria-label={h.whatsappTitle}
            placeholder={t.dashboard.settings.whatsappPlaceholder}
            className="input min-w-0 flex-1"
          />
          <MicButton
            value={number}
            onChange={(v) => setNumber(v.slice(0, 30))}
            lang={locale}
            label={h.whatsappMic}
            separator=" "
          />
        </span>
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {h.save}
        </button>
      </form>

      {state.ok && !pending && (
        <p role="status" className="text-sm font-semibold text-green-700">
          {h.saved}
        </p>
      )}
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
    </section>
  );
}
