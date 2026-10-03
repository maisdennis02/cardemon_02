import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVATE_PATHS, PUBLIC_PAGES } from "@/lib/seo";

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

  it("lists no private page and nothing under /api", async () => {
    const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const path of paths) {
      expect(path.startsWith("/api")).toBe(false);
      for (const priv of PRIVATE_PATHS) expect(path.startsWith(priv), path).toBe(false);
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
    expect(entries.map((e) => e.url)).toEqual(PUBLIC_PAGES.map((p) => `${BASE}${p.path}`));
  });
});

describe("robots.txt", () => {
  const rules = () => {
    const r = robots().rules;
    return Array.isArray(r) ? r : [r];
  };
  const disallowed = () => rules().flatMap((r) => r.disallow ?? []);

  it("points at the sitemap on the canonical host", () => {
    expect(robots().sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("blocks the dashboard and the API", () => {
    expect(disallowed()).toEqual(expect.arrayContaining(["/dashboard", "/api"]));
  });

  it("blocks no public page and no menu", () => {
    const blocked = disallowed();
    for (const path of [...PUBLIC_PAGES.map((p) => p.path), "/m/cavalo-marinho", "/sitemap.xml"]) {
      for (const rule of blocked) {
        expect(path === rule || path.startsWith(`${rule}/`), `${rule} blocks ${path}`).toBe(false);
      }
    }
    expect(blocked).not.toContain("/");
  });

  it("carries no Host directive", () => {
    expect(robots()).not.toHaveProperty("host");
  });
});
