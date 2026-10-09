// Turns what an owner types (or dictates) into menu items. The rule is to be
// sure or say nothing: a line whose price is ambiguous becomes an item with no
// price, which the builder marks for completion. A wrong price shown to diners
// is worse than a missing one.
// Design: docs/superpowers/specs/2026-10-09-construtor-de-cardapio-design.md §3

import type { MenuItem, MenuSection } from "@/lib/menu";

const NAME_MAX = 80;
const TITLE_MAX = 60;

// A price sits at the very end of the line and is preceded by a space (or a
// currency sign), so "500ml", "35cm" and "1.250" never read as prices.
const CURRENCY = String.raw`(?:^|\s)(?:r\$\s*|\$\s*)?`;
// "25 e 90", "25 reais e 90", "25 reais e 90 centavos"
const REAIS_AND_CENTS = new RegExp(`${CURRENCY}(\\d{1,5})\\s+(?:reais\\s+)?e\\s+(\\d{1,2})(?:\\s+centavos)?$`, "i");
// "25", "25,9", "25,90", "25.90", optionally followed by "reais"
const DECIMAL = new RegExp(`${CURRENCY}(\\d{1,5})(?:[.,](\\d{1,2}))?(?:\\s+reais)?$`, "i");

function cents(whole: string, fraction: string | undefined): number {
  const frac = fraction ? (fraction.length === 1 ? Number(fraction) * 10 : Number(fraction)) : 0;
  return Number(whole) * 100 + frac;
}

export function parseItemLine(line: string): { name: string; priceCents: number | null } | null {
  const text = line.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const m = REAIS_AND_CENTS.exec(text) ?? DECIMAL.exec(text);
  if (m) {
    const name = text
      .slice(0, m.index)
      .replace(/[\s\-–:…]+$/, "")
      .trim();
    if (name) return { name: name.slice(0, NAME_MAX), priceCents: cents(m[1], m[2]) };
  }
  return { name: text.slice(0, NAME_MAX), priceCents: null };
}

// "Colar lista": one item per line. An unpriced line is a section title when
// the next line has a price; otherwise it is an item still missing its price.
export function parsePastedList(text: string, newId: () => string): MenuSection[] {
  const lines = text
    .split(/\r?\n/)
    .map(parseItemLine)
    .filter((l): l is { name: string; priceCents: number | null } => l !== null);

  const sections: MenuSection[] = [];
  let current: MenuSection | null = null;

  lines.forEach((line, i) => {
    const next = lines[i + 1];
    if (line.priceCents === null && next && next.priceCents !== null) {
      current = { id: newId(), title: line.name.slice(0, TITLE_MAX), items: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { id: newId(), title: null, items: [] };
      sections.push(current);
    }
    const item: MenuItem = { id: newId(), name: line.name, priceCents: line.priceCents };
    current.items.push(item);
  });

  return sections;
}
