import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/config";
import { NOINDEX_PATHS, PRIVATE_PATHS, PUBLIC_PAGES, type MenuRestaurant } from "@/lib/seo";

// Route modules are imported for their metadata only; everything that needs
// a request, a database or the Next compiler is replaced.
const state = vi.hoisted(() => ({
  locale: "pt-BR" as string,
  restaurant: null as unknown,
}));

vi.mock("@/i18n", async () => {
  const dictionaries = {
    en: (await import("@/i18n/dictionaries/en")).default,
    "pt-BR": (await import("@/i18n/dictionaries/pt-BR")).default,
    es: (await import("@/i18n/dictionaries/es")).default,
  };
  return {
    getLocale: async () => state.locale,
    getDictionary: async (locale: Locale) => dictionaries[locale],
  };
});
vi.mock("@/auth", () => ({ auth: async () => null, signOut: vi.fn(), signIn: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "" });
  return { Geist: font, Geist_Mono: font, Encode_Sans_Expanded: font };
});
vi.mock("@/app/m/[slug]/data", () => ({ getRestaurant: async () => state.restaurant }));

const APP_DIR = fileURLToPath(new URL(".", import.meta.url));
const BASE = "https://menulala.com";

beforeEach(() => {
  vi.stubEnv("APP_URL", BASE);
  state.locale = "pt-BR";
  state.restaurant = null;
});

type MetadataModule = {
  metadata?: Metadata;
  generateMetadata?: (props: never) => Promise<Metadata>;
};

async function metadataOf(mod: MetadataModule, props: unknown = {}): Promise<Metadata> {
  if (mod.generateMetadata) return mod.generateMetadata(props as never);
  return mod.metadata ?? {};
}

const robotsIndex = (meta: Metadata) =>
  typeof meta.robots === "object" && meta.robots !== null ? meta.robots.index : undefined;

describe("every page is classified", () => {
  function pages(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return pages(full);
      return entry.name === "page.tsx" ? [full] : [];
    });
  }

  const routes = pages(APP_DIR).map((file) => {
    const segments = relative(APP_DIR, file)
      .split(sep)
      .slice(0, -1)
      .filter((s) => !(s.startsWith("(") && s.endsWith(")")));
    return `/${segments.join("/")}`;
  });

  it("finds the pages", () => {
    expect(routes).toContain("/");
    expect(routes).toContain("/m/[slug]");
  });

  // A new page.tsx must be added to PUBLIC_PAGES (and so to the sitemap) or
  // to PRIVATE_PATHS (and get a noindex) in the commit that creates it.
  it.each(routes)("%s is public (in the sitemap) or private (noindex)", (route) => {
    const known = [...PUBLIC_PAGES.map((p) => p.path), ...PRIVATE_PATHS, "/m/[slug]"] as string[];
    expect(known).toContain(route);
  });
});

