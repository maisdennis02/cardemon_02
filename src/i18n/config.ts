export const LOCALES = ["en", "pt-BR", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// --- Locale URLs -----------------------------------------------------------
//
// Every public marketing page exists once per language, each at its own URL:
// English at the un-prefixed path ("/", "/pricing"), which is also what the
// site has always served and where `hreflang="x-default"` points; the other
// locales under a prefix that is the locale code itself ("/pt-BR/pricing",
// "/es/pricing"). Prefixed pages take the locale from the path and nothing
// else, so they are static (src/app/(localized)/[locale]).
//
// The un-prefixed pages still negotiate the language from the cookie and
// `Accept-Language` (src/i18n/index.ts) — a Brazilian visitor keeps getting
// Portuguese at "/" — but when they render a non-English locale their
// canonical points at that locale's own URL, so the negotiated copy never
// competes with it in the index.

// The locale that owns the un-prefixed URLs (and `x-default`).
export const UNPREFIXED_LOCALE: Locale = DEFAULT_LOCALE;

// Every other locale, each with its own URL prefix. Written out rather than
// derived so the type is a literal union; config.test.ts checks it stays
// equal to LOCALES minus UNPREFIXED_LOCALE.
export const PREFIXED_LOCALES = ["pt-BR", "es"] as const satisfies readonly Locale[];
export type PrefixedLocale = (typeof PREFIXED_LOCALES)[number];

export function isPrefixedLocale(value: string): value is PrefixedLocale {
  return (PREFIXED_LOCALES as readonly string[]).includes(value);
}

// "" for English, "/pt-BR", "/es".
export type PathPrefix = "" | `/${PrefixedLocale}`;

export function localePrefix(locale: Locale): PathPrefix {
  return isPrefixedLocale(locale) ? `/${locale}` : "";
}

// The URL path of `path` (an un-prefixed public path such as "/" or
// "/pricing") in `locale`: "/pricing" → "/pt-BR/pricing", "/" → "/pt-BR".
export function localizedPath(locale: Locale, path: string): string {
  return withPrefix(localePrefix(locale), path);
}

// Same, from a prefix. Internal links of a page are built with the prefix of
// the URL being served — NOT with the locale being rendered: the un-prefixed
// pages keep un-prefixed links even when they render Portuguese.
export function withPrefix(prefix: PathPrefix, path: string): string {
  if (!prefix) return path;
  return path === "/" ? prefix : `${prefix}${path}`;
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

// Maps app locale to Open Graph locale codes (which use underscore-separated ISO).
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  "pt-BR": "pt_BR",
  es: "es_ES",
};

// Locale for a restaurant's public menu, derived from its country so the page
// stays deterministic (and therefore cacheable) — no request headers involved.
const COUNTRY_LOCALE: Record<string, Locale> = {
  BR: "pt-BR",
  PT: "pt-BR",
  MX: "es",
  AR: "es",
  UY: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  ES: "es",
};

export function localeForCountry(country: string | null | undefined): Locale {
  return (country && COUNTRY_LOCALE[country.toUpperCase()]) || DEFAULT_LOCALE;
}

export function pickLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const primary = header.split(",")[0]?.trim().split(";")[0]?.toLowerCase() ?? "";
  if (primary.startsWith("pt")) return "pt-BR";
  if (primary.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}
