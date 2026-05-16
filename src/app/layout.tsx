import type { Metadata } from "next";
import { Geist, Geist_Mono, Encode_Sans_Expanded } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary, getLocale } from "@/i18n";
import { DictionaryProvider } from "@/i18n/provider";
import { LOCALES, OG_LOCALE } from "@/i18n/config";
import { siteUrl } from "@/lib/site";

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

  return {
    metadataBase: new URL(base),
    title: {
      default: t.metadata.rootTitle,
      template: `%s — menulala`,
    },
    description: t.metadata.rootDescription,
    applicationName: "menulala",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: "menulala",
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
      url: "/",
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: {
      card: "summary",
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
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

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "menulala",
    url: base,
    logo: `${base}/icon.svg`,
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "menulala",
    url: base,
    inLanguage: locale,
  };

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${encodeSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <DictionaryProvider locale={locale} dictionary={dictionary}>
          {children}
        </DictionaryProvider>
        <Analytics />
      </body>
    </html>
  );
}
