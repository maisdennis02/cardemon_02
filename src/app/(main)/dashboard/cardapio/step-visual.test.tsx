import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { DictionaryProvider } from "@/i18n/provider";
import type { MenuTheme } from "@/lib/menu";
import { StepVisual } from "./step-visual";

vi.mock("@vercel/blob/client", () => ({ upload: vi.fn() }));
vi.mock("@/lib/posthog", () => ({ capture: vi.fn() }));

// 2026-11-06: the look starts with a style, light or poster; the poster has
// its own dark page, so the background choice only shows for light.

const TONYS = { id: "r1", slug: "tonys", name: "Tony's Lanches", hasWhatsapp: true, address: null, hours: null };

const render = (theme: MenuTheme, restaurant: Parameters<typeof StepVisual>[0]["restaurant"] = TONYS) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <StepVisual
        restaurant={restaurant}
        country="BR"
        onCountry={() => {}}
        theme={theme}
        onTheme={() => {}}
      />
    </DictionaryProvider>,
  );

const v = ptBR.dashboard.builder.visual;

describe("StepVisual styles", () => {
  it("offers light and poster, light selected when the theme has no style", () => {
    const html = render({ color: "#e08a00", headerStyle: "band" });
    expect(html).toMatch(new RegExp(`aria-pressed="true"[^>]*>(?:(?!</button>)[\\s\\S])*${v.styles.light}`));
    expect(html).toContain(v.styles.poster);
  });

  it("shows the background choice for light only", () => {
    expect(render({ color: "#e08a00", headerStyle: "band" })).toContain(v.background);
    expect(render({ color: "#e08a00", headerStyle: "band", style: "poster" })).not.toContain(v.background);
  });

  it("names the band by what it shows", () => {
    expect(render({ color: "#e08a00", headerStyle: "band" })).toContain(v.band);
    expect(v.band).toBe("Faixa com o nome");
  });
});

// 2026-11-07: the header preview is the public header, address and hours included.
describe("StepVisual header preview", () => {
  it("shows the restaurant's address and hours", () => {
    const html = render(
      { color: "#e08a00", headerStyle: "band" },
      { ...TONYS, address: "Rua das Flores, 10", hours: "Terça a domingo, 18h às 23h" },
    );
    expect(html).toContain("Rua das Flores, 10");
    expect(html).toContain("Terça a domingo, 18h às 23h");
  });
});
