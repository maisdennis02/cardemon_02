import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/i18n/dictionaries/en";
import { DictionaryProvider } from "@/i18n/provider";
import type { Menu, MenuTheme } from "@/lib/menu";
import { BuiltMenu } from "./built-menu";
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
      labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por" }}
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
          labels={{ cardapioDigital: "Cardápio Digital", madeBy: "feito por" }}
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
