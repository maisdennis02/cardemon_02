import { prisma } from "@/lib/prisma";

/**
 * MenuView counts with crawler bursts left out.
 *
 * The table keeps no IP and no user agent — only the restaurant, the kind,
 * the time and the visitor's country — so the one trace a bot leaves is its
 * walk: the same country opening several *different* menus seconds apart
 * (seen in prod: three menus 6–8 s apart from US/ID, some with a WhatsApp
 * tap). A diner reads one menu. So an event is dropped when, within
 * BURST_WINDOW_SECONDS either side of it, its country has events on
 * BURST_RESTAURANTS or more restaurants.
 *
 * Nothing is written or deleted: the rule runs at read time, so the whole
 * history cleans up and a wrong rule is undone by reverting this file. The
 * window function needs every restaurant's rows (the neighbours are other
 * menus), so it sorts the whole table — fine at dozens of restaurants and
 * only run when an owner or the admin opens a page.
 */

export const BURST_WINDOW_SECONDS = 30;
export const BURST_RESTAURANTS = 3;

export type MenuEventCount = {
  restaurantId: string;
  kind: string;
  /** Every human event of this kind, all time. */
  total: number;
  /** The same, from `since` on. */
  recent: number;
};

export async function countMenuEvents(
  restaurantIds: string[],
  since: Date,
): Promise<MenuEventCount[]> {
  if (restaurantIds.length === 0) return [];
  // The restaurant filter sits outside the CTE on purpose: the window must
  // see the other restaurants' rows to tell a burst from a diner.
  return prisma.$queryRaw<MenuEventCount[]>`
    WITH nearby AS (
      SELECT "restaurantId", kind, "viewedAt",
        array_agg("restaurantId") OVER (
          PARTITION BY country ORDER BY "viewedAt"
          RANGE BETWEEN make_interval(secs => ${BURST_WINDOW_SECONDS}) PRECEDING
                    AND make_interval(secs => ${BURST_WINDOW_SECONDS}) FOLLOWING
        ) AS restaurants
      FROM "MenuView"
    )
    SELECT "restaurantId", kind,
      count(*)::int AS total,
      (count(*) FILTER (WHERE "viewedAt" >= ${since}))::int AS recent
    FROM nearby
    WHERE "restaurantId" = ANY(${restaurantIds})
      AND (SELECT count(DISTINCT r) FROM unnest(restaurants) AS r) < ${BURST_RESTAURANTS}
    GROUP BY "restaurantId", kind
  `;
}
