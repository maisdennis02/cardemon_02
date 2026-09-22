import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/admin";
import { acquisitionSource, asAcquisition, isAdClick } from "@/lib/acquisition";
import { isPro } from "@/lib/pricing";

/**
 * The ground truth behind an ad run, assembled from the tables the product
 * already writes — accounts, restaurants, menu images, menu views, plan state.
 *
 * There is deliberately no event table behind this. menulala's funnel is its
 * own domain model: an account row *is* a signup, a restaurant with an image
 * *is* an activation, proExpiresAt *is* a sale. Writing a second copy of that
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
  | "no_images"
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
  images: number;
  views: number;
  status: FunnelStatus;
};

export type FunnelSource = {
  source: string;
  signups: number;
  onboarded: number;
  published: number;
  viewed: number;
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
    paying: number;
    /** Active Pro accounts across the whole product, not just this window. */
    payingNow: number;
  };
  sources: FunnelSource[];
  /** One row per UTC day: accounts created, and how far they have got since. */
  daily: { date: string; signups: number; adSignups: number; published: number }[];
  accounts: FunnelAccount[];
};

function statusFor(
  account: { proExpiresAt: Date | null },
  images: number,
  views: number,
  hasRestaurant: boolean,
): FunnelStatus {
  if (isPro(account)) return "paying";
  if (!hasRestaurant) return "no_restaurant";
  if (images === 0) return "no_images";
  return views > 0 ? "viewed" : "live";
}

export async function loadFunnel(days: number): Promise<Funnel> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  // One query with the two counts folded in. The user base is in the dozens,
  // so this is a single small scan over the createdAt index rather than
  // anything worth paginating.
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
            slug: true,
            _count: { select: { images: true, views: true } },
          },
        },
      },
    }),
    prisma.user.count({ where: { proExpiresAt: { gt: new Date() } } }),
  ]);

  const accounts: FunnelAccount[] = users.map((user) => {
    const acq = asAcquisition(user.acquisition);
    const restaurant = user.restaurants[0] ?? null;
    const images = restaurant?._count.images ?? 0;
    const views = restaurant?._count.views ?? 0;
    return {
      email: maskEmail(user.email),
      createdAt: user.createdAt.toISOString(),
      source: acquisitionSource(acq),
      ad: isAdClick(acq),
      gclid: acq?.gclid ?? acq?.gbraid ?? acq?.wbraid ?? null,
      campaign: acq?.utm_campaign ?? null,
      landing: acq?.landing ?? null,
      slug: restaurant?.slug ?? null,
      images,
      views,
      status: statusFor(user, images, views, Boolean(restaurant)),
    };
  });

  const bySource = new Map<string, FunnelSource>();
  for (const a of accounts) {
    const row = bySource.get(a.source) ?? {
      source: a.source,
      signups: 0,
      onboarded: 0,
      published: 0,
      viewed: 0,
      paying: 0,
    };
    row.signups += 1;
    if (a.status !== "no_restaurant") row.onboarded += 1;
    if (a.images > 0) row.published += 1;
    if (a.views > 0) row.viewed += 1;
    if (a.status === "paying") row.paying += 1;
    bySource.set(a.source, row);
  }

  const byDay = new Map<string, { date: string; signups: number; adSignups: number; published: number }>();
  for (const a of accounts) {
    const date = a.createdAt.slice(0, 10);
    const row = byDay.get(date) ?? { date, signups: 0, adSignups: 0, published: 0 };
    row.signups += 1;
    if (a.ad) row.adSignups += 1;
    if (a.images > 0) row.published += 1;
    byDay.set(date, row);
  }

  return {
    window: { days, fromUtc: from.toISOString(), toUtc: to.toISOString() },
    totals: {
      signups: accounts.length,
      adSignups: accounts.filter((a) => a.ad).length,
      onboarded: accounts.filter((a) => a.status !== "no_restaurant").length,
      published: accounts.filter((a) => a.images > 0).length,
      viewed: accounts.filter((a) => a.views > 0).length,
      paying: accounts.filter((a) => a.status === "paying").length,
      payingNow,
    },
    sources: [...bySource.values()].sort((a, b) => b.signups - a.signups),
    daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    accounts,
  };
}
