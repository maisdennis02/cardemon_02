import type { MetadataRoute } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { LOCALES, localizedPath } from "@/i18n/config";
import { PUBLIC_PAGES, isTestMenu, languageAlternates } from "@/lib/seo";
import { isPublished, publishedItemCount } from "@/lib/menu";
import { isReservedSlug } from "@/lib/example-menus";

export const revalidate = 3600;

// No `changeFrequency` / `priority`: Google ignores both. What it does read
// is `lastModified`, so every entry carries a true one — the static pages
// from PUBLIC_PAGES (never "now": a date that moves on every regeneration
// teaches the crawler to distrust it), the menus from the database. Menus
// have one URL each, whatever their language, and no hreflang.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  // Every public page once per language, each entry carrying the full set of
  // its translations (hreflang) — the same set the pages declare in their
  // <head>, so the two sources cannot disagree.
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_PAGES.flatMap((page) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(page.path)).map(([lang, path]) => [lang, `${base}${path}`]),
    );
    return LOCALES.map((locale) => ({
      url: `${base}${localizedPath(locale, page.path)}`,
      lastModified: page.lastModified,
      alternates: { languages },
    }));
  });

  const menuEntries: MetadataRoute.Sitemap = (await listedMenus()).map((r) => ({
    url: `${base}/m/${r.slug}`,
    lastModified: r.lastModified,
  }));

  return [...staticEntries, ...menuEntries];
}

// Menus worth indexing: the ones whose page is indexable — published photos
// or a published text menu (the same isPublished the page's robots tag uses,
// so the two cannot disagree) — minus the try-out menus. An empty menu
// renders "this menu is being prepared", is `noindex` on the page itself, and
// has no business in the sitemap.
async function listedMenus(): Promise<{ slug: string; lastModified: Date }[]> {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { OR: [{ images: { some: {} } }, { menuPublished: { not: Prisma.DbNull } }] },
      select: {
        slug: true,
        updatedAt: true,
        menuMode: true,
        menuPublished: true,
        images: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    // Example menus are served from the code, are `noindex` and their slugs
    // cannot be registered; the filter only makes sure a stray row with one
    // of those slugs could never put an example in the sitemap.
    return restaurants
      .filter(
        (r) =>
          !isReservedSlug(r.slug) &&
          !isTestMenu(r.slug) &&
          isPublished({
            menuMode: r.menuMode,
            imageCount: r.images.length,
            publishedItemCount: publishedItemCount(r.menuPublished),
          }),
      )
      .map((r) => {
        // Uploading a page does not touch Restaurant.updatedAt, so the newest
        // image counts too. Publishing a text menu does.
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
