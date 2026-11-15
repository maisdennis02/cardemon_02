import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import { format, localeForCountry } from "@/i18n/config";
import { headerColors, readExampleMenuTheme, readMenuTheme } from "@/lib/menu";
import { NOINDEX } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getRestaurant } from "../data";
import { TableCards } from "./table-cards";

// A4 sheet of six table cards with the menu's QR (2026-11-15): what the owner
// leaves on the tables and at the counter. Example menus get one too, so it
// can be shown at an in-person visit. Out of the index, like the print page.
export const revalidate = 60;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) return {};
  const t = await getDictionary(localeForCountry(r.country));
  return { title: format(t.dashboard.qr.sheetTitle, { name: r.name }), robots: NOINDEX };
}

export default async function TableQrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();

  const t = await getDictionary(localeForCountry(restaurant.country));
  const theme = (restaurant.example ? readExampleMenuTheme : readMenuTheme)(restaurant.menuTheme);
  const qr = t.dashboard.qr;
  return (
    <TableCards
      url={absoluteUrl(`/m/${slug}`)}
      name={restaurant.name}
      // The title colour of the menu page: the restaurant's colour when it reads on white.
      color={headerColors(theme.color).title}
      // An example has no WhatsApp; its card must not promise an order.
      canOrder={!!restaurant.whatsappNumber}
      labels={{
        title: format(qr.sheetTitle, { name: restaurant.name }),
        print: qr.sheetPrint,
        help: qr.sheetHelp,
        line: qr.cardLine,
        order: qr.cardOrder,
        scanLabel: qr.scanLabel,
        scanHint: qr.scanHint,
        qrTitle: format(qr.menuQrTitle, { name: restaurant.name }),
      }}
    />
  );
}
