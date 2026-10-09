import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LOCALES, localizedPath } from "@/i18n/config";
import {
  NOINDEX_PATHS,
  PRIVATE_PATHS,
  PUBLIC_PAGES,
  ROBOTS_DISALLOW,
} from "@/lib/seo";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { restaurant: { findMany } } }));

import robots from "./robots";
import sitemap from "./sitemap";

const BASE = "https://menulala.com";

beforeEach(() => {
  vi.stubEnv("APP_URL", BASE);
  findMany.mockReset();
  findMany.mockResolvedValue([
    {
      slug: "nils-bar-restaurante",
      updatedAt: new Date("2026-07-26T03:24:17Z"),
      images: [{ createdAt: new Date("2026-09-06T12:00:00Z") }],
    },
    {
      slug: "cavalo-marinho",
      updatedAt: new Date("2026-09-01T04:03:55Z"),
      images: [{ createdAt: new Date("2026-05-20T00:00:00Z") }],
    },
  ]);
});

describe("sitemap.xml", () => {
  it("lists every public page with its declared lastModified", async () => {
    const entries = await sitemap();
    for (const page of PUBLIC_PAGES) {
      const entry = entries.find((e) => e.url === `${BASE}${page.path}`);
      expect(entry, page.path).toBeDefined();
      expect(entry!.lastModified).toBe(page.lastModified);
    }
  });

  it("gives every entry a lastModified and nothing Google ignores", async () => {
    for (const entry of await sitemap()) {
      expect(entry.lastModified, entry.url).toBeTruthy();
      expect(entry).not.toHaveProperty("changeFrequency");
      expect(entry).not.toHaveProperty("priority");
    }
  });

  it("never dates a static page with the time of the request", async () => {
    const before = Date.now();
    const entries = await sitemap();
    for (const page of PUBLIC_PAGES) {
      const entry = entries.find((e) => e.url === `${BASE}${page.path}`)!;
      expect(new Date(entry.lastModified!).getTime()).toBeLessThan(before - 1000);
    }
  });

  it("lists no private page, no noindex page and nothing robots.txt disallows", async () => {
    const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const path of paths) {
      for (const hidden of [...PRIVATE_PATHS, ...NOINDEX_PATHS, ...ROBOTS_DISALLOW]) {
        expect(path.startsWith(hidden), `${path} is under ${hidden}`).toBe(false);
      }
    }
  });

  it("lists only the public pages, in every language, and the menus", async () => {
    const publicPaths = PUBLIC_PAGES.flatMap((p) => LOCALES.map((l) => localizedPath(l, p.path)));
    for (const entry of await sitemap()) {
      const path = new URL(entry.url).pathname;
      expect(publicPaths.includes(path) || /^\/m\/[^/]+$/.test(path), path).toBe(true);
    }
  });

  it.each(PUBLIC_PAGES.flatMap((p) => LOCALES.map((l) => [p.path, l] as const)))(
    "lists %s in %s with its date and the full set of translations",
    async (path, locale) => {
      const entries = await sitemap();
      const entry = entries.find((e) => e.url === `${BASE}${localizedPath(locale, path)}`);
      expect(entry, `${locale} ${path}`).toBeDefined();
      expect(entry!.lastModified).toBe(PUBLIC_PAGES.find((p) => p.path === path)!.lastModified);
      expect(entry!.alternates?.languages).toEqual({
        en: `${BASE}${path}`,
        "pt-BR": `${BASE}${localizedPath("pt-BR", path)}`,
        es: `${BASE}${localizedPath("es", path)}`,
        "x-default": `${BASE}${path}`,
      });
    },
  );

  // hreflang must be reciprocal: every URL an entry names as a translation
  // is itself an entry, and names the same set back.
  it("every translation named in the sitemap is listed and points back", async () => {
    const entries = await sitemap();
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    for (const entry of entries) {
      for (const url of Object.values(entry.alternates?.languages ?? {})) {
        expect(byUrl.has(url as string), `${url} named by ${entry.url}`).toBe(true);
        expect(byUrl.get(url as string)!.alternates?.languages).toEqual(entry.alternates?.languages);
      }
    }
  });

  it("menus have one URL each and no hreflang", async () => {
    const menus = (await sitemap()).filter((e) => new URL(e.url).pathname.startsWith("/m/"));
    expect(menus).toHaveLength(2);
    for (const menu of menus) expect(menu.alternates).toBeUndefined();
    for (const entry of await sitemap()) {
      expect(new URL(entry.url).pathname).not.toMatch(/^\/(pt-BR|es)\/m\//);
    }
  });

  it("has no duplicate URL and stays on the canonical host", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(url.startsWith(`${BASE}/`)).toBe(true);
  });

  it("lists menus, dated by the newer of the restaurant edit and the last upload", async () => {
    const entries = await sitemap();
    const nils = entries.find((e) => e.url === `${BASE}/m/nils-bar-restaurante`)!;
    expect(nils.lastModified).toEqual(new Date("2026-09-06T12:00:00Z"));
    const cavalo = entries.find((e) => e.url === `${BASE}/m/cavalo-marinho`)!;
    expect(cavalo.lastModified).toEqual(new Date("2026-09-01T04:03:55Z"));
  });

  it("asks the database only for menus that have at least one page", async () => {
    await sitemap();
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toEqual({ images: { some: {} } });
  });

  // A failed regeneration must not overwrite the cached sitemap with one
  // that lost every menu: throwing makes ISR keep the previous copy.
  it("throws at request time when the database is down", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    await expect(sitemap()).rejects.toThrow("db down");
  });

  // `next build` must not need the database (deploys during an outage).
  it("builds without the database, with the static pages only", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    findMany.mockRejectedValue(new Error("db down"));
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toEqual(
      PUBLIC_PAGES.flatMap((p) => LOCALES.map((l) => `${BASE}${localizedPath(l, p.path)}`)),
    );
  });
});

