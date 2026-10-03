import { notFound } from "next/navigation";
import { MenuSlideshow } from "./slideshow";
import { getDictionary } from "@/i18n";
import { OG_LOCALE, localeForCountry } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
import { NOINDEX, SITE_NAME, menuDescription, restaurantLd } from "@/lib/seo";
import { getRestaurant } from "./data";

export const revalidate = 60;

// Deliberately empty: menus are generated on first visit and then served from
// the ISR cache. Keeping this DB-free also keeps builds deployable during a
// database outage. Required even when empty — without it the route is fully
// dynamic and `revalidate` is ignored.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) return {};

  const locale = localeForCountry(r.country);
  const t = await getDictionary(locale);
  const title = `${r.name} — ${t.menu.cardapioDigital}`;
  const description = menuDescription({
    name: r.name,
    description: r.description,
    template: t.metadata.menuDescriptionFallback,
  });
  const path = `/m/${slug}`;
  const cover = r.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: path },
    // A menu with no pages yet shows only "being prepared": keep it out of
    // the index until the owner uploads something.
    ...(r.images.length === 0 && { robots: NOINDEX }),
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) notFound();

  const url = absoluteUrl(`/m/${slug}`);
  const ld = restaurantLd(restaurant, url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />
      <MenuSlideshow
        slug={slug}
        name={restaurant.name}
        whatsappNumber={restaurant.whatsappNumber}
        instagramUrl={restaurant.instagramUrl}
        country={restaurant.country}
        deliveryUrls={{
          ifoodUrl: restaurant.ifoodUrl,
          ubereatsUrl: restaurant.ubereatsUrl,
          doordashUrl: restaurant.doordashUrl,
          rappiUrl: restaurant.rappiUrl,
          grubhubUrl: restaurant.grubhubUrl,
          pedidosyaUrl: restaurant.pedidosyaUrl,
          didifoodUrl: restaurant.didifoodUrl,
        }}
        images={restaurant.images.map((i) => i.url)}
      />
    </>
  );
}
