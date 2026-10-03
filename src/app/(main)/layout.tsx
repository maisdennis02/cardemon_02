import type { Metadata } from "next";
import { Geist, Geist_Mono, Encode_Sans_Expanded } from "next/font/google";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary, getLocale } from "@/i18n";
import { DictionaryProvider } from "@/i18n/provider";
import { LOCALES, OG_LOCALE } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
import { OG_IMAGE, SITE_NAME, organizationLd, websiteLd } from "@/lib/seo";
import { GoogleAdsTag } from "@/components/google-ads-tag";
import { PostHogInit } from "@/components/posthog-init";
import { Telemetry } from "@/components/telemetry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const encodeSans = Encode_Sans_Expanded({
  variable: "--font-encode-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getDictionary(locale);
  const base = siteUrl();

  // Defaults only. Deliberately NO `alternates.canonical` and NO
  // `openGraph.url` here: both are inherited by every page that does not set
  // its own, which made /pricing, /login and /signup declare the home page as
  // their canonical. Each public page sets them through pageMetadata().
  return {
    metadataBase: new URL(base),
    title: {
      default: t.metadata.rootTitle,
      template: `%s — ${SITE_NAME}`,
    },
    description: t.metadata.rootDescription,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{ ...OG_IMAGE, alt: t.metadata.rootTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const base = siteUrl();

  const organization = organizationLd(base, dictionary.metadata.rootDescription);
  const website = websiteLd(base, locale, dictionary.metadata.rootDescription);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${encodeSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(website) }}
        />
        <DictionaryProvider locale={locale} dictionary={dictionary}>
          {children}
        </DictionaryProvider>
        <footer className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-4 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} menulala</span>
            <a href="/terms" className="hover:underline">
              {dictionary.common.termsOfService}
            </a>
            <a href="/privacy" className="hover:underline">
              {dictionary.common.privacyPolicy}
            </a>
          </div>
        </footer>
        <Analytics />
        {/* Ad funnel instrumentation. Deliberately absent from the
            public-menu layout (src/app/m/[slug]/layout.tsx), which must
            stay ISR and survive the database being down. */}
        <GoogleAdsTag />
        <Telemetry />
        <PostHogInit />
      </body>
    </html>
  );
}
