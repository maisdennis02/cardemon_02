import { describe, expect, it } from "vitest";
import type { Menu } from "./menu";
import { ConciergeFileSchema, cartSampleItems, courtesyDateBR, planConciergeFill, type FillTarget } from "./concierge";

// Concierge pilot (spec 2026-11-05): we transcribe a restaurant's menu image
// and drop it into the draft of the account the restaurant itself created,
// plus 60 days of courtesy Pro. Never overwrite, never touch a subscription.

const now = new Date("2026-11-06T12:00:00Z");
const menu: Menu = {
  v: 1,
  sections: [
    { id: "s1", title: "Lanches", items: [{ id: "i1", name: "X-Burguer", priceCents: 2590 }, { id: "i2", name: "X-Salada", priceCents: null }] },
    { id: "s2", title: "Bebidas", items: [{ id: "i3", name: "Coca lata", priceCents: 700 }] },
  ],
};
const target = (o: Partial<FillTarget> = {}): FillTarget => ({
  restaurants: [{ id: "r1", slug: "lanche-bom", menuDraft: null }],
  proExpiresAt: null,
  billingSubscriptionId: null,
  billingCustomerId: null,
  ...o,
});

describe("planConciergeFill", () => {
  it("fills an empty draft and grants 60 days", () => {
    const p = planConciergeFill(target(), menu, now);
    expect(p).toMatchObject({ ok: true, restaurantId: "r1", slug: "lanche-bom", items: 3, sections: 2 });
    if (p.ok) expect(p.proExpiresAtAfter.toISOString()).toBe("2027-01-05T12:00:00.000Z");
  });

  it("keeps a longer Pro date", () => {
    const later = new Date("2027-03-01T00:00:00Z");
    const p = planConciergeFill(target({ proExpiresAt: later }), menu, now);
    expect(p.ok && p.proExpiresAtAfter.toISOString()).toBe(later.toISOString());
  });

  it("an empty menu draft counts as empty", () => {
    const p = planConciergeFill(target({ restaurants: [{ id: "r1", slug: "x", menuDraft: { v: 1, sections: [] } }] }), menu, now);
    expect(p.ok).toBe(true);
  });

  it("never overwrites a draft with items", () => {
    const p = planConciergeFill(target({ restaurants: [{ id: "r1", slug: "x", menuDraft: menu }] }), menu, now);
    expect(p).toEqual({ ok: false, reason: "draft-not-empty" });
  });

  it("never overwrites a draft it can't read", () => {
    const p = planConciergeFill(target({ restaurants: [{ id: "r1", slug: "x", menuDraft: { garbage: true } }] }), menu, now);
    expect(p).toEqual({ ok: false, reason: "draft-not-empty" });
  });

  it("refuses any account with a subscription id, even a lapsed one", () => {
    expect(planConciergeFill(target({ billingSubscriptionId: "sub_1" }), menu, now)).toEqual({ ok: false, reason: "has-subscription" });
    const lapsed = target({ billingSubscriptionId: "sub_1", proExpiresAt: new Date("2026-01-01T00:00:00Z") });
    expect(planConciergeFill(lapsed, menu, now)).toEqual({ ok: false, reason: "has-subscription" });
  });

  it("refuses a former subscriber whose subscription id the webhook already cleared", () => {
    const former = target({ billingCustomerId: "cus_1", proExpiresAt: new Date("2026-01-01T00:00:00Z") });
    expect(planConciergeFill(former, menu, now)).toEqual({ ok: false, reason: "has-subscription" });
  });

  it("needs exactly one restaurant", () => {
    expect(planConciergeFill(target({ restaurants: [] }), menu, now)).toEqual({ ok: false, reason: "no-restaurant" });
    const two = target({ restaurants: [{ id: "a", slug: "a", menuDraft: null }, { id: "b", slug: "b", menuDraft: null }] });
    expect(planConciergeFill(two, menu, now)).toEqual({ ok: false, reason: "many-restaurants" });
  });
});

describe("ConciergeFileSchema", () => {
  it("accepts an item with no price (illegible stays null, never 0)", () => {
    expect(ConciergeFileSchema.safeParse({ name: "Lanche Bom", instagram: "lanchebom", menu }).success).toBe(true);
  });

  it("takes the address and hours from the restaurant's bio, within the Ajustes limits", () => {
    const base = { name: "Tony's", instagram: "tonys", menu };
    expect(ConciergeFileSchema.safeParse({ ...base, address: "Rua A, 1 - Boituva", hours: "Terça a domingo" }).success).toBe(true);
    expect(ConciergeFileSchema.safeParse({ ...base, address: "x".repeat(161) }).success).toBe(false);
  });

  it("rejects a file without menu.v", () => {
    const bad = { name: "x", instagram: "x", menu: { sections: [] } };
    expect(ConciergeFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("courtesyDateBR", () => {
  it("formats in São Paulo time, not UTC (a late-evening run must not read a day later)", () => {
    expect(courtesyDateBR(new Date("2027-01-05T02:00:00Z"))).toBe("04/01/2027");
  });
});

// 2026-11-08: the DM's cart image shows a real order (a few items from
// different sections), not a single R$ 4,50 esfiha.
describe("cartSampleItems", () => {
  const item = (id: string, priceCents: number | null, groups = false) => ({
    id,
    name: id,
    priceCents,
    ...(groups && { groups: [{ id: "g", title: "T", min: 1, max: 1, options: [{ id: "o", name: "P", priceCents: 0 }] }] }),
  });
  const big: Menu = {
    v: 1,
    sections: [
      { id: "s1", title: "Salgadas", items: [item("a1", null), item("a2", 450), item("a3", 500)] },
      { id: "s2", title: "Doces", items: [item("b1", 500, true), item("b2", 600)] },
      { id: "s3", title: "Combos", items: [item("c1", 4000)] },
      { id: "s4", title: "Bebidas", items: [item("d1", 700)] },
    ],
  };

  it("takes the first priced item without options of each section, up to 3", () => {
    expect(cartSampleItems(big).map((i) => i.id)).toEqual(["a2", "b2", "c1"]);
  });

  it("fills from the same section when there are fewer sections", () => {
    const one: Menu = { v: 1, sections: [{ id: "s1", title: "X", items: [item("a", 100), item("b", 200, true), item("c", 300), item("d", 400)] }] };
    expect(cartSampleItems(one).map((i) => i.id)).toEqual(["a", "c", "d"]);
  });

  it("returns nothing when no item can go straight to the cart", () => {
    const none: Menu = { v: 1, sections: [{ id: "s1", title: "X", items: [item("a", null), item("b", 200, true)] }] };
    expect(cartSampleItems(none)).toEqual([]);
  });
});
