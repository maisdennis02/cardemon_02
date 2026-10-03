import type { Metadata } from "next";
import "../../globals.css";
import { getDictionary } from "@/i18n";
import { PREFIXED_LOCALES, localePrefix } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { rootMetadata } from "@/lib/seo";
import { SiteDocument } from "@/components/site-document";
import { localeFromParams, type LocaleParams } from "./locale";

// Root layout of the per-language URLs: "/pt-BR", "/pt-BR/pricing", "/es", …
// A third root layout, next to (main) and m/[slug], on purpose: (main) reads
// the cookie and Accept-Language to pick a language and is therefore dynamic;
// here the language is the first path segment, so every page below is
// prerendered and a crawler that sends no Accept-Language still gets
// Portuguese at /pt-BR and Spanish at /es.
//
// Nothing under this folder may call cookies(), headers(), getLocale() or
// auth() — seo-routes.test.tsx checks it, and the build output must keep
// showing these routes as ● (SSG).
//
// English has no prefix: it lives at the un-prefixed URLs under (main).

// Only the locales below exist; any other first segment is a 404.
export const dynamicParams = false;

// Regenerated once a day so the "© year" in the footer cannot go stale
// between deploys. No database is involved in any of these pages.
export const revalidate = 86400;

export function generateStaticParams() {
  return PREFIXED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await localeFromParams(params);
  return rootMetadata({ base: siteUrl(), locale, t: await getDictionary(locale) });
}

export default async function LocalizedRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LocaleParams;
}) {
  const locale = await localeFromParams(params);
  const dictionary = await getDictionary(locale);

  return (
    <SiteDocument locale={locale} dictionary={dictionary} pathPrefix={localePrefix(locale)}>
      {children}
    </SiteDocument>
  );
}
