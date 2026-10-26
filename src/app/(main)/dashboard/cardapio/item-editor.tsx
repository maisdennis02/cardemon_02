"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import type { ItemPhoto, MenuItem, MenuSection } from "@/lib/menu";
import { parsePrice } from "@/lib/menu-parse";
import { PhotoError, uploadItemPhoto } from "@/lib/item-photo";
import { FREE_PHOTO_LIMIT } from "@/lib/pricing";
import { capture } from "@/lib/posthog";
import { MicButton } from "@/components/voice/mic-button";
import { IconButton } from "./step-items";

// `photo: undefined` removes the photo.
type Patch = { name?: string; description?: string; priceCents?: number | null; photo?: ItemPhoto | undefined };

function priceText(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

// Inline editor for one item: photo, name, description, price, order, section.
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
  restaurantId,
  isPro,
  photoCount,
}: {
  lang: string;
  restaurantId: string;
  isPro: boolean;
  // Photos in the whole menu, for the free cap.
  photoCount: number;
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
      <div className="flex items-start gap-3">
        <PhotoSlot
          item={item}
          restaurantId={restaurantId}
          canAdd={isPro || photoCount < FREE_PHOTO_LIMIT}
          onChange={onChange}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
      <label className="label">
        {e.name}
        <span className="flex items-center gap-2">
          <input autoFocus className="input min-w-0" maxLength={80} value={name} onChange={(ev) => changeName(ev.target.value)} />
          <MicButton value={name} onChange={(v) => changeName(v.slice(0, 80))} lang={lang} label={mic} />
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
        </div>
      </div>
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
      {item.photo && !isPro && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-900">
          {e.photoProNotice}{" "}
          <Link href="/pricing" className="font-bold underline" onClick={() => capture("photo_pro_tapped", { from: "notice" })}>
            {e.photoProLink}
          </Link>
        </p>
      )}
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

// The photo square left of name and price: add, or the thumb with change and
// remove. The upload outlives renders, so its result goes through a ref to the
// latest onChange: a stale one would undo what the owner typed meanwhile.
function PhotoSlot({
  item,
  restaurantId,
  canAdd,
  onChange,
}: {
  item: MenuItem;
  restaurantId: string;
  canAdd: boolean;
  onChange: (patch: Patch) => void;
}) {
  const t = useT();
  const e = t.dashboard.builder.editor;
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setFailed(false);
    setUploading(true);
    const started = Date.now();
    try {
      const { photo, format: fmt } = await uploadItemPhoto(file, restaurantId, item.id);
      latest.current({ photo });
      capture("item_photo_added", { format: fmt, ms: Date.now() - started });
    } catch (err) {
      setFailed(true);
      capture("item_photo_failed", { stage: err instanceof PhotoError ? err.stage : "upload" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(ev) => void pick(ev.target.files?.[0])}
    />
  );

  if (!item.photo && !canAdd) {
    return (
      <p className="w-24 shrink-0 text-xs leading-snug text-gray-600">
        {e.photoLimit}{" "}
        <Link href="/pricing" className="font-bold underline" onClick={() => capture("photo_pro_tapped", { from: "limit" })}>
          {e.photoProLink}
        </Link>
      </p>
    );
  }

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1">
      {input}
      {item.photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photo.thumb}
            alt={format(e.photoAlt, { name: item.name })}
            width={96}
            height={96}
            className={`size-24 rounded-xl object-cover ${uploading ? "opacity-50" : ""}`}
          />
          <span className="flex gap-2 text-xs font-semibold">
            <button type="button" className="py-1.5 text-gray-700 underline" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {e.photoChange}
            </button>
            <button
              type="button"
              className="py-1.5 text-red-700 underline"
              disabled={uploading}
              onClick={() => {
                onChange({ photo: undefined });
                capture("item_photo_removed");
              }}
            >
              {e.photoRemove}
            </button>
          </span>
        </>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex size-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-white text-center text-xs font-semibold text-gray-700"
        >
          <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {uploading ? e.photoUploading : e.photoAdd}
        </button>
      )}
      {failed && <span className="text-center text-xs text-red-600">{e.photoFailed}</span>}
    </div>
  );
}
