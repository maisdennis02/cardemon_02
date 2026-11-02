import { describe, expect, it } from "vitest";
import type { Menu } from "@/lib/menu";
import {
  CART_TTL_MS,
  addToCart,
  cartTotals,
  emptyCart,
  lineKey,
  pruneCart,
  qtyOfItem,
  readCart,
  resolveCart,
  setQty,
} from "@/lib/cart";

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

const burger = (extra: { min: number }): Menu => ({
  v: 1,
  sections: [
    {
      id: "s1",
      title: "Lanches",
      items: [
        {
          id: "burger",
          name: "Burger",
          priceCents: 2000,
          groups: [
            { id: "g1", title: "Extras", min: extra.min, max: 3, options: [
              { id: "b", name: "Bacon", priceCents: 500 },
              { id: "d", name: "Dobro", priceCents: 600 },
            ] },
            { id: "g2", title: "Molho", min: 0, max: 1, options: [{ id: "s", name: "Sem", priceCents: 0 }] },
          ],
        },
      ],
    },
  ],
});

describe("cart with options", () => {
  it("keys a line by id alone when it has no options", () => {
    expect(lineKey("a", [])).toBe("a");
    expect(lineKey("a")).toBe("a");
    expect(lineKey("burger", ["d", "b"])).toBe("burger|b,d");
  });

  it("loads a cart saved before options existed", () => {
    const raw = JSON.stringify({ lines: [{ id: "a", qty: 2 }], savedAt: NOW });
    const lines = resolveCart(readCart(raw, NOW), menu);
    expect(lines.map((l) => ({ key: l.key, opts: l.opts, qty: l.qty }))).toEqual([
      { key: "a", opts: [], qty: 2 },
    ]);
  });

  it("merges equal selections in any order and splits different ones", () => {
    let cart = addToCart(emptyCart(NOW), "burger", NOW, ["d", "b"]);
    cart = addToCart(cart, "burger", NOW, ["d", "b"]);
    cart = addToCart(cart, "burger", NOW, ["b", "d"]);
    expect(cart.lines).toEqual([{ id: "burger", opts: ["b", "d"], qty: 3 }]);
    cart = addToCart(cart, "burger", NOW, ["s"]);
    expect(cart.lines).toHaveLength(2);
    expect(qtyOfItem(resolveCart(cart, burger({ min: 0 })), "burger")).toBe(4);
  });

  it("sets or removes one line by key only", () => {
    let cart = addToCart(emptyCart(NOW), "burger", NOW, ["b"]);
    cart = addToCart(cart, "burger", NOW, ["s"]);
    cart = setQty(cart, lineKey("burger", ["s"]), 0, NOW);
    expect(cart.lines).toEqual([{ id: "burger", opts: ["b"], qty: 1 }]);
  });

  it("drops lines whose selection is no longer valid", () => {
    let cart = addToCart(emptyCart(NOW), "burger", NOW, ["d", "b"]);
    cart = addToCart(cart, "burger", NOW, ["s"]);
    const noD: Menu = JSON.parse(JSON.stringify(burger({ min: 0 })));
    noD.sections[0].items[0].groups![0].options.splice(1, 1);
    expect(resolveCart(cart, noD).map((l) => l.key)).toEqual(["burger|s"]);
    expect(resolveCart(cart, burger({ min: 1 })).map((l) => l.key)).toEqual(["burger|b,d"]);
  });

  it("totals the chosen options per unit", () => {
    const cart = addToCart(addToCart(emptyCart(NOW), "burger", NOW, ["d", "b"]), "burger", NOW, ["b", "d"]);
    expect(cartTotals(resolveCart(cart, burger({ min: 0 })))).toEqual({
      count: 2,
      cents: 2 * (2000 + 1100),
      hasUnpriced: false,
    });
  });

  it("keeps an unpriced item unpriced even with paid options", () => {
    const item = { id: "x", name: "X", priceCents: null, groups: burger({ min: 0 }).sections[0].items[0].groups };
    expect(cartTotals([{ item, opts: ["b"], qty: 1 }])).toEqual({ count: 1, cents: 0, hasUnpriced: true });
  });
});

// Final review #1: the card count must agree with the order sheet, which only
// shows lines resolveCart keeps; and what is stored never keeps a dead line.
describe("cart after the owner edits the menu", () => {
  const plain: Menu = { v: 1, sections: [{ id: "s1", title: null, items: [{ id: "burger", name: "Burger", priceCents: 2000 }] }] };

  it("counts an item from the resolved lines only", () => {
    let cart = addToCart(emptyCart(NOW), "burger", NOW, ["b"], 2);
    cart = addToCart(cart, "burger", NOW, [], 1);
    // Owner removed every group: the line with options is gone from the order.
    expect(qtyOfItem(resolveCart(cart, plain), "burger")).toBe(1);
    expect(cartTotals(resolveCart(cart, plain)).count).toBe(1);
  });

  it("prunes lines the order would drop, so the card's + and the order agree", () => {
    const stale = addToCart(emptyCart(NOW), "burger", NOW, ["b"], 2);
    const pruned = pruneCart(stale, plain);
    expect(pruned.lines).toEqual([]);
    const next = setQty(pruned, "burger", qtyOfItem(resolveCart(pruned, plain), "burger") + 1, NOW);
    expect(qtyOfItem(resolveCart(next, plain), "burger")).toBe(1);
    expect(cartTotals(resolveCart(next, plain)).count).toBe(1);
    expect(next.lines).toEqual([{ id: "burger", qty: 1 }]);
  });

  it("drops a line whose chosen option was deleted and keeps the rest", () => {
    let cart = addToCart(emptyCart(NOW), "burger", NOW, ["d"]);
    cart = addToCart(cart, "burger", NOW, ["s"], 2);
    const noD: Menu = JSON.parse(JSON.stringify(burger({ min: 0 })));
    noD.sections[0].items[0].groups![0].options.splice(1, 1);
    expect(pruneCart(cart, noD).lines).toEqual([{ id: "burger", opts: ["s"], qty: 2 }]);
    expect(qtyOfItem(resolveCart(cart, noD), "burger")).toBe(2);
  });

  it("stores lines canonically: no empty opts, no bad ids, equal selections merged", () => {
    const cart = {
      lines: [
        { id: "a", opts: [] as string[], qty: 2 },
        { id: "a", opts: [""], qty: 1 },
        { id: "burger", opts: ["d", "b"], qty: 1 },
        { id: "burger", opts: ["b", "d"], qty: 2 },
      ],
      savedAt: NOW,
    };
    const both: Menu = { v: 1, sections: [{ ...burger({ min: 0 }).sections[0], items: [...burger({ min: 0 }).sections[0].items, ...menu.sections[0].items] }] };
    expect(pruneCart(cart, both)).toEqual({
      lines: [
        { id: "a", qty: 2 },
        { id: "burger", opts: ["b", "d"], qty: 3 },
      ],
      savedAt: NOW,
    });
  });

  it("leaves a cart from before option groups as it was", () => {
    const old = { lines: [{ id: "a", qty: 2 }, { id: "b", qty: 1 }], savedAt: NOW };
    expect(pruneCart(old, menu)).toEqual(old);
  });
});
