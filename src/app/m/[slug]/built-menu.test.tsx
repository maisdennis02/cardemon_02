import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/i18n/dictionaries/en";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import { menuJsonLd, publicMenu, type Menu, type MenuTheme } from "@/lib/menu";
import { BuiltMenu, BuiltMenuHeader } from "./built-menu";
import { OrderableItem, OrderableMenu } from "./order/orderable-menu";

// The text menu's layout (2026-10-22): each item is a card that reads name,
// description, price, top to bottom — the price is never a right-hand column
// the diner scans first. With three or more titled sections a row of chips
// links to each section.

const theme: MenuTheme = { color: "#c84630", headerStyle: "band" };

const section = (id: string, title: string | null, items: Menu["sections"][number]["items"]) => ({ id, title, items });
const item = (id: string, name: string, priceCents: number | null, description?: string) => ({
  id,
  name,
  priceCents,
  description,
});

const twoSections: Menu = {
  v: 1,
  sections: [
    section("lanches", "Lanches", [item("xb", "X-Burguer", 2590, "Pão, carne, queijo e salada."), item("bf", "Batata frita", 1890)]),
    section("bebidas", "Bebidas", [item("coca", "Coca-Cola lata", 790)]),
  ],
};

const fourSections: Menu = {
  v: 1,
  sections: [
    ...twoSections.sections,
    section("porcoes", "Porções", [item("fp", "Frango a passarinho", 4200)]),
    section("extra", null, [item("x", "Sem título", 100)]),
    section("sobremesas", "Sobremesas", [item("pudim", "Pudim", 1200)]),
  ],
};

function renderStatic(menu: Menu): string {
  return renderToStaticMarkup(
    <BuiltMenu
      slug="x"
      name="Seu Restaurante"
      country="BR"
      theme={theme}
      menu={menu}
      labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por", fromPrice: "a partir de {price}" }}
      actions={null}
    />,
  );
}

function renderOrdering(menu: Menu): string {
  return renderToStaticMarkup(
    <DictionaryProvider locale="en" dictionary={en}>
      <OrderableMenu
        slug="x"
        restaurantName="Seu Restaurante"
        country="BR"
        whatsappNumber="5511999999999"
        menu={menu}
        accent="#c84630"
        titleColor="#a8371f"
      />
    </DictionaryProvider>,
  );
}

const listItem = (html: string, n: number): string => (html.match(/<li\b[\s\S]*?<\/li>/g) ?? [])[n] ?? "";

function readsTopToBottom(li: string, ...parts: string[]) {
  const positions = parts.map((p) => li.indexOf(p));
  expect(positions, `${parts.join(" → ")} in ${li}`).toEqual([...positions].sort((a, b) => a - b));
  expect(positions.every((p) => p >= 0), li).toBe(true);
}

describe("item card", () => {
  it("reads name, then description, then price on the static page", () => {
    const html = renderStatic(twoSections);
    readsTopToBottom(listItem(html, 0), "X-Burguer", "Pão, carne, queijo e salada.", "25,90");
    readsTopToBottom(listItem(html, 1), "Batata frita", "18,90");
  });

  it("reads the same way with ordering on, with the add control after the price", () => {
    readsTopToBottom(listItem(renderOrdering(twoSections), 0), "X-Burguer", "Pão, carne, queijo e salada.", "25,90", ">+<");
  });
});

