import { describe, expect, it, vi } from "vitest";
import { jsonLdScript } from "@/lib/json-ld";
import {
  DEFAULT_MENU_THEME,
  MenuDataError,
  PublishMenuInputSchema,
  MenuSchema,
  MenuThemeSchema,
  MenuVisualInputSchema,
  MENU_FONTS,
  menuFontFamilies,
  isOwnLogoUrl,
  uploadRulesFor,
  countItems,
  currencyForCountry,
  dropEmptySections,
  effectiveMode,
  formatPrice,
  headerColors,
  isPublished,
  menuJsonLd,
  publishedItemCount,
  readMenuTheme,
  readPublishedMenu,
  visibleMenu,
  publicMenu,
  printableMenu,
  ITEM_PHOTO_MAX_BYTES,
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

  it("accepts an optional WhatsApp number typed on the preview", () => {
    expect(ok({ restaurantId: "cmg1abcde0000xyz123456789", menu: {}, whatsappNumber: "11 91234-5678" })).toBe(true);
  });

  it("rejects a WhatsApp number longer than the field allows", () => {
    expect(ok({ restaurantId: "cmg1abcde0000xyz123456789", menu: {}, whatsappNumber: "1".repeat(31) })).toBe(false);
  });
});

describe("MenuThemeSchema", () => {
  const blob = "https://abc.public.blob.vercel-storage.com";
  const theme = (patch: Record<string, unknown>) =>
    MenuThemeSchema.safeParse({ color: "#a1b2c3", headerStyle: "centered", ...patch }).success;

  it("accepts a logo under our Blob logos/ path", () => {
    expect(theme({ logoUrl: `${blob}/logos/ckabc123/logo-x.png` })).toBe(true);
  });

  it("rejects a logo from another host, another scheme or another Blob folder", () => {
    expect(theme({ logoUrl: "https://evil.com/logos/x/a.png" })).toBe(false);
    expect(theme({ logoUrl: "javascript:alert(1)" })).toBe(false);
    expect(theme({ logoUrl: `${blob}/menu-pages/ckabc123/a.png` })).toBe(false);
  });

  it("takes six-digit hex colors only", () => {
    expect(theme({ color: "#a1b2c3" })).toBe(true);
    expect(theme({ color: "red" })).toBe(false);
    expect(theme({ color: "#fff" })).toBe(false);
  });
});

describe("stage A follow-ups", () => {
  it("puts only the visible items in the JSON-LD", () => {
    const ld = menuJsonLd(visibleMenu(menuWith([15, 10]), false).menu, "BR");
    expect(JSON.stringify(ld).match(/"MenuItem"/g)).toHaveLength(20);
  });

  it("falls back to the default dark tone for a non-hex color", () => {
    expect(headerColors("red")).toEqual({ accent: "#1f2937", title: "#1f2937" });
  });

  it("reads a missing theme as the default", () => {
    expect(readMenuTheme(null)).toEqual(DEFAULT_MENU_THEME);
  });

  it("does not mutate the menu it cuts", () => {
    const menu = menuWith([15, 10]);
    const before = structuredClone(menu);
    visibleMenu(menu, false);
    expect(menu).toEqual(before);
  });
});

describe("logo ownership and upload rules", () => {
  const blob = "https://abc.public.blob.vercel-storage.com";

  it("recognizes a logo of this restaurant only", () => {
    expect(isOwnLogoUrl(`${blob}/logos/ckabc123/logo-x.png`, "ckabc123")).toBe(true);
    expect(isOwnLogoUrl(`${blob}/logos/ckother9/logo-x.png`, "ckabc123")).toBe(false);
    expect(isOwnLogoUrl(`${blob}/menu-pages/ckabc123/a.png`, "ckabc123")).toBe(false);
    expect(isOwnLogoUrl("https://evil.com/logos/ckabc123/a.png", "ckabc123")).toBe(false);
  });

  it("caps logos at 2 MB and menu pages at 10 MB, inside the restaurant's folder", () => {
    expect(uploadRulesFor("logos/abc/x.png", "abc")?.maxBytes).toBe(2 * 1024 * 1024);
    expect(uploadRulesFor("logos/abc/x.png", "abc")?.types).not.toContain("image/gif");
    expect(uploadRulesFor("menu-pages/abc/x.png", "abc")?.maxBytes).toBe(10 * 1024 * 1024);
  });

  it("refuses any other path", () => {
    expect(uploadRulesFor("logos/other/x.png", "abc")).toBeNull();
    expect(uploadRulesFor("../x", "abc")).toBeNull();
    expect(uploadRulesFor("logos/abc/../other/x.png", "abc")).toBeNull();
    expect(uploadRulesFor("x.png", "abc")).toBeNull();
  });
});

describe("MenuVisualInputSchema", () => {
  const input = (country: string) => ({
    restaurantId: "ckabc1234567890abcdefghij",
    country,
    theme: { color: "#a1b2c3", headerStyle: "band" },
  });

  it("takes a supported country only", () => {
    expect(MenuVisualInputSchema.safeParse(input("BR")).success).toBe(true);
    expect(MenuVisualInputSchema.safeParse(input("XX")).success).toBe(false);
  });
});

