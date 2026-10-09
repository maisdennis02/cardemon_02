import { PREFIXED_LOCALES } from "@/i18n/config";

// The links whose clicks telemetry.tsx reports as `cta_click`: sign-up,
// sign-in and pricing — with or without a locale prefix, since the pricing
// link is "/pricing" on the un-prefixed pages and "/pt-BR/pricing" or
// "/es/pricing" on the per-language ones. Pure, so it can be tested without
// a browser.
const FUNNEL_HREF = new RegExp(
  `^(?:/(?:${PREFIXED_LOCALES.join("|")}))?/(?:signup|login|pricing)(?:\\?|#|$)`,
);

export function isFunnelHref(href: string): boolean {
  return FUNNEL_HREF.test(href);
}
