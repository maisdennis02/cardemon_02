"use client";

import { useActionState } from "react";
import { sendFeedback, type ActionState } from "./actions";
import { useT } from "@/i18n/provider";
import { capture } from "@/lib/posthog";
import { FEEDBACK_MAX_LENGTH } from "@/lib/feedback-limits";

/**
 * "Sugestões e dúvidas" — the last card on the dashboard home, also shown
 * under the onboarding form. One textarea, one button; the message is stored
 * and e-mailed to us. No reply deadline is promised ("em breve").
 */
export function FeedbackCard() {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendFeedback, {});
  return <FeedbackCardView state={state} action={action} pending={pending} />;
}

export function FeedbackCardView({
  state,
  action,
  pending,
}: {
  state: ActionState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const t = useT();
  const c = t.dashboard.feedback;
  // Fires once per answer, while rendering: the success state replaces the
  // form, so there is no later user action to hook it on.
  if (state.ok && !state.error && typeof window !== "undefined" && !capturedFor.has(state)) {
    capturedFor.add(state);
    capture("feedback_sent");
  }

  return (
    <section className="card">
      <h2 className="mb-1 text-lg font-bold">{c.title}</h2>
      <p className="mb-4 text-sm text-gray-600">{c.lead}</p>
      {state.ok && !state.error ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{c.success}</p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <textarea
            name="message"
            required
            maxLength={FEEDBACK_MAX_LENGTH}
            rows={4}
            placeholder={c.placeholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          <div>
            <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
              {pending ? c.sending : c.submit}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

// Which answers already produced a feedback_sent event (identity of the state
// object the action returned), so re-renders don't double count.
const capturedFor = new WeakSet<object>();