describe("robots.txt", () => {
  const rules = () => {
    const r = robots().rules;
    return Array.isArray(r) ? r : [r];
  };
  const disallowed = () => rules().flatMap((r) => r.disallow ?? []);
  // robots.txt rules are path PREFIXES: "/login" blocks /login, /login?x=1
  // and /login/anything.
  const blockedBy = (path: string) => disallowed().find((rule) => path.startsWith(rule));

  it("points at the sitemap on the canonical host", () => {
    expect(robots().sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("disallows exactly the declared prefixes", () => {
    expect(disallowed()).toEqual([...ROBOTS_DISALLOW]);
    expect(disallowed()).toEqual(expect.arrayContaining(["/dashboard", "/api"]));
  });

  // Google cannot read a noindex on a URL robots.txt blocks, and may index
  // the bare URL from links. Pages that open without a session and carry
  // noindex must therefore stay crawlable.
  it.each([...NOINDEX_PATHS])("does not block %s, which relies on its noindex tag", (path) => {
    expect(blockedBy(path), `${path} is disallowed`).toBeUndefined();
    expect(blockedBy(`${path}?callbackUrl=%2Fdashboard`)).toBeUndefined();
  });

  it("keeps the two ways of hiding a page apart", () => {
    for (const path of NOINDEX_PATHS) expect([...ROBOTS_DISALLOW] as string[]).not.toContain(path);
  });

  // A Disallow is only right where there is no HTML to index: route handlers
  // (/api) or a prefix the proxy redirects to the sign-in screen.
  it("disallows only /api and prefixes the proxy sends to /login", () => {
    const proxy = readFileSync(fileURLToPath(new URL("../proxy.ts", import.meta.url)), "utf8");
    for (const prefix of ROBOTS_DISALLOW) {
      if (prefix === "/api") continue;
      expect(proxy, prefix).toContain(`pathname.startsWith("${prefix}") && !isLoggedIn`);
      expect(proxy, prefix).toContain(`"${prefix}/:path*"`);
    }
  });

  it("blocks no public page and no menu", () => {
    for (const path of [...PUBLIC_PAGES.map((p) => p.path), "/m/cavalo-marinho", "/sitemap.xml"]) {
      expect(blockedBy(path), path).toBeUndefined();
    }
    expect(disallowed()).not.toContain("/");
  });

  it("carries no Host directive", () => {
    expect(robots()).not.toHaveProperty("host");
  });
});
