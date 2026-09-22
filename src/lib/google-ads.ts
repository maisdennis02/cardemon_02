/**
 * Google Ads conversion tracking. Entirely inert until the Vercel env sets:
 *
 * - NEXT_PUBLIC_GOOGLE_ADS_ID — the tag id, "AW-XXXXXXXXXX".
 * - NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL — the "account created" conversion
 *   action's label (Google Ads → Metas → Conversões → the action's snippet,
 *   the part after the slash in `send_to`).
 * - NEXT_PUBLIC_GOOGLE_ADS_MENU_LABEL — "menu published", the first menu
 *   image uploaded. Optional but the one worth creating: Smart Bidding chases
 *   whatever conversion you feed it, and a restaurant that actually put its
 *   menu online is a far better proxy for a future subscriber than an e-mail
 *   address that never came back.
 * - NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL — a Pro subscription, reported with
 *   its value when Stripe sends the buyer back to /dashboard.
 *
 * With only the id set, the base tag loads (click attribution + remarketing)
 * and no conversions fire, which is the right state while the campaign is
 * still being built.
 *
 * Every read must stay a literal `process.env.NEXT_PUBLIC_*` expression —
 * Next inlines these into the client bundle at build time, so a computed
 * lookup would come out undefined in production.
 */
export const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

const signupLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL;
const menuLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_MENU_LABEL;
const purchaseLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Fire one conversion, at most once per browser per `dedupeKey`. A returning
 * owner firing it again on a fresh browser is harmless: Google only counts a
 * conversion it can match to an ad click (the gclid its base tag stored on
 * landing), and each action counts one per click.
 */
function fireConversion(
  label: string | undefined,
  dedupeKey: string,
  params: Record<string, unknown> = {},
): void {
  if (!googleAdsId || !label) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return; // Tag blocked or not loaded yet — never throw over analytics.
  }
  try {
    if (localStorage.getItem(dedupeKey)) return;
    localStorage.setItem(dedupeKey, "1");
  } catch {
    // Storage unavailable (private mode). Fall through and let Google's own
    // one-per-click counting do the deduplication.
  }
  window.gtag("event", "conversion", {
    send_to: `${googleAdsId}/${label}`,
    ...params,
  });
}

/**
 * An account now exists.
 *
 * Fired when the dashboard first loads for a browser, not on the signup form:
 * that is the only client-side moment shared by the e-mail path and the
 * Google OAuth path, which returns from Google already signed in with no form
 * submit to hook.
 */
export function reportSignUpConversion(): void {
  fireConversion(signupLabel, "gads:signup");
}

/** The first menu image is up — the restaurant is actually live. */
export function reportMenuPublishedConversion(): void {
  fireConversion(menuLabel, "gads:menu-published");
}

/**
 * A Pro subscription started. `value` in `currency`; `orderId` is the Stripe
 * Checkout Session id, so a refresh of the return URL cannot count twice on
 * Google's side any more than it can on ours.
 */
export function reportPurchaseConversion(
  value: number,
  currency: string,
  orderId: string,
): void {
  fireConversion(purchaseLabel, `gads:purchase:${orderId}`, {
    value,
    currency,
    transaction_id: orderId,
  });
}
