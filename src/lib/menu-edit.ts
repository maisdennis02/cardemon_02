// Editing operations for the menu builder. Each one is pure and returns a new
// Menu, or the very same object when there is nothing to do (unknown id, move
// past an end, a limit reached) so React can skip the re-render and the
// autosave. Every result stays valid under MenuSchema.

import {
  MENU_MAX_ITEMS,
  MENU_MAX_SECTIONS,
  MenuSchema,
  countItems,
  type Menu,
  type MenuItem,
  type MenuSection,
} from "@/lib/menu";
import type { Locale } from "@/i18n/config";
import { LANDING_DEMO } from "@/lib/landing-demo";

const EMPTY: Menu = { v: 1, sections: [] };

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

// The builder starts from the draft, else from what is published. A draft that
// no longer parses is dropped (and the owner told) rather than half-loaded.
export function initialBuilderMenu(draftRaw: unknown, publishedRaw: unknown): { menu: Menu; draftWasInvalid: boolean } {
  if (draftRaw != null) {
    const draft = MenuSchema.safeParse(draftRaw);
    return draft.success ? { menu: draft.data, draftWasInvalid: false } : { menu: EMPTY, draftWasInvalid: true };
  }
  const published = MenuSchema.safeParse(publishedRaw);
  return { menu: published.success ? published.data : EMPTY, draftWasInvalid: false };
}

