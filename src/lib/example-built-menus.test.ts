import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MenuSchema, MenuThemeSchema, readExampleMenuTheme, readMenuTheme } from "@/lib/menu";
import { LANDING_DEMO } from "@/lib/landing-demo";
import { FULL_EXAMPLE_MENUS, VISIT_DEMO_MENU } from "@/lib/example-full-menus";
import { findExampleMenu, isReservedSlug } from "@/lib/example-menus";
import { FREE_ITEM_LIMIT } from "@/lib/pricing";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";

describe.each([
  ["seu-restaurante", "pt-BR", ptBR],
  ["tu-restaurante", "es", es],
  ["your-restaurant", "en", en],
] as const)("built example %s", (slug, locale, t) => {
  const example = findExampleMenu(slug);
  const built = example?.built;
  const items = built?.menu.sections.flatMap((s) => s.items) ?? [];

  it("is a reserved example with the full menu of its language", () => {
    expect(isReservedSlug(slug)).toBe(true);
    expect(example?.locale).toBe(locale);
    expect(FULL_EXAMPLE_MENUS[locale].slug).toBe(slug);
    expect(built?.menu).toBe(FULL_EXAMPLE_MENUS[locale].menu);
    expect(MenuSchema.safeParse(built?.menu).success).toBe(true);
    expect(example?.images).toEqual([]);
  });

  it("is the slug the landing links to and the WhatsApp message names", () => {
    expect(t.landing.heroDemoSlug).toBe(slug);
    expect(t.landing.demoSlug).toBe(slug);
  });

  it("reads like a real menu: sections, a price and a description on every item", () => {
    expect(built?.menu.sections.length).toBeGreaterThanOrEqual(4);
    expect(items.length).toBeGreaterThan(LANDING_DEMO[locale].menu.sections.flatMap((s) => s.items).length);
    for (const item of items) {
      expect(item.priceCents, item.name).toBeGreaterThan(0);
      expect(item.description?.length, item.name).toBeGreaterThan(0);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it("shows option groups: a required size with a paid option, extras, and a free required flavour", () => {
    const first = built?.menu.sections[0].items[0];
    const required = first?.groups?.find((g) => g.min === 1 && g.max === 1 && g.options.some((o) => o.priceCents > 0));
    expect(required, "size group").toBeDefined();
    expect(required?.options.some((o) => o.priceCents === 0)).toBe(true);
    const extras = first?.groups?.find((g) => g.min === 0 && g.max === 3);
    expect(extras?.options.length).toBeGreaterThanOrEqual(3);
    const flavour = items.find((i) => i.groups?.some((g) => g.min === 1 && g.max === 1 && g.options.length >= 3 && g.options.every((o) => o.priceCents === 0)));
    expect(flavour, "drink with a free required flavour").toBeDefined();
  });

  it("stays within what the free plan builds", () => {
    expect(items.length).toBeLessThanOrEqual(FREE_ITEM_LIMIT);
  });

  it("keeps its logo, background and colour when the page reads the theme", () => {
    const theme = readExampleMenuTheme(built?.theme);
    expect(theme).toEqual(built?.theme);
    expect(theme.logoUrl).toBe(`/demo-menus/${slug}/logo.svg`);
    expect(existsSync(`public${theme.logoUrl}`)).toBe(true);
    expect(theme.background).not.toBe("plain");
    // Everything but the logo is an ordinary owner theme.
    expect(MenuThemeSchema.safeParse({ ...built?.theme, logoUrl: undefined }).success).toBe(true);
  });
});

// The menu the owner shows on his phone at in-person visits.
describe("the visit demo, quiosque-beira-mar", () => {
  const example = findExampleMenu(VISIT_DEMO_MENU.slug);
  const built = example?.built;
  const items = built?.menu.sections.flatMap((s) => s.items) ?? [];

  it("is a reserved Portuguese example, served from the code", () => {
    expect(isReservedSlug("quiosque-beira-mar")).toBe(true);
    expect(example).toMatchObject({ name: "Quiosque Beira-Mar", locale: "pt-BR", country: "BR", images: [] });
    expect(built?.menu).toBe(VISIT_DEMO_MENU.menu);
    expect(MenuSchema.safeParse(built?.menu).success).toBe(true);
  });

  it("fills the free plan exactly: twenty items, each with a price and a description", () => {
    expect(items).toHaveLength(FREE_ITEM_LIMIT);
    expect(built?.menu.sections.length).toBeGreaterThanOrEqual(5);
    for (const item of items) {
      expect(item.priceCents, item.name).toBeGreaterThan(0);
      expect(item.description?.length, item.name).toBeGreaterThan(0);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.name)).size).toBe(items.length);
  });

  it("opens with an item that shows a paid size and extras, and has a drink with two required choices", () => {
    const first = built?.menu.sections[0].items[0];
    expect(first?.groups?.some((g) => g.min === 1 && g.max === 1 && g.options.some((o) => o.priceCents > 0))).toBe(true);
    expect(first?.groups?.some((g) => g.min === 0 && g.max === 3 && g.options.length >= 3)).toBe(true);
    const drink = items.find((i) => (i.groups?.filter((g) => g.min === 1 && g.max === 1).length ?? 0) >= 2);
    expect(drink?.name).toBe("Caipirinha");
    // Option ids are unique within an item (the cart keys on them).
    for (const item of items) {
      const ids = item.groups?.flatMap((g) => g.options.map((o) => o.id)) ?? [];
      expect(new Set(ids).size, item.name).toBe(ids.length);
    }
  });

  it("keeps its logo and colour when the page reads the theme", () => {
    const theme = readExampleMenuTheme(built?.theme);
    expect(theme).toEqual(built?.theme);
    expect(theme.logoUrl).toBe("/demo-menus/quiosque-beira-mar/logo.svg");
    expect(existsSync(`public${theme.logoUrl}`)).toBe(true);
    expect(MenuThemeSchema.safeParse({ ...built?.theme, logoUrl: undefined }).success).toBe(true);
  });

  it("is not what the landing links to", () => {
    expect(ptBR.landing.heroDemoSlug).not.toBe(VISIT_DEMO_MENU.slug);
    expect(ptBR.landing.demoSlug).not.toBe(VISIT_DEMO_MENU.slug);
  });
});

describe("readExampleMenuTheme", () => {
  const base = { color: "#c84630", headerStyle: "band", background: "dots" } as const;

  it("is the only reader that keeps a demo logo; owners' themes still drop it", () => {
    const raw = { ...base, logoUrl: "/demo-menus/seu-restaurante/logo.svg" };
    expect(readExampleMenuTheme(raw).logoUrl).toBe(raw.logoUrl);
    expect(readMenuTheme(raw)).not.toEqual(readExampleMenuTheme(raw));
  });

  it.each([
    "/demo-menus/../uploads/x.svg",
    "/demo-menus/seu-restaurante/logo.svg?x=1",
    "https://evil.example/demo-menus/a/logo.svg",
    "//evil.example/demo-menus/a/logo.svg",
  ])("treats %s like readMenuTheme does", (logoUrl) => {
    expect(readExampleMenuTheme({ ...base, logoUrl })).toEqual(readMenuTheme({ ...base, logoUrl }));
  });
});
