"use client";

import { useState } from "react";
import { useT } from "@/i18n/provider";
import type { MenuItem, MenuSection } from "@/lib/menu";
import { parseItemLine } from "@/lib/menu-parse";
import { MicButton } from "@/components/voice/mic-button";
import { IconButton } from "./step-items";

type Patch = { name?: string; description?: string; priceCents?: number | null };

function priceText(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

// Reads a price typed on its own with the same rule as an item line, so
// "25,90", "R$ 25" and "25 e 90" all work here too.
function parsePrice(text: string): number | null | "invalid" {
  if (!text.trim()) return null;
  return parseItemLine(`x ${text}`)?.priceCents ?? "invalid";
}

// Inline editor for one item: name, description, price, order, section.
export function ItemEditor({
  item,
  sectionId,
  sections,
  first,
  last,
  onChange,
  onMove,
  onMoveTo,
  onRemove,
  onDone,
  lang,
}: {
  lang: string;
  item: MenuItem;
  sectionId: string;
  sections: MenuSection[];
  first: boolean;
  last: boolean;
  onChange: (patch: Patch) => void;
  onMove: (dir: -1 | 1) => void;
  onMoveTo: (sectionId: string) => void;
  onRemove: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const e = t.dashboard.builder.editor;
  const it = t.dashboard.builder.items;
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(priceText(item.priceCents));
  const parsedPrice = parsePrice(price);
  const mic = t.menu.order.mic;
  const changeName = (value: string) => {
    setName(value);
    // The schema needs a name: an emptied field keeps the last one.
    if (value.trim()) onChange({ name: value });
  };
  const changePrice = (value: string) => {
    setPrice(value);
    const next = parsePrice(value);
    if (next !== "invalid") onChange({ priceCents: next });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-3">
      <label className="label">
        {e.name}
        <span className="flex items-center gap-2">
          <input autoFocus className="input min-w-0" maxLength={80} value={name} onChange={(ev) => changeName(ev.target.value)} />
          <MicButton value={name} onChange={(v) => changeName(v.slice(0, 80))} lang={lang} label={mic} />
        </span>
      </label>
      <label className="label">
        {e.description}
        <span className="flex items-start gap-2">
          <textarea
            className="input min-w-0"
            rows={2}
            maxLength={200}
            value={item.description ?? ""}
            onChange={(ev) => onChange({ description: ev.target.value })}
          />
          <MicButton
            value={item.description ?? ""}
            onChange={(v) => onChange({ description: v.slice(0, 200) })}
            lang={lang}
            label={mic}
          />
        </span>
      </label>
      <label className="label">
        {e.price}
        <span className="label-hint">{e.priceHint}</span>
        <span className="flex items-center gap-2">
          <input
            className="input min-w-0 tabular-nums"
            inputMode="decimal"
            value={price}
            onChange={(ev) => changePrice(ev.target.value)}
          />
          {/* A dictated price replaces the field: "25 e 90" is a whole price. */}
          <MicButton value="" onChange={changePrice} lang={lang} label={mic} />
        </span>
        {parsedPrice === "invalid" && <span className="text-xs font-normal text-red-600">{e.invalidPrice}</span>}
      </label>
      {sections.length > 1 && (
        <label className="label">
          {e.section}
          <select className="input" value={sectionId} onChange={(ev) => onMoveTo(ev.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title ?? it.untitled}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-center gap-1">
        <IconButton label={it.moveUp} disabled={first} onClick={() => onMove(-1)}>
          ↑
        </IconButton>
        <IconButton label={it.moveDown} disabled={last} onClick={() => onMove(1)}>
          ↓
        </IconButton>
        <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>
          {e.remove}
        </button>
        <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={onDone}>
          {e.done}
        </button>
      </div>
    </div>
  );
}
