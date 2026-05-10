import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MenuSlideshow } from "./slideshow";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await prisma.restaurant.findUnique({ where: { slug } });
  if (!r) return {};
  return {
    title: `${r.name} — Cardápio Digital`,
    description: r.description ?? `Cardápio digital de ${r.name}`,
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
      images={restaurant.images.map((i) => i.url)}
    />
  );
}
