import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import { localeForCountry } from "@/i18n/config";
import { printableMenu, readMenuTheme } from "@/lib/menu";
import { isPro } from "@/lib/pricing";
import { NOINDEX } from "@/lib/seo";
import { getRestaurant } from "../data";
import { PrintPages } from "./print-pages";

// The printable text menu (spec 2026-10-26). Cached like the menu itself;
// out of the index, it is a copy of /m/<slug>.
export const revalidate = 60;

// Empty on purpose, as on the menu page: without it the route is fully
// dynamic and `revalidate` is ignored.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) return {};
  const t = await getDictionary(localeForCountry(r.country));
  return { title: `${r.name} — ${t.menu.cardapioDigital}`, robots: NOINDEX };
}

export default async function PrintMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);
  if (!restaurant || restaurant.example) notFound();

  const menu = printableMenu(
    {
      menuMode: restaurant.menuMode,
      imageCount: restaurant.images.length,
      menuPublished: restaurant.menuPublished,
      pro: isPro(restaurant.owner),
    },
    slug,
  );
  if (!menu) notFound();

  const t = await getDictionary(localeForCountry(restaurant.country));
  return (
    <PrintPages
      slug={slug}
      name={restaurant.name}
      country={restaurant.country}
      theme={readMenuTheme(restaurant.menuTheme)}
      menu={menu}
      hasWhatsapp={!!restaurant.whatsappNumber}
      labels={t.menu.print}
    />
  );
}
