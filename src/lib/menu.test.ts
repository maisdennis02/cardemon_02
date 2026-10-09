import { describe, expect, it, vi } from "vitest";
import { jsonLdScript } from "@/lib/json-ld";
import {
  DEFAULT_MENU_THEME,
  MenuDataError,
  PublishMenuInputSchema,
  MenuSchema,
  countItems,
  currencyForCountry,
  effectiveMode,
  formatPrice,
  headerColors,
  isPublished,
  menuJsonLd,
  publishedItemCount,
  readMenuTheme,
  readPublishedMenu,
  visibleMenu,
  type Menu,
} from "@/lib/menu";

// One section per entry in `counts`, titled S1, S2…, items "Item N" at R$ 10,00.
function menuWith(counts: number[]): Menu {
  let n = 0;
  return {
    v: 1,
    sections: counts.map((count, s) => ({
      id: `s${s + 1}`,
      title: `S${s + 1}`,
      items: Array.from({ length: count }, () => {
        n += 1;
        return { id: `i${n}`, name: `Item ${n}`, priceCents: 1000 };
      }),
    })),
  };
}

function withFirstItem(patch: Record<string, unknown>): unknown {
  const menu = menuWith([1]);
  return { ...menu, sections: [{ ...menu.sections[0], items: [{ ...menu.sections[0].items[0], ...patch }] }] };
}

const ok = (raw: unknown) => MenuSchema.safeParse(raw).success;

describe("MenuSchema", () => {
  it("accepts a valid menu", () => {
    expect(ok(menuWith([2]))).toBe(true);
  });

  it("rejects more than 30 sections", () => {
    expect(ok(menuWith(Array(31).fill(1)))).toBe(false);
  });

  it("rejects more than 300 items in total", () => {
    expect(ok(menuWith([150, 151]))).toBe(false);
  });

  it("rejects an item id repeated across sections", () => {
    const menu = menuWith([1, 1]);
    menu.sections[1].items[0].id = menu.sections[0].items[0].id;
    expect(ok(menu)).toBe(false);
  });

  it("rejects ids outside the allowed format", () => {
    expect(ok(withFirstItem({ id: "Has Space" }))).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(ok(withFirstItem({ name: "" }))).toBe(false);
  });

  it("rejects a name longer than 80 characters", () => {
    expect(ok(withFirstItem({ name: "x".repeat(81) }))).toBe(false);
  });

  it("rejects a description longer than 200 characters", () => {
    expect(ok(withFirstItem({ description: "x".repeat(201) }))).toBe(false);
  });

  it("rejects a section title longer than 60 characters", () => {
    const menu = menuWith([1]);
    menu.sections[0].title = "x".repeat(61);
    expect(ok(menu)).toBe(false);
  });

  it("rejects negative and fractional prices", () => {
    expect(ok(withFirstItem({ priceCents: -1 }))).toBe(false);
    expect(ok(withFirstItem({ priceCents: 1.5 }))).toBe(false);
  });

  it("trims names", () => {
    const parsed = MenuSchema.parse(withFirstItem({ name: "  X-Burguer  " }));
    expect(parsed.sections[0].items[0].name).toBe("X-Burguer");
  });
});

describe("reading stored menus", () => {
  it("reads a missing published menu as null", () => {
    expect(readPublishedMenu(null)).toBeNull();
  });

  it("throws on a corrupt published menu", () => {
    expect(() => readPublishedMenu({ v: 1, sections: "nope" })).toThrow(MenuDataError);
  });

  it("logs which menu was corrupt before throwing", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => readPublishedMenu({ v: 1, sections: "nope" }, "barraca-da-sonia")).toThrow(MenuDataError);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("barraca-da-sonia"), expect.anything());
    log.mockRestore();
  });

  it("counts a corrupt published menu as zero items without throwing", () => {
    expect(publishedItemCount({ v: 1, sections: "nope" })).toBe(0);
  });

  it("counts the items of a valid published menu", () => {
    expect(publishedItemCount(menuWith([3, 2]))).toBe(5);
  });

  it("falls back to the default theme on bad data", () => {
    expect(readMenuTheme({ color: 42 })).toEqual(DEFAULT_MENU_THEME);
  });
});

