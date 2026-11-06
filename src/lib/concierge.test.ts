import { describe, expect, it } from "vitest";
import type { Menu } from "./menu";
import { ConciergeFileSchema, planConciergeFill, type FillTarget } from "./concierge";

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

  it("rejects a file without menu.v", () => {
    const bad = { name: "x", instagram: "x", menu: { sections: [] } };
    expect(ConciergeFileSchema.safeParse(bad).success).toBe(false);
  });
});
