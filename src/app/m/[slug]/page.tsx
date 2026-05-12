import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MenuSlideshow } from "./slideshow";
import { getDictionary, getLocale } from "@/i18n";
import { format } from "@/i18n/config";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await prisma.restaurant.findUnique({ where: { slug } });
  if (!r) return {};
  const locale = await getLocale();
  const t = await getDictionary(locale);
  return {
    title: `${r.name} — ${t.menu.cardapioDigital}`,
    description:
      r.description ?? format(t.metadata.menuDescriptionFallback, { name: r.name }),
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

  return (
    <MenuSlideshow
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
  );
}
