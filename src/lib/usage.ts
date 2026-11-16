import { prisma } from "@/lib/prisma";
import { countMenuEvents, type MenuEventCount } from "@/lib/menu-view-counts";
import { isTestEmail, maskEmail } from "@/lib/admin";
import { isPro } from "@/lib/pricing";
import { effectiveMode, isPublished, publishedItemCount, type MenuMode } from "@/lib/menu";

/**
 * Who is using menulala today: every restaurant, with what diners did on its
 * menu in the last N days.
 *
 * The funnel (src/lib/funnel.ts) cannot answer this. It lists the accounts
 * *created* in its window, so a restaurant that signed up months ago and is
 * still opened every night never shows there. This lists every restaurant
 * regardless of age and counts the events of the window.
 *
 * Crawler bursts are left out, as everywhere else (countMenuEvents). A view is
 * a menu opened; it includes the owner looking at their own menu.
 */

export type UsageRestaurant = {
  slug: string;
  name: string;
  owner: string;
  createdAt: string;
  /** What the public page shows; null when nothing is published. */
  mode: MenuMode | null;
  images: number;
  items: number;
  pro: boolean;
  /** The owner's own account (admin or FUNNEL_TEST_EMAILS): listed, never counted. */
  test: boolean;
  /** Menu opened, in the window and since the beginning. */
  views: number;
  viewsAllTime: number;
  /** Taps on the WhatsApp button, in the window. */
  whatsapp: number;
  /** Orders sent to WhatsApp from the cart, in the window. */
  orders: number;
  ordersAllTime: number;
  /** Taps on Instagram and on delivery apps, in the window. */
  otherClicks: number;
  /** Latest menu view, any date; null when it was never opened. */
  lastViewAt: string | null;
};

export type Usage = {
  window: { days: number; fromUtc: string; toUtc: string };
  totals: {
    restaurants: number;
    published: number;
    /** Restaurants whose menu was opened at least once in the window. */
    viewed: number;
    /** Restaurants that got at least one order or WhatsApp tap in the window. */
    contacted: number;
    views: number;
    whatsapp: number;
    orders: number;
    /** Test restaurants, left out of every count above. */
    testRestaurants: number;
  };
  /** Most opened first. */
  restaurants: UsageRestaurant[];
};

/** One restaurant as the database gives it, already joined. */
export type UsageRow = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  menuMode: string;
  menuPublished: unknown;
  images: number;
  ownerEmail: string | null;
  ownerProExpiresAt: Date | null;
};

const OWN_KINDS = new Set(["view", "click_whatsapp", "click_order"]);

// Pure: everything the endpoint reports, from rows already loaded.
export function buildUsage(
  rows: UsageRow[],
  events: MenuEventCount[],
  window: { days: number; from: Date; to: Date },
): Usage {
  const byRestaurant = new Map<string, MenuEventCount[]>();
  for (const e of events) byRestaurant.set(e.restaurantId, [...(byRestaurant.get(e.restaurantId) ?? []), e]);

  const listed = rows.map((r): UsageRestaurant => {
    const mine = byRestaurant.get(r.id) ?? [];
    const of = (kind: string) => mine.find((e) => e.kind === kind);
    const items = publishedItemCount(r.menuPublished);
    const content = { menuMode: r.menuMode, imageCount: r.images, publishedItemCount: items };
    const view = of("view");
    return {
      slug: r.slug,
      name: r.name,
      owner: maskEmail(r.ownerEmail),
      createdAt: r.createdAt.toISOString(),
      mode: isPublished(content) ? effectiveMode(content) : null,
      images: r.images,
      items,
      pro: isPro({ proExpiresAt: r.ownerProExpiresAt }),
      test: isTestEmail(r.ownerEmail),
      views: view?.recent ?? 0,
      viewsAllTime: view?.total ?? 0,
      whatsapp: of("click_whatsapp")?.recent ?? 0,
      orders: of("click_order")?.recent ?? 0,
      ordersAllTime: of("click_order")?.total ?? 0,
      otherClicks: mine.filter((e) => !OWN_KINDS.has(e.kind)).reduce((n, e) => n + e.recent, 0),
      lastViewAt: view ? new Date(view.lastAt).toISOString() : null,
    };
  });

  const restaurants = [...listed].sort(
    (a, b) => b.views - a.views || b.viewsAllTime - a.viewsAllTime || a.slug.localeCompare(b.slug),
  );
  const counted = restaurants.filter((r) => !r.test);

  return {
    window: { days: window.days, fromUtc: window.from.toISOString(), toUtc: window.to.toISOString() },
    totals: {
      restaurants: counted.length,
      published: counted.filter((r) => r.mode !== null).length,
      viewed: counted.filter((r) => r.views > 0).length,
      contacted: counted.filter((r) => r.orders + r.whatsapp > 0).length,
      views: counted.reduce((n, r) => n + r.views, 0),
      whatsapp: counted.reduce((n, r) => n + r.whatsapp, 0),
      orders: counted.reduce((n, r) => n + r.orders, 0),
      testRestaurants: restaurants.length - counted.length,
    },
    restaurants,
  };
}

export async function loadUsage(days: number): Promise<Usage> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  // Dozens of restaurants: one small scan, nothing worth paginating.
  const found = await prisma.restaurant.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      menuMode: true,
      menuPublished: true,
      _count: { select: { images: true } },
      owner: { select: { email: true, proExpiresAt: true } },
    },
  });
  const events = await countMenuEvents(found.map((r) => r.id), from);

  const rows: UsageRow[] = found.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    createdAt: r.createdAt,
    menuMode: r.menuMode,
    menuPublished: r.menuPublished,
    images: r._count.images,
    ownerEmail: r.owner.email,
    ownerProExpiresAt: r.owner.proExpiresAt,
  }));

  return buildUsage(rows, events, { days, from, to });
}
