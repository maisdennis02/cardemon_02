import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));

import { BURST_RESTAURANTS, BURST_WINDOW_SECONDS, countMenuEvents } from "./menu-view-counts";

beforeEach(() => {
  queryRaw.mockReset();
  queryRaw.mockResolvedValue([]);
});

// The SQL itself is checked against a real Postgres (bursts dropped, two
// restaurants kept, reloads kept, slow walks kept); here, what reaches it.
describe("countMenuEvents", () => {
  it("does not query for an empty list", async () => {
    expect(await countMenuEvents([], new Date())).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("passes the restaurants, the window, the threshold and the date as parameters", async () => {
    const since = new Date("2026-10-13T00:00:00Z");
    await countMenuEvents(["r1", "r2"], since);
    const [strings, ...values] = queryRaw.mock.calls[0];
    expect(values).toEqual([
      BURST_WINDOW_SECONDS,
      BURST_WINDOW_SECONDS,
      since,
      ["r1", "r2"],
      BURST_RESTAURANTS,
    ]);
    const sql = (strings as string[]).join("?");
    // The restaurant filter must stay outside the window: the neighbours are
    // other restaurants' rows.
    expect(sql.indexOf("= ANY(")).toBeGreaterThan(sql.indexOf("FROM nearby"));
    expect(sql).toContain("PARTITION BY country");
  });

  it("returns the rows as they come", async () => {
    const rows = [{ restaurantId: "r1", kind: "view", total: 5, recent: 2 }];
    queryRaw.mockResolvedValue(rows);
    expect(await countMenuEvents(["r1"], new Date())).toEqual(rows);
  });
});
