// The example menu and order drawn on the landing page, per language. Generic
// dishes, no restaurant name (the dictionary's "Seu Restaurante"), labelled as
// an example on the page. The WhatsApp message is built by the product's own
// buildOrderMessage, so the landing can never show a message the product
// doesn't send.

import type { Dictionary } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type { Menu, MenuItem } from "@/lib/menu";
import { buildOrderMessage, orderLabels, type OrderDetails } from "@/lib/order";

export type LandingDemo = {
  country: string;
  menu: Menu;
  order: { id: string; qty: number }[];
  details: OrderDetails;
};

const menu = (sections: [string, [string, string, number][]][]): Menu => ({
  v: 1,
  sections: sections.map(([title, items], s) => ({
    id: `s${s}`,
    title,
    items: items.map(([id, name, priceCents]) => ({ id, name, priceCents })),
  })),
});

export const LANDING_DEMO: Record<Locale, LandingDemo> = {
  "pt-BR": {
    country: "BR",
    menu: menu([
      ["Lanches", [["a", "X-Burguer", 2590], ["b", "X-Salada", 2790], ["c", "Batata frita", 1890]]],
      ["Bebidas", [["d", "Coca-Cola lata", 790], ["e", "Suco de laranja", 990]]],
    ]),
    order: [
      { id: "a", qty: 2 },
      { id: "d", qty: 1 },
    ],
    details: { name: "Ana", mode: "delivery", address: "Rua das Flores, 123", table: "", notes: "sem cebola" },
  },
  es: {
    country: "MX",
    menu: menu([
      ["Tacos", [["a", "Tacos al pastor", 8500], ["b", "Quesadilla", 6500], ["c", "Guacamole", 7000]]],
      ["Bebidas", [["d", "Agua de horchata", 3500], ["e", "Refresco", 3000]]],
    ]),
    order: [
      { id: "a", qty: 2 },
      { id: "d", qty: 1 },
    ],
    details: { name: "Lucía", mode: "pickup", address: "", table: "4", notes: "sin cebolla" },
  },
  en: {
    country: "US",
    menu: menu([
      ["Burgers", [["a", "Cheeseburger", 1250], ["b", "Veggie burger", 1150], ["c", "Fries", 450]]],
      ["Drinks", [["d", "Lemonade", 350], ["e", "Iced tea", 300]]],
    ]),
    order: [
      { id: "a", qty: 2 },
      { id: "d", qty: 1 },
    ],
    details: { name: "Sam", mode: "delivery", address: "12 Oak Street", table: "", notes: "no onions" },
  },
};

export function demoOrderLines(locale: Locale): { item: MenuItem; qty: number }[] {
  const demo = LANDING_DEMO[locale];
  const items = new Map(demo.menu.sections.flatMap((s) => s.items.map((i) => [i.id, i] as const)));
  return demo.order.map(({ id, qty }) => ({ item: items.get(id)!, qty }));
}

export function demoOrderMessage(locale: Locale, t: Dictionary): string {
  const demo = LANDING_DEMO[locale];
  return buildOrderMessage({
    restaurantName: t.landing.demoRestaurant,
    slug: t.landing.demoSlug,
    country: demo.country,
    lines: demoOrderLines(locale),
    details: demo.details,
    labels: orderLabels(t.menu.order),
  });
}
