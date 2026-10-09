import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { localePrefix } from "@/i18n/config";
import { countryForLocale } from "@/lib/hero-mockup";
import { pageMetadata } from "@/lib/seo";
import { LandingPage } from "@/app/(main)/landing-page";
import { localeFromParams, type LocaleParams } from "./locale";

// "/pt-BR" and "/es": the landing page in one fixed language, static.
// Always the signed-out view (no session is read), with the delivery apps of
// the country the language stands for (no IP lookup).

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getDictionary(locale);
  return pageMetadata({
    locale,
    title: t.metadata.rootTitle,
    absoluteTitle: true,
    description: t.metadata.rootDescription,
    path: "/",
  });
}

export default async function LocalizedHome({ params }: { params: LocaleParams }) {
  const locale = await localeFromParams(params);
  const t = await getDictionary(locale);

  return (
    <LandingPage
      locale={locale}
      t={t}
      signedIn={false}
      country={countryForLocale(locale)}
      pathPrefix={localePrefix(locale)}
    />
  );
}
