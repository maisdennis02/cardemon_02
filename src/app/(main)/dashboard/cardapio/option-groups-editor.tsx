"use client";

import { useState } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { MAX_GROUPS_PER_ITEM, MAX_OPTIONS_PER_GROUP, type OptionGroup } from "@/lib/menu";
import {
  addOption, cleanGroups, copyGroups, moveGroup, newGroup, optionPriceCents, optionPriceText,
  removeGroup, removeOption, setMax, setRequired, updateOption,
} from "@/lib/option-groups-edit";
import { IconButton } from "./step-items";

type OtherItem = { id: string; name: string; groups: OptionGroup[] };
// A new group's title is menu content, so it is in the menu's language (the
// country), not the dashboard's.
export type GroupTitles = { required: string; extras: string };

// The owner's "adicionais" editor for one item. The raw draft (empty options
// included) lives here so typing never fights the autosave; upward goes only
// cleanGroups(draft), which always passes the menu schema.
export function OptionGroupsEditor({
  groups,
  otherItems,
  defaultTitles,
  onChange,
}: {
  groups: OptionGroup[] | undefined;
  otherItems: OtherItem[];
  defaultTitles?: GroupTitles;
  onChange: (next: OptionGroup[] | undefined) => void;
}) {
  const t = useT();
  const e = t.dashboard.builder.editor;
  const it = t.dashboard.builder.items;
  // Seeded once: the parent re-renders with the cleaned groups, which must not
  // overwrite the raw draft in progress.
  const [draft, setDraft] = useState<OptionGroup[]>(groups ?? []);
  const [focusId, setFocusId] = useState<string | null>(null);
  const full = draft.length >= MAX_GROUPS_PER_ITEM;

  const commit = (next: OptionGroup[]) => {
    setDraft(next);
    onChange(cleanGroups(next));
  };
  const patchGroup = (id: string, fn: (g: OptionGroup) => OptionGroup) =>
    commit(draft.map((g) => (g.id === id ? fn(g) : g)));
  const add = (kind: "required" | "extras") => {
    const titles = defaultTitles ?? { required: e.defaultRequiredTitle, extras: e.defaultExtrasTitle };
    const g = newGroup(kind, kind === "required" ? titles.required : titles.extras);
    setFocusId(g.options[0].id);
    commit([...draft, g]);
  };
  const addOpt = (g: OptionGroup) => {
    const next = addOption(g);
    setFocusId(next.options[next.options.length - 1].id);
    patchGroup(g.id, () => next);
  };

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <legend className="px-1 text-sm font-semibold text-[color:var(--color-navy)]">{e.groupsTitle}</legend>
      {draft.map((g, gi) => (
        <div key={g.id} className="flex flex-col gap-2 rounded-lg bg-gray-50 p-2.5">
          <div className="flex items-end gap-1">
            <label className="label min-w-0 flex-1">
              {e.groupTitleLabel}
              <input
                className="input min-w-0"
                maxLength={60}
                value={g.title}
                onChange={(ev) => patchGroup(g.id, (x) => ({ ...x, title: ev.target.value }))}
              />
            </label>
            <IconButton label={e.removeGroup} onClick={() => commit(removeGroup(draft, g.id))}>×</IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-5"
                checked={g.min >= 1}
                onChange={(ev) => patchGroup(g.id, (x) => setRequired(x, ev.target.checked))}
              />
              {e.requiredLabel}
            </label>
            {/* A −/+ counter: a number field can't be cleared and retyped on a phone. */}
            <MaxCounter
              value={g.max}
              label={e.maxLabel}
              lessLabel={e.maxLess}
              moreLabel={e.maxMore}
              id={g.id}
              onChange={(n) => patchGroup(g.id, (x) => setMax(x, n))}
            />
            <span className="ml-auto flex">
              <IconButton label={it.moveUp} disabled={gi === 0} onClick={() => commit(moveGroup(draft, g.id, -1))}>↑</IconButton>
              <IconButton label={it.moveDown} disabled={gi === draft.length - 1} onClick={() => commit(moveGroup(draft, g.id, 1))}>↓</IconButton>
            </span>
          </div>
          {g.options.map((o) => (
            <div key={o.id} className="flex items-center gap-1">
              <input
                className="input min-w-0 flex-1"
                aria-label={e.optionNameLabel}
                placeholder={e.optionNameLabel}
                maxLength={60}
                autoFocus={o.id === focusId}
                value={o.name}
                onChange={(ev) => patchGroup(g.id, (x) => updateOption(x, o.id, { name: ev.target.value }))}
              />
              <PriceField
                label={e.optionPriceLabel}
                placeholder={e.optionFree}
                cents={o.priceCents}
                onCents={(priceCents) => patchGroup(g.id, (x) => updateOption(x, o.id, { priceCents }))}
              />
              <IconButton label={e.removeOption} onClick={() => patchGroup(g.id, (x) => removeOption(x, o.id))}>×</IconButton>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm self-start"
            disabled={g.options.length >= MAX_OPTIONS_PER_GROUP}
            onClick={() => addOpt(g)}
          >
            {e.addOption}
          </button>
          {g.options.length >= MAX_OPTIONS_PER_GROUP && (
            <span className="text-xs text-gray-500">{format(e.limitOptions, { n: MAX_OPTIONS_PER_GROUP })}</span>
          )}
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn btn-secondary btn-sm" disabled={full} onClick={() => add("required")}>
          {e.addRequired}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={full} onClick={() => add("extras")}>
          {e.addExtras}
        </button>
      </div>
      {full && <span className="text-xs text-gray-500">{format(e.limitGroups, { n: MAX_GROUPS_PER_ITEM })}</span>}
      {otherItems.length > 0 && (
        <select
          className="input"
          aria-label={e.copyFrom}
          disabled={full}
          value=""
          onChange={(ev) => {
            const from = otherItems.find((i) => i.id === ev.target.value);
            if (from) commit(copyGroups(draft, from.groups));
          }}
        >
          <option value="">{e.copyFrom}</option>
          {otherItems.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      )}
    </fieldset>
  );
}

// "Máximo de escolhas" as a counter, 1..MAX_OPTIONS_PER_GROUP.
function MaxCounter({
  value, label, lessLabel, moreLabel, id, onChange,
}: {
  value: number;
  label: string;
  lessLabel: string;
  moreLabel: string;
  id: string;
  onChange: (n: number) => void;
}) {
  const n = Math.min(Math.max(value, 1), MAX_OPTIONS_PER_GROUP);
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 text-sm font-medium">
      <span className="mr-1">{label}</span>
      <IconButton label={lessLabel} disabled={n <= 1} onClick={() => onChange(n - 1)}>−</IconButton>
      <span data-max-value={id} aria-live="polite" className="min-w-6 text-center font-bold tabular-nums">{n}</span>
      <IconButton label={moreLabel} disabled={n >= MAX_OPTIONS_PER_GROUP} onClick={() => onChange(n + 1)}>+</IconButton>
    </div>
  );
}

// The price text is local so "8," survives mid-typing; only a readable price is sent up.
function PriceField({
  label, placeholder, cents, onCents,
}: {
  label: string;
  placeholder: string;
  cents: number;
  onCents: (cents: number) => void;
}) {
  const [text, setText] = useState(optionPriceText(cents));
  return (
    <input
      className="input w-24 shrink-0 tabular-nums"
      aria-label={label}
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onChange={(ev) => {
        setText(ev.target.value);
        const next = optionPriceCents(ev.target.value);
        if (next !== null) onCents(next);
      }}
    />
  );
}
