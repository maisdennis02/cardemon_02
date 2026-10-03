// SEO building blocks shared by every route: which pages are public, their
// metadata shape, and the JSON-LD objects. Kept free of request-time APIs
// (no cookies()/headers(), no Prisma) so the public menu pages can use it
// without leaving ISR, and so vitest can exercise it directly.

import type { Metadata } from "next";
import {
  LOCALES,
  OG_LOCALE,
  UNPREFIXED_LOCALE,
  format,
  localizedPath,
  type Locale,
} from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

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

// The hreflang set of a public page: one URL per locale plus `x-default`,
// which is the un-prefixed (English, language-negotiating) URL. The same set
// goes on every language version of the page — that is what makes the
// annotations reciprocal and self-referencing, which Google requires before
// it trusts them. Paths are relative; `metadataBase` makes them absolute.
export function languageAlternates(path: string): Record<Locale | "x-default", string> {
  const urls = Object.fromEntries(
    LOCALES.map((l) => [l, localizedPath(l, path)]),
  ) as Record<Locale, string>;
  return { ...urls, "x-default": localizedPath(UNPREFIXED_LOCALE, path) };
}

// Full metadata for one public page. Next merges metadata SHALLOWLY, so a
// page that sets only `alternates` or only `openGraph.url` silently drops the
// rest of that object — and a canonical set in the root layout is inherited
// by every page that forgets its own (that is how /pricing, /login and
// /signup all ended up declaring themselves duplicates of the home page).
// Every public page goes through here instead.
//
// `path` is the un-prefixed path of the page ("/", "/pricing"); `locale` is
// the language being RENDERED. The canonical is that locale's own URL. For a
// prefixed route that is the URL itself. For the un-prefixed route it is the
// URL itself only when it renders English: when the cookie or
// `Accept-Language` made "/" render Portuguese, the canonical is "/pt-BR", so
// the negotiated copy never competes with the page that owns that language.
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
  const canonical = localizedPath(locale, path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
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

// Site-wide defaults, shared by the two root layouts of the marketing site
// ((main), which negotiates the language, and (localized)/[locale], which
// reads it from the path). Deliberately NO `alternates` and NO
// `openGraph.url` here: both would be inherited by every page that does not
// set its own. Each public page sets them through pageMetadata().
export function rootMetadata({
  base,
  locale,
  t,
}: {
  base: string;
  locale: Locale;
  t: Dictionary;
}): Metadata {
  return {
    metadataBase: new URL(base),
    title: {
      default: t.metadata.rootTitle,
      template: `%s — ${SITE_NAME}`,
    },
    description: t.metadata.rootDescription,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{ ...OG_IMAGE, alt: t.metadata.rootTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
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
  // The URLs of the language being rendered, same rule as the canonical.
  const home = `${base}${localizedPath(locale, "/").replace(/^\/$/, "")}`;
  const pricing = `${base}${localizedPath(locale, "/pricing")}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: home,
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
        url: pricing,
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: String(monthly),
        priceCurrency: currency,
        url: pricing,
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