describe("section chips", () => {
  it("are absent with fewer than three titled sections", () => {
    expect(renderStatic(twoSections)).not.toContain("<nav");
  });

  it("link to every titled section, skipping the untitled one", () => {
    const html = renderStatic(fourSections);
    const nav = html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0];
    expect(nav).toBeDefined();
    const hrefs = [...nav!.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["#lanches", "#bebidas", "#porcoes", "#sobremesas"]);
    for (const title of ["Lanches", "Bebidas", "Porções", "Sobremesas"]) expect(nav).toContain(title);
  });

  it("every section carries its id as the anchor, on both renderers", () => {
    for (const html of [renderStatic(fourSections), renderOrdering(fourSections)]) {
      for (const id of ["lanches", "bebidas", "porcoes", "sobremesas"]) {
        expect(html).toMatch(new RegExp(`<section[^>]*\\bid="${id}"`));
      }
    }
  });

  it("also show with ordering on, once per page", () => {
    // The chips belong to the page, not to the list: BuiltMenu renders them
    // above whichever list it picks.
    const html = renderToStaticMarkup(
      <DictionaryProvider locale="en" dictionary={en}>
        <BuiltMenu
          slug="x"
          name="Seu Restaurante"
          country="BR"
          theme={theme}
          menu={fourSections}
          labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por", fromPrice: "a partir de {price}" }}
          actions={null}
          ordering={{ whatsappNumber: "5511999999999", demo: true }}
        />
      </DictionaryProvider>,
    );
    expect(html.match(/<nav\b/g)).toHaveLength(1);
  });
});

describe("an item already in the order", () => {
  // 2026-10-23: with the card layout the ± control had been left hanging
  // under the price line, next to a badge repeating the same count.
  const render = (qty: number) =>
    renderToStaticMarkup(
      <DictionaryProvider locale="en" dictionary={en}>
        <OrderableItem
          item={item("xb", "X-Burguer", 2590, "Pão, carne, queijo e salada.")}
          qty={qty}
          country="BR"
          accent="#c84630"
          onAdd={() => {}}
          onQty={() => {}}
        />
      </DictionaryProvider>,
    );

  it("shows its count once, on the price line, between − and +", () => {
    const li = render(2);
    // One count, not a badge plus a control repeating it.
    expect(li.match(/>2</g)).toHaveLength(1);
    expect(li).toContain("−");
    expect(li).toContain(">+<");
    // The control sits on the price line, inside the card's padding, with
    // room between the buttons and the number.
    expect(li).toMatch(/class="absolute bottom-3 right-4"/);
    expect(li).toMatch(/class="flex items-center justify-end gap-4"/);
    // And the price line keeps its width clear of the control.
    expect(li).toMatch(/w-\[7\.5rem\]/);
  });

  it("shows the plain + when it is not in the order", () => {
    const li = render(0);
    expect(li).toContain(">+<");
    expect(li).not.toContain("−");
  });
});

