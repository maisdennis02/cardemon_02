import { describe, expect, it } from "vitest";
import type { MenuItem, OptionGroup } from "@/lib/menu";
import { MenuSchema } from "@/lib/menu";
import {
  choiceHint,
  fromPrice,
  hasGroups,
  normalizeOpts,
  selectionCents,
  firstMissingGroup,
  selectionSummary,
  toggleOption,
  validSelection,
} from "@/lib/menu-options";

const size: OptionGroup = {
  id: "size",
  title: "Tamanho",
  min: 1,
  max: 1,
  options: [
    { id: "s", name: "Simples", priceCents: 0 },
    { id: "d", name: "Duplo", priceCents: 800 },
  ],
};
const extra: OptionGroup = {
  id: "extra",
  title: "Extras",
  min: 0,
  max: 3,
  options: [
    { id: "b", name: "Bacon", priceCents: 300 },
    { id: "c", name: "Cheddar", priceCents: 250 },
  ],
};
const burger: MenuItem = {
  id: "i1",
  name: "Burger",
  priceCents: 2000,
  groups: [size, extra],
};
const menuOf = (item: MenuItem) => ({
  v: 1,
  sections: [{ id: "s1", title: null, items: [item] }],
});
const withGroups = (groups: OptionGroup[]) => ({ ...burger, groups });
const opts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `o${i}`,
    name: `O${i}`,
    priceCents: 0,
  }));

describe("MenuSchema with groups", () => {
  it("accepts the item, an item without groups, and min 0 max 3 with 1 option", () => {
    expect(MenuSchema.safeParse(menuOf(burger)).success).toBe(true);
    expect(
      MenuSchema.safeParse(menuOf({ id: "i1", name: "X", priceCents: 1 }))
        .success,
    ).toBe(true);
    const g = { ...extra, options: opts(1) };
    expect(MenuSchema.safeParse(menuOf(withGroups([g]))).success).toBe(true);
  });
  it("refuses invalid shapes", () => {
    const g = (n: number): OptionGroup => ({
      ...extra,
      id: `g${n}`,
      options: opts(2).map((o) => ({ ...o, id: `g${n}${o.id}` })),
    });
    const bad: Record<string, MenuItem> = {
      sixGroups: withGroups([1, 2, 3, 4, 5, 6].map(g)),
      sixteenOptions: withGroups([{ ...extra, options: opts(16) }]),
      minOverMax: withGroups([{ ...extra, min: 2, max: 1 }]),
      maxZero: withGroups([{ ...extra, min: 0, max: 0 }]),
      minOverOptions: withGroups([
        { ...extra, min: 2, max: 2, options: opts(1) },
      ]),
      nullPrice: withGroups([
        {
          ...extra,
          options: [
            { id: "x", name: "X", priceCents: null as unknown as number },
          ],
        },
      ]),
      emptyTitle: withGroups([{ ...extra, title: "  " }]),
      dupOptionId: withGroups([
        size,
        { ...extra, options: [{ id: "s", name: "Z", priceCents: 1 }] },
      ]),
    };
    for (const [name, item] of Object.entries(bad))
      expect(MenuSchema.safeParse(menuOf(item)).success, name).toBe(false);
  });
});

describe("selection rules", () => {
  it("prices a selection", () =>
    expect(selectionCents(burger, ["d", "b"])).toBe(1100));
  it("validates a selection", () => {
    expect(validSelection(burger, ["s"])).toBe(true);
    expect(validSelection(burger, [])).toBe(false);
    expect(validSelection(burger, ["s", "d"])).toBe(false);
    expect(validSelection(burger, ["s", "zz"])).toBe(false);
    expect(validSelection(burger, ["s", "b", "c"])).toBe(true);
  });
  it("normalizes", () =>
    expect(normalizeOpts(["b", "a", "b"])).toEqual(["a", "b"]));
  it("summarizes in group and option order", () =>
    expect(selectionSummary(burger, ["b", "d"])).toEqual([
      { title: "Tamanho", names: ["Duplo"] },
      { title: "Extras", names: ["Bacon"] },
    ]));
  it("hasGroups", () => {
    expect(hasGroups(burger)).toBe(true);
    expect(hasGroups({ ...burger, groups: [] })).toBe(false);
    expect(hasGroups({ id: "a", name: "a", priceCents: 1 })).toBe(false);
  });
});

