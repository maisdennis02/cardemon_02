import { notFound } from "next/navigation";
import { isPrefixedLocale, type PrefixedLocale } from "@/i18n/config";

export type LocaleParams = Promise<{ locale: string }>;

// The locale of a per-language page comes from its path and from nothing
// else. `dynamicParams = false` in the layout already turns any other first
// segment into a 404; this narrows the type and keeps that true if the
// config is ever loosened.
export async function localeFromParams(params: LocaleParams): Promise<PrefixedLocale> {
  const { locale } = await params;
  if (!isPrefixedLocale(locale)) notFound();
  return locale;
}
