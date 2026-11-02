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

// The owner's "adicionais" editor for one item. The raw draft (empty options
// included) lives here so typing never fights the autosave; upward goes only
// cleanGroups(draft), which always passes the menu schema.
export function OptionGroupsEditor({
  groups,
  otherItems,
  onChange,
}: {
  groups: OptionGroup[] | undefined;
  otherItems: OtherItem[];
  onChange: (next: OptionGroup[] | undefined) => void;
}) {
  const e = useT().dashboard.builder.editor;
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
    const g = newGroup(kind, kind === "required" ? e.defaultRequiredTitle : e.defaultExtrasTitle);
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
            <label className="flex items-center gap-2 text-sm font-medium">
              {e.maxLabel}
              <input
                type="number"
                inputMode="numeric"
                className="input w-16 tabular-nums"
                min={1}
                max={MAX_OPTIONS_PER_GROUP}
                value={g.max}
                onChange={(ev) => ev.target.value !== "" && patchGroup(g.id, (x) => setMax(x, Number(ev.target.value)))}
              />
            </label>
            <span className="ml-auto flex">
              <IconButton label="↑" disabled={gi === 0} onClick={() => commit(moveGroup(draft, g.id, -1))}>↑</IconButton>
              <IconButton label="↓" disabled={gi === draft.length - 1} onClick={() => commit(moveGroup(draft, g.id, 1))}>↓</IconButton>
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