describe("item photos (2026-10-25)", () => {
  const blob = "https://abc.public.blob.vercel-storage.com/item-photos/ckr1";
  const photo = { full: `${blob}/xb-full.webp`, thumb: `${blob}/xb-thumb.webp` };
  const withPhotos: Menu = {
    v: 1,
    sections: [
      section("lanches", "Lanches", [
        { ...item("xb", "X-Burguer", 2590, "Pão, carne, queijo e salada."), photo },
        item("bf", "Batata frita", 1890),
      ]),
    ],
  };

  const renderStaticWithProvider = (menu: Menu) =>
    renderToStaticMarkup(
      <DictionaryProvider locale="en" dictionary={en}>
        <BuiltMenu
          slug="x"
          name="Seu Restaurante"
          country="BR"
          theme={theme}
          menu={menu}
          labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por", fromPrice: "a partir de {price}" }}
          actions={null}
        />
      </DictionaryProvider>,
    );

  it("puts the thumb on the card, 96 px, lazy, named after the item", () => {
    const li = listItem(renderStaticWithProvider(withPhotos), 0);
    expect(li).toMatch(/<img[^>]*src="[^"]*xb-thumb\.webp"/);
    expect(li).toMatch(/<img[^>]*alt="X-Burguer"/);
    expect(li).toMatch(/<img[^>]*width="96"[^>]*height="96"/);
    expect(li).toMatch(/<img[^>]*loading="lazy"/);
  });

  it("leaves a card without a photo exactly as before", () => {
    expect(listItem(renderStaticWithProvider(withPhotos), 1)).not.toContain("<img");
    expect(renderStatic(twoSections)).not.toContain("<img");
  });

  it("on the static page, only a card with a photo opens the sheet", () => {
    const html = renderStaticWithProvider(withPhotos);
    expect(listItem(html, 0)).toContain('aria-haspopup="dialog"');
    expect(listItem(html, 1)).not.toContain("<button");
  });

  it("shows no photo, and no JSON-LD image, when the owner is not Pro", () => {
    const free = publicMenu(withPhotos, false);
    expect(renderStaticWithProvider(free)).not.toContain("<img");
    expect(JSON.stringify(menuJsonLd(free, "BR"))).not.toContain('"image"');
  });

  it("puts the full photo in the JSON-LD on Pro", () => {
    expect(JSON.stringify(menuJsonLd(publicMenu(withPhotos, true), "BR"))).toContain(photo.full);
  });

  it("with ordering on, the card opens the item and a separate + adds it", () => {
    const li = listItem(renderOrdering(withPhotos), 0);
    expect(li).toContain('aria-label="See X-Burguer"');
    expect(li).toContain('aria-haspopup="dialog"');
    expect(li).toContain('aria-label="Add X-Burguer to the order"');
    // Two buttons side by side, never one inside the other.
    expect(li).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
  });

  it("with ordering on, an item without a photo also opens the sheet and keeps its + on the price line", () => {
    const li = listItem(renderOrdering(withPhotos), 1);
    expect(li).toContain('aria-haspopup="dialog"');
    // The "+" is its own button now, in the spot the ± control takes.
    expect(li).toMatch(/<button[^>]*aria-label="Add Batata frita to the order"[^>]*class="absolute [^"]*bottom-3 right-4/);
    // 2026-11-08 (review of PR #9): the price line keeps one height whether
    // the item is in the order or not, so adding never moves the list.
    expect(li).toContain("min-h-[2em]");
  });

  // Review of 2026-10-25: next to a photo the text column is ~186 px on a
  // 360 px phone, too narrow for the price plus the ± control.
  it("puts the ± of a photo card in the order on its own row, not over the price", () => {
    const li = renderToStaticMarkup(
      <DictionaryProvider locale="en" dictionary={en}>
        <OrderableItem
          item={{ ...item("xb", "X-Burguer", 2590, "Pão, carne, queijo e salada."), photo }}
          qty={2}
          country="BR"
          accent="#c84630"
          onAdd={() => {}}
          onQty={() => {}}
        />
      </DictionaryProvider>,
    );
    expect(li).not.toMatch(/right-\[7\.75rem\]/);
    expect(li).not.toMatch(/w-\[7\.5rem\]/);
    expect(li).toMatch(/class="mt-2 flex justify-end"/);
    expect(li.match(/>2</g)).toHaveLength(1);
  });
});


