import { describe, expect, it } from "vitest";
import { MENU_MAX_ITEMS, MENU_MAX_SECTIONS, MenuSchema, countItems, type Menu, type MenuSection } from "@/lib/menu";
import {
  addItem,
  addSection,
  appendSections,
  initialBuilderMenu,
  moveItem,
  moveItemToSection,
  moveSection,
  newId,
  removeItem,
  removeSection,
  renameSection,
  updateItem,
} from "@/lib/menu-edit";

const EMPTY: Menu = { v: 1, sections: [] };

function menuOf(...sections: [string, string[]][]): Menu {
  return {
    v: 1,
    sections: sections.map(([id, items]) => ({
      id,
      title: id.toUpperCase(),
      items: items.map((itemId) => ({ id: itemId, name: itemId, priceCents: 100 })),
    })),
  };
}

const ids = (menu: Menu) => menu.sections.map((s) => [s.id, s.items.map((i) => i.id)]);

describe("newId", () => {
  it("makes distinct ids the schema accepts", () => {
    const all = Array.from({ length: 1000 }, newId);
    expect(new Set(all).size).toBe(1000);
    for (const id of all) expect(id).toMatch(/^[a-z0-9_-]{1,32}$/);
  });
});

describe("initialBuilderMenu", () => {
  const published = menuOf(["s1", ["a"]]);
  const draft = menuOf(["s1", ["a", "b"]]);

  it("starts empty with nothing saved", () => {
    expect(initialBuilderMenu(null, null)).toEqual({ menu: EMPTY, draftWasInvalid: false });
  });

  it("starts from the published menu when there is no draft", () => {
    expect(initialBuilderMenu(null, published)).toEqual({ menu: published, draftWasInvalid: false });
  });

  it("starts from the draft when there is one", () => {
    expect(initialBuilderMenu(draft, published)).toEqual({ menu: draft, draftWasInvalid: false });
  });

  it("starts empty and says so when the draft is unreadable", () => {
    expect(initialBuilderMenu({ v: 2 }, published)).toEqual({ menu: EMPTY, draftWasInvalid: true });
  });
});

