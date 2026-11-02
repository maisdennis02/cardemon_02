// Pure rules for the option groups of a menu item (size, extras...), shared by
// the public page, the cart and the builder. A selection is a list of option ids.
// Design: docs/superpowers/specs/2026-11-02-adicionais-design.md

import type { MenuItem, OptionGroup } from "@/lib/menu";

export function hasGroups(item: MenuItem): boolean {
  return (item.groups?.length ?? 0) > 0;
}

// Canonical form (no repeats, sorted) so equal selections compare and key equal.
export function normalizeOpts(opts: string[]): string[] {
  return [...new Set(opts)].sort();
}

function allOptions(item: MenuItem) {
  return (item.groups ?? []).flatMap((g) => g.options);
}

export function selectionCents(item: MenuItem, opts: string[]): number {
  const chosen = new Set(opts);
  return allOptions(item).reduce(
    (sum, o) => sum + (chosen.has(o.id) ? o.priceCents : 0),
    0,
  );
}

// Every id belongs to the item, and each group's count is within [min, max].
export function validSelection(item: MenuItem, opts: string[]): boolean {
  const unique = normalizeOpts(opts);
  const known = new Set(allOptions(item).map((o) => o.id));
  if (!unique.every((id) => known.has(id))) return false;
  const chosen = new Set(unique);
  return (item.groups ?? []).every((g) => {
    const n = g.options.filter((o) => chosen.has(o.id)).length;
    return n >= g.min && n <= g.max;
  });
}

// "A partir de" price: base plus the cheapest way to satisfy required groups.
// `from` is true when a required group's choice can change the price.
export function fromPrice(item: MenuItem): {
  cents: number | null;
  from: boolean;
} {
  if (item.priceCents === null) return { cents: null, from: false };
  let cents = item.priceCents;
  let from = false;
  for (const g of item.groups ?? []) {
    if (g.min === 0) continue;
    const prices = g.options.map((o) => o.priceCents).sort((a, b) => a - b);
    cents += prices.slice(0, g.min).reduce((a, b) => a + b, 0);
    if (prices[0] !== prices[prices.length - 1]) from = true;
  }
  return { cents, from };
}

export function selectionSummary(
  item: MenuItem,
  opts: string[],
): { title: string; names: string[] }[] {
  const chosen = new Set(opts);
  return (item.groups ?? [])
    .map((g) => ({
      title: g.title,
      names: g.options.filter((o) => chosen.has(o.id)).map((o) => o.name),
    }))
    .filter((s) => s.names.length > 0);
}

export function choiceHint(group: OptionGroup): {
  kind: "one" | "exactly" | "upTo" | "range";
  min: number;
  max: number;
} {
  const max = Math.min(group.max, group.options.length);
  const { min } = group;
  const kind =
    min <= 1 && max === 1
      ? "one"
      : min === max
        ? "exactly"
        : min === 0
          ? "upTo"
          : "range";
  return { kind, min, max };
}
