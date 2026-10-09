import { describe, expect, it } from "vitest";
import { MenuSchema } from "@/lib/menu";
import { LANDING_DEMO } from "@/lib/landing-demo";
import { findExampleMenu, isReservedSlug } from "@/lib/example-menus";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";

describe.each([
  ["seu-restaurante", "pt-BR", ptBR],
  ["tu-restaurante", "es", es],
  ["your-restaurant", "en", en],
] as const)("built example %s", (slug, locale, t) => {
  it("is a reserved example with the landing's own menu", () => {
    const example = findExampleMenu(slug);
    expect(isReservedSlug(slug)).toBe(true);
    expect(example?.locale).toBe(locale);
    expect(example?.built?.menu).toEqual(LANDING_DEMO[locale].menu);
    expect(MenuSchema.safeParse(example?.built?.menu).success).toBe(true);
    expect(example?.images).toEqual([]);
  });

  it("is the slug the landing links to and the WhatsApp message names", () => {
    expect(t.landing.heroDemoSlug).toBe(slug);
    expect(t.landing.demoSlug).toBe(slug);
  });
});