describe("visibleMenu", () => {
  it("shows the first 20 items on the free plan", () => {
    const cut = visibleMenu(menuWith([15, 10]), false);
    expect(countItems(cut.menu)).toBe(20);
    expect(cut.hidden).toBe(5);
  });

  it("drops a section the cut leaves empty", () => {
    expect(visibleMenu(menuWith([20, 5]), false).menu.sections).toHaveLength(1);
  });

  it("shows everything on Pro", () => {
    expect(visibleMenu(menuWith([15, 10]), true).hidden).toBe(0);
  });
});

describe("effectiveMode and isPublished", () => {
  const cases: [string, number, number, "photos" | "built", boolean][] = [
    ["built", 0, 3, "built", true],
    ["built", 2, 0, "photos", true],
    ["built", 0, 0, "photos", false],
    ["photos", 2, 3, "photos", true],
    ["photos", 0, 3, "built", true],
    ["photos", 0, 0, "photos", false],
    ["garbage", 0, 3, "built", true],
  ];
  for (const [menuMode, imageCount, publishedItemCount, mode, published] of cases) {
    it(`${menuMode} with ${imageCount} images and ${publishedItemCount} items → ${mode}`, () => {
      const r = { menuMode, imageCount, publishedItemCount };
      expect(effectiveMode(r)).toBe(mode);
      expect(isPublished(r)).toBe(published);
    });
  }
});

describe("currency", () => {
  const nb = (s: string) => s.replace(/ /g, " ");

  it("maps Brazil to BRL", () => {
    expect(currencyForCountry("BR")).toBe("BRL");
  });

  it("falls back to USD without a country or for an unknown one", () => {
    expect(currencyForCountry(null)).toBe("USD");
    expect(currencyForCountry("ZZ")).toBe("USD");
  });

  it("formats Brazilian prices in reais", () => {
    expect(nb(formatPrice(2590, "BR"))).toBe("R$ 25,90");
  });

  it("formats prices without a country in dollars", () => {
    expect(nb(formatPrice(2590, null))).toBe("$25.90");
  });
});

describe("headerColors", () => {
  it("keeps a dark color for titles", () => {
    expect(headerColors("#1f2937")).toEqual({ accent: "#1f2937", title: "#1f2937" });
  });

  it("keeps a light color for accents only", () => {
    expect(headerColors("#f9e79f")).toEqual({ accent: "#f9e79f", title: "#1f2937" });
  });
});

describe("menuJsonLd", () => {
  it("describes sections, items and prices", () => {
    expect(menuJsonLd(menuWith([1]), "BR")).toMatchObject({
      "@type": "Menu",
      hasMenuSection: [
        {
          "@type": "MenuSection",
          name: "S1",
          hasMenuItem: [
            {
              "@type": "MenuItem",
              name: "Item 1",
              offers: { "@type": "Offer", price: "10.00", priceCurrency: "BRL" },
            },
          ],
        },
      ],
    });
  });

  it("leaves out offers for an item without a price", () => {
    const ld = menuJsonLd(withFirstItem({ priceCents: null }) as Menu, "BR") as {
      hasMenuSection: { hasMenuItem: Record<string, unknown>[] }[];
    };
    expect(ld.hasMenuSection[0].hasMenuItem[0]).not.toHaveProperty("offers");
  });

  it("leaves out the name of an untitled section", () => {
    const menu = menuWith([1]);
    menu.sections[0].title = null;
    const ld = menuJsonLd(menu, "BR") as { hasMenuSection: Record<string, unknown>[] };
    expect(ld.hasMenuSection[0]).not.toHaveProperty("name");
  });

  it("cannot break out of the script tag through an item name", () => {
    const evil = withFirstItem({ name: "</script><script>alert(1)</script>" }) as Menu;
    expect(jsonLdScript(menuJsonLd(evil, "BR"))).not.toContain("</script");
  });
});

describe("PublishMenuInputSchema", () => {
  const ok = (raw: unknown) => PublishMenuInputSchema.safeParse(raw).success;

  it("accepts a cuid restaurant id with any menu payload", () => {
    expect(ok({ restaurantId: "cmg1abcde0000xyz123456789", menu: {} })).toBe(true);
  });

  it("rejects a missing input", () => {
    expect(ok(undefined)).toBe(false);
  });

  it("rejects a restaurant id that is not a string", () => {
    expect(ok({ restaurantId: { not: "" }, menu: {} })).toBe(false);
  });

  it("rejects a restaurant id that is not a cuid", () => {
    expect(ok({ restaurantId: "nope nope", menu: {} })).toBe(false);
  });
});
