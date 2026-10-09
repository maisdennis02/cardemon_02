import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { EXAMPLE_MENUS, isKnownMenuSlug } from "@/lib/example-menus";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "" });
  return { Geist: font, Geist_Mono: font, Encode_Sans_Expanded: font, Playfair_Display: font, Kalam: font };
});
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }));

const DICTS = { en, "pt-BR": ptBR, es } as const;
const APP_DIR = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = join(APP_DIR, "__fixtures__/landing-pt-BR.json");

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://menulala.com");
});

async function renderLanding(locale: Locale): Promise<string> {
  const { SiteDocument } = await import("@/components/site-document");
  const { LandingPage } = await import("./(main)/landing-page");
  const country = { en: "US", "pt-BR": "BR", es: "MX" }[locale] as "US" | "BR" | "MX";
  return renderToStaticMarkup(
    <SiteDocument locale={locale} dictionary={DICTS[locale]} pathPrefix="">
      <LandingPage locale={locale} t={DICTS[locale]} signedIn={false} country={country} pathPrefix="" />
    </SiteDocument>,
  );
}

// What a visitor reads, can click and sees, without markup noise.
function visible(html: string) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/©\s*\d{4}/g, "© YEAR");
  const text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&ldquo;/g, "“")
    .replace(/\s+/g, " ")
    .trim();
  const links = [...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const images = [...body.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1]);
  return { text, links, images };
}

const menuSlugs = (links: string[]) =>
  links.filter((href) => href.startsWith("/m/")).map((href) => href.slice("/m/".length));

describe("the Portuguese landing", () => {
  // The pt-BR landing is the page the ads send people to. Its copy, links and
  // images are pinned to what shipped before the example menus were added
  // (the fixture was generated from the commit before them).
  // After a DELIBERATE change to the Portuguese landing, regenerate with:
  //   UPDATE_LANDING_FIXTURE=1 npx vitest run src/app/landing-examples.test.tsx
  it("reads exactly as it did before the example menus", async () => {
    const current = visible(await renderLanding("pt-BR"));
    if (process.env.UPDATE_LANDING_FIXTURE) {
      writeFileSync(FIXTURE, `${JSON.stringify(current, null, 2)}\n`);
    }
    expect(existsSync(FIXTURE)).toBe(true);
    expect(current).toEqual(JSON.parse(readFileSync(FIXTURE, "utf8")));
  });

  it("still shows its three customers and no example", async () => {
    const { text, links, images } = visible(await renderLanding("pt-BR"));
    expect(menuSlugs(links)).toEqual(["cavalo-marinho", "art-sabor-sushi", "barraca-da-sonia", "cavalo-marinho"]);
    expect(text).toContain("Restaurantes que já usam o menulala");
    expect(text).not.toContain(ptBR.menu.exampleLabel);
    expect(images.filter((i) => i.startsWith("/mockup/"))).toEqual([
      "/mockup/brazil/01.webp",
      "/mockup/brazil/02.webp",
      "/mockup/brazil/03.webp",
    ]);
  });
});

describe.each([
  ["en", "usa", ["maple-street-diner", "harbor-taproom"], "See it working"],
  ["es", "latin_america", ["taqueria-la-esquina", "cafe-buen-dia"], "Míralo funcionando"],
] as const)("the %s landing", (locale, region, examples, heading) => {
  it("links only to menus that exist", async () => {
    const slugs = menuSlugs(visible(await renderLanding(locale)).links);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) expect(isKnownMenuSlug(slug), slug).toBe(true);
  });

  it("links to the two examples of its language, from the hero and from the section", async () => {
    const slugs = menuSlugs(visible(await renderLanding(locale)).links);
    // Hero demo link first, then the three cards in order.
    expect(slugs).toEqual([examples[0], examples[0], examples[1], "cavalo-marinho"]);
    // And to no example written in another language.
    const others = EXAMPLE_MENUS.filter((m) => m.locale !== locale).map((m) => m.slug);
    for (const slug of slugs) expect(others).not.toContain(slug);
  });

  it("does not claim the examples are customers", async () => {
    const { text } = visible(await renderLanding(locale));
    expect(text).toContain(heading);
    expect(text).not.toMatch(/Restaurants already using menulala|Restaurantes que ya usan menulala/);
    // Each example card says it is one.
    const label = DICTS[locale].menu.exampleLabel;
    expect(text.split(label).length - 1).toBe(2);
    expect(text).toMatch(locale === "en" ? /Real restaurant/ : /Restaurante real/);
  });

  // The people and places the old English and Spanish sections invented or
  // attributed quotes to.
  it("has no invented people, quotes or cities", async () => {
    const { text } = visible(await renderLanding(locale));
    for (const gone of [
      "Sônia Ribeiro",
      "Roger Almeida",
      "Mylena Tanaka",
      "Marcos Almeida",
      "Júlia Tanaka",
      "Boteco do Marcão",
      "Cantina da Júlia",
      "Belo Horizonte",
      "Curitiba",
      "Santos / SP",
      "“",
    ]) {
      expect(text, gone).not.toContain(gone);
    }
  });

  it("shows an example in its own language in the hero phone", async () => {
    const { images } = visible(await renderLanding(locale));
    expect(images.filter((i) => i.startsWith("/mockup/"))).toEqual(
      [1, 2, 3].map((n) => `/mockup/${region}/0${n}.webp`),
    );
  });
});

describe("a menu that does not exist", () => {
  it("would fail the link check", () => {
    expect(menuSlugs(["/m/boteco-do-marcao", "/pricing"]).every(isKnownMenuSlug)).toBe(false);
  });
});
