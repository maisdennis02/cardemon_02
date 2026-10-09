import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";
import ptBR from "@/i18n/dictionaries/pt-BR";
import { cartTotals } from "@/lib/cart";
import { buildOrderMessage } from "@/lib/order";
import { LANDING_DEMO, demoOrderLines, demoOrderMessage } from "@/lib/landing-demo";

const DICTS = { en, es, "pt-BR": ptBR } as const;

describe.each(LOCALES)("landing demo (%s)", (locale) => {
  const demo = LANDING_DEMO[locale];
  const t = DICTS[locale];

  it("orders items that are on its own menu", () => {
    const ids = new Set(demo.menu.sections.flatMap((s) => s.items.map((i) => i.id)));
    for (const line of demo.order) expect(ids.has(line.id), line.id).toBe(true);
  });

  it("shows exactly the message the product would send", () => {
    const lines = demoOrderLines(locale);
    expect(demoOrderMessage(locale, t)).toBe(
      buildOrderMessage({
        restaurantName: t.landing.demoRestaurant,
        slug: t.landing.demoSlug,
        country: demo.country,
        lines,
        details: demo.details,
        labels: {
          title: t.menu.order.msgTitle,
          total: t.menu.order.msgTotal,
          toArrange: t.menu.order.toArrange,
          plusToArrange: t.menu.order.plusToArrange,
          name: t.menu.order.msgName,
          delivery: t.menu.order.msgDelivery,
          pickup: t.menu.order.msgPickup,
          pickupTable: t.menu.order.msgPickupTable,
          notes: t.menu.order.msgNotes,
          footer: t.menu.order.msgFooter,
          confirm: t.menu.order.msgConfirm,
        },
      }),
    );
    expect(demoOrderMessage(locale, t).startsWith("🛎️🛎️🛎️")).toBe(true);
    expect(cartTotals(lines).count).toBeGreaterThan(1);
  });
});
