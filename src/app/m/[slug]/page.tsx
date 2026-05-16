import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MenuSlideshow } from "./slideshow";
import { getDictionary, getLocale } from "@/i18n";
import { format } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  if (!r) return {};

  const locale = await getLocale();
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
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantLd) }}
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
