import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/admin";
import { acquisitionSource, asAcquisition, isAdClick } from "@/lib/acquisition";
import { isPro } from "@/lib/pricing";
import { effectiveMode, isPublished, publishedItemCount, type MenuMode } from "@/lib/menu";

/**
 * The ground truth behind an ad run, assembled from the tables the product
 * already writes — accounts, restaurants, published menus (photos or text),
 * menu views and orders sent, plan state.
 *
 * There is deliberately no event table behind this. menulala's funnel is its
 * own domain model: an account row *is* a signup, a restaurant with a
 * published menu — photos or a text menu — *is* an activation, proExpiresAt
 * *is* a sale. Writing a second copy of that
 * into an events table would double the Neon write volume on exactly the
 * traffic a paid campaign buys, and the free plan has already run out of
 * compute hours once. Pre-signup behaviour (who saw the landing page, who
 * clicked the CTA, who abandoned the form) lives in PostHog instead, where the
 * replay explains it as well as counts it.
 *
 * What this cannot answer, and the daily read must not pretend otherwise:
 * *when* a subscription started. We store proExpiresAt, not a start date, so
 * "sales yesterday" comes from Stripe, not from here.
 */

export type FunnelStatus =
  | "no_restaurant"
  | "no_menu"
  | "live"
  | "viewed"
  | "paying";

export type FunnelAccount = {
  email: string;
  createdAt: string;
  source: string;
  ad: boolean;
  gclid: string | null;
  campaign: string | null;
  landing: string | null;
  slug: string | null;
  /** What the public page shows: photos or a text menu; null when nothing is published. */
  mode: MenuMode | null;
  images: number;
  /** Items on the published text menu. */
  items: number;
  /** Menu opened by a diner (or the owner); clicks are not counted here. */
  views: number;
  /** Orders a diner sent to the restaurant's WhatsApp from the menu. */
  orders: number;
  status: FunnelStatus;
};

export type FunnelSource = {
  source: string;
  signups: number;
  onboarded: number;
  published: number;
  viewed: number;
  /** Accounts with at least one order sent. */
  ordered: number;
  paying: number;
};

export type Funnel = {
  window: { days: number; fromUtc: string; toUtc: string };
  totals: {
    signups: number;
    adSignups: number;
    onboarded: number;
    published: number;
    viewed: number;
    ordered: number;
    /** Orders sent across these accounts (intent: the diner still taps send in WhatsApp). */
    orders: number;
    paying: number;
    /** Active Pro accounts across the whole product, not just this window. */
    payingNow: number;
  };
  sources: FunnelSource[];
  /** One row per UTC day: accounts created, and how far they have got since. */
  daily: { date: string; signups: number; adSignups: number; published: number }[];
  accounts: FunnelAccount[];
};

/** One account as the database gives it, already joined. */
export type FunnelUserRow = {
  email: string;
  createdAt: Date;
  acquisition: unknown;
  proExpiresAt: Date | null;
  restaurant: {
    slug: string;
    menuMode: string;
    menuPublished: unknown;
    images: number;
    views: number;
    orders: number;
  } | null;
};

function accountFor(user: FunnelUserRow): FunnelAccount {
  const acq = asAcquisition(user.acquisition);
  const r = user.restaurant;
  const items = r ? publishedItemCount(r.menuPublished) : 0;
  const content = r && { menuMode: r.menuMode, imageCount: r.images, publishedItemCount: items };
  const published = !!content && isPublished(content);
  const status: FunnelStatus = isPro(user)
    ? "paying"
    : !r
      ? "no_restaurant"
      : !published
        ? "no_menu"
        : r.views > 0
          ? "viewed"
          : "live";
  return {
    email: maskEmail(user.email),
    createdAt: user.createdAt.toISOString(),
    source: acquisitionSource(acq),
    ad: isAdClick(acq),
    gclid: acq?.gclid ?? acq?.gbraid ?? acq?.wbraid ?? null,
    campaign: acq?.utm_campaign ?? null,
    landing: acq?.landing ?? null,
    slug: r?.slug ?? null,
    mode: content && published ? effectiveMode(content) : null,
    images: r?.images ?? 0,
    items,
    views: r?.views ?? 0,
    orders: r?.orders ?? 0,
    status,
  };
}

