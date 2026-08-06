import { notFound } from "next/navigation";
import { MenuSlideshow } from "./slideshow";
import { getDictionary } from "@/i18n";
import { format, localeForCountry } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
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
  const description =
    r.description ?? format(t.metadata.menuDescriptionFallback, { name: r.name });
  const path = `/m/${slug}`;
  const cover = r.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      siteName: "menulala",
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
  const restaurantLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    url,
    hasMenu: url,
    ...(restaurant.description && { description: restaurant.description }),
    ...(restaurant.images[0]?.url && { image: restaurant.images[0].url }),
    ...(restaurant.country && {
      address: { "@type": "PostalAddress", addressCountry: restaurant.country },
    }),
    ...(restaurant.whatsappNumber && { telephone: `+${restaurant.whatsappNumber}` }),
    ...(restaurant.instagramUrl && { sameAs: [restaurant.instagramUrl] }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(restaurantLd) }}
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
