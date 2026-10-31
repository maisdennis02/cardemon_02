import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import { MenuHomeCard } from "./menu-home-card";
import { MenuQrCard } from "./menu-qr-card";

// The printable menu opens from the top of the dashboard, next to "open" and
// "edit", for a text menu only (spec 2026-10-26 §1).

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      {node}
    </DictionaryProvider>,
  );

const homeCard = (mode: "built" | "photos") =>
  render(
    <MenuHomeCard
      name="Lanchonete do Zé"
      slug="lanchonete-do-ze"
      hasMenu
      mode={mode}
      itemCount={3}
      imageCount={1}
      whatsappNumber={null}
      country="BR"
    />,
  );

describe("MenuHomeCard print button", () => {
  it("opens /m/<slug>/print in a new tab for a text menu", () => {
    const html = homeCard("built");
    expect(html).toMatch(/<a[^>]*href="\/m\/lanchonete-do-ze\/print"[^>]*target="_blank"/);
    expect(html).toContain(ptBR.dashboard.home.print);
  });

  it("has no print button for a photo menu", () => {
    const html = homeCard("photos");
    expect(html).not.toContain("/print");
    expect(html).not.toContain(ptBR.dashboard.home.print);
  });
});

describe("MenuQrCard", () => {
  it("no longer carries the print link", () => {
    expect(render(<MenuQrCard slug="lanchonete-do-ze" name="Lanchonete do Zé" />)).not.toContain("/print");
  });
});
