import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, priceIdFor, appUrl } from "@/lib/stripe";
import { getLocale } from "@/i18n";
import { currencyForLocale } from "@/lib/pricing";

// POST /api/stripe/checkout
// Body (form-encoded): cycle=MONTHLY|ANNUAL
// Creates a Checkout Session and 303-redirects the user to Stripe.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const cycleRaw = String(form.get("cycle") ?? "MONTHLY");
  const cycle = cycleRaw === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const currency = currencyForLocale(await getLocale());

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, billingCustomerId: true },
  });
  if (!user?.email) {
    return NextResponse.json({ error: "user-missing-email" }, { status: 400 });
  }

  // For returning subscribers we re-use the saved customer so they keep their
  // payment-method history in Stripe. For first-time checkouts we hand Stripe
  // just `customer_email` — Stripe creates the Customer on its side, but we
  // do NOT persist anything to our DB until the webhook fires on a successful
  // subscription. That way an abandoned/declined checkout doesn't leave an
  // orphan billingCustomerId locked to whatever currency was tried.
  let customerId = user.billingCustomerId;
  if (customerId) {
    try {
      const existing = await stripe().customers.retrieve(customerId);
      if ((existing as { deleted?: boolean }).deleted) customerId = null;
    } catch {
      // Customer gone (deleted, or test/live key drift). Drop it; webhook will
      // re-populate billingCustomerId on the next successful subscription.
      customerId = null;
      await prisma.user.update({
        where: { id: userId },
        data: { billingCustomerId: null, billingSubscriptionId: null },
      });
    }
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    ...(customerId
      ? { customer: customerId }
      : { customer_email: user.email }),
    client_reference_id: userId,
    line_items: [{ price: priceIdFor(cycle, currency), quantity: 1 }],
    success_url: `${appUrl()}/dashboard?subscribed=1`,
    cancel_url: `${appUrl()}/pricing?canceled=1`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId, cycle },
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "no-checkout-url" }, { status: 500 });
  }
  return NextResponse.redirect(checkout.url, 303);
}
