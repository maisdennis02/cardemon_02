"use client";

import { useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { formatPrice, textOn, type Menu } from "@/lib/menu";
import { hasGroups } from "@/lib/menu-options";
import { addToCart, cartTotals, emptyCart, pruneCart, qtyOfItem, readCart, resolveCart, setQty, type Cart } from "@/lib/cart";
import type { OrderDetails } from "@/lib/order";
import { readCartRaw, subscribeCart, writeCartRaw } from "./cart-store";
import { MENU_ITEM_CARD_CLASS, MENU_SECTION_LIST_CLASS, MENU_SECTION_TITLE_CLASS, MenuItemBody, cardPrice } from "../menu-item-card";
import { OrderSheet } from "./order-sheet";
import { QtyControl } from "./qty-control";
import { ItemSheet } from "../item-sheet";

// The text menu with ordering (spec §2): tap an item to open it, "+" to add, ± once it is
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
  titleStyle,
  controlColor = accent,
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
  // Overrides titleColor: the poster style's band (sectionTitleStyle).
  titleStyle?: React.CSSProperties;
  // The cards' "+", ± and "n no pedido": the poster style needs a color that
  // reads on its dark page (posterColors().name); sheets keep `accent`.
  controlColor?: string;
}) {
  const t = useT();
  const o = t.menu.order;
  const key = `cart:${slug}`;
  const raw = useSyncExternalStore(subscribeCart, () => readCartRaw(key), () => null);
  const [openedAt] = useState(() => Date.now());
  // Only lines the order can show: a line the owner's edits made invalid is
  // neither counted on a card nor kept in storage on the next save.
  const cart = pruneCart(readCart(raw, openedAt), menu);
  const lines = resolveCart(cart, menu);
  const totals = cartTotals(lines);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Kept here, not in the sheet, so closing it to add one more item doesn't
  // wipe the name and address the diner already typed.
  const [details, setDetails] = useState<OrderDetails>({ name: "", mode: null, address: "", table: "", notes: "" });
  const [tried, setTried] = useState(false);

  const save = (next: Cart) => writeCartRaw(key, JSON.stringify(pruneCart(next, menu)));
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
              <h2 className={MENU_SECTION_TITLE_CLASS} style={titleStyle ?? { color: titleColor }}>
                {section.title}
              </h2>
            )}
            <ul className={MENU_SECTION_LIST_CLASS}>
              {section.items.map((item) => (
                <OrderableItem
                  key={item.id}
                  item={item}
                  qty={qtyOfItem(lines, item.id)}
                  country={country}
                  accent={accent}
                  controlColor={controlColor}
                  onAdd={(opts, n) => save(addToCart(cart, item.id, Date.now(), opts, n))}
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
            className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-full px-5 py-4 font-bold shadow-lg"
            style={{ background: accent, color: textOn(accent) }}
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
          onQty={(lineKey, n) => save(setQty(cart, lineKey, n, Date.now()))}
          onClear={() => save(emptyCart(Date.now()))}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

// One item of the ordering list. Tapping the card opens the item sheet; the
// "+" beside it adds one straight away (spec 2026-10-25 §4, the delivery-app
// pattern). Once the item is in the order the ± control takes the place of
// the "+" on the price line — one count on screen (2026-10-23). With a photo
// the "+" sits on the photo's corner and the ± gets a row under the card.
export function OrderableItem({
  item,
  qty,
  country,
  accent,
  controlColor = accent,
  onAdd,
  onQty,
}: {
  item: Menu["sections"][number]["items"][number];
  qty: number;
  country: string | null;
  accent: string;
  controlColor?: string;
  // Adds `qty` of the item with the chosen options (from the sheet, or the bare "+").
  onAdd: (opts: string[], qty: number) => void;
  // Direct ± on the card; only items without option groups get one.
  onQty: (qty: number) => void;
}) {
  const t = useT();
  const o = t.menu.order;
  const [open, setOpen] = useState(false);
  const photo = Boolean(item.photo);
  // With option groups the choice needs the sheet: "+" opens it, and the card
  // shows a count instead of ± (one line per choice lives in the order screen).
  const grouped = hasGroups(item);
  return (
    <li className={`${MENU_ITEM_CARD_CLASS} relative`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={format(o.open, { name: item.name })}
        onClick={() => setOpen(true)}
        className="block w-full text-left"
      >
        <MenuItemBody
          name={item.name}
          description={item.description}
          {...cardPrice(item)}
          fromTemplate={o.fromPrice}
          country={country}
          photo={item.photo}
          trailing={
            qty > 0 && !photo && !grouped ? (
              // Holds the ± control's width so the price line stays clear of it.
              <span aria-hidden className="h-8 w-[7.5rem] shrink-0" />
            ) : photo ? undefined : (
              <span aria-hidden className="size-8 shrink-0" />
            )
          }
        />
      </button>
      {grouped && qty > 0 && (
        <p className="mt-1 text-sm font-semibold" style={{ color: controlColor }}>
          {format(o.inOrder, { n: qty })}
        </p>
      )}
      {qty > 0 && !grouped ? (
        // Sits on the price line, inside the card's padding (px-4 py-2). Next
        // to a photo the text column is too narrow for price plus ± on a
        // 360 px phone, so there it takes a row of its own under the card.
        <div className={photo ? "mt-2 flex justify-end" : "absolute bottom-2 right-4"}>
          <QtyControl
            qty={qty}
            accent={controlColor}
            label={format(o.inCart, { n: qty })}
            lessLabel={o.less}
            moreLabel={o.more}
            onChange={onQty}
          />
        </div>
      ) : (
        /* The "+" every ordering app uses, so diners see the item can be added. */
        <button
          type="button"
          aria-label={format(o.add, { name: item.name })}
          onClick={grouped ? () => setOpen(true) : () => onAdd([], 1)}
          aria-haspopup={grouped ? "dialog" : undefined}
          className={`absolute flex items-center justify-center rounded-full text-lg font-bold menu-add ${
            photo ? "right-3 top-[4.625rem] size-9 bg-white shadow-md" : "bottom-2 right-4 size-8"
          }`}
          style={photo ? { color: accent } : { background: controlColor, color: textOn(controlColor) }}
        >
          +
        </button>
      )}
      {open && (
        <ItemSheet item={item} country={country} accent={accent} onClose={() => setOpen(false)} onAdd={(n, opts) => (grouped ? onAdd(opts, n) : onQty(qty + n))} />
      )}
    </li>
  );
}
