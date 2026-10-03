// Example menus: fictional restaurants whose menus ship with the code.
//
// The landing page needs something to show a visitor in their own language —
// the real customers are all Brazilian — and it must not pretend that an
// invented place is a customer. So these are labelled as examples everywhere
// they appear, and they are deliberately NOT rows in the database:
//
//  - they deploy with the code and keep working when the database is down;
//  - nobody has to create an account or upload anything in production;
//  - they never show up in owner stats, the sitemap or structured data.
//
// The menu route (src/app/m/[slug]/data.ts) looks here before it asks
// Prisma. The page for an example is `noindex`, carries no Restaurant
// JSON-LD (it is not a business) and says "example menu" next to the name.
//
// Images are rendered from the HTML sources in scripts/demo-menus/ by
// `node scripts/demo-menus/render.mjs`. No request-time API and no Prisma in
// this file: it is imported by the static menu route, by client components
// and by tests.

import type { Locale } from "@/i18n/config";

export type ExampleMenu = {
  slug: string;
  name: string;
  // Language of the menu itself; the landing shows the examples of the
  // language it renders.
  locale: Locale;
  // Drives the page's own language (localeForCountry) like any restaurant.
  country: string;
  // Paths under public/, in page order.
  images: readonly string[];
};

const pages = (slug: string) =>
  ["01", "02", "03"].map((n) => `/demo-menus/${slug}/${n}.webp`);

export const EXAMPLE_MENUS: readonly ExampleMenu[] = [
  {
    slug: "maple-street-diner",
    name: "Maple Street Diner",
    locale: "en",
    country: "US",
    images: pages("maple-street-diner"),
  },
  {
    slug: "harbor-taproom",
    name: "Harbor Taproom",
    locale: "en",
    country: "US",
    images: pages("harbor-taproom"),
  },
  {
    slug: "taqueria-la-esquina",
    name: "Taquería La Esquina",
    locale: "es",
    country: "MX",
    images: pages("taqueria-la-esquina"),
  },
  {
    slug: "cafe-buen-dia",
    name: "Café Buen Día",
    locale: "es",
    country: "MX",
    images: pages("cafe-buen-dia"),
  },
];

export function findExampleMenu(slug: string): ExampleMenu | undefined {
  return EXAMPLE_MENUS.find((m) => m.slug === slug);
}

// Slugs an account may not take: the example would shadow the real
// restaurant's menu at /m/<slug> (the registry is consulted first).
export function isReservedSlug(slug: string): boolean {
  return findExampleMenu(slug) !== undefined;
}

// Restaurants that exist in production and that the landing links to. They
// live in the database, so the code cannot prove they exist — this list is
// the allow-list the tests check landing links against. Verified with a GET
// on https://menulala.com/m/<slug> on 2026-10-03 (all 200).
export const REAL_MENU_SLUGS = ["art-sabor-sushi", "barraca-da-sonia", "cavalo-marinho"] as const;

export function isKnownMenuSlug(slug: string): boolean {
  return isReservedSlug(slug) || (REAL_MENU_SLUGS as readonly string[]).includes(slug);
}