describe("fromPrice", () => {
  it("handles each case", () => {
    expect(fromPrice(burger)).toEqual({ cents: 2000, from: true });
    expect(fromPrice(withGroups([extra]))).toEqual({
      cents: 2000,
      from: false,
    });
    const zero: OptionGroup = {
      ...size,
      options: [
        { id: "a", name: "A", priceCents: 0 },
        { id: "b", name: "B", priceCents: 0 },
      ],
    };
    expect(fromPrice(withGroups([zero]))).toEqual({ cents: 2000, from: false });
    const two: OptionGroup = {
      ...extra,
      min: 2,
      max: 2,
      options: [...extra.options, { id: "e", name: "E", priceCents: 500 }],
    };
    expect(fromPrice(withGroups([two]))).toEqual({ cents: 2550, from: true });
    expect(fromPrice({ ...burger, priceCents: null })).toEqual({
      cents: null,
      from: false,
    });
  });
});

describe("choiceHint", () => {
  it("classifies", () => {
    expect(choiceHint(size).kind).toBe("one");
    expect(choiceHint({ ...extra, options: opts(1) }).kind).toBe("one");
    expect(choiceHint({ ...extra, options: opts(2) })).toMatchObject({
      kind: "upTo",
      max: 2,
    });
    expect(choiceHint({ ...extra, min: 1, max: 2 }).kind).toBe("range");
    expect(choiceHint({ ...extra, min: 2, max: 2 }).kind).toBe("exactly");
  });
});

describe("toggleOption", () => {
  it("replaces the choice in a max-1 group", () => {
    expect(toggleOption(burger, ["s"], "size", "d")).toEqual(["d"]);
    expect(toggleOption(burger, ["s", "b"], "size", "d")).toEqual(["b", "d"]);
  });
  it("toggles in a multi group and respects the max", () => {
    expect(toggleOption(burger, [], "extra", "b")).toEqual(["b"]);
    expect(toggleOption(burger, ["b"], "extra", "b")).toEqual([]);
    const cap = { ...burger, groups: [{ ...extra, max: 1 + 1 }] };
    expect(toggleOption(cap, ["b", "c"], "extra", "b")).toEqual(["c"]);
    const two = {
      ...burger,
      groups: [{ ...extra, max: 2, options: [...extra.options, { id: "e", name: "E", priceCents: 1 }] }],
    };
    expect(toggleOption(two, ["b", "c"], "extra", "e")).toEqual(["b", "c"]);
  });
  it("re-tap: optional max-1 group unselects, required keeps", () => {
    const optional = { ...burger, groups: [{ ...size, min: 0 }] };
    expect(toggleOption(optional, ["s"], "size", "s")).toEqual([]);
    expect(toggleOption(burger, ["s"], "size", "s")).toEqual(["s"]);
  });
  it("treats a group with one option as effective max 1", () => {
    const one = { ...burger, groups: [{ ...extra, options: opts(1) }] };
    const id = one.groups[0].options[0].id;
    expect(toggleOption(one, [], "extra", id)).toEqual([id]);
  });
});

describe("firstMissingGroup", () => {
  it("returns the first group below its min", () => {
    expect(firstMissingGroup(burger, [])).toBe("size");
    expect(firstMissingGroup(burger, ["s"])).toBeNull();
    expect(firstMissingGroup({ id: "x", name: "X", priceCents: 1 }, [])).toBeNull();
  });
});