function swap<T>(list: T[], index: number, dir: -1 | 1): T[] | null {
  const target = index + dir;
  if (index < 0 || target < 0 || target >= list.length) return null;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function findItem(menu: Menu, itemId: string): { s: number; i: number } | null {
  for (let s = 0; s < menu.sections.length; s++) {
    const i = menu.sections[s].items.findIndex((item) => item.id === itemId);
    if (i >= 0) return { s, i };
  }
  return null;
}

function withSection(menu: Menu, index: number, section: MenuSection): Menu {
  return { ...menu, sections: menu.sections.map((s, i) => (i === index ? section : s)) };
}

export function addSection(menu: Menu, title: string | null, id = newId()): Menu {
  if (menu.sections.length >= MENU_MAX_SECTIONS) return menu;
  return { ...menu, sections: [...menu.sections, { id, title, items: [] }] };
}

export function renameSection(menu: Menu, sectionId: string, title: string | null): Menu {
  const index = menu.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return menu;
  return withSection(menu, index, { ...menu.sections[index], title });
}

// Items are never lost with their section: they join the previous section (or
// the next one, when the first section goes).
export function removeSection(menu: Menu, sectionId: string): Menu {
  const index = menu.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return menu;
  const removed = menu.sections[index];
  if (menu.sections.length === 1) {
    return removed.items.length ? { ...menu, sections: [{ ...removed, title: null }] } : EMPTY;
  }
  const sections = menu.sections.filter((_, i) => i !== index);
  if (index === 0) {
    sections[0] = { ...sections[0], items: [...removed.items, ...sections[0].items] };
  } else {
    sections[index - 1] = { ...sections[index - 1], items: [...sections[index - 1].items, ...removed.items] };
  }
  return { ...menu, sections };
}

export function moveSection(menu: Menu, sectionId: string, dir: -1 | 1): Menu {
  const sections = swap(menu.sections, menu.sections.findIndex((s) => s.id === sectionId), dir);
  return sections ? { ...menu, sections } : menu;
}

// sectionId null = the first section, created untitled when the menu has none.
export function addItem(menu: Menu, sectionId: string | null, item: Omit<MenuItem, "id">, id = newId()): Menu {
  if (countItems(menu) >= MENU_MAX_ITEMS) return menu;
  let base = menu;
  if (sectionId === null && base.sections.length === 0) base = addSection(base, null);
  const index = sectionId === null ? 0 : base.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return menu;
  const section = base.sections[index];
  return withSection(base, index, { ...section, items: [...section.items, { ...item, id }] });
}

export function updateItem(menu: Menu, itemId: string, patch: Partial<Omit<MenuItem, "id">>): Menu {
  const at = findItem(menu, itemId);
  if (!at) return menu;
  const section = menu.sections[at.s];
  const updated: MenuItem = { ...section.items[at.i], ...patch };
  if (!updated.description?.trim()) delete updated.description;
  return withSection(menu, at.s, { ...section, items: section.items.map((it, i) => (i === at.i ? updated : it)) });
}

export function removeItem(menu: Menu, itemId: string): Menu {
  const at = findItem(menu, itemId);
  if (!at) return menu;
  const section = menu.sections[at.s];
  return withSection(menu, at.s, { ...section, items: section.items.filter((_, i) => i !== at.i) });
}

export function moveItem(menu: Menu, itemId: string, dir: -1 | 1): Menu {
  const at = findItem(menu, itemId);
  if (!at) return menu;
  const section = menu.sections[at.s];
  const items = swap(section.items, at.i, dir);
  return items ? withSection(menu, at.s, { ...section, items }) : menu;
}

export function moveItemToSection(menu: Menu, itemId: string, sectionId: string): Menu {
  const at = findItem(menu, itemId);
  const target = menu.sections.findIndex((s) => s.id === sectionId);
  if (!at || target < 0 || target === at.s) return menu;
  const item = menu.sections[at.s].items[at.i];
  const sections = menu.sections.map((s, i) => {
    if (i === at.s) return { ...s, items: s.items.filter((it) => it.id !== itemId) };
    if (i === target) return { ...s, items: [...s.items, item] };
    return s;
  });
  return { ...menu, sections };
}

// "Colar lista": appends what fits under the schema's limits and reports how
// many items were left out, so the owner hears about it instead of hitting an
// "invalid menu" on publish.
export function appendSections(menu: Menu, incoming: MenuSection[]): { menu: Menu; dropped: number } {
  const sections = [...menu.sections];
  let room = MENU_MAX_ITEMS - countItems(menu);
  let dropped = 0;
  for (const section of incoming) {
    if (sections.length >= MENU_MAX_SECTIONS || room <= 0) {
      dropped += section.items.length;
      continue;
    }
    const items = section.items.slice(0, room);
    dropped += section.items.length - items.length;
    room -= items.length;
    sections.push({ ...section, items });
  }
  return { menu: { ...menu, sections }, dropped };
}

// Ghost samples (spec §2): the landing's example menu, shown faded in the
// Items step while the menu has no item. They live only on screen; adopting
// one copies it into the menu as a real item, so a sample never reaches the
// draft or the published menu on its own.
export function sampleMenu(locale: Locale): Menu {
  return LANDING_DEMO[locale].menu;
}

export function showSamples(menu: Menu, dismissed: boolean): boolean {
  return !dismissed && countItems(menu) === 0;
}

// Copies the sample item with a fresh id into the section of the same title,
// created (fresh id too) when the menu has none.
export function adoptSample(menu: Menu, sample: Menu, itemId: string): { menu: Menu; newItemId: string | null } {
  const at = findItem(sample, itemId);
  if (!at) return { menu, newItemId: null };
  const { title } = sample.sections[at.s];
  const { name, description, priceCents } = sample.sections[at.s].items[at.i];
  const item: Omit<MenuItem, "id"> = description ? { name, description, priceCents } : { name, priceCents };
  const key = title?.trim().toLowerCase() ?? null;
  let base = menu;
  let section = base.sections.find((s) => (s.title?.trim().toLowerCase() ?? null) === key);
  if (!section) {
    const sectionId = newId();
    base = addSection(base, title, sectionId);
    section = base.sections.find((s) => s.id === sectionId);
    if (!section) return { menu, newItemId: null };
  }
  const id = newId();
  const next = addItem(base, section.id, item, id);
  return next === base ? { menu, newItemId: null } : { menu: next, newItemId: id };
}
