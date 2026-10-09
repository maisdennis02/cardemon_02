import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXAMPLE_MENUS } from "@/lib/example-menus";

// The example menus are served from the code. The database client below
// throws on any use: every test here passing proves an example is rendered
// without Prisma, which is also what keeps them up when the database is down.
const db = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/lib/prisma", () => {
  const boom = () => {
    db.calls += 1;
    throw new Error("the database must not be asked about an example menu");
  };
  return { prisma: { restaurant: { findUnique: boom, findMany: boom, findFirst: boom } } };
});
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "" });
  return { Geist: font, Geist_Mono: font, Encode_Sans_Expanded: font, Playfair_Display: font, Kalam: font };
});
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }));

const BASE = "https://menulala.com";
const props = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.stubEnv("APP_URL", BASE);
  db.calls = 0;
});

const robotsIndex = (meta: Metadata) =>
  typeof meta.robots === "object" && meta.robots !== null ? meta.robots.index : undefined;

async function renderMenu(slug: string): Promise<string> {
  const layout = (await import("./layout")).default;
  const page = (await import("./page")).default;
  const children = await page(props(slug));
  return renderToStaticMarkup(await layout({ children, ...props(slug) }));
}

describe.each(EXAMPLE_MENUS.map((m) => [m.slug, m] as const))("/m/%s", (slug, menu) => {
  const label = { en: "Example menu", es: "Menú de ejemplo", "pt-BR": "Cardápio de exemplo" }[menu.locale];

  it("resolves from the registry, without the database", async () => {
    const { getRestaurant } = await import("./data");
    const data = await getRestaurant(slug);
    expect(data).toMatchObject({ name: menu.name, country: menu.country, example: true });
    expect(data!.images.map((i) => i.url)).toEqual(menu.images);
    // Nothing that would send a visitor to a person or business.
    expect(data).toMatchObject({ whatsappNumber: null, instagramUrl: null, ifoodUrl: null });
    expect(db.calls).toBe(0);
  });

  it("is noindex and says it is an example in the title and description", async () => {
    const { generateMetadata } = await import("./page");
    const meta = (await generateMetadata(props(slug))) as Metadata;
    expect(robotsIndex(meta)).toBe(false);
    expect(meta.title).toBe(`${menu.name} — ${label}`);
    expect(meta.description).toContain(menu.name);
    expect(meta.description).toMatch(/not a real restaurant|No es un restaurante real/);
    expect(meta.alternates?.canonical).toBe(`/m/${slug}`);
    expect(db.calls).toBe(0);
  });

  it("renders its three pages in its own language, labelled, with no structured data", async () => {
    const html = await renderMenu(slug);
    expect(html).toContain(`<html lang="${menu.locale}"`);
    for (const image of menu.images) expect(html).toContain(`src="${image}"`);
    // Labelled twice: the badge over the first page and the last slide.
    expect(html.split(label).length - 1).toBe(2);
    expect(html).toContain('class="example-badge"');
    expect(html).toContain('class="example-note"');
    expect(html).toContain(menu.name);
    // Not a business: no Restaurant JSON-LD, and no contact or order button.
    expect(html).not.toContain("application/ld+json");
    expect(html).not.toContain("schema.org");
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("social-buttons");
    expect(db.calls).toBe(0);
  });

  it("loads no ad tag and no PostHog", async () => {
    const html = await renderMenu(slug);
    expect(html).not.toMatch(/googletagmanager|posthog|gtag\(/);
  });
});

describe("a real restaurant", () => {
  it("still goes to the database, and a database failure still throws", async () => {
    const { getRestaurant } = await import("./data");
    await expect(getRestaurant("cavalo-marinho")).rejects.toThrow();
    expect(db.calls).toBe(1);
  });
});

describe("the sitemap", () => {
  it("never lists an example, even if a row with its slug existed", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        restaurant: {
          findMany: async () => [
            { slug: "maple-street-diner", updatedAt: new Date("2026-10-01"), images: [] },
            { slug: "cavalo-marinho", updatedAt: new Date("2026-09-01"), images: [] },
          ],
        },
      },
    }));
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/m/cavalo-marinho`);
    for (const menu of EXAMPLE_MENUS) expect(urls).not.toContain(`${BASE}/m/${menu.slug}`);
    expect(urls.some((u) => u.includes("/demo-menus/"))).toBe(false);
  });
});
