import { Encode_Sans_Expanded } from "next/font/google";
import "../../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { getDictionary } from "@/i18n";
import { DictionaryProvider } from "@/i18n/provider";
import { localeForCountry } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { getRestaurant } from "./data";

const encodeSans = Encode_Sans_Expanded({
  variable: "--font-encode-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  metadataBase: new URL(siteUrl()),
};

// Root layout for public menus, separate from the app's main root layout on
// purpose: it must never touch cookies()/headers(), otherwise the route drops
// out of ISR and every QR scan depends on a live database.
export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Locale comes from the restaurant itself, not the visitor's headers. If the
  // DB is unreachable on a cache miss, still render the shell in the default
  // locale and let the page's error boundary take over.
  const restaurant = await getRestaurant(slug).catch(() => null);
  const locale = localeForCountry(restaurant?.country);
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} className={`${encodeSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <DictionaryProvider locale={locale} dictionary={dictionary}>
          {children}
        </DictionaryProvider>
        <Analytics />
      </body>
    </html>
  );
}
