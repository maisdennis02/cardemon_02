import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { ROBOTS_DISALLOW } from "@/lib/seo";

// Only what has no HTML to index is disallowed (ROBOTS_DISALLOW). The
// sign-in, sign-up and password screens are deliberately NOT here: they are
// kept out of the index by `noindex` in their metadata, which a crawler can
// only read if robots.txt lets it fetch the page. No `Host:` line: it was a
// Yandex-only directive, since retired, and Google does not read it.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
