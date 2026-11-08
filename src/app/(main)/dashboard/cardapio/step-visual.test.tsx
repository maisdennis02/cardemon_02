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

const render = (theme: MenuTheme) =>
  renderToStaticMarkup(
    <DictionaryProvider locale="pt-BR" dictionary={ptBR}>
      <StepVisual
        restaurant={{ id: "r1", slug: "tonys", name: "Tony's Lanches", hasWhatsapp: true }}
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
