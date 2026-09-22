/**
 * PostHog — product analytics and session replay for the owner-facing funnel.
 * Inert until the env sets NEXT_PUBLIC_POSTHOG_KEY (and optionally
 * NEXT_PUBLIC_POSTHOG_HOST; the default is EU cloud, which keeps replay data
 * in the EU rather than the US).
 *
 * Why this sits next to Vercel Analytics and the MenuView counters rather
 * than replacing them:
 *
 * - Vercel Analytics answers "how many" for traffic, cheaply, on every route.
 * - MenuView answers "how is *this* restaurant's menu doing", for the owner.
 * - PostHog answers "why did this person stop": the replay shows the signup
 *   form they abandoned, the upload that failed, the pricing page they read
 *   twice. That is the only question a paid ad run actually needs answered.
 *
 * The library is behind a dynamic import, so a build without the key does not
 * carry it in the bundle at all.
 *
 * **This project is shared with DevRounds.** PostHog's free plan allows one
 * project per organisation, so both products report into project 267290. Every
 * event menulala sends therefore carries a `product: "menulala"` super
 * property, registered at init — without it the two funnels are one
 * indistinguishable pile. Every query in the daily ads read must filter on it,
 * and so must every insight and dashboard built in the PostHog UI.
 *
 * Scope: loaded only from the (main) layout — landing, pricing, auth,
 * dashboard. Public menu pages (/m/[slug]) get none of it, on purpose: they
 * are ISR, they must survive the database being down, and a QR scan is not
 * part of the ad funnel. Keeping them out also keeps the free tier's replay
 * quota pointed at the ~dozens of owners instead of the thousands of diners.
 *
 * Both reads must stay literal `process.env.NEXT_PUBLIC_*` expressions — Next
 * inlines them into the client bundle at build time.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export const postHogEnabled = Boolean(key);

type PostHog = (typeof import("posthog-js"))["default"];
let client: Promise<PostHog> | null = null;

/** The initialised client, or null where PostHog is off. Loads once. */
export function postHog(): Promise<PostHog> | null {
  if (!key || typeof window === "undefined") return null;
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host,
      // The App Router changes pages without a document load; count those too.
      capture_pageview: "history_change",
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      // Off by default in posthog-js. /privacy tells owners that turning on
      // "Do Not Track" stops the recording, so it has to be on here for that
      // sentence to be true — keep the two in step.
      respect_dnt: true,
      // Autocapture of clicks is what makes the funnel legible in a replay
      // without instrumenting every button by hand.
      autocapture: true,
      // Uncaught errors as $exception events. Without this, a dashboard that
      // dies mid-upload looks exactly like an owner who lost interest.
      capture_exceptions: true,
      session_recording: {
        // Restaurant names and menu prices are the owner's business, and the
        // signup form carries an e-mail and a password. Mask every input, and
        // anything we tag .ph-mask, by default.
        maskAllInputs: true,
        maskTextSelector: ".ph-mask",
      },
    });
    // A super property rather than a per-call prop: it has to land on
    // autocapture and $pageview too, which we never call ourselves.
    posthog.register({ product: "menulala" });
    return posthog;
  });
  return client;
}

/** Report one product event. Never throws; a no-op where PostHog is off. */
export function capture(
  event: string,
  props: Record<string, string | number | boolean | null> = {},
): void {
  void postHog()?.then((p) => p.capture(event, props));
}

/** Tie this browser's replay and events to the signed-in owner. */
export function identifyOwner(email: string, props: Record<string, unknown> = {}): void {
  void postHog()?.then((p) => p.identify(email, props));
}

/** On sign-out, so the next person on this device is not recorded as them. */
export function resetIdentity(): void {
  void postHog()?.then((p) => p.reset());
}
