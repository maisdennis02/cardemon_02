import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { Menu, MenuTheme } from "@/lib/menu";
import { PrintPages } from "./print-pages";
import { waitForAssets } from "./wait-for-assets";

// The printable page (spec 2026-10-28 §2–3): it lays the sheets out after
// measuring them in the browser, so the server sends the toolbar and a
// "laying out" note, never a sheet measured with the wrong fonts.

const theme: MenuTheme = { color: "#b4532a", headerStyle: "centered" };
const menu: Menu = { v: 1, sections: [{ id: "s1", title: "Lanches", items: [{ id: "xb", name: "X-Burguer", priceCents: 2800 }] }] };

function render(locale: "pt-BR" | "es" = "pt-BR") {
  const dict = locale === "es" ? es : ptBR;
  return renderToStaticMarkup(
    <DictionaryProvider locale={locale} dictionary={dict}>
      <PrintPages slug="ze" name="Lanchonete do Zé" country="BR" theme={theme} menu={menu} hasWhatsapp labels={dict.menu.print} />
    </DictionaryProvider>,
  );
}

describe("PrintPages on the server", () => {
  it("sends the two buttons, the help and the laying-out note, no sheet yet", () => {
    const html = render();
    expect(html).toContain(ptBR.menu.print.savePdf);
    expect(html).toContain(ptBR.menu.print.saveJpg);
    expect(html).toContain("Salvar como PDF"); // the help; its quotes come out escaped
    expect(html).toContain(ptBR.menu.print.building);
    expect(html).not.toContain('class="print-page');
  });

  it("speaks the restaurant's language", () => {
    expect(render("es")).toContain(es.menu.print.savePdf);
  });
});

type FakeImg = { complete: boolean; fire?: () => void; addEventListener: (e: string, cb: () => void) => void };
const img = (complete: boolean): FakeImg => {
  const i: FakeImg = { complete, addEventListener: (_e, cb) => (i.fire = cb) };
  return i;
};
const root = (imgs: FakeImg[]) => ({ querySelectorAll: () => imgs }) as unknown as HTMLElement;

describe("waitForAssets", () => {
  it("waits for every image that is still loading, load or error", async () => {
    const late = img(false);
    let done = false;
    const p = waitForAssets(root([img(true), late]), null).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    late.fire!();
    await p;
    expect(done).toBe(true);
  });

  it("waits for the fonts when the browser exposes them", async () => {
    let release!: () => void;
    const fonts = { ready: new Promise<void>((r) => (release = r)) };
    let done = false;
    const p = waitForAssets(root([]), fonts).then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    release();
    await p;
    expect(done).toBe(true);
  });
});
