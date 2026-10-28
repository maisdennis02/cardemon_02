import { describe, expect, it } from "vitest";
import {
  SHEET,
  SLACK,
  balance,
  columnWidth,
  columnsFor,
  paginate,
  planLayout,
  type Block,
  type Sheet,
} from "./print-layout";

// The printable sheet's layout rules (spec 2026-10-28 §2): columns by item
// count, a scale that fills one sheet, balanced sheets when it can't.

const item = (key: string, height: number): Block => ({ kind: "item", key, height });
const title = (key: string, height = 30): Block => ({ kind: "title", key, height });
const items = (n: number, height: number) => Array.from({ length: n }, (_, i) => item(`i${i}`, height));
const keys = (sheets: Sheet[]) => sheets.flat(2).map((b) => b.key);
const scaled = (blocks: Block[]) => (s: number) => blocks.map((b) => ({ ...b, height: b.height * s }));

describe("columnsFor / columnWidth", () => {
  it("uses one column up to 8 items, two above", () => {
    expect(columnsFor(8)).toBe(1);
    expect(columnsFor(9)).toBe(2);
  });

  it("is 480 px for one column and splits the sheet for two", () => {
    expect(columnWidth(1)).toBe(480);
    expect(columnWidth(2)).toBe((SHEET.width - 2 * SHEET.pad - SHEET.gap) / 2);
  });
});

describe("paginate", () => {
  it("keeps a short menu on one sheet, first column", () => {
    const sheets = paginate(items(3, 100), 2, 1000, 1000);
    expect(sheets).toHaveLength(1);
    expect(sheets[0][0].map((b) => b.key)).toEqual(["i0", "i1", "i2"]);
    expect(sheets[0][1]).toEqual([]);
  });

  it("fills column 1, then column 2, then the next sheet, in order", () => {
    const sheets = paginate(items(25, 100), 2, 1000, 1000);
    expect(sheets).toHaveLength(2);
    expect(sheets[0][0]).toHaveLength(10);
    expect(sheets[0][1]).toHaveLength(10);
    expect(sheets[1][0]).toHaveLength(5);
    expect(keys(sheets)).toEqual(items(25, 100).map((b) => b.key));
  });

  it("never leaves a section title last in a column", () => {
    const blocks = [...items(9, 100), title("t"), item("after", 100)];
    const sheets = paginate(blocks, 2, 1000, 1000);
    expect(sheets[0][0].at(-1)?.kind).toBe("item");
    expect(sheets[0][1].map((b) => b.key)).toEqual(["t", "after"]);
  });

  it("puts a card taller than the column alone in its column, dropping nothing", () => {
    const blocks = [item("a", 100), item("huge", 2000), item("b", 100)];
    const sheets = paginate(blocks, 2, 1000, 1000);
    expect(sheets[0][1].map((b) => b.key)).toEqual(["huge"]);
    expect(keys(sheets)).toEqual(["a", "huge", "b"]);
  });

  it("uses the first-sheet capacity on sheet 1 only", () => {
    const sheets = paginate(items(12, 100), 1, 500, 1000);
    expect(sheets[0][0]).toHaveLength(5);
    expect(sheets[1][0]).toHaveLength(7);
  });
});

describe("balance", () => {
  it("leaves no near-empty last sheet", () => {
    const blocks = items(42, 100);
    expect(paginate(blocks, 2, 1000, 1000).at(-1)!.flat()).toHaveLength(2);
    const sheets = balance(blocks, 2, 1000, 1000);
    expect(sheets).toHaveLength(3);
    expect(sheets.at(-1)!.flat().length).toBeGreaterThanOrEqual(Math.floor(42 * 0.2));
    expect(keys(sheets)).toEqual(blocks.map((b) => b.key));
  });

  it("keeps a one-sheet layout as it is", () => {
    expect(balance(items(3, 100), 2, 1000, 1000)).toEqual(paginate(items(3, 100), 2, 1000, 1000));
  });
});

describe("planLayout", () => {
  const cap1 = (headerHeight: number) => (SHEET.height - SHEET.footer - headerHeight) * SLACK;

  it("enlarges a short menu in one column, up to 160 %", () => {
    const plan = planLayout({ itemCount: 5, headerHeight: 200, measureAt: scaled(items(5, 60)) });
    expect(plan.columns).toBe(1);
    expect(plan.scale).toBe(1.6);
    expect(plan.sheets).toHaveLength(1);
  });

  it("shrinks a long menu onto one sheet, not below 80 %", () => {
    // 13 items per column fit exactly at scale s when 13 * h * s <= cap.
    const h = cap1(200) / 13 / 0.82;
    const plan = planLayout({ itemCount: 25, headerHeight: 200, measureAt: scaled(items(25, h)) });
    expect(plan.columns).toBe(2);
    expect(plan.sheets).toHaveLength(1);
    expect(plan.scale).toBeGreaterThanOrEqual(0.8);
    expect(plan.scale).toBeLessThanOrEqual(0.84);
  });

  it("goes back to 100 % on balanced sheets when 80 % is not enough", () => {
    const plan = planLayout({ itemCount: 60, headerHeight: 200, measureAt: scaled(items(60, 100)) });
    expect(plan.scale).toBe(1);
    expect(plan.sheets.length).toBeGreaterThan(1);
    expect(plan.sheets.at(-1)!.flat().length).toBeGreaterThanOrEqual(10);
  });

  it("just fits at the first-sheet capacity and not one pixel over", () => {
    const fits = planLayout({ itemCount: 8, headerHeight: 200, measureAt: () => items(8, cap1(200) / 8 - 0.01) });
    expect(fits.sheets).toHaveLength(1);
    const over = planLayout({ itemCount: 8, headerHeight: 200, measureAt: () => items(8, cap1(200) / 8 + 1) });
    expect(over.sheets).toHaveLength(2);
  });
});