// Option groups (2026-11-02): the card shows the cheapest valid price, the "+"
// opens the sheet, and the count replaces the ±.
describe("items with option groups", () => {
  const opt = (id: string, name: string, priceCents: number) => ({ id, name, priceCents });
  const sizes = {
    id: "g1",
    title: "Tamanho",
    min: 1,
    max: 1,
    options: [opt("s", "Simples", 0), opt("d", "Duplo", 600)],
  };
  const extras = { id: "g2", title: "Extras", min: 0, max: 3, options: [opt("b", "Bacon", 300)] };
  const grouped = (groups: NonNullable<Menu["sections"][number]["items"][number]["groups"]>) => ({
    ...item("xb", "X-Burguer", 2000),
    groups,
  });
  const plain = (x: Menu["sections"][number]["items"][number], qty = 0) =>
    renderToStaticMarkup(
      <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
        <OrderableItem item={x} qty={qty} country="BR" accent="#c84630" onAdd={() => {}} onQty={() => {}} />
      </DictionaryProvider>,
    );

  it("says 'a partir de' only when a required group can change the price", () => {
    expect(plain(grouped([sizes]))).toContain("a partir de R$");
    expect(plain(grouped([extras]))).not.toContain("a partir de");
    expect(plain(grouped([extras]))).toMatch(/R\$\s20,00/);
  });

  it("uses the from-price on the static page too, plain and with a photo", () => {
    const photo = { full: "https://x.public.blob.vercel-storage.com/a-full.webp", thumb: "https://x.public.blob.vercel-storage.com/a-thumb.webp" };
    const menu: Menu = { v: 1, sections: [section("a", "A", [grouped([sizes]), { ...grouped([sizes]), id: "p", photo }])] };
    const html = renderToStaticMarkup(
      <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
        <BuiltMenu
          slug="x"
          name="R"
          country="BR"
          theme={theme}
          menu={menu}
          labels={{ cardapioDigital: "C", madeBy: "m", fromPrice: ptBR.menu.order.fromPrice }}
          actions={null}
        />
      </DictionaryProvider>,
    );
    expect(html.match(/a partir de/g)).toHaveLength(2);
  });

  // Final review #3: read-only menus list the groups as information (spec §2).
  const staticMenu = (preview: boolean) =>
    renderToStaticMarkup(
      <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
        <BuiltMenu
          slug="x"
          name="R"
          country="BR"
          theme={theme}
          menu={{ v: 1, sections: [section("a", "A", [grouped([sizes, extras]), item("agua", "Água", 500)])] }}
          labels={{ cardapioDigital: "C", madeBy: "m", fromPrice: ptBR.menu.order.fromPrice }}
          actions={null}
          preview={preview}
        />
      </DictionaryProvider>,
    ).replace(/&nbsp;|\u00a0/g, " ");

  it("lists the groups on a static page without WhatsApp", () => {
    const html = staticMenu(false);
    readsTopToBottom(listItem(html, 0), "X-Burguer", "Tamanho: Simples · Duplo +R$ 6,00", "Extras: Bacon +R$ 3,00", "a partir de R$");
    expect(listItem(html, 1)).not.toContain(":");
  });

  it("lists the groups in the dashboard preview too", () => {
    expect(listItem(staticMenu(true), 0)).toContain("Tamanho: Simples · Duplo +R$ 6,00");
  });

  it("opens the sheet from the + instead of adding, and counts instead of ±", () => {
    const html = plain(grouped([sizes]), 3);
    // The card and the + both open the dialog.
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(html).toContain("3 no pedido");
    expect(html).not.toContain("−");
  });

  it("keeps the direct + and ± for items without groups", () => {
    expect(plain(item("a", "A", 100)).match(/aria-haspopup="dialog"/g)).toHaveLength(1);
    const html = plain(item("a", "A", 100), 2);
    expect(html).toContain("−");
    expect(html).not.toMatch(/>2 no pedido</);
  });
});

// 2026-11-06 (plans/2026-11-06-cardapio-visual-novo.md): a compact list, a
// band that says the restaurant's name, address and hours under the name,
// and the "poster" style.
describe("visual of 2026-11-06", () => {
  const render = (patch: Partial<MenuTheme>, info?: { address: string | null; hours: string | null }) =>
    renderToStaticMarkup(
      <BuiltMenu
        slug="x"
        name="Tony's Lanches"
        country="BR"
        theme={{ ...theme, ...patch }}
        menu={twoSections}
        labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por", fromPrice: "a partir de {price}" }}
        actions={null}
        info={info}
      />,
    );

  it("fills the band with the restaurant's name, hidden from screen readers", () => {
    const html = render({ headerStyle: "band" });
    const texture = html.match(/<div[^>]*class="menu-texture[^"]*"[^>]*>[\s\S]*?<\/div><\/div>/)?.[0] ?? "";
    expect(texture).toContain('aria-hidden="true"');
    expect((texture.match(/Tony&#x27;s Lanches/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("draws no texture on the simple header", () => {
    expect(render({ headerStyle: "centered" })).not.toContain("menu-texture");
  });

  it("shows the address as a link to the map, and the hours, under the name", () => {
    const html = render({}, { address: "Rua Maria Scomparim, 261 - Boituva", hours: "Terça a domingo, 18h às 23h30" });
    expect(html).toMatch(/<a[^>]*href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=Rua%20Maria[^"]*"[^>]*target="_blank"/);
    expect(html).toContain("Terça a domingo, 18h às 23h30");
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("Terça a domingo"));
  });

  it("shows neither when the restaurant has none", () => {
    expect(render({}, { address: null, hours: null })).not.toContain("google.com/maps");
  });

  it("lists each section's items in one panel, with descriptions cut at two lines", () => {
    const html = render({});
    expect(html.match(/<ul[^>]*class="[^"]*menu-list/g)).toHaveLength(2);
    expect(listItem(html, 0)).toMatch(/line-clamp-2[^>]*>Pão, carne, queijo e salada\./);
  });

  it("poster: a dark page, sections on a band of the color, prices on a tag", () => {
    const html = render({ style: "poster", color: "#fcc707" });
    expect(html).toMatch(/class="[^"]*\bmenu-poster\b/);
    expect(html).toContain("background-color:#141414");
    expect(html).toMatch(/<h2[^>]*style="[^"]*background:#fcc707;color:#141414/);
    expect(listItem(html, 0)).toMatch(/class="[^"]*menu-price[^"]*"[^>]*>R\$/);
  });

  it("light stays light, on the chosen background", () => {
    const html = render({ style: "light", background: "paper" });
    expect(html).not.toMatch(/class="[^"]*\bmenu-poster\b/);
  });
});