describe("the root layout", () => {
  // Next inherits these two into every page that forgets its own, which is
  // how /pricing, /login and /signup came to declare the home page as their
  // canonical URL.
  it("sets no canonical and no og:url for pages to inherit", async () => {
    const meta = await metadataOf(await import("./(main)/layout"));
    expect(meta.alternates?.canonical).toBeUndefined();
    expect(meta.openGraph?.url).toBeUndefined();
    expect(String(meta.metadataBase)).toBe(`${BASE}/`);
    expect(meta.title).toMatchObject({ template: "%s — menulala" });
  });

  it("declares no icon by hand — the files in src/app are the icons", async () => {
    const meta = await metadataOf(await import("./(main)/layout"));
    expect(meta.icons).toBeUndefined();
    for (const layout of ["(main)/layout.tsx", "m/[slug]/layout.tsx"]) {
      expect(readFileSync(join(APP_DIR, layout), "utf8")).not.toMatch(/href=["']data:/);
    }
  });
});

describe.each(["pt-BR", "en", "es"] as const)("public pages (%s)", (locale) => {
  beforeEach(() => {
    state.locale = locale;
  });

  const cases = [
    ["/", () => import("./(main)/page")],
    ["/pricing", () => import("./(main)/pricing/page")],
    ["/privacy", () => import("./(main)/privacy/page")],
    ["/terms", () => import("./(main)/terms/page")],
  ] as const;

  it("has a case for every public page", () => {
    expect(cases.map(([path]) => path).sort()).toEqual(PUBLIC_PAGES.map((p) => p.path).sort());
  });

  it.each(cases)("%s has its own canonical, description and social tags", async (path, load) => {
    const meta = await metadataOf(await load());
    expect(meta.alternates?.canonical).toBe(path);
    expect(meta.openGraph?.url).toBe(path);
    expect(robotsIndex(meta)).not.toBe(false);
    expect(meta.title).toBeTruthy();
    expect(meta.description!.length).toBeGreaterThanOrEqual(120);
    expect(meta.description!.length).toBeLessThanOrEqual(160);
    expect(meta.openGraph).toMatchObject({ siteName: "menulala", description: meta.description });
    expect(meta.openGraph?.images).toBeTruthy();
    expect(meta.twitter).toMatchObject({ description: meta.description });
  });
});

describe("private pages", () => {
  it("the auth segment is noindex for everything under it", async () => {
    const meta = await metadataOf(await import("./(main)/(auth)/layout"));
    expect(robotsIndex(meta)).toBe(false);
  });

  it("the dashboard is noindex", async () => {
    const meta = await metadataOf(await import("./(main)/dashboard/layout"));
    expect(robotsIndex(meta)).toBe(false);
    expect(meta.title).toBe("Painel");
  });

  it.each([
    ["/login", () => import("./(main)/(auth)/login/layout"), "Entrar"],
    ["/signup", () => import("./(main)/(auth)/signup/layout"), "Cadastrar"],
    ["/forgot-password", () => import("./(main)/(auth)/forgot-password/layout"), "Redefina sua senha"],
    ["/reset-password", () => import("./(main)/(auth)/reset-password/page"), "Defina uma nova senha"],
  ] as const)("%s has a real title and no canonical", async (_path, load, title) => {
    const meta = await metadataOf(await load());
    expect(meta.title).toBe(title);
    expect(meta.alternates?.canonical).toBeUndefined();
    // Must not undo the segment's noindex.
    expect(robotsIndex(meta)).not.toBe(true);
  });

  // NOINDEX_PATHS is the list robots.txt must leave crawlable. It has to be
  // exactly the pages under the (auth) segment: a page added there without
  // being listed would be noindex but could later be disallowed unnoticed.
  it("NOINDEX_PATHS is exactly the pages of the (auth) segment", () => {
    const authDir = join(APP_DIR, "(main)/(auth)");
    const authPages = readdirSync(authDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .filter((e) => readdirSync(join(authDir, e.name)).includes("page.tsx"))
      .map((e) => `/${e.name}`);
    expect(authPages.sort()).toEqual([...NOINDEX_PATHS].sort());
  });

  it("every private path sits under a noindex layout", () => {
    const dirs: Record<(typeof PRIVATE_PATHS)[number], string> = {
      "/login": "(main)/(auth)/login",
      "/signup": "(main)/(auth)/signup",
      "/forgot-password": "(main)/(auth)/forgot-password",
      "/reset-password": "(main)/(auth)/reset-password",
      "/dashboard": "(main)/dashboard",
    };
    for (const path of PRIVATE_PATHS) {
      const noindexLayout = dirs[path].startsWith("(main)/(auth)")
        ? "(main)/(auth)/layout.tsx"
        : `${dirs[path]}/layout.tsx`;
      expect(readFileSync(join(APP_DIR, noindexLayout), "utf8"), path).toContain("NOINDEX");
      expect(readFileSync(join(APP_DIR, dirs[path], "page.tsx"), "utf8").length).toBeGreaterThan(0);
    }
  });
});

describe("public menu page /m/[slug]", () => {
  const restaurant: MenuRestaurant & Record<string, unknown> = {
    name: "Nil's Bar & Restaurante",
    description: "Nil's Bar & Restaurante",
    country: "BR",
    whatsappNumber: "5513996332974",
    instagramUrl: null,
    images: [{ url: "https://blob.example/page-01.jpg" }],
  };
  const props = { params: Promise.resolve({ slug: "nils-bar-restaurante" }) };

  it("has the restaurant in the title, a full description and its own canonical", async () => {
    state.restaurant = restaurant;
    const meta = await metadataOf(await import("./m/[slug]/page"), props);
    expect(meta.title).toBe("Nil's Bar & Restaurante — Cardápio Digital");
    expect(meta.alternates?.canonical).toBe("/m/nils-bar-restaurante");
    expect(meta.description!.length).toBeGreaterThanOrEqual(120);
    expect(meta.description!.length).toBeLessThanOrEqual(160);
    expect(meta.description).toContain("Nil's Bar & Restaurante");
    expect(robotsIndex(meta)).toBeUndefined();
    expect(meta.openGraph).toMatchObject({
      url: "/m/nils-bar-restaurante",
      locale: "pt_BR",
      images: [{ url: "https://blob.example/page-01.jpg" }],
    });
  });

  it("is noindex while the menu has no page uploaded", async () => {
    state.restaurant = { ...restaurant, images: [] };
    const meta = await metadataOf(await import("./m/[slug]/page"), props);
    expect(robotsIndex(meta)).toBe(false);
  });

  it("returns no metadata for an unknown slug (the page 404s)", async () => {
    state.restaurant = null;
    expect(await metadataOf(await import("./m/[slug]/page"), props)).toEqual({});
  });

  // Outage invariants (see the comments in m/[slug]/layout.tsx and page.tsx):
  // SEO work must not pull a request-time API into the menu route, or drop
  // the empty generateStaticParams that keeps it ISR.
  it("stays static: no request-time API anywhere under /m/[slug]", async () => {
    const dir = join(APP_DIR, "m/[slug]");
    for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
      // Comments are allowed to name the forbidden calls; code is not.
      const code = readFileSync(join(dir, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/\bcookies\(|\bheaders\(|\bgetLocale\b|next\/headers/);
    }
    expect(readFileSync(fileURLToPath(new URL("../lib/seo.ts", import.meta.url)), "utf8")).not.toMatch(
      /next\/headers|@\/lib\/prisma|from "@\/i18n"/,
    );
    const page = await import("./m/[slug]/page");
    expect(await page.generateStaticParams()).toEqual([]);
    expect(page.revalidate).toBe(60);
  });
});

describe("icons", () => {
  const file = (name: string) => readFileSync(join(APP_DIR, name));
  const pngSize = (buf: Buffer) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

  it("ships a real /favicon.ico with a 48px image", () => {
    const ico = file("favicon.ico");
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    const count = ico.readUInt16LE(4);
    const widths = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + i * 16));
    expect(widths).toContain(48);
  });

  it("ships a 180×180 apple-touch icon", () => {
    expect(pngSize(file("apple-icon.png"))).toEqual([180, 180]);
  });

  it("ships the 512×512 logo the Organization JSON-LD points at", () => {
    expect(pngSize(file("../../public/logo.png"))).toEqual([512, 512]);
  });

  // The mark used to be #F2F2F2 on transparent: invisible on a white tab and
  // on a white results page.
  it("the SVG icon is not near-white", () => {
    const fills = [...file("icon.svg").toString("utf8").matchAll(/fill="#([0-9a-fA-F]{6})"/g)].map((m) => m[1]);
    expect(fills.length).toBeGreaterThan(0);
    for (const hex of fills) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.min(r, g, b), `#${hex}`).toBeLessThan(200);
    }
  });
});
