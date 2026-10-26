"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { formatPrice, type MenuItem } from "@/lib/menu";
import { MENU_ITEM_CARD_CLASS, MenuItemBody } from "./menu-item-card";
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
}: {
  item: MenuItem;
  country: string | null;
  accent: string;
  onClose: () => void;
  // Set when the page takes orders.
  onAdd?: (qty: number) => void;
}) {
  const t = useT();
  const o = t.menu.order;
  const [qty, setQty] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  const price = item.priceCents === null ? null : formatPrice(item.priceCents, country);

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
            {price && <p className="mt-1 text-lg font-semibold tabular-nums">{price}</p>}
          </div>
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
                onAdd(qty);
                onClose();
              }}
              className="flex h-12 flex-1 items-center justify-between rounded-full px-5 font-bold text-white"
              style={{ background: accent }}
            >
              <span>{o.addToOrder}</span>
              {price && <span className="tabular-nums">{price}</span>}
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
          priceCents={item.priceCents}
          country={country}
          photo={item.photo}
        />
      </button>
      {open && <ItemSheet item={item} country={country} accent={accent} onClose={() => setOpen(false)} />}
    </li>
  );
}
