import type { Metadata } from "next";
import { auth } from "@/auth";
import { getDictionary, getLocale } from "@/i18n";
import { detectCountry } from "@/lib/hero-mockup";
import { pageMetadata } from "@/lib/seo";
import { LandingPage } from "./landing-page";

// "/" — the landing page at the URL the site has always had (and the one the
// ads land on). The language is negotiated per request: a Brazilian visitor
// gets Portuguese here. The same page also lives at "/pt-BR" and "/es"
// ((localized)/[locale]/page.tsx); when this URL renders one of those
// languages, pageMetadata() points its canonical there.

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return pageMetadata({
    locale,
    title: t.metadata.rootTitle,
    absoluteTitle: true,
    description: t.metadata.rootDescription,
    path: "/",
  });
}

export default async function Home() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const country = await detectCountry(locale);

  return (
    <LandingPage
      locale={locale}
      t={t}
      signedIn={!!session?.user}
      country={country}
      pathPrefix=""
    />
  );
}
