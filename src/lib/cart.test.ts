import { describe, expect, it } from "vitest";
import type { Menu } from "@/lib/menu";
import { CART_TTL_MS, addToCart, cartTotals, emptyCart, readCart, resolveCart, setQty } from "@/lib/cart";

const NOW = 1_800_000_000_000;
const menu: Menu = {
  v: 1,
  sections: [
    {
      id: "s1",
      title: "Lanches",
      items: [
        { id: "a", name: "X-Burguer", priceCents: 2590 },
        { id: "b", name: "Vegetariano", priceCents: null },
      ],
    },
  ],
};

describe("cart", () => {
  it("adds one at a time", () => {
    const cart = addToCart(addToCart(emptyCart(NOW), "a", NOW), "a", NOW);
    expect(cart.lines).toEqual([{ id: "a", qty: 2 }]);
  });

  it("removes a line set to zero and caps at 99", () => {
    const cart = addToCart(emptyCart(NOW), "a", NOW);
    expect(setQty(cart, "a", 0, NOW).lines).toEqual([]);
    expect(setQty(cart, "a", 150, NOW).lines).toEqual([{ id: "a", qty: 99 }]);
  });

  it("drops lines whose item is no longer on the menu", () => {
    let cart = addToCart(emptyCart(NOW), "gone", NOW);
    cart = addToCart(cart, "a", NOW);
    expect(resolveCart(cart, menu).map((l) => l.item.id)).toEqual(["a"]);
  });

  it("totals priced items and flags unpriced ones", () => {
    let cart = setQty(emptyCart(NOW), "a", 2, NOW);
    cart = addToCart(cart, "b", NOW);
    expect(cartTotals(resolveCart(cart, menu))).toEqual({ count: 3, cents: 5180, hasUnpriced: true });
  });

  it("totals a cart of unpriced items as zero, flagged", () => {
    const cart = addToCart(emptyCart(NOW), "b", NOW);
    expect(cartTotals(resolveCart(cart, menu))).toEqual({ count: 1, cents: 0, hasUnpriced: true });
  });
});

describe("readCart", () => {
  it("starts empty on missing or broken data", () => {
    for (const raw of [null, "{", '{"lines":"x"}', '{"lines":[{"id":1,"qty":"2"}],"savedAt":1}']) {
      expect(readCart(raw, NOW)).toEqual(emptyCart(NOW));
    }
  });

  it("forgets a cart older than six hours", () => {
    const old = JSON.stringify({ lines: [{ id: "a", qty: 1 }], savedAt: NOW - CART_TTL_MS - 1 });
    expect(readCart(old, NOW)).toEqual(emptyCart(NOW));
  });

  it("keeps a recent cart", () => {
    const cart = { lines: [{ id: "a", qty: 2 }], savedAt: NOW - 60 * 60 * 1000 };
    expect(readCart(JSON.stringify(cart), NOW)).toEqual(cart);
  });
});
