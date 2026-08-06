export const LOCALES = ["en", "pt-BR", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
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
