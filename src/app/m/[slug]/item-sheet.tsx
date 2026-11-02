"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { formatPrice, type MenuItem } from "@/lib/menu";
import { firstMissingGroup, fromPrice, hasGroups, normalizeOpts, selectionCents, toggleOption } from "@/lib/menu-options";
import { OptionPicker, groupDomId } from "./option-picker";
import { MENU_ITEM_CARD_CLASS, MenuItemBody, cardPrice } from "./menu-item-card";
import { QtyControl } from "./order/qty-control";

// The sheet a tap on an item opens, as in the delivery apps (spec 2026-10-25
// §4): the big photo, the whole description and, with ordering on, quantity
// and add. Closes on the X, a tap outside or Esc, and gives the focus back to
// the card that opened it.
export function ItemSheet({
  item,
  country,
  accent,
  onClose,
  onAdd,
  initialOpts,
}: {
  item: MenuItem;
  country: string | null;
  accent: string;
  onClose: () => void;
  // Set when the page takes orders.
  onAdd?: (qty: number, opts: string[]) => void;
  // Pre-chosen options (static rendering in tests).
  initialOpts?: string[];
}) {
  const t = useT();
  const o = t.menu.order;
  const [qty, setQty] = useState(1);
  const [opts, setOpts] = useState<string[]>(initialOpts ?? []);
  const [missing, setMissing] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const price = item.priceCents === null ? null : formatPrice(item.priceCents, country);
  const grouped = hasGroups(item);
  // The button shows the live total: base plus chosen options, times quantity.
  const total =
    item.priceCents === null ? null : formatPrice((item.priceCents + selectionCents(item, opts)) * qty, country);
  const from = grouped ? fromPrice(item) : null;
  const headline =
    from && from.from && from.cents !== null ? format(o.fromPrice, { price: formatPrice(from.cents, country) }) : price;

  // The parent passes a new onClose on every render; the open/close effect
  // must run once, or the focus would jump back to the X on each tap of ±.
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latestClose.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 bg-gray-900/45" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white text-gray-900"
      >
        <div className="overflow-y-auto">
          {item.photo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.photo.full} alt={item.name} className="aspect-[4/3] w-full object-cover" />
          )}
          <div className="flex flex-col gap-2 px-5 pb-5 pt-5">
            <h2 className="pr-10 text-xl font-bold leading-tight">{item.name}</h2>
            {item.description && <p className="leading-snug text-gray-600">{item.description}</p>}
            {headline && <p className="mt-1 text-lg font-semibold tabular-nums">{headline}</p>}
          </div>
          {grouped && (
            <div className="px-5 pb-5">
              <OptionPicker
                item={item}
                country={country}
                accent={accent}
                value={opts}
                readOnly={!onAdd}
                missing={missing}
                onChange={(groupId, optionId) => {
                  setOpts((cur) => toggleOption(item, cur, groupId, optionId));
                  setMissing(null);
                }}
              />
            </div>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label={o.close}
          onClick={onClose}
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white text-xl font-bold shadow"
        >
          ×
        </button>
        {onAdd && (
          <div className="flex items-center gap-3 border-t border-gray-100 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <QtyControl
              qty={qty}
              accent={accent}
              label={format(o.inCart, { n: qty })}
              lessLabel={o.less}
              moreLabel={o.more}
              onChange={(n) => setQty(Math.max(1, n))}
            />
            <button
              type="button"
              onClick={() => {
                const gap = firstMissingGroup(item, opts);
                if (gap) {
                  setMissing(gap);
                  document.getElementById(groupDomId(item.id, gap))?.scrollIntoView({ block: "center", behavior: "smooth" });
                  return;
                }
                onAdd(qty, normalizeOpts(opts));
                onClose();
              }}
              className="flex h-12 flex-1 items-center justify-between rounded-full px-5 font-bold text-white"
              style={{ background: accent }}
            >
              <span>{o.addToOrder}</span>
              {total && <span className="tabular-nums">{total}</span>}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// A card of the static page (no ordering) that has a photo: the whole card
// opens the sheet. Cards without a photo stay server-rendered <li>s.
export function PhotoItemCard({ item, country, accent }: { item: MenuItem; country: string | null; accent: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <li className={MENU_ITEM_CARD_CLASS}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={format(t.menu.order.open, { name: item.name })}
        onClick={() => setOpen(true)}
        className="block w-full text-left"
      >
        <MenuItemBody
          name={item.name}
          description={item.description}
          {...cardPrice(item)}
          fromTemplate={t.menu.order.fromPrice}
          country={country}
          photo={item.photo}
        />
      </button>
      {open && <ItemSheet item={item} country={country} accent={accent} onClose={() => setOpen(false)} />}
    </li>
  );
}
