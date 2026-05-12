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

export function appUrl(): string {
  // Used to build success/cancel/return URLs. Falls back to localhost for dev.
  return process.env.APP_URL || "http://localhost:3000";
}