describe("sections", () => {
  it("adds, renames and moves a section", () => {
    let menu = addSection(EMPTY, "Lanches", "s1");
    menu = addSection(menu, "Bebidas", "s2");
    menu = renameSection(menu, "s2", "Drinks");
    menu = moveSection(menu, "s2", -1);
    expect(menu.sections.map((s) => s.title)).toEqual(["Drinks", "Lanches"]);
  });

  it("refuses a section past the limit", () => {
    let menu = EMPTY;
    for (let i = 0; i < MENU_MAX_SECTIONS; i++) menu = addSection(menu, `S${i}`, `s${i}`);
    expect(addSection(menu, "one more", "extra")).toBe(menu);
  });

  it("moves a removed first section's items to the start of the next one", () => {
    const menu = removeSection(menuOf(["s1", ["a", "b"]], ["s2", ["c"]]), "s1");
    expect(ids(menu)).toEqual([["s2", ["a", "b", "c"]]]);
  });

  it("moves a removed section's items to the end of the previous one", () => {
    const menu = removeSection(menuOf(["s1", ["a"]], ["s2", ["b", "c"]]), "s2");
    expect(ids(menu)).toEqual([["s1", ["a", "b", "c"]]]);
  });

  it("keeps the items of the only section in an untitled one", () => {
    const menu = removeSection(menuOf(["s1", ["a", "b"]]), "s1");
    expect(menu.sections).toHaveLength(1);
    expect(menu.sections[0].title).toBeNull();
    expect(menu.sections[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("removes an empty only section entirely", () => {
    expect(removeSection(menuOf(["s1", []]), "s1")).toEqual(EMPTY);
  });

  it("ignores a move past either end", () => {
    const menu = menuOf(["s1", []], ["s2", []]);
    expect(moveSection(menu, "s1", -1)).toBe(menu);
    expect(moveSection(menu, "s2", 1)).toBe(menu);
  });
});

describe("items", () => {
  it("creates an untitled section for the first item", () => {
    const menu = addItem(EMPTY, null, { name: "Coca", priceCents: 700 }, "i1");
    expect(menu.sections).toHaveLength(1);
    expect(menu.sections[0].title).toBeNull();
    expect(menu.sections[0].items).toEqual([{ id: "i1", name: "Coca", priceCents: 700 }]);
  });

  it("adds to the named section", () => {
    const menu = addItem(menuOf(["s1", ["a"]], ["s2", []]), "s2", { name: "Coca", priceCents: 700 }, "i1");
    expect(ids(menu)).toEqual([
      ["s1", ["a"]],
      ["s2", ["i1"]],
    ]);
  });

  it("refuses an item past the limit", () => {
    const full = menuOf(["s1", Array.from({ length: MENU_MAX_ITEMS }, (_, i) => `i${i}`)]);
    expect(addItem(full, "s1", { name: "x", priceCents: null })).toBe(full);
  });

  it("updates, moves and removes an item", () => {
    let menu = menuOf(["s1", ["a", "b"]], ["s2", ["c"]]);
    menu = updateItem(menu, "b", { name: "Bauru", priceCents: 2690 });
    expect(menu.sections[0].items[1]).toEqual({ id: "b", name: "Bauru", priceCents: 2690 });
    menu = moveItem(menu, "b", -1);
    expect(ids(menu)[0]).toEqual(["s1", ["b", "a"]]);
    menu = moveItemToSection(menu, "b", "s2");
    expect(ids(menu)).toEqual([
      ["s1", ["a"]],
      ["s2", ["c", "b"]],
    ]);
    menu = removeItem(menu, "c");
    expect(ids(menu)[1]).toEqual(["s2", ["b"]]);
  });

  it("drops an emptied description instead of storing an empty string", () => {
    const menu = updateItem(menuOf(["s1", ["a"]]), "a", { description: "  " });
    expect(menu.sections[0].items[0]).not.toHaveProperty("description");
  });

  it("ignores an unknown id and a move past either end", () => {
    const menu = menuOf(["s1", ["a", "b"]]);
    expect(moveItem(menu, "a", -1)).toBe(menu);
    expect(moveItem(menu, "b", 1)).toBe(menu);
    expect(updateItem(menu, "zzz", { name: "x" })).toBe(menu);
    expect(removeItem(menu, "zzz")).toBe(menu);
    expect(moveItemToSection(menu, "a", "nope")).toBe(menu);
  });
});

describe("appendSections", () => {
  it("adds what fits and counts the rest", () => {
    const pasted: MenuSection[] = [
      { id: "p1", title: null, items: Array.from({ length: 310 }, (_, i) => ({ id: `p${i + 2}`, name: `x${i}`, priceCents: 100 })) },
    ];
    const { menu, dropped } = appendSections(EMPTY, pasted);
    expect(countItems(menu)).toBe(MENU_MAX_ITEMS);
    expect(dropped).toBe(10);
  });

  it("counts the items of sections past the section limit as dropped", () => {
    let base = EMPTY;
    for (let i = 0; i < MENU_MAX_SECTIONS; i++) base = addSection(base, `S${i}`, `s${i}`);
    const { menu, dropped } = appendSections(base, [{ id: "p1", title: "X", items: [{ id: "p2", name: "a", priceCents: 1 }] }]);
    expect(menu.sections).toHaveLength(MENU_MAX_SECTIONS);
    expect(dropped).toBe(1);
  });
});

describe("every operation keeps the menu valid", () => {
  it("passes the schema after a sequence of edits", () => {
    let menu = addItem(EMPTY, null, { name: "Coca", priceCents: 700 });
    menu = addSection(menu, "Lanches");
    menu = addItem(menu, menu.sections[1].id, { name: "X-Burguer", priceCents: 2590 });
    menu = moveSection(menu, menu.sections[1].id, -1);
    menu = appendSections(menu, [{ id: newId(), title: "Bebidas", items: [{ id: newId(), name: "Suco", priceCents: 850 }] }]).menu;
    menu = removeSection(menu, menu.sections[0].id);
    expect(MenuSchema.safeParse(menu).success).toBe(true);
  });
});
