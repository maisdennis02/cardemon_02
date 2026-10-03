import { Geist, Geist_Mono, Encode_Sans_Expanded } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { DictionaryProvider } from "@/i18n/provider";
import { withPrefix, type Locale, type PathPrefix } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { siteUrl } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
import { organizationLd, websiteLd } from "@/lib/seo";
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

// The <html> document of the owner-facing site, shared by its two root
// layouts so they cannot drift apart:
//
//  - (main)/layout.tsx — un-prefixed URLs; the locale is negotiated per
//    request (cookie, Accept-Language), so that layout is dynamic;
//  - (localized)/[locale]/layout.tsx — "/pt-BR/…", "/es/…"; the locale comes
//    from the path, so those pages are static.
//
// This component takes the locale as a prop and reads nothing from the
// request itself, which is what lets the second layout stay static.
//
// `pathPrefix` is the prefix of the URL being served ("" on un-prefixed
// pages, whatever language they render): the links here must stay inside the
// visitor's current set of URLs.
export function SiteDocument({
  locale,
  dictionary,
  pathPrefix,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  pathPrefix: PathPrefix;
  children: React.ReactNode;
}) {
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
            <a href={withPrefix(pathPrefix, "/terms")} className="hover:underline">
              {dictionary.common.termsOfService}
            </a>
            <a href={withPrefix(pathPrefix, "/privacy")} className="hover:underline">
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
