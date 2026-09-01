// "Your Pro plan is ending" reminders.
//
// A Stripe subscription renews on its own, so an upcoming proExpiresAt is NOT
// an expiry for most users — it's a renewal date, and Stripe's own renewal
// reminder email covers it. Pro genuinely ends only when the subscription is
// set to cancel at period end (billingCancelAtPeriodEnd) or when Pro was
// granted by hand with no subscription behind it. Those users get:
//
//   7 days before  → "ends on <date>"        (sent by the daily cron)
//   1 day before   → "ends tomorrow"         (sent by the daily cron)
//   at the end     → "Pro has ended"         (webhook on subscription lapse,
//                                             cron as fallback / for grants)
//
// Idempotency without extra state: each stage is a window that opens at
// proExpiresAt - N days. A stage is due when the window is open and the last
// reminder (proEndingReminderSentAt) predates its opening. A renewal moves
// proExpiresAt a period forward, which closes every window on its own.

import type { Prisma } from "@/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReminderStage = 7 | 1 | 0;

export function dueReminderStage(
  expiresAt: Date,
  sentAt: Date | null,
  now: Date = new Date(),
): ReminderStage | null {
  // Smallest window first so a late cron (or a cancellation made 2 days
  // before the end) sends the most accurate message, never two at once.
  for (const days of [0, 1, 7] as const) {
    const opensAt = new Date(expiresAt.getTime() - days * DAY_MS);
    if (now >= opensAt) {
      return !sentAt || sentAt < opensAt ? days : null;
    }
  }
  return null;
}

// Prisma filter for the users the daily cron should look at: Pro that is not
// going to renew, ending within the next 7 days or ended in the last 3 (the
// day-of email is normally sent by the webhook; this catches manual grants
// and a missed webhook). Anything older is left alone so a one-off grant that
// lapsed months ago doesn't get a surprise email when this feature ships.
export function endingSoonWhere(now: Date = new Date()): Prisma.UserWhereInput {
  return {
    email: { not: "" },
    proExpiresAt: {
      lte: new Date(now.getTime() + 7 * DAY_MS),
      gte: new Date(now.getTime() - 3 * DAY_MS),
    },
    OR: [{ billingCancelAtPeriodEnd: true }, { billingSubscriptionId: null }],
  };
}