describe("menu fonts", () => {
  const theme = (font: unknown) =>
    MenuThemeSchema.safeParse({ color: "#a1b2c3", headerStyle: "centered", font }).success;

  it("accepts the offered fonts, and no font at all", () => {
    for (const font of MENU_FONTS) expect(theme(font)).toBe(true);
    expect(MenuThemeSchema.safeParse({ color: "#a1b2c3", headerStyle: "centered" }).success).toBe(true);
  });

  it("rejects any other font", () => {
    expect(theme("comic-sans")).toBe(false);
  });

  it("keeps the original look by default: serif name, page font for the items", () => {
    expect(menuFontFamilies(undefined)).toEqual({ body: undefined, title: expect.stringContaining("serif") });
    expect(menuFontFamilies("default")).toEqual(menuFontFamilies(undefined));
  });

  it("uses one family for the whole menu otherwise", () => {
    for (const font of MENU_FONTS.filter((f) => f !== "default")) {
      const { body, title } = menuFontFamilies(font);
      expect(body).toBeTruthy();
      expect(title).toBe(body);
    }
  });
});

describe("prices in each country's own format", () => {
  const nb = (s: string) => s.replace(/ /g, " ");
  it("writes Mexican pesos the Mexican way", () => {
    expect(nb(formatPrice(8500, "MX"))).toBe("$85.00");
  });
  it("keeps reais and dollars as before", () => {
    expect(nb(formatPrice(2590, "BR"))).toBe("R$ 25,90");
    expect(nb(formatPrice(1250, "US"))).toBe("$12.50");
  });
});

describe("dropEmptySections", () => {
  it("removes sections with no items, keeping order", () => {
    const out = dropEmptySections(menuWith([2, 0, 1]));
    expect(out.sections.map((s) => s.id)).toEqual(["s1", "s3"]);
  });

  it("returns the same menu when nothing is empty", () => {
    const menu = menuWith([2, 1]);
    expect(dropEmptySections(menu)).toBe(menu);
  });
});

describe("item photos", () => {
  const blob = "https://abc.public.blob.vercel-storage.com";
  const photo = {
    full: `${blob}/item-photos/ckabc123/i1-full-x1.webp`,
    thumb: `${blob}/item-photos/ckabc123/i1-thumb-x1.webp`,
  };

  function menuWithPhotos(counts: number[]): Menu {
    const menu = menuWith(counts);
    return {
      ...menu,
      sections: menu.sections.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, photo })) })),
    };
  }

  it("accepts an item photo on our Blob host", () => {
    const parsed = MenuSchema.safeParse(withFirstItem({ photo }));
    expect(parsed.success && parsed.data.sections[0].items[0].photo).toEqual(photo);
  });

  it("refuses a photo URL outside item-photos/", () => {
    expect(ok(withFirstItem({ photo: { ...photo, full: `${blob}/logos/ckabc123/a.webp` } }))).toBe(false);
    expect(ok(withFirstItem({ photo: { ...photo, thumb: "https://evil.example/x.webp" } }))).toBe(false);
    expect(ok(withFirstItem({ photo: { full: photo.full } }))).toBe(false);
  });

  it("still accepts items with no photo", () => {
    expect(ok(menuWith([3]))).toBe(true);
  });

  it("publicMenu strips photos for free owners and keeps them for Pro", () => {
    const menu = menuWithPhotos([2, 1]);
    const free = publicMenu(menu, false);
    expect(free.sections.flatMap((s) => s.items).every((i) => i.photo === undefined)).toBe(true);
    expect(publicMenu(menu, true)).toEqual(menu);
  });

  it("publicMenu still applies the free item cut", () => {
    expect(countItems(publicMenu(menuWithPhotos([15, 10]), false))).toBe(20);
    expect(countItems(publicMenu(menuWithPhotos([15, 10]), true))).toBe(25);
  });

  it("upload rules: item-photos/ in the restaurant's own folder, 512 KB, webp or jpeg", () => {
    const rules = uploadRulesFor("item-photos/abc/i1-full.webp", "abc");
    expect(rules?.maxBytes).toBe(512 * 1024);
    expect(ITEM_PHOTO_MAX_BYTES).toBe(512 * 1024);
    expect(rules?.types).toEqual(["image/webp", "image/jpeg"]);
    expect(uploadRulesFor("item-photos/other/i1-full.webp", "abc")).toBeNull();
    expect(uploadRulesFor("item-photos/abc/../other/x.webp", "abc")).toBeNull();
  });
});

// What /m/<slug>/print may show (spec 2026-10-26): only a published text
// menu, and the same items the public page shows.
describe("printableMenu", () => {
  const items = (n: number): Menu => ({
    v: 1,
    sections: [{ id: "s1", title: null, items: Array.from({ length: n }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, priceCents: 100 })) }],
  });
  const row = (over: Partial<{ menuMode: string; imageCount: number; menuPublished: unknown; pro: boolean }>) => ({
    menuMode: "built",
    imageCount: 0,
    menuPublished: items(3),
    pro: false,
    ...over,
  });

  it("is null for a photo menu", () => {
    expect(printableMenu(row({ menuMode: "photos", imageCount: 2 }), "x")).toBeNull();
  });

  it("is null when no text menu is published", () => {
    expect(printableMenu(row({ menuPublished: null }), "x")).toBeNull();
  });

  it("cuts a free menu at the same 20 items as the public page", () => {
    expect(countItems(printableMenu(row({ menuPublished: items(25) }), "x"))).toBe(20);
  });

  it("prints every item on Pro", () => {
    expect(countItems(printableMenu(row({ menuPublished: items(25), pro: true }), "x"))).toBe(25);
  });
});
