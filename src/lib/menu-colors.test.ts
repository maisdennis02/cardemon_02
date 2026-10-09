import { describe, expect, it } from "vitest";
import { headerColors } from "@/lib/menu";
import { MENU_PALETTES, pickLogoColors, swatchesFor } from "@/lib/menu-colors";

function pixels(...runs: [number, [number, number, number, number]][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [count, rgba] of runs) for (let i = 0; i < count; i++) out.push(...rgba);
  return new Uint8ClampedArray(out);
}

describe("pickLogoColors", () => {
  it("returns the logo's colors, most present first", () => {
    expect(pickLogoColors(pixels([50, [0, 0, 255, 255]], [100, [255, 0, 0, 255]]))).toEqual(["#ff0000", "#0000ff"]);
  });

  it("ignores white, black, grey and transparent pixels", () => {
    expect(pickLogoColors(pixels([100, [255, 255, 255, 255]]))).toEqual([]);
    expect(pickLogoColors(pixels([100, [0, 0, 0, 255]], [100, [128, 128, 128, 255]]))).toEqual([]);
    expect(pickLogoColors(pixels([100, [255, 0, 0, 0]]))).toEqual([]);
  });

  it("treats near-identical shades as one color", () => {
    expect(pickLogoColors(pixels([100, [240, 10, 10, 255]], [100, [230, 20, 20, 255]]))).toHaveLength(1);
  });

  it("returns at most `max` colors", () => {
    const four = pixels([40, [255, 0, 0, 255]], [30, [0, 0, 255, 255]], [20, [0, 160, 0, 255]], [10, [200, 0, 200, 255]]);
    expect(pickLogoColors(four)).toHaveLength(3);
    expect(pickLogoColors(four, 2)).toHaveLength(2);
  });
});

describe("MENU_PALETTES", () => {
  it("has 8 colors dark enough for titles", () => {
    expect(MENU_PALETTES).toHaveLength(8);
    for (const c of MENU_PALETTES) expect(headerColors(c).title).toBe(c);
  });
});

describe("swatchesFor", () => {
  it("offers the palettes when the logo's colors are unknown, e.g. after a reload", () => {
    expect(swatchesFor([], false)).toEqual(MENU_PALETTES);
  });

  it("shows the logo's colors, then the palettes when expanded", () => {
    expect(swatchesFor(["#ff0000"], false)).toEqual(["#ff0000"]);
    expect(swatchesFor(["#ff0000"], true)).toEqual(["#ff0000", ...MENU_PALETTES]);
  });
});
