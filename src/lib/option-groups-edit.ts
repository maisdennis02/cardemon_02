// Pure edit operations for an item's option groups (the "adicionais" editor).
// The dashboard autosaves the raw draft, so cleanGroups is the safety net: what
// it returns always passes MenuSchema when placed on an item.

import {
  MAX_GROUPS_PER_ITEM,
  MAX_OPTIONS_PER_GROUP,
  type MenuOption,
  type OptionGroup,
} from "@/lib/menu";
import { newId } from "@/lib/menu-edit";

const ID_RE = /^[a-z0-9_-]{1,32}$/;
const TEXT_MAX = 60;

export function newGroup(kind: "required" | "extras", title: string): OptionGroup {
  return {
    id: newId(),
    title,
    min: kind === "required" ? 1 : 0,
    max: kind === "required" ? 1 : 3,
    options: [{ id: newId(), name: "", priceCents: 0 }],
  };
}

export function setRequired(g: OptionGroup, on: boolean): OptionGroup {
  return { ...g, min: on ? 1 : 0, max: on ? Math.max(g.max, 1) : g.max };
}

export function setMax(g: OptionGroup, max: number): OptionGroup {
  const m = Math.max(1, Math.floor(Number.isFinite(max) ? max : 1));
  return { ...g, max: m, min: Math.min(g.min, m) };
}

export function addOption(g: OptionGroup): OptionGroup {
  if (g.options.length >= MAX_OPTIONS_PER_GROUP) return g;
  return { ...g, options: [...g.options, { id: newId(), name: "", priceCents: 0 }] };
}

export function updateOption(g: OptionGroup, optionId: string, patch: Partial<Omit<MenuOption, "id">>): OptionGroup {
  if (!g.options.some((o) => o.id === optionId)) return g;
  return { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)) };
}

export function removeOption(g: OptionGroup, optionId: string): OptionGroup {
  if (!g.options.some((o) => o.id === optionId)) return g;
  return { ...g, options: g.options.filter((o) => o.id !== optionId) };
}

export function moveGroup(groups: OptionGroup[], groupId: string, dir: -1 | 1): OptionGroup[] {
  const i = groups.findIndex((g) => g.id === groupId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= groups.length) return groups;
  const next = [...groups];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function removeGroup(groups: OptionGroup[], groupId: string): OptionGroup[] {
  return groups.some((g) => g.id === groupId) ? groups.filter((g) => g.id !== groupId) : groups;
}

export function copyGroups(into: OptionGroup[], from: OptionGroup[]): OptionGroup[] {
  const copies = from.map((g) => ({
    ...g,
    id: newId(),
    options: g.options.map((o) => ({ ...o, id: newId() })),
  }));
  return [...into, ...copies].slice(0, MAX_GROUPS_PER_ITEM);
}

export function cleanGroups(groups: OptionGroup[]): OptionGroup[] | undefined {
  const seen = new Set<string>();
  // Ids must be unique across the whole item; a malformed id is replaced, a repeat is dropped.
  const claim = (id: string): string | null => {
    const use = ID_RE.test(id) ? id : newId();
    if (seen.has(use)) return null;
    seen.add(use);
    return use;
  };
  const out: OptionGroup[] = [];
  for (const g of groups) {
    if (out.length >= MAX_GROUPS_PER_ITEM) break;
    const title = g.title.trim().slice(0, TEXT_MAX).trim();
    if (!title) continue;
    const gid = claim(g.id);
    if (!gid) continue;
    const options: MenuOption[] = [];
    for (const o of g.options) {
      if (options.length >= MAX_OPTIONS_PER_GROUP) break;
      const name = o.name.trim().slice(0, TEXT_MAX).trim();
      if (!name) continue;
      const oid = claim(o.id);
      if (!oid) continue;
      const price = Number.isFinite(o.priceCents) ? Math.max(0, Math.round(o.priceCents)) : 0;
      options.push({ id: oid, name, priceCents: price });
    }
    if (options.length === 0) {
      seen.delete(gid);
      continue;
    }
    const max = Math.max(1, Math.floor(Number.isFinite(g.max) ? g.max : 1));
    const min = Math.max(0, Math.min(Math.floor(Number.isFinite(g.min) ? g.min : 0), max, options.length));
    out.push({ id: gid, title, min, max, options });
  }
  return out.length ? out : undefined;
}
