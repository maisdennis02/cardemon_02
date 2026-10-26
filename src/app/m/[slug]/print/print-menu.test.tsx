import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { Menu, MenuTheme } from "@/lib/menu";
import { PrintMenu } from "./print-menu";

// The printable sheet (spec 2026-10-26): the menu in two columns, no photos,
// and a footer with a QR to the online menu and the menulala mark.

const blob = "https://abc.public.blob.vercel-storage.com";
const theme: MenuTheme = { color: "#b4532a", headerStyle: "centered" };
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
          photo: { full: `${blob}/item-photos/ckr1/xb-full.webp`, thumb: `${blob}/item-photos/ckr1/xb-thumb.webp` },
        },
      ],
    },
    { id: "s2", title: null, items: [{ id: "agua", name: "Água com gás", priceCents: null }] },
  ],
};

function render(opts: { theme?: MenuTheme; menu?: Menu; hasWhatsapp?: boolean; locale?: "pt-BR" | "es" } = {}) {
  const dict = opts.locale === "es" ? es : ptBR;
  return renderToStaticMarkup(
    <DictionaryProvider locale={opts.locale ?? "pt-BR"} dictionary={dict}>
      <PrintMenu
        slug="lanchonete-do-ze"
        name="Lanchonete do Zé"
        country={opts.locale === "es" ? "AR" : "BR"}
        theme={opts.theme ?? theme}
        menu={opts.menu ?? menu}
        hasWhatsapp={opts.hasWhatsapp ?? true}
        labels={dict.menu.print}
      />
    </DictionaryProvider>,
  );
}

describe("PrintMenu", () => {
  it("prints the name, the sections and each item with its price and description", () => {
    const html = render();
    expect(html).toContain("Lanchonete do Zé");
    expect(html).toContain("Lanches");
    expect(html).toContain("X-Burguer");
    expect(html).toContain("maionese da casa");
    expect(html).toMatch(/R\$\s28,00/);
  });

  it("prints an item without a price and a section without a title, with no null", () => {
    const html = render();
    expect(html).toContain("Água com gás");
    expect(html).not.toContain("null");
  });

  it("draws no item photo even when the item has one", () => {
    const html = render();
    expect(html).not.toContain("xb-full");
    expect(html).not.toContain("xb-thumb");
  });

  it("puts a QR and the menulala mark in the footer", () => {
    const html = render();
    expect(html).toContain("<svg");
    expect(html).toContain(ptBR.menu.print.madeWith);
    expect(html).toContain("menulala.com");
  });

  it("says pedido pelo WhatsApp only when the restaurant has WhatsApp", () => {
    expect(render()).toContain(ptBR.menu.print.footerOrder);
    const without = render({ hasWhatsapp: false });
    expect(without).toContain(ptBR.menu.print.footerNoOrder);
    expect(without).not.toContain(ptBR.menu.print.footerOrder);
  });

  it("shows the logo only when there is one", () => {
    expect(render()).not.toContain("<img");
    const logo = `${blob}/logos/ckr1/logo.webp`;
    expect(render({ theme: { ...theme, logoUrl: logo } })).toContain(`src="${logo}"`);
  });

  it("has the save button and its help on screen", () => {
    const html = render();
    expect(html).toContain(ptBR.menu.print.save);
    expect(html).toContain("Salvar como PDF");
  });

  it("speaks the restaurant's language", () => {
    const html = render({ locale: "es" });
    expect(html).toContain(es.menu.print.save);
    expect(html).toContain(es.menu.print.footerOrder);
  });
});
