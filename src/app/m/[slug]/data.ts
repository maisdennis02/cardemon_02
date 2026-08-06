import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// One query shared by the menu layout, generateMetadata and the page via
// React's render-pass memoization, so each ISR regeneration hits the DB once.
export const getRestaurant = cache(async (slug: string) => {
  return prisma.restaurant.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
});