// Review of 2026-11-06: what the poster style and the band must not break.
describe("visual of 2026-11-06, review fixes", () => {
  const renderWith = (patch: Partial<MenuTheme>, menu: Menu = twoSections, name = "Tony's Lanches") =>
    renderToStaticMarkup(
      <DictionaryProvider locale="en" dictionary={en}>
        <BuiltMenu
          slug="x"
          name={name}
          country="BR"
          theme={{ ...theme, ...patch }}
          menu={menu}
          labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por", fromPrice: "a partir de {price}" }}
          actions={null}
          ordering={{ whatsappNumber: "5511999999999" }}
        />
      </DictionaryProvider>,
    );

  it("poster with a dark color draws the + in a color that reads on the dark page", () => {
    const html = renderWith({ style: "poster", color: "#1f2937" });
    expect(html).toMatch(/<button[^>]*aria-label="Add X-Burguer to the order"[^>]*style="background:#ffffff;color:#141414"/);
  });

  it("writes the + in dark text on a light color, white on a dark one", () => {
    expect(renderWith({ color: "#fcc707" })).toMatch(/aria-label="Add X-Burguer to the order"[^>]*style="background:#fcc707;color:#141414"/);
    expect(renderWith({ color: "#c84630" })).toMatch(/aria-label="Add X-Burguer to the order"[^>]*style="background:#c84630;color:#ffffff"/);
  });

  it("repeats a short name enough to fill the band", () => {
    const html = renderWith({ headerStyle: "band" }, twoSections, "Nil's");
    const firstLine = html.match(/class="menu-texture[\s\S]*?<div[^>]*><div[^>]*>([^<]*)</)?.[1] ?? "";
    expect((firstLine.match(/Nil&#x27;s/g) ?? []).length).toBeGreaterThanOrEqual(12);
  });

  it("gives the stuck section chips the page's own color", () => {
    expect(renderWith({ style: "poster" }, fourSections)).toMatch(/<nav[^>]*style="background-color:#141414/);
    expect(renderWith({ background: "plain" }, fourSections)).toMatch(/<nav[^>]*style="background-color:#/);
  });

  it("keeps the white circle of the + on a photo in the poster style", () => {
    const css = readFileSync(join(__dirname, "built-menu.css"), "utf8");
    expect(css).toMatch(/\.menu-poster \.menu-add:not\(\.bg-white\)/);
  });
});

// 2026-11-07: on the light style the band is shorter, so more items fit on
// the first screen; the poster keeps its tall band.
describe("band height", () => {
  const band = (style?: "poster") =>
    renderToStaticMarkup(<BuiltMenuHeader name="Casa" theme={{ color: "#c8102e", headerStyle: "band", style }} />);
  it("is 96 px on light and 128 px on the poster", () => {
    expect(band()).toMatch(/class="relative mb-12 h-24"/);
    expect(band("poster")).toMatch(/class="relative mb-12 h-32"/);
  });
});
