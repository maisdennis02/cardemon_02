import "server-only";
import { headers } from "next/headers";
import type { Locale } from "@/i18n";
import {
  COUNTRY_APPS,
  DELIVERY_APPS,
  isSupportedCountry,
  type CountryCode,
  type DeliveryApp,
} from "./delivery-apps";

export type MockupRegion = "brazil" | "usa" | "latin_america";

export function regionFromLocale(locale: Locale): MockupRegion {
  if (locale === "pt-BR") return "brazil";
  if (locale === "es") return "latin_america";
  return "usa";
}

function countryFromLocaleFallback(locale: Locale): CountryCode {
  if (locale === "pt-BR") return "BR";
  if (locale === "es") return "MX";
  return "US";
}

function countryFromAcceptLanguage(header: string | null): CountryCode | null {
  if (!header) return null;
  const primary = header.split(",")[0]?.trim().split(";")[0] ?? "";
  const match = primary.match(/^[a-z]{2,3}-([a-z]{2})$/i);
  if (!match) return null;
  const country = match[1].toUpperCase();
  return isSupportedCountry(country) ? country : null;
}

export async function detectCountry(locale: Locale): Promise<CountryCode> {
  const h = await headers();
  const vercel = h.get("x-vercel-ip-country");
  if (vercel && isSupportedCountry(vercel.toUpperCase())) {
    return vercel.toUpperCase() as CountryCode;
  }
  const fromAcceptLang = countryFromAcceptLanguage(h.get("accept-language"));
  if (fromAcceptLang) return fromAcceptLang;
  return countryFromLocaleFallback(locale);
}

// Stripped of RegExp fields so it can cross the server/client boundary.
export type SerializableApp = Pick<
  DeliveryApp,
  | "id"
  | "displayName"
  | "brandColor"
  | "textColor"
  | "logoPath"
  | "logoMatchesBrandColor"
>;

export function topAppsForCountry(country: CountryCode, n = 2): SerializableApp[] {
  return COUNTRY_APPS[country].slice(0, n).map((id) => {
    const a = DELIVERY_APPS[id];
    return {
      id: a.id,
      displayName: a.displayName,
      brandColor: a.brandColor,
      textColor: a.textColor,
      logoPath: a.logoPath,
      logoMatchesBrandColor: a.logoMatchesBrandColor,
    };
  });
}

export function mockupImagePaths(region: MockupRegion): string[] {
  return [
    `/mockup/${region}/01.webp`,
    `/mockup/${region}/02.webp`,
    `/mockup/${region}/03.webp`,
  ];
}
