import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import type { MenuEventCount } from "@/lib/menu-view-counts";
import { buildUsage, type UsageRow } from "@/lib/usage";

const FROM = new Date("2026-10-16T00:00:00Z");
const TO = new Date("2026-11-15T00:00:00Z");
const menu = (items: number) => ({
  v: 1,
  sections: [{ id: "s1", title: null, items: Array.from({ length: items }, (_, i) => ({ id: `i${i}`, name: `x${i}`, priceCents: 100 })) }],
});

const row = (patch: Partial<UsageRow>): UsageRow => ({
  id: "r1",
  slug: "r1",
  name: "R1",
  createdAt: new Date("2026-05-01T12:00:00Z"),
  menuMode: "photos",
  menuPublished: null,
  images: 0,
  ownerEmail: "someone@example.com",
  ownerProExpiresAt: null,
  ...patch,
});

const event = (restaurantId: string, kind: string, recent: number, total = recent, lastAt = "2026-11-10T22:00:00Z"): MenuEventCount => ({
  restaurantId,
  kind,
  recent,
  total,
  lastAt: new Date(lastAt),
});

const run = (rows: UsageRow[], events: MenuEventCount[] = []) => buildUsage(rows, events, { days: 30, from: FROM, to: TO });

afterEach(() => vi.unstubAllEnvs());

describe("buildUsage", () => {
  it("lists a restaurant created long before the window, with the window's events", () => {
    const usage = run(
      [row({ id: "old", slug: "nils-bar", images: 18 })],
      [event("old", "view", 40, 900), event("old", "click_whatsapp", 6, 50), event("old", "click_order", 2, 3)],
    );
    expect(usage.restaurants[0]).toMatchObject({
      slug: "nils-bar",
      mode: "photos",
      images: 18,
      views: 40,
      viewsAllTime: 900,
      whatsapp: 6,
      orders: 2,
      ordersAllTime: 3,
      lastViewAt: "2026-11-10T22:00:00.000Z",
    });
    expect(usage.totals).toMatchObject({ restaurants: 1, published: 1, viewed: 1, contacted: 1, views: 40, whatsapp: 6, orders: 2 });
  });

  it("shows a menu nobody opened in the window as zero, with its last view", () => {
    const [r] = run([row({})], [event("r1", "view", 0, 12, "2026-08-02T10:00:00Z")]).restaurants;
    expect(r).toMatchObject({ views: 0, viewsAllTime: 12, lastViewAt: "2026-08-02T10:00:00.000Z" });
  });

  it("says never opened, and not published, without inventing a date", () => {
    const usage = run([row({})]);
    expect(usage.restaurants[0]).toMatchObject({ mode: null, views: 0, viewsAllTime: 0, lastViewAt: null });
    expect(usage.totals).toMatchObject({ restaurants: 1, published: 0, viewed: 0, contacted: 0 });
  });

  it("reads a published text menu and the owner's plan", () => {
    const [r] = run([
      row({ menuMode: "built", menuPublished: menu(14), ownerProExpiresAt: new Date(Date.now() + 86_400_000) }),
    ]).restaurants;
    expect(r).toMatchObject({ mode: "built", items: 14, pro: true });
  });

  it("adds Instagram and delivery taps together, apart from views and orders", () => {
    const [r] = run([row({})], [event("r1", "view", 3), event("r1", "click_instagram", 2), event("r1", "click_ifood", 5)]).restaurants;
    expect(r).toMatchObject({ views: 3, otherClicks: 7, whatsapp: 0, orders: 0 });
  });

  it("puts the most opened first", () => {
    const usage = run(
      [row({ id: "a", slug: "a" }), row({ id: "b", slug: "b" }), row({ id: "c", slug: "c" })],
      [event("a", "view", 1, 500), event("b", "view", 9, 9), event("c", "view", 1, 700)],
    );
    expect(usage.restaurants.map((r) => r.slug)).toEqual(["b", "c", "a"]);
  });

  it("lists the owner's test restaurant but keeps it out of the totals", () => {
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    const usage = run(
      [row({ id: "t", slug: "teste", ownerEmail: "Owner@example.com", images: 2 }), row({ id: "x", slug: "x" })],
      [event("t", "view", 30), event("t", "click_order", 4), event("x", "view", 2)],
    );
    expect(usage.restaurants.find((r) => r.slug === "teste")).toMatchObject({ test: true, views: 30 });
    expect(usage.totals).toMatchObject({ restaurants: 1, viewed: 1, views: 2, orders: 0, testRestaurants: 1 });
  });

  it("masks the owner's e-mail", () => {
    expect(run([row({ ownerEmail: "maria.silva@gmail.com" })]).restaurants[0].owner).toBe("mar***@gmail.com");
  });
});
