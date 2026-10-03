import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCALES, OG_LOCALE, format, type Locale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { jsonLdScript } from "@/lib/json-ld";
import {
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  currencyForLocale,
  pricesFor,
} from "@/lib/pricing";
import {
  NOINDEX,
  OG_IMAGE,
  PRIVATE_PATHS,
  PUBLIC_PAGES,
  SITE_NAME,
  menuDescription,
  organizationLd,
  pageMetadata,
  restaurantLd,
  softwareApplicationLd,
  websiteLd,
} from "./seo";

const DICTS = { en, "pt-BR": ptBR, es } as const;
const BASE = "https://menulala.com";

// What a crawler reads back out of the page: the inline script, parsed.
const roundTrip = (value: unknown) => JSON.parse(jsonLdScript(value));

function pricingDescription(locale: Locale): string {
  const prices = pricesFor(currencyForLocale(locale));
  return format(DICTS[locale].metadata.pricingDescription, {
    free: FREE_IMAGE_LIMIT,
    pro: PRO_IMAGE_LIMIT,
    price: `${prices.symbol}${prices.monthly}`,
  });
}

describe.each(LOCALES)("search-facing copy (%s)", (locale) => {
  const t = DICTS[locale];
  const suffix = ` — ${SITE_NAME}`;

  // The title as it reaches <title>: rootTitle is absolute, every other page
  // gets the layout's " — menulala" appended.
  const titles = {
    "/": t.metadata.rootTitle,
    "/pricing": t.metadata.pricingTitle + suffix,
    "/privacy": t.common.privacyPolicy + suffix,
    "/terms": t.common.termsOfService + suffix,
  };
  const descriptions = {
    "/": t.metadata.rootDescription,
    "/pricing": pricingDescription(locale),
    "/privacy": t.metadata.privacyDescription,
    "/terms": t.metadata.termsDescription,
  };

  it("covers every public page", () => {
    expect(Object.keys(titles).sort()).toEqual(PUBLIC_PAGES.map((p) => p.path).sort());
  });

  it.each(Object.entries(titles))("title of %s fits in 60 characters", (_path, title) => {
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith(SITE_NAME)).toBe(true);
  });

  it.each(Object.entries(descriptions))(
    "description of %s is 120–160 characters with no placeholder left",
    (_path, description) => {
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(160);
      expect(description).not.toMatch(/[{}]/);
    },
  );

  it("titles and descriptions are unique per page", () => {
    expect(new Set(Object.values(titles)).size).toBe(PUBLIC_PAGES.length);
    expect(new Set(Object.values(descriptions)).size).toBe(PUBLIC_PAGES.length);
  });

  it("the landing title leads with the term people search, brand last", () => {
    const term = { en: "Digital menu", "pt-BR": "Cardápio digital", es: "Menú digital" }[locale];
    expect(t.metadata.rootTitle.startsWith(term)).toBe(true);
    expect(t.metadata.rootTitle.startsWith(SITE_NAME)).toBe(false);
    expect(t.metadata.rootDescription.toLowerCase()).toContain(term.toLowerCase());
  });
});

