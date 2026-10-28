import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import type { Menu, MenuTheme } from "@/lib/menu";
import { PrintSheet, menuBlocks, type PrintBlock } from "./print-sheet";

// One A4 sheet of the printable menu (spec 2026-10-28 §1): the phone header on
// sheet 1, a name strip after, the phone cards, the QR footer on the right.

const blob = "https://abc.public.blob.vercel-storage.com";
const theme: MenuTheme = { color: "#b4532a", headerStyle: "band", logoUrl: `${blob}/logos/ze.webp` };
const menu: Menu = {
  v: 1,
  sections: [
    {
      id: "s1",
      title: "Lanches",
      items: [
        {
          id: "xb",
          name: "X-Burguer",
          description: "Pão brioche e maionese da casa",
          priceCents: 2800,
          photo: { full: `${blob}/item-photos/c1/xb-full.webp`, thumb: `${blob}/item-photos/c1/xb-thumb.webp` },
        },
      ],
    },
    { id: "s2", title: null, items: [{ id: "agua", name: "Água com gás", priceCents: null }] },
  ],
};

const footer = { qrValue: "https://menulala.com/m/ze", line: ptBR.menu.print.footerOrder, madeWith: ptBR.menu.print.madeWith };

function sheet(index: number, blocks: PrintBlock[][] = [menuBlocks(menu)]) {
  return renderToStaticMarkup(
    <PrintSheet
      index={index}
      total={2}
      name="Lanchonete do Zé"
      theme={theme}
      country="BR"
      columns={1}
      scale={1.2}
      blocks={blocks}
      footer={footer}
    />,
  );
}

describe("menuBlocks", () => {
  it("lists titles and items in order, no block for an untitled section", () => {
    expect(menuBlocks(menu).map((b) => `${b.kind}:${b.key}`)).toEqual(["title:s1", "item:xb", "item:agua"]);
  });
});

describe("PrintSheet", () => {
  it("opens sheet 1 with the phone header, name larger, logo kept", () => {
    const html = sheet(0);
    expect(html).toContain("<header");
    expect(html).toContain("text-[44px]");
    expect(html).toContain(`src="${blob}/logos/ze.webp"`);
  });

  it("opens the next sheets with a strip carrying the name, no header", () => {
    const html = sheet(1);
    expect(html).not.toContain("<header");
    expect(html).toContain("Lanchonete do Zé");
  });

  it("puts the QR and the menulala mark on every sheet, on the right", () => {
    for (const i of [0, 1]) {
      const html = sheet(i);
      expect(html).toContain("<svg");
      expect(html).toContain(footer.line);
      expect(html).toContain("menulala.com");
      expect(html).toContain("flex-row-reverse");
    }
  });

  it("draws the photo thumb only for an item that has one", () => {
    const html = sheet(0);
    expect(html).toContain("xb-thumb.webp");
    expect(html.match(/<img/g)).toHaveLength(2); // logo + one thumb
  });

  it("draws an item with no price and no description without empty lines or null", () => {
    const html = sheet(0, [[{ kind: "item", key: "agua", item: menu.sections[1].items[0] }]]);
    expect(html).toContain("Água com gás");
    expect(html).not.toContain("null");
    expect(html).not.toContain("tabular-nums");
  });

  it("has nothing to tap inside the sheet", () => {
    const html = sheet(0);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("scales the columns, not the header", () => {
    const html = sheet(0);
    expect(html).toMatch(/zoom:1\.2/);
    expect(html).toContain('class="print-page');
  });
});
