import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDictionary } from "@/i18n";
import { localeForCountry } from "@/i18n/config";
import { sendPaymentFailedEmail, sendProEndedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { isOurProduct, stripe } from "@/lib/stripe";

// POST /api/stripe/webhook
// Stripe sends events here. We verify the signature, then sync the user's
// proExpiresAt / billingSubscriptionId from the relevant subscription events.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook-not-configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing-signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid-signature", detail: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        if (userId && subId) {
          const sub = await stripe().subscriptions.retrieve(subId);
          await applySubscription(userId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(sub);
        if (userId) await applySubscription(userId, sub);
        break;
      }
      case "checkout.session.expired": {
        // Abandoned first-time checkouts using customer_email still leave a
        // Stripe-side Customer behind. If our DB never linked to it (no user
        // has this billingCustomerId) and it has no subscriptions, delete it
        // so the Stripe Dashboard doesn't accumulate orphans.
        const s = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (!customerId) break;
        const linked = await prisma.user.findFirst({
          where: { billingCustomerId: customerId },
          select: { id: true },
        });
        if (linked) break;
        // Product guard, immediately before the only destructive call in this
        // handler. Other products' expired sessions arrive here too, and their
        // orphan customers are not ours to delete. The session payload doesn't
        // carry line items, so fetch them; if we can't positively prove the
        // session was menulala's, leave the customer alone.
        let ours = false;
        try {
          const items = await stripe().checkout.sessions.listLineItems(s.id, {
            limit: 100,
          });
          ours = items.data.some((li) => isOurProduct(li.price?.product));
        } catch {
          ours = false;
        }
        if (!ours) break;
        try {
          const subs = await stripe().subscriptions.list({
            customer: customerId,
            limit: 1,
          });
          if (subs.data.length === 0) {
            await stripe().customers.del(customerId);
          }
        } catch {
          // Best-effort: don't make Stripe retry the whole webhook just
          // because orphan cleanup failed.
        }
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        // In Stripe API 2025-08+ the linked subscription moved to
        // invoice.parent.subscription_details.subscription.
        const linked = inv.parent?.subscription_details?.subscription;
        const subId = typeof linked === "string" ? linked : linked?.id;
        if (subId) {
          const sub = await stripe().subscriptions.retrieve(subId);
          const userId = await resolveUserId(sub);
          if (userId) await applySubscription(userId, sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        // Dunning: tell the owner their card failed so they can fix it before
        // Stripe exhausts its retries and cancels the subscription. Stripe
        // fires this once per retry attempt (a handful over the dunning
        // window), which is a normal reminder cadence. Pro state itself is
        // not touched here — the customer.subscription.updated that carries
        // status "past_due" keeps access through the retry window, and the
        // eventual "deleted"/"unpaid" clears it (see applySubscription).
        const inv = event.data.object as Stripe.Invoice;
        const linked = inv.parent?.subscription_details?.subscription;
        const subId = typeof linked === "string" ? linked : linked?.id;
        if (!subId) break;
        const sub = await stripe().subscriptions.retrieve(subId);
        // Product guard: other products' dunning is not ours to email about.
        const ours =
          sub.items?.data?.some((item) => isOurProduct(item.price?.product)) ?? false;
        if (!ours) break;
        const userId = await resolveUserId(sub);
        if (!userId) break;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            restaurants: { select: { country: true }, take: 1 },
          },
        });
        if (!user?.email) break;
        const dict = await getDictionary(
          localeForCountry(user.restaurants[0]?.country),
        );
        await sendPaymentFailedEmail({ to: user.email, dict });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json(
      { error: "handler-failed", detail: (err as Error).message },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const metaUserId = sub.metadata?.userId;
  if (metaUserId) return metaUserId;

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await prisma.user.findFirst({
    where: { billingCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function applySubscription(userId: string, sub: Stripe.Subscription) {
  // Product guard. Every write to a user's Pro state funnels through here —
  // checkout.session.completed, the three customer.subscription.* events, and
  // invoice.paid — so this one check covers them all. Without it a foreign
  // product's subscription on a customer we've seen before would drive
  // menulala's billing: its renewal would extend Pro, its cancellation would
  // clear it. Throws (→ 500 → Stripe retries) if the allowlist is unset, so a
  // misconfigured deploy queues events instead of silently mis-applying them.
  const ours = sub.items?.data?.some((item) => isOurProduct(item.price?.product)) ?? false;
  if (!ours) return;

  // "past_due" keeps access on purpose: Stripe is still retrying the card
  // (and invoice.payment_failed is emailing the owner about it). Anything
  // else — canceled, unpaid, incomplete_expired, paused — has lapsed.
  const active =
    sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  // current_period_end location depends on the account's pinned API version:
  //   - 2025-08-28+: per item (sub.items.data[N].current_period_end)
  //   - older:       top-level (sub.current_period_end)
  // We read both and take whichever is populated.
  const itemEnd =
    sub.items?.data?.reduce(
      (max, item) =>
        Math.max(
          max,
          (item as { current_period_end?: number }).current_period_end ?? 0,
        ),
      0,
    ) ?? 0;
  const topEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ?? 0;
  const periodEndUnix = Math.max(itemEnd, topEnd);
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  const cycleMeta = sub.metadata?.cycle;
  const billingCycle =
    cycleMeta === "ANNUAL" ? "ANNUAL" : cycleMeta === "MONTHLY" ? "MONTHLY" : undefined;

  const prev = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      proExpiresAt: true,
      billingSubscriptionId: true,
      proEndingReminderSentAt: true,
      restaurants: { select: { country: true }, take: 1 },
    },
  });
  if (!prev) return;

  // A lapsed subscription that isn't the one backing Pro must not touch it.
  // After a re-subscribe, the old (canceled) subscription still fires
  // customer.subscription.deleted at its period end; without this it would
  // wipe the Pro the new subscription just paid for.
  if (!active && prev.billingSubscriptionId && prev.billingSubscriptionId !== sub.id) {
    return;
  }

  // Set when the owner canceled from the portal: Pro stays until periodEnd
  // and then ends instead of renewing. The daily reminder cron keys off it
  // (lib/pro-ending.ts). cancel_at covers the dated-cancel variant.
  const cancelAtPeriodEnd = active && (sub.cancel_at_period_end || sub.cancel_at != null);

  await prisma.user.update({
    where: { id: userId },
    data: {
      billingSubscriptionId: active ? sub.id : null,
      billingCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      ...(billingCycle ? { billingCycle } : {}),
      billingCancelAtPeriodEnd: cancelAtPeriodEnd,
      // If the sub has lapsed, clear proExpiresAt. (This used to write
      // periodEnd on both branches, so a canceled sub kept Pro through a
      // period that was never paid for.)
      proExpiresAt: active ? periodEnd : null,
    },
  });

  // Pro just ended (canceled period ran out, or dunning gave up): tell the
  // owner what changed and how to come back. Guarded by the same
  // proEndingReminderSentAt the cron uses, so a retried event or a cron run
  // that beat this webhook to it can't double-send.
  const proJustEnded =
    !active &&
    prev.proExpiresAt !== null &&
    (!prev.proEndingReminderSentAt || prev.proEndingReminderSentAt < prev.proExpiresAt);
  if (proJustEnded && prev.email) {
    try {
      const dict = await getDictionary(localeForCountry(prev.restaurants[0]?.country));
      const ok = await sendProEndedEmail({ to: prev.email, dict });
      if (ok) {
        await prisma.user.update({
          where: { id: userId },
          data: { proEndingReminderSentAt: new Date() },
        });
      }
    } catch (err) {
      // Pro state is already correct; an email hiccup is not worth a Stripe
      // retry of the whole event.
      console.error(`[webhook] pro-ended email failed for user ${userId}:`, err);
    }
  }
}
