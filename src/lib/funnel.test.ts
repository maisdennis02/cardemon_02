import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildFunnel, type FunnelUserRow } from "@/lib/funnel";

const FROM = new Date("2026-10-01T00:00:00Z");
const TO = new Date("2026-10-08T00:00:00Z");
const menu = (items: number) => ({
  v: 1,
  sections: [{ id: "s1", title: null, items: Array.from({ length: items }, (_, i) => ({ id: `i${i}`, name: `x${i}`, priceCents: 100 })) }],
});

function user(
  patch: Omit<Partial<FunnelUserRow>, "restaurant"> & { restaurant?: Partial<NonNullable<FunnelUserRow["restaurant"]>> | null },
): FunnelUserRow {
  const { restaurant, ...rest } = patch;
  return {
    email: "someone@example.com",
    createdAt: new Date("2026-10-03T12:00:00Z"),
    acquisition: null,
    proExpiresAt: null,
    test: false,
    ...rest,
    restaurant:
      restaurant === null
        ? null
        : { slug: "r", menuMode: "photos", menuPublished: null, images: 0, views: 0, orders: 0, ...restaurant },
  };
}

const run = (rows: FunnelUserRow[]) => buildFunnel(rows, 0, { days: 7, from: FROM, to: TO });

describe("funnel statuses", () => {
  it("counts a published text menu as a menu, with its mode and items", () => {
    const [a] = run([user({ restaurant: { menuMode: "built", menuPublished: menu(12) } })]).accounts;
    expect(a).toMatchObject({ status: "live", mode: "built", items: 12, images: 0 });
  });

  it("calls an account with a restaurant but nothing published no_menu", () => {
    const [a] = run([user({ restaurant: {} })]).accounts;
    expect(a).toMatchObject({ status: "no_menu", mode: null });
  });

  it("keeps photo menus as before", () => {
    const [a] = run([user({ restaurant: { images: 3, views: 5 } })]).accounts;
    expect(a).toMatchObject({ status: "viewed", mode: "photos", images: 3, views: 5 });
  });

  it("does not count a corrupt text menu as published", () => {
    const [a] = run([user({ restaurant: { menuMode: "built", menuPublished: { v: 9 } } })]).accounts;
    expect(a).toMatchObject({ status: "no_menu", items: 0 });
  });

  it("still says no_restaurant and paying", () => {
    const rows = run([
      user({ restaurant: null }),
      user({ proExpiresAt: new Date(Date.now() + 86_400_000), restaurant: { images: 1 } }),
    ]).accounts;
    expect(rows.map((r) => r.status)).toEqual(["no_restaurant", "paying"]);
  });
});

describe("funnel totals", () => {
  it("counts text menus as published and orders on their own", () => {
    const f = run([
      user({ restaurant: { menuMode: "built", menuPublished: menu(5), views: 2, orders: 3 } }),
      user({ restaurant: { images: 2 } }),
      user({ restaurant: {} }),
      user({ restaurant: null }),
    ]);
    expect(f.totals).toMatchObject({ signups: 4, onboarded: 3, published: 2, viewed: 1, ordered: 1, orders: 3 });
    expect(f.daily).toEqual([{ date: "2026-10-03", signups: 4, adSignups: 0, published: 2 }]);
    expect(f.sources[0]).toMatchObject({ signups: 4, published: 2, ordered: 1 });
  });
});

describe("test accounts", () => {
  it("lists them flagged but leaves them out of totals, sources and days", () => {
    const f = run([
      user({ test: true, acquisition: { gclid: "teste123" }, restaurant: { menuMode: "built", menuPublished: menu(5), views: 2, orders: 3 } }),
      user({ restaurant: { images: 2 } }),
    ]);
    expect(f.accounts.map((a) => a.test)).toEqual([true, false]);
    expect(f.totals).toMatchObject({ signups: 1, adSignups: 0, published: 1, ordered: 0, orders: 0, testAccounts: 1 });
    expect(f.sources).toHaveLength(1);
    expect(f.sources[0]).toMatchObject({ signups: 1, published: 1 });
    expect(f.daily).toEqual([{ date: "2026-10-03", signups: 1, adSignups: 0, published: 1 }]);
  });
});
