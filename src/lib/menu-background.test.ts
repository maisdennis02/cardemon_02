import { describe, expect, it } from "vitest";
import { MENU_BACKGROUNDS, MenuThemeSchema } from "@/lib/menu";
import { menuBackgroundStyle } from "@/lib/menu-background";

const theme = (background: unknown) =>
  MenuThemeSchema.safeParse({ color: "#a1b2c3", headerStyle: "centered", background }).success;

describe("menu backgrounds", () => {
  it("offers the six backgrounds, plain first", () => {
    expect(MENU_BACKGROUNDS).toEqual(["plain", "paper", "linen", "gingham", "dots", "doodles"]);
  });

  it("accepts the offered backgrounds, and none at all", () => {
    for (const background of MENU_BACKGROUNDS) expect(theme(background)).toBe(true);
    expect(MenuThemeSchema.safeParse({ color: "#a1b2c3", headerStyle: "centered" }).success).toBe(true);
  });

  it("rejects any other background", () => {
    expect(theme("wood")).toBe(false);
    expect(theme("url(https://evil.example/x.png)")).toBe(false);
  });

  it("keeps today's white page when nothing is chosen", () => {
    expect(menuBackgroundStyle(undefined, "#c84630")).toEqual({ backgroundColor: "#ffffff" });
    expect(menuBackgroundStyle("plain", "#c84630")).toEqual({ backgroundColor: "#ffffff" });
  });

  it("draws every pattern as an inline SVG that CSS can read", () => {
    for (const bg of MENU_BACKGROUNDS.filter((b) => b !== "plain")) {
      const style = menuBackgroundStyle(bg, "#c84630");
      expect(style.backgroundColor, bg).toMatch(/^#[0-9a-f]{6}$/);
      expect(style.backgroundImage, bg).toMatch(/^url\("data:image\/svg\+xml,[^"]+"\)$/);
      expect(style.backgroundSize, bg).toMatch(/^\d+px$/);
    }
  });

  it("tints the patterns with the menu's color", () => {
    for (const bg of ["linen", "gingham", "dots", "doodles"] as const) {
      expect(decodeURIComponent(menuBackgroundStyle(bg, "#1f7a4d").backgroundImage!), bg).toContain("#1f7a4d");
    }
  });

  it("falls back to the default color when the menu's color is unreadable", () => {
    expect(decodeURIComponent(menuBackgroundStyle("dots", "nope").backgroundImage!)).not.toContain("nope");
  });
});
