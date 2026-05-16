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

  let customerId = user.billingCustomerId;
  // If we have a saved customer, make sure it still exists in this Stripe
  // mode/account. Customers can be deleted in the Dashboard, and when toggling
  // between test/live keys locally the saved id won't resolve. Falling through
  // creates a fresh customer instead of failing the checkout.
  if (customerId) {
    try {
      const existing = await stripe().customers.retrieve(customerId);
      if ((existing as { deleted?: boolean }).deleted) customerId = null;
    } catch {
      customerId = null;
    }
  }
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        billingCustomerId: customerId,
        // Stale subscription id is meaningless for a different customer.
        billingSubscriptionId: null,
      },
    });
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
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
