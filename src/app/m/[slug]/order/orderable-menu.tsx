"use client";

import { useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { formatPrice, type Menu } from "@/lib/menu";
import { addToCart, cartTotals, emptyCart, readCart, resolveCart, setQty, type Cart } from "@/lib/cart";
import type { OrderDetails } from "@/lib/order";
import { readCartRaw, subscribeCart, writeCartRaw } from "./cart-store";
import { MENU_ITEM_CARD_CLASS, MENU_SECTION_LIST_CLASS, MENU_SECTION_TITLE_CLASS, MenuItemBody } from "../menu-item-card";
import { OrderSheet } from "./order-sheet";

// The text menu with ordering (spec §2): tap an item to add it, ± once it is
// in the order, a bar at the bottom, and the order sheet. Rendered by
// BuiltMenu only when the restaurant has a WhatsApp number.
export function OrderableMenu({
  slug,
  restaurantName,
  country,
  whatsappNumber,
  demo = false,
  menu,
  accent,
  titleColor,
}: {
  slug: string;
  restaurantName: string;
  country: string | null;
  whatsappNumber: string;
  // Example menus: the order is shown, never sent.
  demo?: boolean;
  menu: Menu; // already cut by visibleMenu
  accent: string;
  titleColor: string;
}) {
  const t = useT();
  const o = t.menu.order;
  const key = `cart:${slug}`;
  const raw = useSyncExternalStore(subscribeCart, () => readCartRaw(key), () => null);
  const [openedAt] = useState(() => Date.now());
  const cart = readCart(raw, openedAt);
  const lines = resolveCart(cart, menu);
  const totals = cartTotals(lines);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Kept here, not in the sheet, so closing it to add one more item doesn't
  // wipe the name and address the diner already typed.
  const [details, setDetails] = useState<OrderDetails>({ name: "", mode: null, address: "", table: "", notes: "" });
  const [tried, setTried] = useState(false);

  const save = (next: Cart) => writeCartRaw(key, JSON.stringify(next));
  const qtyOf = (id: string) => cart.lines.find((l) => l.id === id)?.qty ?? 0;
  const totalText =
    totals.cents === 0 && totals.hasUnpriced
      ? o.toArrange
      : totals.hasUnpriced
        ? format(o.plusToArrange, { total: formatPrice(totals.cents, country) })
        : formatPrice(totals.cents, country);

  return (
    <>
      <main className="flex-1 px-4 pb-10 pt-3">
        {menu.sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-6 scroll-mt-14 first:mt-1">
            {section.title && (
              <h2 className={MENU_SECTION_TITLE_CLASS} style={{ color: titleColor }}>
                {section.title}
              </h2>
            )}
            <ul className={MENU_SECTION_LIST_CLASS}>
              {section.items.map((item) => (
                <OrderableItem
                  key={item.id}
                  item={item}
                  qty={qtyOf(item.id)}
                  country={country}
                  accent={accent}
                  onAdd={() => save(addToCart(cart, item.id, Date.now()))}
                  onQty={(n) => save(setQty(cart, item.id, n, Date.now()))}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>

      {totals.count > 0 && !sheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-full px-5 py-4 font-bold text-white shadow-lg"
            style={{ background: accent }}
          >
            <span>{o.viewOrder}</span>
            <span className="text-sm font-semibold tabular-nums">
              {totals.count === 1 ? o.countOne : format(o.count, { n: totals.count })} · {totalText}
            </span>
          </button>
        </div>
      )}

      {sheetOpen && (
        <OrderSheet
          slug={slug}
          restaurantName={restaurantName}
          country={country}
          whatsappNumber={whatsappNumber}
          demo={demo}
          lines={lines}
          totalText={totalText}
          details={details}
          setDetails={setDetails}
          tried={tried}
          setTried={setTried}
          accent={accent}
          onQty={(id, n) => save(setQty(cart, id, n, Date.now()))}
          onClear={() => save(emptyCart(Date.now()))}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

// One item of the ordering list. Tapping the card adds it; once it is in the
// order the ± control takes the place of the "+" on the price line — one
// count on screen, not a badge plus a control under it (2026-10-23).
export function OrderableItem({
  item,
  qty,
  country,
  accent,
  onAdd,
  onQty,
}: {
  item: Menu["sections"][number]["items"][number];
  qty: number;
  country: string | null;
  accent: string;
  onAdd: () => void;
  onQty: (qty: number) => void;
}) {
  const t = useT();
  const o = t.menu.order;
  return (
    <li className={`${MENU_ITEM_CARD_CLASS} relative`}>
      <button type="button" aria-label={format(o.add, { name: item.name })} onClick={onAdd} className="block w-full text-left">
        <MenuItemBody
          name={item.name}
          description={item.description}
          priceCents={item.priceCents}
          country={country}
          trailing={
            qty > 0 ? (
              // Holds the ± control's width so the price line stays clear of it.
              <span aria-hidden className="h-8 w-[7.5rem] shrink-0" />
            ) : (
              /* The "+" every ordering app uses, so diners see the item can be added. */
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: accent }}
              >
                +
              </span>
            )
          }
        />
      </button>
      {qty > 0 && (
        // Sits on the price line, inside the card's padding (px-4 pb-3).
        <div className="absolute bottom-3 right-4">
          <QtyControl
            qty={qty}
            accent={accent}
            label={format(o.inCart, { n: qty })}
            lessLabel={o.less}
            moreLabel={o.more}
            onChange={onQty}
          />
        </div>
      )}
    </li>
  );
}

export function QtyControl({
  qty,
  accent,
  label,
  lessLabel,
  moreLabel,
  onChange,
}: {
  qty: number;
  accent: string;
  label: string;
  lessLabel: string;
  moreLabel: string;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-4" aria-label={label}>
      <button
        type="button"
        aria-label={lessLabel}
        onClick={() => onChange(qty - 1)}
        className="flex size-8 items-center justify-center rounded-full border-2 text-lg font-bold"
        style={{ borderColor: accent, color: accent }}
      >
        −
      </button>
      <span className="min-w-6 text-center font-bold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label={moreLabel}
        onClick={() => onChange(qty + 1)}
        className="flex size-8 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ background: accent }}
      >
        +
      </button>
    </div>
  );
}
