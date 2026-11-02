// The diner's cart on a text menu. Lives only in the diner's browser
// (localStorage, one key per menu), so ordering never touches the database
// and the public page stays a cached, static-friendly page.
// Design: docs/superpowers/specs/2026-10-10-pedido-whatsapp-design.md

import { z } from "zod";
import { MAX_GROUPS_PER_ITEM, MAX_OPTIONS_PER_GROUP, type Menu, type MenuItem } from "@/lib/menu";
import { normalizeOpts, selectionCents, validSelection } from "@/lib/menu-options";

export type CartLine = { id: string; opts?: string[]; qty: number };
export type Cart = { lines: CartLine[]; savedAt: number };

export const CART_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_QTY = 99;

// `opts` is optional so carts saved before option groups existed keep loading.
const CartSchema = z.object({
  lines: z.array(
    z.object({
      id: z.string(),
      opts: z.array(z.string()).max(MAX_GROUPS_PER_ITEM * MAX_OPTIONS_PER_GROUP).optional(),
      qty: z.number().int().min(1).max(MAX_QTY),
    }),
  ),
  savedAt: z.number(),
});

export function emptyCart(now: number): Cart {
  return { lines: [], savedAt: now };
}

// One cart line per item + selection. With no options the key is the bare id,
// so callers that only know item ids keep working.
export function lineKey(id: string, opts: string[] = []): string {
  const norm = normalizeOpts(opts);
  return norm.length === 0 ? id : `${id}|${norm.join(",")}`;
}

const keyOf = (l: CartLine) => lineKey(l.id, l.opts);

export function setQty(cart: Cart, key: string, qty: number, now: number): Cart {
  const clamped = Math.min(Math.floor(qty), MAX_QTY);
  const exists = cart.lines.some((l) => keyOf(l) === key);
  if (clamped <= 0) return { lines: cart.lines.filter((l) => keyOf(l) !== key), savedAt: now };
  if (exists) {
    return { lines: cart.lines.map((l) => (keyOf(l) === key ? { ...l, qty: clamped } : l)), savedAt: now };
  }
  // Item ids never contain "|" (generated), so the key splits back losslessly.
  const [id, rest] = key.split("|");
  const line: CartLine = rest ? { id, opts: rest.split(","), qty: clamped } : { id, qty: clamped };
  return { lines: [...cart.lines, line], savedAt: now };
}

export function addToCart(cart: Cart, id: string, now: number, opts: string[] = [], qty = 1): Cart {
  const key = lineKey(id, opts);
  const current = cart.lines.find((l) => keyOf(l) === key)?.qty ?? 0;
  return setQty(cart, key, current + qty, now);
}

export type ResolvedLine = { key: string; item: MenuItem; opts: string[]; qty: number };

// How many of an item the order holds, counted from the RESOLVED lines, so the
// card always agrees with the order sheet and the bar.
export function qtyOfItem(lines: ResolvedLine[], itemId: string): number {
  return lines.reduce((n, l) => n + (l.item.id === itemId ? l.qty : 0), 0);
}

// Lines whose item left the menu (deleted, or now past the free-plan cut) are
// dropped: the diner can only order what the page shows. Same for a selection
// the owner has since made invalid (option deleted, group became required).
export function resolveCart(cart: Cart, menu: Menu): ResolvedLine[] {
  const items = new Map(menu.sections.flatMap((s) => s.items.map((i) => [i.id, i] as const)));
  return cart.lines.flatMap((l) => {
    const item = items.get(l.id);
    const opts = normalizeOpts(l.opts ?? []);
    if (!item || !validSelection(item, opts)) return [];
    return [{ key: lineKey(l.id, opts), item, opts, qty: l.qty }];
  });
}

// The cart as it should be stored: only the lines resolveCart keeps, in
// canonical form (sorted opts, none when empty), equal selections merged.
// Written on every save so a line the owner's edits made invalid never
// lingers, hidden, under a card's count.
export function pruneCart(cart: Cart, menu: Menu): Cart {
  const lines: CartLine[] = [];
  for (const r of resolveCart(cart, menu)) {
    const same = lines.find((l) => lineKey(l.id, l.opts) === r.key);
    if (same) same.qty = Math.min(same.qty + r.qty, MAX_QTY);
    else lines.push(r.opts.length ? { id: r.item.id, opts: r.opts, qty: r.qty } : { id: r.item.id, qty: r.qty });
  }
  return { lines, savedAt: cart.savedAt };
}

// An unpriced item ("a combinar") stays unpriced even with paid options.
export function cartTotals(lines: { item: MenuItem; opts?: string[]; qty: number }[]): {
  count: number;
  cents: number;
  hasUnpriced: boolean;
} {
  return lines.reduce<{ count: number; cents: number; hasUnpriced: boolean }>(
    (t, { item, opts = [], qty }) => ({
      count: t.count + qty,
      cents: t.cents + (item.priceCents === null ? 0 : (item.priceCents + selectionCents(item, opts)) * qty),
      hasUnpriced: t.hasUnpriced || item.priceCents === null,
    }),
    { count: 0, cents: 0, hasUnpriced: false },
  );
}

export function readCart(raw: string | null, now: number): Cart {
  if (!raw) return emptyCart(now);
  try {
    const parsed = CartSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || now - parsed.data.savedAt > CART_TTL_MS) return emptyCart(now);
    return parsed.data;
  } catch {
    return emptyCart(now);
  }
}
