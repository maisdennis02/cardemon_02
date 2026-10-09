// An order from a text menu, sent to the restaurant as a WhatsApp message.
// Pure: the page passes in the dictionary strings, so the same rules run in
// tests and in the browser, in all three languages.
// Design: docs/superpowers/specs/2026-10-10-pedido-whatsapp-design.md §3

import { format } from "@/i18n/config";
import { formatPrice, type MenuItem } from "@/lib/menu";

export type OrderDetails = {
  name: string;
  mode: "delivery" | "pickup" | null;
  address: string;
  table: string;
  notes: string;
};

export type OrderLabels = {
  title: string; // "{name}"
  total: string; // "{total}"
  toArrange: string;
  plusToArrange: string; // "{total}"
  name: string;
  delivery: string;
  pickup: string;
  pickupTable: string; // "{table}"
  notes: string;
  footer: string; // "{url}"
};

export function orderErrors(d: OrderDetails): { name?: true; mode?: true; address?: true } {
  return {
    ...(!d.name.trim() && { name: true as const }),
    ...(!d.mode && { mode: true as const }),
    ...(d.mode === "delivery" && !d.address.trim() && { address: true as const }),
  };
}

export function buildOrderMessage({
  restaurantName,
  slug,
  country,
  lines,
  details,
  labels,
}: {
  restaurantName: string;
  slug: string;
  country: string | null;
  lines: { item: MenuItem; qty: number }[];
  details: OrderDetails;
  labels: OrderLabels;
}): string {
  const priced = lines.filter((l) => l.item.priceCents !== null);
  const cents = priced.reduce((sum, l) => sum + (l.item.priceCents ?? 0) * l.qty, 0);
  const hasUnpriced = priced.length < lines.length;
  const total =
    priced.length === 0
      ? labels.toArrange
      : hasUnpriced
        ? format(labels.plusToArrange, { total: formatPrice(cents, country) })
        : formatPrice(cents, country);

  const table = details.table.trim();
  const where =
    details.mode === "delivery"
      ? `${labels.delivery}: ${details.address.trim()}`
      : table
        ? format(labels.pickupTable, { table })
        : labels.pickup;
  const notes = details.notes.trim();

  return [
    `*${format(labels.title, { name: restaurantName })}*`,
    "",
    ...lines.map(({ item, qty }) =>
      `${qty}x ${item.name} — ${item.priceCents === null ? labels.toArrange : formatPrice(item.priceCents * qty, country)}`,
    ),
    "",
    `*${format(labels.total, { total })}*`,
    "",
    `${labels.name}: ${details.name.trim()}`,
    where,
    ...(notes ? [`${labels.notes}: ${notes}`] : []),
    "",
    format(labels.footer, { url: `menulala.com/m/${slug}` }),
  ].join("\n");
}

export function whatsappOrderUrl(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
