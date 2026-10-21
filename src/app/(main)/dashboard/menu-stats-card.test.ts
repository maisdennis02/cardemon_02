import { describe, expect, it, vi } from "vitest";

const countMenuEvents = vi.hoisted(() => vi.fn());
vi.mock("@/lib/menu-view-counts", () => ({ countMenuEvents }));

import { loadMenuStats } from "./menu-stats-card";

describe("loadMenuStats", () => {
  it("reads views, recent views, recent orders and every click from the bot-free counts", async () => {
    const since = new Date("2026-10-13T00:00:00Z");
    countMenuEvents.mockResolvedValue([
      { restaurantId: "r1", kind: "view", total: 120, recent: 30 },
      { restaurantId: "r1", kind: "click_order", total: 9, recent: 4 },
      { restaurantId: "r1", kind: "click_whatsapp", total: 7, recent: 0 },
    ]);

    expect(await loadMenuStats("r1", since)).toEqual({
      totalViews: 120,
      last7Days: 30,
      orders7Days: 4,
      clicks: { click_order: 9, click_whatsapp: 7 },
    });
    expect(countMenuEvents).toHaveBeenCalledWith(["r1"], since);
  });

  it("is all zeros for a menu nobody opened", async () => {
    countMenuEvents.mockResolvedValue([]);
    expect(await loadMenuStats("r1", new Date())).toEqual({
      totalViews: 0,
      last7Days: 0,
      orders7Days: 0,
      clicks: {},
    });
  });
});
