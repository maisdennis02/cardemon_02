// SEO building blocks shared by every route: which pages are public, their
// metadata shape, and the JSON-LD objects. Kept free of request-time APIs
// (no cookies()/headers(), no Prisma) so the public menu pages can use it
// without leaving ISR, and so vitest can exercise it directly.

import type { Metadata } from "next";
import { LOCALES, OG_LOCALE, format, type Locale } from "@/i18n/config";

export const SITE_NAME = "menulala";
export const CONTACT_EMAIL = "contato@menulala.com";

export const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
} as const;

// Every indexable page of the marketing site, with the date its content last
// changed. This list feeds the sitemap, and seo-routes.test.ts fails when a
// page.tsx exists that is neither here nor in PRIVATE_PATHS — a new page must
// be classified in the same commit that adds it.
//
// `lastModified` must be TRUE: bump it when the page's copy, prices or
// metadata change, never to "now". For the legal pages it is the date printed
// on the page ("Last updated: …"); seo.test.ts checks the two agree.
export const PUBLIC_PAGES = [
  { path: "/", lastModified: "2026-10-03" },
  { path: "/pricing", lastModified: "2026-10-03" },
  { path: "/privacy", lastModified: "2026-09-20" },
  { path: "/terms", lastModified: "2026-08-27" },
] as const;

// Keeping a page out of Google takes one of two tools, and they do not mix:
//
// - `noindex` in the page's own metadata — for pages that OPEN without a
//   session. The crawler has to be able to fetch the page to read the tag, so
//   these must NOT be disallowed in robots.txt: a URL that robots.txt blocks
//   can still be indexed, bare, from links pointing at it, and the noindex
//   that would have prevented it is never seen.
// - `Disallow` in robots.txt — for prefixes with no HTML to index at all:
//   route handlers, and pages that answer an anonymous request with a
//   redirect to the sign-in screen.
//
// robots.test / seo-routes.test fail if a path ends up in both.

// Open without a session, carry `noindex` (see (main)/(auth)/layout.tsx).
export const NOINDEX_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

// What robots.txt disallows. `/dashboard` is redirected to /login for
// anonymous visitors by src/proxy.ts; `/api` is route handlers only.
export const ROBOTS_DISALLOW = ["/dashboard", "/api"] as const;

// Every page that must stay out of the index and out of the sitemap,
// whichever of the two tools keeps it out.
export const PRIVATE_PATHS = [...NOINDEX_PATHS, "/dashboard"] as const;

// "noindex, follow": keep the page out of results without hiding its links.
export const NOINDEX: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
};

// Full metadata for one public page. Next merges metadata SHALLOWLY, so a
// page that sets only `alternates` or only `openGraph.url` silently drops the
// rest of that object — and a canonical set in the root layout is inherited
// by every page that forgets its own (that is how /pricing, /login and
// /signup all ended up declaring themselves duplicates of the home page).
// Every public page goes through here instead.
export function pageMetadata({
  locale,
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  // true: `title` is used as is; false: the layout appends " — menulala".
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{ ...OG_IMAGE, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

// --- Public menu pages (/m/<slug>) -----------------------------------------

const DESCRIPTION_MAX = 160;

function clip(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.—-]+$/, "")}…`;
}

// Meta description of a restaurant's menu page. Owners often leave the
// description empty, repeat the restaurant name, or type one word — which
// gives Google a 9-character snippet. A real description (50+ chars) is used
// as written; a short one is kept and completed with the generic sentence;
// anything else falls back to the generic sentence alone.
export function menuDescription({
  name,
  description,
  template,
}: {
  name: string;
  description: string | null | undefined;
  // t.metadata.menuDescriptionFallback, with a {name} placeholder.
  template: string;
}): string {
  const generic = format(template, { name });
  const own = (description ?? "").replace(/\s+/g, " ").trim();
  if (own.length >= 50) return clip(own);
  const repeatsName = own.toLowerCase() === name.trim().toLowerCase();
  if (own.length >= 10 && !repeatsName) {
    const sentence = /[.!?…]$/.test(own) ? own : `${own}.`;
    return clip(`${sentence} ${generic}`);
  }
  return clip(generic);
}

export type MenuRestaurant = {
  name: string;
  description: string | null;
  country: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  images: { url: string }[];
};

export function restaurantLd(restaurant: MenuRestaurant, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    url,
    hasMenu: url,
    ...(restaurant.description && { description: restaurant.description }),
    ...(restaurant.images[0]?.url && { image: restaurant.images[0].url }),
    ...(restaurant.country && {
      address: { "@type": "PostalAddress", addressCountry: restaurant.country },
    }),
    ...(restaurant.whatsappNumber && { telephone: `+${restaurant.whatsappNumber}` }),
    ...(restaurant.instagramUrl && { sameAs: [restaurant.instagramUrl] }),
  };
}

// --- Marketing site ---------------------------------------------------------

export function organizationLd(base: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    // A raster logo at a stable URL: Google's logo guidelines ask for an
    // image that reads on a white background (the old value was the favicon
    // SVG, a light-grey mark on transparent).
    logo: `${base}/logo.png`,
    email: CONTACT_EMAIL,
    description,
  };
}

export function websiteLd(base: string, locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: base,
    inLanguage: locale,
    description,
  };
}

// The product itself. Prices come from the same table the page renders
// (src/lib/pricing.ts), so the structured data cannot drift from the copy.
export function softwareApplicationLd({
  base,
  locale,
  description,
  currency,
  monthly,
}: {
  base: string;
  locale: Locale;
  description: string;
  currency: string;
  monthly: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: base,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    description,
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: currency,
        url: `${base}/pricing`,
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: String(monthly),
        priceCurrency: currency,
        url: `${base}/pricing`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(monthly),
          priceCurrency: currency,
          unitText: "MONTH",
        },
      },
    ],
  };
}
