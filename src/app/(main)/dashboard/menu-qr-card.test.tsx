import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import { MenuQrCard } from "./menu-qr-card";

// The QR card opens the printable menu for a text menu (spec 2026-10-26 §1).

const render = (printable: boolean) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <MenuQrCard slug="lanchonete-do-ze" name="Lanchonete do Zé" printable={printable} />
    </DictionaryProvider>,
  );

describe("MenuQrCard print link", () => {
  it("opens /m/<slug>/print in a new tab for a text menu", () => {
    const html = render(true);
    expect(html).toMatch(/<a[^>]*href="\/m\/lanchonete-do-ze\/print"[^>]*target="_blank"/);
    expect(html).toContain(ptBR.dashboard.qr.print);
  });

  it("has no print link for a photo menu", () => {
    const html = render(false);
    expect(html).not.toContain("/print");
    expect(html).not.toContain(ptBR.dashboard.qr.print);
  });
});
