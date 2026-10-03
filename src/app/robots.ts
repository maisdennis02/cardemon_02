import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The sign-in screens are also `noindex` in their own metadata (see
// (main)/(auth)/layout.tsx). No `Host:` line: it was a Yandex-only
// directive, since retired, and Google does not read it.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api", "/login", "/signup"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
