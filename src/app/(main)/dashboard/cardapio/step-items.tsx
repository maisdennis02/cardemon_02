"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { format, localeForCountry, type Locale } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import { FREE_ITEM_LIMIT } from "@/lib/pricing";
import { countItems, formatPrice, visibleMenu, type Menu, type MenuSection } from "@/lib/menu";
import { parseItemLine } from "@/lib/menu-parse";
import {
  addItem,
  addSection,
  newId,
  moveItem,
  moveItemToSection,
  moveSection,
  removeItem,
  removeSection,
  renameSection,
  updateItem,
} from "@/lib/menu-edit";
import { ItemEditor } from "./item-editor";
import { PasteList } from "./paste-list";

// Step 2 (spec §3): sections and items. One line per item, "name price",
// typed or dictated; ambiguous prices become items without a price.
export function StepItems({
  menu,
  setMenu,
  isPro,
  country,
  sectionSuggestions,
}: {
  menu: Menu;
  setMenu: (next: Menu) => void;
  isPro: boolean;
  country: string;
  sectionSuggestions: Record<Locale, string[]>;
}) {
  const t = useT();
  const it = t.dashboard.builder.items;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  // The section whose add field should take the focus when it mounts: the
  // first item and a new section both swap in a field that wasn't there, and
  // dictating item after item must not need a tap on the screen.
  const [focusSectionId, setFocusSectionId] = useState<string | null>(null);

  const total = countItems(menu);
  const { menu: shown, hidden } = visibleMenu(menu, isPro);
  const visibleIds = new Set(shown.sections.flatMap((s) => s.items.map((i) => i.id)));
  const used = new Set(menu.sections.map((s) => s.title?.toLowerCase()));
  const suggestions = sectionSuggestions[localeForCountry(country)].filter((s) => !used.has(s.toLowerCase()));

  function createSection(title: string) {
    const clean = title.trim().slice(0, 60);
    if (clean) {
      const id = newId();
      setMenu(addSection(menu, clean, id));
      setFocusSectionId(id);
    }
    setNewSection(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!isPro ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
              hidden > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {format(it.counter, { n: total, limit: FREE_ITEM_LIMIT })}
          </span>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPasting(true)}>
          {it.paste}
        </button>
      </div>

      {hidden > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {format(it.overLimitNotice, { limit: FREE_ITEM_LIMIT, hidden })}{" "}
          <Link href="/pricing" className="font-semibold underline">
            {it.seePro}
          </Link>
        </p>
      )}

      {pasting && <PasteList menu={menu} setMenu={setMenu} onClose={() => setPasting(false)} />}

      {menu.sections.length === 0 && (
        <section className="card p-5">
          <AddItemField
            onAdd={(item) => {
              const next = addItem(menu, null, item);
              setMenu(next);
              setFocusSectionId(next.sections[0]?.id ?? null);
            }}
          />
          <p className="mt-3 text-sm text-gray-500">{it.empty}</p>
        </section>
      )}

      {menu.sections.map((section, index) => (
        <SectionBlock
          key={section.id}
          section={section}
          first={index === 0}
          last={index === menu.sections.length - 1}
          focusAdd={focusSectionId === section.id}
          country={country}
          visibleIds={visibleIds}
          editingId={editingId}
          setEditingId={setEditingId}
          sections={menu.sections}
          onRename={(title) => setMenu(renameSection(menu, section.id, title))}
          onMove={(dir) => setMenu(moveSection(menu, section.id, dir))}
          onRemove={() => setMenu(removeSection(menu, section.id))}
          onAdd={(item) => setMenu(addItem(menu, section.id, item))}
          onItem={(itemId, patch) => setMenu(updateItem(menu, itemId, patch))}
          onItemMove={(itemId, dir) => setMenu(moveItem(menu, itemId, dir))}
          onItemMoveTo={(itemId, sectionId) => setMenu(moveItemToSection(menu, itemId, sectionId))}
          onItemRemove={(itemId) => {
            setMenu(removeItem(menu, itemId));
            setEditingId(null);
          }}
        />
      ))}

      <section className="flex flex-col gap-2">
        {menu.sections.length < 3 && suggestions.length > 0 && (
          <>
            <p className="text-sm text-gray-600">{it.suggestionsLead}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" className="btn btn-secondary btn-sm" onClick={() => createSection(s)}>
                  {s}
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewSection("")}>
                {it.other}
              </button>
            </div>
          </>
        )}
        {newSection === null ? (
          <button type="button" className="btn btn-ghost self-start" onClick={() => setNewSection("")}>
            {it.newSection}
          </button>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createSection(newSection);
            }}
          >
            <input
              autoFocus
              className="input"
              maxLength={60}
              placeholder={it.newSectionName}
              aria-label={it.newSectionName}
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              {it.add}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function SectionBlock({
  section,
  first,
  last,
  focusAdd,
  country,
  visibleIds,
  editingId,
  setEditingId,
  sections,
  onRename,
  onMove,
  onRemove,
  onAdd,
  onItem,
  onItemMove,
  onItemMoveTo,
  onItemRemove,
}: {
  section: MenuSection;
  first: boolean;
  last: boolean;
  focusAdd: boolean;
  country: string;
  visibleIds: Set<string>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  sections: MenuSection[];
  onRename: (title: string | null) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onAdd: (item: { name: string; priceCents: number | null }) => void;
  onItem: (itemId: string, patch: { name?: string; description?: string; priceCents?: number | null }) => void;
  onItemMove: (itemId: string, dir: -1 | 1) => void;
  onItemMoveTo: (itemId: string, sectionId: string) => void;
  onItemRemove: (itemId: string) => void;
}) {
  const t = useT();
  const it = t.dashboard.builder.items;

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-1">
        <input
          className="input flex-1 font-semibold"
          maxLength={60}
          aria-label={it.sectionTitle}
          placeholder={it.untitled}
          value={section.title ?? ""}
          onChange={(e) => onRename(e.target.value.trim() ? e.target.value : null)}
        />
        <IconButton label={it.moveUp} disabled={first} onClick={() => onMove(-1)}>
          ↑
        </IconButton>
        <IconButton label={it.moveDown} disabled={last} onClick={() => onMove(1)}>
          ↓
        </IconButton>
        <IconButton label={it.removeSection} onClick={onRemove}>
          ×
        </IconButton>
      </div>

      {section.items.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {section.items.map((item, index) => {
            const visible = visibleIds.has(item.id);
            if (editingId === item.id) {
              return (
                <li key={item.id} className="py-2">
                  <ItemEditor
                    item={item}
                    sectionId={section.id}
                    sections={sections}
                    first={index === 0}
                    last={index === section.items.length - 1}
                    onChange={(patch) => onItem(item.id, patch)}
                    onMove={(dir) => onItemMove(item.id, dir)}
                    onMoveTo={(sectionId) => onItemMoveTo(item.id, sectionId)}
                    onRemove={() => onItemRemove(item.id)}
                    onDone={() => setEditingId(null)}
                  />
                </li>
              );
            }
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={format(t.dashboard.builder.editor.edit, { name: item.name })}
                  onClick={() => setEditingId(item.id)}
                  className={`flex w-full items-baseline gap-3 py-2.5 text-left ${visible ? "" : "opacity-40"}`}
                >
                  <span className="flex-1">
                    <span className="font-medium">{item.name}</span>
                    {!visible && <span className="block text-xs text-amber-700">{it.overLimit}</span>}
                  </span>
                  {item.priceCents === null ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                      {it.noPrice}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap font-bold tabular-nums">{formatPrice(item.priceCents, country)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AddItemField onAdd={onAdd} autoFocus={focusAdd} />
    </section>
  );
}

// Enter adds the item and keeps the focus here, so dictating one item after
// another never needs a tap on the screen.
function AddItemField({
  onAdd,
  autoFocus = false,
}: {
  onAdd: (item: { name: string; priceCents: number | null }) => void;
  autoFocus?: boolean;
}) {
  const t = useT();
  const it = t.dashboard.builder.items;
  const [line, setLine] = useState("");

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = parseItemLine(line);
        if (!parsed) return;
        onAdd(parsed);
        capture("item_added", { via: "typed" });
        setLine("");
      }}
    >
      <div className="flex gap-2">
        <input
          className="input"
          enterKeyHint="done"
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={it.addPlaceholder}
          aria-label={it.addPlaceholder}
          value={line}
          onChange={(e) => setLine(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!line.trim()}>
          {it.add}
        </button>
      </div>
      <span className="text-xs text-gray-500">{it.addHint}</span>
    </form>
  );
}

export function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
