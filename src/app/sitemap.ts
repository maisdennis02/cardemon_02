import type { MetadataRoute } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { PUBLIC_PAGES } from "@/lib/seo";

export const revalidate = 3600;

// No `changeFrequency` / `priority`: Google ignores both. What it does read
// is `lastModified`, so every entry carries a true one — the static pages
// from PUBLIC_PAGES (never "now": a date that moves on every regeneration
// teaches the crawler to distrust it), the menus from the database.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: `${base}${page.path}`,
    lastModified: page.lastModified,
  }));

  const menuEntries: MetadataRoute.Sitemap = (await listedMenus()).map((r) => ({
    url: `${base}/m/${r.slug}`,
    lastModified: r.lastModified,
  }));

  return [...staticEntries, ...menuEntries];
}

// Menus worth indexing: only restaurants that uploaded at least one page. An
// empty menu renders "this menu is being prepared", is `noindex` on the page
// itself, and has no business in the sitemap.
async function listedMenus(): Promise<{ slug: string; lastModified: Date }[]> {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { images: { some: {} } },
      select: {
        slug: true,
        updatedAt: true,
        images: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    return restaurants.map((r) => {
      // Uploading a page does not touch Restaurant.updatedAt, so the newest
      // image counts too.
      const newestImage = r.images[0]?.createdAt;
      return {
        slug: r.slug,
        lastModified: newestImage && newestImage > r.updatedAt ? newestImage : r.updatedAt,
      };
    });
  } catch (err) {
    // At request time a failed regeneration must THROW: ISR then keeps
    // serving the last good sitemap instead of replacing it with one that
    // lost every menu. During `next build` there is nothing to keep, and a
    // database outage must not block a deploy (the menu pages already build
    // without the database), so the build ships the static pages and the
    // first hourly regeneration fills the menus in.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw err;
    console.warn("sitemap: database unreachable during build, menus omitted until the next revalidation");
    return [];
  }
}
