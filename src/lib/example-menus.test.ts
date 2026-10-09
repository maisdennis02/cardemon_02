import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LOCALES, localeForCountry } from "@/i18n/config";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import {
  EXAMPLE_MENUS,
  REAL_MENU_SLUGS,
  findExampleMenu,
  isKnownMenuSlug,
  isReservedSlug,
} from "./example-menus";
import { LANDING_SHOWCASE } from "./landing-showcase";
import { mockupImagePaths } from "./hero-mockup";
import { slugify } from "./slug";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const SOURCES_DIR = join(ROOT, "scripts/demo-menus");
const DICTS = { en, "pt-BR": ptBR, es } as const;

const md5 = (path: string) => createHash("md5").update(readFileSync(path)).digest("hex");

describe("the example registry", () => {
  it("has a text-menu example per language, plus two photo menus in English and two in Spanish", () => {
    expect(EXAMPLE_MENUS.map((m) => m.slug)).toEqual([
      "seu-restaurante",
      "tu-restaurante",
      "your-restaurant",
      "maple-street-diner",
      "harbor-taproom",
      "taqueria-la-esquina",
      "cafe-buen-dia",
    ]);
    const photos = EXAMPLE_MENUS.filter((m) => !m.built);
    expect(photos.filter((m) => m.locale === "en")).toHaveLength(2);
    expect(photos.filter((m) => m.locale === "es")).toHaveLength(2);
    expect(photos.filter((m) => m.locale === "pt-BR")).toHaveLength(0);
    for (const locale of ["pt-BR", "es", "en"]) {
      expect(EXAMPLE_MENUS.filter((m) => m.built && m.locale === locale)).toHaveLength(1);
    }
  });

  it.each(EXAMPLE_MENUS.map((m) => [m.slug, m] as const))("%s resolves, with a valid slug", (slug, menu) => {
    expect(findExampleMenu(slug)).toBe(menu);
    // Same rule the dashboard applies to a slug, and exactly what typing the
    // name into the sign-up form would produce — which is why it is reserved.
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slugify(menu.name)).toBe(slug);
    // The menu page picks its language from the country, like any restaurant.
    expect(localeForCountry(menu.country)).toBe(menu.locale);
  });

  it("unknown slugs are not examples", () => {
    expect(findExampleMenu("cavalo-marinho")).toBeUndefined();
    expect(findExampleMenu("")).toBeUndefined();
  });
});

const PHOTO_EXAMPLES = EXAMPLE_MENUS.filter((m) => !m.built);

describe("example images", () => {
  it.each(PHOTO_EXAMPLES.map((m) => [m.slug, m] as const))(
    "%s has three 720×1418 WebP pages and its HTML source",
    async (slug, menu) => {
      expect(menu.images).toEqual([1, 2, 3].map((n) => `/demo-menus/${slug}/0${n}.webp`));
      for (const image of menu.images) {
        const file = join(PUBLIC_DIR, image);
        expect(existsSync(file), image).toBe(true);
        const meta = await sharp(file).metadata();
        expect([meta.format, meta.width, meta.height]).toEqual(["webp", 720, 1418]);
      }
      expect(existsSync(join(SOURCES_DIR, `${slug}.html`))).toBe(true);
      expect(readFileSync(join(SOURCES_DIR, "render.mjs"), "utf8")).toContain(`"${slug}"`);
    },
  );

  it("no two example pages are the same image", () => {
    const hashes = PHOTO_EXAMPLES.flatMap((m) => m.images.map((i) => md5(join(PUBLIC_DIR, i))));
    expect(new Set(hashes).size).toBe(12);
  });
});

describe("hero phone mockups", () => {
  const files = (locale: (typeof LOCALES)[number]) => {
    const region = { en: "usa", "pt-BR": "brazil", es: "latin_america" }[locale] as
      | "usa"
      | "brazil"
      | "latin_america";
    return mockupImagePaths(region).map((p) => join(PUBLIC_DIR, p));
  };

  it.each(LOCALES)("the three images exist for %s", async (locale) => {
    for (const file of files(locale)) {
      expect(existsSync(file), file).toBe(true);
      const meta = await sharp(file).metadata();
      expect([meta.width, meta.height]).toEqual([720, 1418]);
    }
  });

  // They used to be three copies of the Brazilian menu.
  it("English and Spanish no longer show the Brazilian menu", () => {
    const brazil = files("pt-BR").map(md5);
    for (const locale of ["en", "es"] as const) {
      for (const hash of files(locale).map(md5)) expect(brazil).not.toContain(hash);
    }
    expect(files("en").map(md5)).not.toEqual(files("es").map(md5));
  });

  // Pinned: the Portuguese hero is the page the ads land on.
  it("the Brazilian mockup is untouched", () => {
    expect(files("pt-BR").map(md5)).toEqual([
      "5373186c64a44726c062d33bf1be9422",
      "90a1f22bbf72b950b50f9619388b2a11",
      "6bde32895e1ba2c00405903fcdb99cf8",
    ]);
  });

  // The hero shows the text-menu example its demo link opens (checked in
  // example-built-menus.test.ts); these photo phones moved to the "just send
  // the photo" section and still show a photo example of the page's language.
  it.each(["en", "es"] as const)("the %s photo phone shows a photo example of its language", (locale) => {
    const shown = files(locale).map(md5);
    const match = PHOTO_EXAMPLES.find(
      (m) => m.locale === locale && m.images.map((i) => md5(join(PUBLIC_DIR, i))).join() === shown.join(),
    );
    expect(match, locale).toBeDefined();
  });
});

