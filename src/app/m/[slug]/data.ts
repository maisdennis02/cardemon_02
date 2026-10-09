import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// One call shared by the menu layout, generateMetadata and the page via React's
// render-pass memoization, so each ISR regeneration loads the restaurant once
// (Prisma still issues one query per relation underneath). The owner's plan
// decides how much of a text menu is shown.
export const getRestaurant = cache(async (slug: string) => {
  return prisma.restaurant.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { proExpiresAt: true } },
    },
  });
});
