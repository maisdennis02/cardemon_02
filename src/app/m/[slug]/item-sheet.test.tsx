import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { MenuItem } from "@/lib/menu";
import { ItemSheet } from "./item-sheet";

// The sheet a tap on an item opens (spec 2026-10-25 §4): the big photo, the
// whole description, and — with ordering on — quantity and add.

const blob = "https://abc.public.blob.vercel-storage.com/item-photos/ckr1";
const xb: MenuItem = {
  id: "xb",
  name: "X-Burguer",
  description: "Pão brioche, hambúrguer de 150 g, queijo prato e maionese da casa.",
  priceCents: 2800,
  photo: { full: `${blob}/xb-full.webp`, thumb: `${blob}/xb-thumb.webp` },
};

const render = (item: MenuItem, onAdd?: (qty: number, opts: string[]) => void, initialOpts?: string[]) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <ItemSheet item={item} country="BR" accent="#b4532a" onClose={() => {}} onAdd={onAdd} initialOpts={initialOpts} />
    </DictionaryProvider>,
  );

describe("ItemSheet", () => {
  it("is a modal dialog with the full photo, the name, the description and a close button", () => {
    const html = render(xb, () => {});
    expect(html).toMatch(/role="dialog"[^>]*aria-modal="true"|aria-modal="true"[^>]*role="dialog"/);
    expect(html).toMatch(/<img[^>]*src="[^"]*xb-full\.webp"/);
    expect(html).toContain("X-Burguer");
    expect(html).toContain("maionese da casa");
    expect(html).toContain(`aria-label="${ptBR.menu.order.close}"`);
  });

  it("with ordering on, starts at 1 and adds for the item's price", () => {
    const html = render(xb, () => {});
    expect(html).toMatch(/>1</);
    expect(html).toContain("Adicionar");
    expect(html).toMatch(/R\$\s28,00/);
  });

  it("without ordering, shows no quantity and no add button", () => {
    const html = render(xb);
    expect(html).not.toContain("Adicionar");
    expect(html).not.toContain(ptBR.menu.order.more);
  });

  it("opens for an item without a photo, with no image", () => {
    expect(render({ ...xb, photo: undefined }, () => {})).not.toContain("<img");
  });

  describe("with option groups", () => {
    const burger: MenuItem = {
      id: "bg",
      name: "Burger",
      priceCents: 2000,
      groups: [
        { id: "size", title: "Tamanho", min: 1, max: 1, options: [{ id: "a", name: "Simples", priceCents: 0 }, { id: "b", name: "Duplo", priceCents: 800 }] },
        { id: "extra", title: "Extras", min: 0, max: 3, options: [{ id: "c", name: "Cheddar", priceCents: 250 }, { id: "d", name: "Bacon", priceCents: 300 }] },
      ],
    };

    it("shows the pickers and the live total on the add button", () => {
      const html = render(burger, () => {}, ["b", "d"]);
      expect(html).toContain("Tamanho");
      expect(html).toContain('type="radio"');
      expect(html).toMatch(/R\$\s31,00/);
    });

    // Final review #5: no bare base price on the button before a required choice.
    const pizza: MenuItem = {
      id: "pz",
      name: "Pizza",
      priceCents: 0,
      groups: [{ id: "size", title: "Tamanho", min: 1, max: 1, options: [{ id: "m", name: "Média", priceCents: 2000 }, { id: "g", name: "Grande", priceCents: 2800 }] }],
    };
    const addButton = (html: string) => html.match(/<button[^>]*><span>Adicionar<\/span>[\s\S]*?<\/button>/)?.[0] ?? "";

    it("shows no amount on the add button until the required choice is made", () => {
      const html = render(pizza, () => {}, []);
      expect(addButton(html)).not.toBe("");
      expect(addButton(html)).not.toContain("R$");
      expect(html).not.toMatch(/R\$\s0,00/);
    });

    it("shows the exact total once the selection is valid", () => {
      expect(addButton(render(pizza, () => {}, ["g"]))).toMatch(/R\$\s28,00/);
      expect(addButton(render(burger, () => {}, ["a"]))).toMatch(/R\$\s20,00/);
    });

    it("without ordering, lists the groups with no inputs", () => {
      const html = render(burger);
      expect(html).toContain("Duplo");
      expect(html).not.toContain("<input");
    });
  });
});

describe("ItemSheet headline", () => {
  it("matches the card: base plus the required choice when all options cost the same", () => {
    const item: MenuItem = {
      id: "p",
      name: "Pizza",
      priceCents: 2000,
      groups: [
        {
          id: "g",
          title: "Borda",
          min: 1,
          max: 1,
          options: [
            { id: "a", name: "Catupiry", priceCents: 300 },
            { id: "b", name: "Cheddar", priceCents: 300 },
          ],
        },
      ],
    };
    const html = render(item, () => {});
    expect(html).toMatch(/text-lg font-semibold tabular-nums">R\$\s23,00</);
  });
});