describe("pageMetadata", () => {
  const meta = pageMetadata({
    locale: "pt-BR",
    title: "Preços",
    description: "d".repeat(130),
    path: "/pricing",
  });

  it("gives the page its own canonical and og:url", () => {
    expect(meta.alternates?.canonical).toBe("/pricing");
    expect(meta.openGraph?.url).toBe("/pricing");
  });

  it("carries the complete Open Graph and Twitter set", () => {
    expect(meta.openGraph).toMatchObject({
      type: "website",
      siteName: SITE_NAME,
      title: "Preços",
      locale: OG_LOCALE["pt-BR"],
      images: [{ url: OG_IMAGE.url, width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Preços",
      images: [OG_IMAGE.url],
    });
  });

  it("leaves the brand suffix to the layout unless told the title is absolute", () => {
    expect(meta.title).toBe("Preços");
    const home = pageMetadata({ locale: "en", title: "X", description: "y", path: "/", absoluteTitle: true });
    expect(home.title).toEqual({ absolute: "X" });
  });

  it("never marks a public page noindex", () => {
    expect(meta.robots).toBeUndefined();
    expect(NOINDEX).toMatchObject({ index: false });
  });
});

describe("page lists", () => {
  it("no path is both public and private", () => {
    const publicPaths = PUBLIC_PAGES.map((p) => p.path) as string[];
    for (const path of PRIVATE_PATHS) expect(publicPaths).not.toContain(path);
  });

  it("every public page has a real, past lastModified date", () => {
    for (const page of PUBLIC_PAGES) {
      expect(page.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const date = new Date(page.lastModified);
      expect(Number.isNaN(date.getTime())).toBe(false);
      expect(date.getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  // The legal pages print their own "Last updated" date. The sitemap must
  // say the same day, so editing one without the other fails here.
  it.each(["/privacy", "/terms"] as const)("%s lastModified matches the date on the page", (path) => {
    const iso = PUBLIC_PAGES.find((p) => p.path === path)!.lastModified;
    const printed = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
    const source = readFileSync(
      fileURLToPath(new URL(`../app/(main)${path}/page.tsx`, import.meta.url)),
      "utf8",
    );
    expect(source).toContain(`Last updated: ${printed}`);
  });
});

describe("menuDescription", () => {
  const template = ptBR.metadata.menuDescriptionFallback;

  it("writes a full sentence when the owner left the description empty", () => {
    const d = menuDescription({ name: "Cavalo Marinho", description: null, template });
    expect(d).toContain("Cavalo Marinho");
    expect(d.length).toBeGreaterThanOrEqual(120);
    expect(d.length).toBeLessThanOrEqual(160);
  });

  // Both taken from production on 2026-10-03: the snippets Google was given
  // were "Nil's Bar & Restaurante" (23 chars) and "Cardápio " (9 chars).
  it.each([
    ["Nil's Bar & Restaurante", "Nil's Bar & Restaurante"],
    ["Noel Lanches", "Cardápio "],
  ])("does not let a name-only or one-word description through (%s)", (name, description) => {
    const d = menuDescription({ name, description, template });
    expect(d).toBe(format(template, { name }));
  });

  it("keeps a short real description and completes it", () => {
    const d = menuDescription({
      name: "Barraca da Sônia",
      description: "Peixe frito e porções na praia",
      template,
    });
    expect(d.startsWith("Peixe frito e porções na praia. Cardápio digital de Barraca da Sônia.")).toBe(true);
    expect(d.length).toBeLessThanOrEqual(160);
  });

  it("uses a real description as written, clipped at 160 characters", () => {
    const own = "Restaurante de frutos do mar na Riviera de São Lourenço, com porções, pratos executivos e drinks.";
    expect(menuDescription({ name: "X", description: own, template })).toBe(own);
    const long = menuDescription({ name: "X", description: `${own} ${own}`, template });
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
  });

  it.each(LOCALES)("stays within 160 characters for a long restaurant name (%s)", (locale) => {
    const d = menuDescription({
      name: "Restaurante e Pizzaria Cantinho do Acarajé da Praia",
      description: null,
      template: DICTS[locale].metadata.menuDescriptionFallback,
    });
    expect(d.length).toBeLessThanOrEqual(160);
  });
});

describe("JSON-LD", () => {
  it("Organization and WebSite parse and point at crawlable assets", () => {
    const org = roundTrip(organizationLd(BASE, "desc"));
    expect(org).toMatchObject({
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE,
      logo: `${BASE}/logo.png`,
      email: "contato@menulala.com",
    });
    const site = roundTrip(websiteLd(BASE, "pt-BR", "desc"));
    expect(site).toMatchObject({ "@type": "WebSite", url: BASE, inLanguage: "pt-BR" });
  });

  it.each(LOCALES)("SoftwareApplication offers equal the price table (%s)", (locale) => {
    const prices = pricesFor(currencyForLocale(locale));
    const app = roundTrip(
      softwareApplicationLd({
        base: BASE,
        locale,
        description: DICTS[locale].metadata.rootDescription,
        currency: prices.currency,
        monthly: prices.monthly,
      }),
    );
    expect(app["@type"]).toBe("SoftwareApplication");
    expect(app.offers).toHaveLength(2);
    expect(app.offers[0]).toMatchObject({ price: "0", priceCurrency: prices.currency });
    expect(app.offers[1]).toMatchObject({
      price: String(prices.monthly),
      priceCurrency: prices.currency,
    });
  });

  it("Restaurant survives hostile owner input inside an inline <script>", () => {
    const restaurant = {
      name: `Bar </script><script>alert(1)</script> & "Cia"`,
      description: "Linha 1 Linha 2",
      country: "BR",
      whatsappNumber: "5513996332974",
      instagramUrl: "https://instagram.com/bar",
      images: [{ url: "https://blob.example/01.jpg" }],
    };
    const url = `${BASE}/m/bar`;
    const html = jsonLdScript(restaurantLd(restaurant, url));
    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<");
    expect(JSON.parse(html)).toEqual({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: restaurant.name,
      url,
      hasMenu: url,
      description: restaurant.description,
      image: "https://blob.example/01.jpg",
      address: { "@type": "PostalAddress", addressCountry: "BR" },
      telephone: "+5513996332974",
      sameAs: ["https://instagram.com/bar"],
    });
  });

  it("Restaurant omits what the owner did not fill in", () => {
    const ld = roundTrip(
      restaurantLd(
        { name: "X", description: null, country: null, whatsappNumber: null, instagramUrl: null, images: [] },
        `${BASE}/m/x`,
      ),
    );
    expect(Object.keys(ld).sort()).toEqual(["@context", "@type", "hasMenu", "name", "url"]);
  });
});
