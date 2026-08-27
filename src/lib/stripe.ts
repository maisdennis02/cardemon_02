import Stripe from "stripe";
import type { Currency } from "@/lib/pricing";

export type BillingCycle = "MONTHLY" | "ANNUAL";

// Singleton client. Pinned to the SDK's default apiVersion to avoid drift.
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key);
  return _stripe;
}

export function priceIdFor(cycle: BillingCycle, currency: Currency = "USD"): string {
  // TEMP: route every Subscribe click to a tiny test-amount Price so we can
  // validate the end-to-end flow without charging real money. Remove this
  // block to restore the per-cycle pricing.
  const testEnv = currency === "BRL" ? "STRIPE_PRICE_ID_TEST_BRL" : "STRIPE_PRICE_ID_TEST_USD";
  const testId = process.env[testEnv];
  if (testId) return testId;

  const envName =
    currency === "BRL"
      ? cycle === "ANNUAL"
        ? "STRIPE_PRICE_ID_ANNUAL_BRL"
        : "STRIPE_PRICE_ID_MONTHLY_BRL"
      : cycle === "ANNUAL"
        ? "STRIPE_PRICE_ID_ANNUAL"
        : "STRIPE_PRICE_ID_MONTHLY";
  const id = process.env[envName];
  if (!id) throw new Error(`${envName} is not set`);
  return id;
}

// Product allowlist. One Stripe account can carry several products, and every
// event for every one of them lands on our single webhook endpoint — so the
// webhook has to prove an event is ours before acting on it. Anchored on the
// Product rather than the Prices because the Prices multiply (four live ones
// plus the STRIPE_PRICE_ID_TEST_* override above) and a price allowlist would
// silently reject a Price someone forgot to add.
// Comma-separated, so a separate test-mode Product can sit alongside the live
// one without widening the guard to "anything on the account".
export function allowedProductIds(): string[] {
  const ids = (process.env.STRIPE_PRODUCT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Deliberately fail closed: an unset allowlist must not degrade into
  // "allow everything", which is the exact bug this guard exists to fix.
  if (ids.length === 0) throw new Error("STRIPE_PRODUCT_ID is not set");
  return ids;
}

// Stripe hands back price.product as a bare id, an expanded Product, or a
// deleted stub depending on the call. Normalize before comparing.
export function isOurProduct(
  product: string | Stripe.Product | Stripe.DeletedProduct | null | undefined,
): boolean {
  const id = typeof product === "string" ? product : product?.id;
  if (!id) return false;
  return allowedProductIds().includes(id);
}

export function appUrl(): string {
  // Used to build success/cancel/return URLs. Falls back to localhost for dev.
  return process.env.APP_URL || "http://localhost:3000";
}