const isPublishedAccount = (a: FunnelAccount) => a.mode !== null;

// Pure: everything the endpoint reports, from rows already loaded.
export function buildFunnel(
  users: FunnelUserRow[],
  payingNow: number,
  window: { days: number; from: Date; to: Date },
): Funnel {
  const accounts = users.map(accountFor);

  const bySource = new Map<string, FunnelSource>();
  for (const a of accounts) {
    const row = bySource.get(a.source) ?? {
      source: a.source,
      signups: 0,
      onboarded: 0,
      published: 0,
      viewed: 0,
      ordered: 0,
      paying: 0,
    };
    row.signups += 1;
    if (a.status !== "no_restaurant") row.onboarded += 1;
    if (isPublishedAccount(a)) row.published += 1;
    if (a.views > 0) row.viewed += 1;
    if (a.orders > 0) row.ordered += 1;
    if (a.status === "paying") row.paying += 1;
    bySource.set(a.source, row);
  }

  const byDay = new Map<string, { date: string; signups: number; adSignups: number; published: number }>();
  for (const a of accounts) {
    const date = a.createdAt.slice(0, 10);
    const row = byDay.get(date) ?? { date, signups: 0, adSignups: 0, published: 0 };
    row.signups += 1;
    if (a.ad) row.adSignups += 1;
    if (isPublishedAccount(a)) row.published += 1;
    byDay.set(date, row);
  }

  return {
    window: { days: window.days, fromUtc: window.from.toISOString(), toUtc: window.to.toISOString() },
    totals: {
      signups: accounts.length,
      adSignups: accounts.filter((a) => a.ad).length,
      onboarded: accounts.filter((a) => a.status !== "no_restaurant").length,
      published: accounts.filter(isPublishedAccount).length,
      viewed: accounts.filter((a) => a.views > 0).length,
      ordered: accounts.filter((a) => a.orders > 0).length,
      orders: accounts.reduce((n, a) => n + a.orders, 0),
      paying: accounts.filter((a) => a.status === "paying").length,
      payingNow,
    },
    sources: [...bySource.values()].sort((a, b) => b.signups - a.signups),
    daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    accounts,
  };
}

export async function loadFunnel(days: number): Promise<Funnel> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  // The user base is in the dozens, so these are small scans over indexed
  // columns rather than anything worth paginating.
  const [users, payingNow] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "desc" },
      select: {
        email: true,
        createdAt: true,
        acquisition: true,
        proExpiresAt: true,
        restaurants: {
          select: {
            id: true,
            slug: true,
            menuMode: true,
            menuPublished: true,
            _count: { select: { images: true } },
          },
        },
      },
    }),
    prisma.user.count({ where: { proExpiresAt: { gt: new Date() } } }),
  ]);

  // Views and orders apart: a click on WhatsApp or delivery is not a view.
  const ids = users.flatMap((u) => u.restaurants.map((r) => r.id));
  const events = ids.length
    ? await prisma.menuView.groupBy({
        by: ["restaurantId", "kind"],
        where: { restaurantId: { in: ids }, kind: { in: ["view", "click_order"] } },
        _count: { _all: true },
      })
    : [];
  const countOf = (id: string, kind: string) =>
    events.find((e) => e.restaurantId === id && e.kind === kind)?._count._all ?? 0;

  const rows: FunnelUserRow[] = users.map((u) => {
    const r = u.restaurants[0] ?? null;
    return {
      email: u.email,
      createdAt: u.createdAt,
      acquisition: u.acquisition,
      proExpiresAt: u.proExpiresAt,
      restaurant: r && {
        slug: r.slug,
        menuMode: r.menuMode,
        menuPublished: r.menuPublished,
        images: r._count.images,
        views: countOf(r.id, "view"),
        orders: countOf(r.id, "click_order"),
      },
    };
  });

  return buildFunnel(rows, payingNow, { days, from, to });
}
