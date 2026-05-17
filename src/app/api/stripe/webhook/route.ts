import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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
  const active = sub.status === "active" || sub.status === "trialing";
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      billingSubscriptionId: sub.id,
      billingCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      ...(billingCycle ? { billingCycle } : {}),
      // If the sub has lapsed without renewal, clear proExpiresAt.
      proExpiresAt: active ? periodEnd : periodEnd ?? null,
    },
  });
}
