import { describe, expect, it } from "vitest";
import { MAX_GROUPS_PER_ITEM, MAX_OPTIONS_PER_GROUP, MenuSchema, type OptionGroup } from "@/lib/menu";
import {
  addOption, cleanGroups, copyGroups, moveGroup, newGroup, removeGroup, removeOption, setMax, setRequired, updateOption,
} from "@/lib/option-groups-edit";

const menuWith = (groups: OptionGroup[] | undefined) => ({
  v: 1 as const,
  sections: [{ id: "s1", title: null, items: [{ id: "i1", name: "X", priceCents: 100, groups }] }],
});
const valid = (groups: OptionGroup[] | undefined) => MenuSchema.safeParse(menuWith(groups)).success;
const filled = (kind: "required" | "extras", title: string, names = ["A", "B"]): OptionGroup => {
  let g = newGroup(kind, title);
  g = { ...g, options: [] };
  for (const n of names) {
    g = addOption(g);
    g = updateOption(g, g.options[g.options.length - 1].id, { name: n });
  }
  return g;
};

describe("newGroup", () => {
  it("required is 1..1, extras 0..3, one empty option", () => {
    const r = newGroup("required", "Tamanho");
    expect([r.title, r.min, r.max, r.options.length]).toEqual(["Tamanho", 1, 1, 1]);
    expect(r.options[0]).toMatchObject({ name: "", priceCents: 0 });
    const e = newGroup("extras", "Extras");
    expect([e.min, e.max]).toEqual([0, 3]);
  });
});

describe("setRequired / setMax", () => {
  it("toggles min and keeps max >= 1", () => {
    const g = newGroup("extras", "E");
    expect(setRequired(g, true).min).toBe(1);
    expect(setRequired(setRequired(g, true), false).min).toBe(0);
    expect(setRequired({ ...g, max: 0 }, true).max).toBe(1);
  });
  it("setMax floors at 1 and drags min down", () => {
    const g = { ...newGroup("extras", "E"), min: 2, max: 3 };
    expect(setMax(g, 0).max).toBe(1);
    expect(setMax(g, 1).min).toBe(1);
    expect(setMax(g, 5)).toMatchObject({ min: 2, max: 5 });
  });
});

describe("options", () => {
  it("add, update, remove, and respect the cap", () => {
    let g = newGroup("extras", "E");
    g = addOption(g);
    expect(g.options).toHaveLength(2);
    const id = g.options[1].id;
    g = updateOption(g, id, { name: "Bacon", priceCents: 300 });
    expect(g.options[1]).toMatchObject({ id, name: "Bacon", priceCents: 300 });
    expect(removeOption(g, id).options).toHaveLength(1);
    expect(removeOption(g, "nope")).toBe(g);
    while (g.options.length < MAX_OPTIONS_PER_GROUP) g = addOption(g);
    expect(addOption(g)).toBe(g);
  });
  it("removing an option below min keeps cleanGroups valid", () => {
    let g = filled("required", "Tam", ["A", "B"]);
    g = removeOption(g, g.options[0].id);
    expect(valid(cleanGroups([g]))).toBe(true);
    expect(cleanGroups([g])![0].options).toHaveLength(1);
  });
});

describe("groups", () => {
  it("moveGroup and removeGroup", () => {
    const a = newGroup("required", "A"), b = newGroup("extras", "B");
    expect(moveGroup([a, b], b.id, -1).map((g) => g.title)).toEqual(["B", "A"]);
    const same = [a, b];
    expect(moveGroup(same, a.id, -1)).toBe(same);
    expect(moveGroup(same, b.id, 1)).toBe(same);
    expect(removeGroup([a, b], a.id)).toEqual([b]);
  });
  it("copyGroups uses fresh ids and caps the total", () => {
    const from = [filled("required", "A"), filled("extras", "B")];
    const into = [filled("extras", "C")];
    const out = copyGroups(into, from);
    expect(out).toHaveLength(3);
    const old = new Set(from.flatMap((g) => [g.id, ...g.options.map((o) => o.id)]));
    for (const g of out.slice(1)) {
      expect(old.has(g.id)).toBe(false);
      for (const o of g.options) expect(old.has(o.id)).toBe(false);
    }
    expect(out[1].title).toBe("A");
    const many = Array.from({ length: 8 }, (_, i) => filled("extras", `G${i}`));
    expect(copyGroups([], many)).toHaveLength(MAX_GROUPS_PER_ITEM);
  });
});

describe("cleanGroups", () => {
  it("empty or untouched -> undefined", () => {
    expect(cleanGroups([])).toBeUndefined();
    expect(cleanGroups([newGroup("required", "Tamanho")])).toBeUndefined();
    expect(valid(cleanGroups([newGroup("required", "Tamanho")]))).toBe(true);
  });
  it("half-filled groups are valid", () => {
    const half = { ...filled("required", "Tam", ["P"]), min: 3, max: 3 };
    const untitled = filled("extras", "  ");
    const out = cleanGroups([half, untitled, newGroup("extras", "Vazio")]);
    expect(out).toHaveLength(1);
    expect(out![0].min).toBe(1);
    expect(valid(out)).toBe(true);
  });
  it("trims, caps lengths, drops duplicate ids, sanitizes numbers", () => {
    const g: OptionGroup = {
      id: "g", title: ` ${"x".repeat(80)} `, min: 0, max: 0,
      options: [
        { id: "o", name: "  A  ", priceCents: -5 },
        { id: "o", name: "dup", priceCents: 1 },
        { id: "g", name: "dupgroupid", priceCents: 1 },
        { id: "BAD ID!", name: "B", priceCents: 1.6 },
      ],
    };
    const out = cleanGroups([g, { ...g }])!;
    expect(out).toHaveLength(1);
    expect(out[0].title).toHaveLength(60);
    expect(out[0].options.map((o) => o.name)).toEqual(["A", "B"]);
    expect(out[0].options.map((o) => o.priceCents)).toEqual([0, 2]);
    expect(valid(out)).toBe(true);
  });
  it("caps groups and options", () => {
    const big = { ...filled("extras", "G", Array.from({ length: 20 }, (_, i) => `o${i}`)) };
    const out = cleanGroups(Array.from({ length: 8 }, (_, i) => ({ ...big, id: `g${i}`, options: big.options.map((o) => ({ ...o, id: `${o.id}${i}` })) })))!;
    expect(out).toHaveLength(MAX_GROUPS_PER_ITEM);
    expect(out[0].options).toHaveLength(MAX_OPTIONS_PER_GROUP);
    expect(valid(out)).toBe(true);
  });
});
