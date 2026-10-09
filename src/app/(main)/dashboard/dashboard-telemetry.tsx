"use client";

import { useEffect } from "react";
import { done, markDone, once, storedAcquisition } from "@/lib/acquisition-store";
import {
  reportMenuPublishedConversion,
  reportPurchaseConversion,
  reportSignUpConversion,
} from "@/lib/google-ads";
import { capture, identifyOwner } from "@/lib/posthog";

/**
 * Everything the ad run needs to learn from an owner who reached the
 * dashboard. Renders nothing; mounted once from the dashboard page.
 *
 * The dashboard is the right place for all of it because it is the first
 * authenticated page on every path into the product — the e-mail signup form,
 * the Google OAuth return (which arrives already signed in, with no form
 * submit to hook) and the Stripe checkout return all land here.
 *
 * Each conversion is fired at most once per browser (see `once` and the
 * dedupe inside lib/google-ads), so a reload of the dashboard is not a second
 * signup.
 */
const ATTRIBUTION_KEY = "attribution";

const attributionDone = () => done(ATTRIBUTION_KEY);
const markAttributionDone = () => markDone(ATTRIBUTION_KEY);

export function DashboardTelemetry({
  email,
  hasMenu,
  menuMode,
  isPro,
}: {
  email: string | null;
  hasMenu: boolean;
  menuMode: "photos" | "built";
  isPro: boolean;
}) {
  useEffect(() => {
    if (email) identifyOwner(email, { pro: isPro, hasMenu });

    // An account exists and this browser is the one that made it. Hand the
    // stored first-touch parameters to the server, which decides whether they
    // belong to this account (see /api/attribution).
    //
    // Not wrapped in `once`: this feeds cost-per-signup, the number the budget
    // is judged on, and a single failed request must not lose a paid click for
    // good. The marker is written only after the server has answered, so a
    // dropped connection just retries on the next dashboard load — the route
    // is idempotent, and it stops accepting anything once the account is a day
    // old anyway.
    if (!attributionDone()) {
      const acq = storedAcquisition();
      if (acq) {
        void fetch("/api/attribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(acq),
        })
          .then((res) => {
            if (res.ok) markAttributionDone();
          })
          .catch(() => {});
      }
    }

    once("signup-conversion", () => {
      reportSignUpConversion();
      capture("signup_completed");
    });

    if (hasMenu) {
      once("menu-published", () => {
        reportMenuPublishedConversion();
        capture("menu_published", { mode: menuMode });
      });
    }

    // The Stripe return. /api/stripe/checkout builds this URL; `cs` is the
    // Checkout Session id, which makes the conversion idempotent across
    // refreshes and bookmarks on Google's side as well as ours.
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") !== "1") return;

    const value = Number(params.get("value"));
    const currency = params.get("currency") ?? "BRL";
    const orderId = params.get("cs") ?? new Date().toISOString().slice(0, 10);
    capture("subscription_started", {
      cycle: params.get("cycle"),
      value: Number.isFinite(value) ? value : null,
      currency,
    });
    if (Number.isFinite(value) && value > 0) {
      reportPurchaseConversion(value, currency, orderId);
    }

    // Drop the markers so a refresh or a bookmarked URL does not look like a
    // second sale, here or in the replay.
    for (const key of ["subscribed", "cycle", "value", "currency", "cs"]) {
      params.delete(key);
    }
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash,
    );
  }, [email, hasMenu, menuMode, isPro]);

  return null;
}
