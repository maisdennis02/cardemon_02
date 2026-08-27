// Single source of truth for the absolute origin used by SEO surfaces
// (metadataBase, sitemap, robots, canonical, structured data) and by any
// server-rendered code that needs an absolute URL — QR examples on the
// landing page, share links, etc.
//
// Uses APP_URL so it stays consistent with the Stripe return-URL helper.

export function siteUrl(): string {
  // On Vercel a missing APP_URL must be a hard error: the localhost fallback
  // would silently poison password-reset links, Stripe return URLs, the
  // sitemap, and every canonical tag. Local dev/builds keep the fallback.
  if (!process.env.APP_URL && process.env.VERCEL) {
    throw new Error("APP_URL is not set");
  }
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  const base = siteUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
