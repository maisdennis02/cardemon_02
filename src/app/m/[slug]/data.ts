import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { findExampleMenu, type ExampleMenu } from "@/lib/example-menus";

// What the menu route needs to render a menu — the part of a Restaurant row
// it reads, plus `example`.
export type MenuData = {
  name: string;
  description: string | null;
  country: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  ifoodUrl: string | null;
  ubereatsUrl: string | null;
  doordashUrl: string | null;
  rappiUrl: string | null;
  grubhubUrl: string | null;
  pedidosyaUrl: string | null;
  didifoodUrl: string | null;
  images: { url: string }[];
  // true: a fictional menu from src/lib/example-menus.ts, not a restaurant.
  example: boolean;
};

// An example has a name, a language and pages — and nothing that would send
// a visitor to a person or a business that does not exist.
function exampleAsMenu(example: ExampleMenu): MenuData {
  return {
    name: example.name,
    description: null,
    country: example.country,
    whatsappNumber: null,
    instagramUrl: null,
    ifoodUrl: null,
    ubereatsUrl: null,
    doordashUrl: null,
    rappiUrl: null,
    grubhubUrl: null,
    pedidosyaUrl: null,
    didifoodUrl: null,
    images: example.images.map((url) => ({ url })),
    example: true,
  };
}

// One query shared by the menu layout, generateMetadata and the page via
// React's render-pass memoization, so each ISR regeneration hits the DB once.
//
// Example menus are answered from the registry BEFORE the database is asked:
// they must render with the database down, and their slugs are reserved, so
// no restaurant row can exist for them.
export const getRestaurant = cache(async (slug: string): Promise<MenuData | null> => {
  const example = findExampleMenu(slug);
  if (example) return exampleAsMenu(example);

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  return restaurant ? { ...restaurant, example: false } : null;
});