describe("reserved slugs", () => {
  it("the four example slugs are reserved, real ones are not", () => {
    for (const menu of EXAMPLE_MENUS) expect(isReservedSlug(menu.slug)).toBe(true);
    for (const slug of REAL_MENU_SLUGS) expect(isReservedSlug(slug)).toBe(false);
    expect(isReservedSlug("meu-restaurante")).toBe(false);
  });

  it("no example slug collides with a real restaurant", () => {
    for (const menu of EXAMPLE_MENUS) expect(REAL_MENU_SLUGS as readonly string[]).not.toContain(menu.slug);
  });

  // Both places an account can set a slug refuse a reserved one before they
  // touch the database, and the view counter never looks one up.
  it("the dashboard actions and the view counter check the reservation", () => {
    const actions = readFileSync(join(ROOT, "src/app/(main)/dashboard/actions.ts"), "utf8");
    expect(actions.match(/if \(isReservedSlug\(parsed\.data\.slug\)\) return \{ error: t\.errors\.slugTaken \};/g)).toHaveLength(2);
    for (const fn of ["createRestaurant", "updateRestaurant"]) {
      const body = actions.slice(actions.indexOf(`export async function ${fn}`));
      expect(body.indexOf("isReservedSlug("), fn).toBeGreaterThan(-1);
      expect(body.indexOf("isReservedSlug("), fn).toBeLessThan(body.indexOf("prisma.restaurant.find"));
    }
    const views = readFileSync(join(ROOT, "src/app/api/menu-views/route.ts"), "utf8");
    expect(views.indexOf("isReservedSlug(slug)")).toBeGreaterThan(-1);
    expect(views.indexOf("isReservedSlug(slug)")).toBeLessThan(views.indexOf("await cachedRestaurantId(slug)"));
  });
});

describe("menus the landing may link to", () => {
  it("knows the examples and the real restaurants, and nothing else", () => {
    for (const menu of EXAMPLE_MENUS) expect(isKnownMenuSlug(menu.slug)).toBe(true);
    for (const slug of REAL_MENU_SLUGS) expect(isKnownMenuSlug(slug)).toBe(true);
    // The Spanish landing used to link to these two; they never existed.
    expect(isKnownMenuSlug("boteco-do-marcao")).toBe(false);
    expect(isKnownMenuSlug("cantina-da-julia")).toBe(false);
  });

  it.each(LOCALES)("every card and the hero link of the %s landing point at a known menu", (locale) => {
    const slugs = [DICTS[locale].landing.heroDemoSlug, ...LANDING_SHOWCASE[locale].cards.map((c) => c.slug)];
    for (const slug of slugs) expect(isKnownMenuSlug(slug), slug).toBe(true);
  });

  it("an example is always labelled as one, in the language of the page", () => {
    for (const locale of LOCALES) {
      for (const card of LANDING_SHOWCASE[locale].cards) {
        const example = findExampleMenu(card.slug);
        expect(card.kind === "example", `${locale} ${card.slug}`).toBe(example !== undefined);
        if (!example) continue;
        expect(example.locale).toBe(locale);
        expect(card.restaurant).toBe(example.name);
        expect(card.label).toBe(DICTS[locale].menu.exampleLabel);
      }
    }
  });

  // Quotes and people's names only where they came from: the Portuguese
  // page. English and Spanish cards carry a factual line instead.
  it("only the Portuguese landing has customer quotes", () => {
    expect(LANDING_SHOWCASE["pt-BR"].cards.every((c) => c.kind === "customer")).toBe(true);
    for (const locale of ["en", "es"] as const) {
      const { heading, cards } = LANDING_SHOWCASE[locale];
      expect(cards.some((c) => c.kind === "customer")).toBe(false);
      expect(cards.filter((c) => c.kind === "example")).toHaveLength(2);
      // The heading must not claim the examples are customers.
      expect(heading).not.toMatch(/already using|ya usan|restaurants? /i);
    }
  });

  it("the hero link opens the text-menu example of its language, and says it is one", () => {
    expect(en.landing.heroDemoSlug).toBe("your-restaurant");
    expect(es.landing.heroDemoSlug).toBe("tu-restaurante");
    expect(ptBR.landing.heroDemoSlug).toBe("seu-restaurante");
    expect(en.landing.heroDemoLink).toMatch(/example/i);
    expect(es.landing.heroDemoLink).toMatch(/ejemplo/i);
    expect(ptBR.landing.heroDemoLink).toMatch(/exemplo/i);
  });
});
