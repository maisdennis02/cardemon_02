import type { Metadata } from "next";
import "../globals.css";
import { getDictionary, getLocale } from "@/i18n";
import { siteUrl } from "@/lib/site";
import { rootMetadata } from "@/lib/seo";
import { SiteDocument } from "@/components/site-document";

// Root layout of the un-prefixed URLs: "/", "/pricing", the sign-in screens,
// the dashboard. The language is negotiated per request (cookie, then
// Accept-Language), so everything under here is dynamic. The same pages also
// exist at one static URL per language under (localized)/[locale].

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return rootMetadata({ base: siteUrl(), locale, t });
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);

  // pathPrefix "": links on these pages stay un-prefixed, as they always
  // were, even when the page renders Portuguese or Spanish.
  return (
    <SiteDocument locale={locale} dictionary={dictionary} pathPrefix="">
      {children}
    </SiteDocument>
  );
}
