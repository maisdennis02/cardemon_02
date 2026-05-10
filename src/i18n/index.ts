import "server-only";
import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  isLocale,
  pickLocaleFromAcceptLanguage,
  type Locale,
} from "./config";
import type { Dictionary } from "./dictionaries/en";

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  "pt-BR": () => import("./dictionaries/pt-BR").then((m) => m.default),
  es: () => import("./dictionaries/es").then((m) => m.default),
};

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return pickLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}

export type { Locale } from "./config";
export type { Dictionary } from "./dictionaries/en";
