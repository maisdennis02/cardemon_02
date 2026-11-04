// Pure rules for the option groups of a menu item (size, extras...), shared by
// the public page, the cart and the builder. A selection is a list of option ids.
// Design: docs/superpowers/specs/2026-11-02-adicionais-design.md

import { formatPrice, type MenuItem, type OptionGroup } from "@/lib/menu";

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

function countIn(group: OptionGroup, opts: string[]): number {
  const chosen = new Set(opts);
  return group.options.filter((o) => chosen.has(o.id)).length;
}

// A tap on an option: a one-choice group swaps its choice, a multi group
// toggles it, and nothing is added past the group's (effective) max.
export function toggleOption(
  item: MenuItem,
  opts: string[],
  groupId: string,
  optionId: string,
): string[] {
  const group = item.groups?.find((g) => g.id === groupId);
  if (!group) return opts;
  const max = Math.min(group.max, group.options.length);
  const ids = new Set(group.options.map((o) => o.id));
  if (opts.includes(optionId)) {
    // Re-tapping the only choice of a required one-choice group keeps it.
    if (max === 1 && group.min >= 1) return opts;
    return normalizeOpts(opts.filter((id) => id !== optionId));
  }
  if (max === 1) return normalizeOpts([...opts.filter((id) => !ids.has(id)), optionId]);
  if (countIn(group, opts) >= max) return opts;
  return normalizeOpts([...opts, optionId]);
}

// The first group (in order) that still needs a choice, or null.
export function firstMissingGroup(item: MenuItem, opts: string[]): string | null {
  return (item.groups ?? []).find((g) => countIn(g, opts) < g.min)?.id ?? null;
}

// The groups as read-only information, one line per group: "Tamanho: Simples ·
// Duplo +R$ 8,00". Shared by the printed menu and the static card (no
// ordering), so the two always say the same.
export function groupInfoLines(item: MenuItem, country: string | null): string[] {
  return (item.groups ?? []).map(
    (g) =>
      `${g.title}: ${g.options
        .map((o) => (o.priceCents > 0 ? `${o.name} +${formatPrice(o.priceCents, country)}` : o.name))
        .join(" · ")}`,
  );
}
