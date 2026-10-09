// The diner's cart on a text menu. Lives only in the diner's browser
// (localStorage, one key per menu), so ordering never touches the database
// and the public page stays a cached, static-friendly page.
// Design: docs/superpowers/specs/2026-10-10-pedido-whatsapp-design.md

import { z } from "zod";
import type { Menu, MenuItem } from "@/lib/menu";

export type Cart = { lines: { id: string; qty: number }[]; savedAt: number };

export const CART_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_QTY = 99;

const CartSchema = z.object({
  lines: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(MAX_QTY) })),
  savedAt: z.number(),
});

export function emptyCart(now: number): Cart {
  return { lines: [], savedAt: now };
}

export function setQty(cart: Cart, id: string, qty: number, now: number): Cart {
  const clamped = Math.min(Math.floor(qty), MAX_QTY);
  const exists = cart.lines.some((l) => l.id === id);
  const lines =
    clamped <= 0
      ? cart.lines.filter((l) => l.id !== id)
      : exists
        ? cart.lines.map((l) => (l.id === id ? { id, qty: clamped } : l))
        : [...cart.lines, { id, qty: clamped }];
  return { lines, savedAt: now };
}

export function addToCart(cart: Cart, id: string, now: number): Cart {
  const current = cart.lines.find((l) => l.id === id)?.qty ?? 0;
  return setQty(cart, id, current + 1, now);
}

// Lines whose item left the menu (deleted, or now past the free-plan cut) are
// dropped: the diner can only order what the page shows.
export function resolveCart(cart: Cart, menu: Menu): { item: MenuItem; qty: number }[] {
  const items = new Map(menu.sections.flatMap((s) => s.items.map((i) => [i.id, i] as const)));
  return cart.lines.flatMap((l) => {
    const item = items.get(l.id);
    return item ? [{ item, qty: l.qty }] : [];
  });
}

export function cartTotals(lines: { item: MenuItem; qty: number }[]): {
  count: number;
  cents: number;
  hasUnpriced: boolean;
} {
  return lines.reduce(
    (t, { item, qty }) => ({
      count: t.count + qty,
      cents: t.cents + (item.priceCents ?? 0) * qty,
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
