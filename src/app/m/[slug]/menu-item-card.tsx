import type { ReactNode } from "react";
import { format } from "@/i18n/config";
import { formatPrice, type ItemPhoto, type MenuItem } from "@/lib/menu";
import { fromPrice } from "@/lib/menu-options";

// One item of a text menu, as a row of its section's panel (2026-11-06; a
// card of its own before): name, description cut at two lines, then the
// price on its own line — never a right-hand price column, which makes a
// diner read the menu by price (what the menu-engineering people call "price
// scanning").
// No hooks and no "use client": the public page renders it on the server,
// the ordering list renders it inside a button.

// The <li> itself; the ordering list needs its own <li> (a button plus the
// quantity control inside), so the card look is a class it can reuse.
export const MENU_ITEM_CARD_CLASS = "menu-row px-4 pb-3 pt-3";

// What a card shows as the price of an item: with option groups, the price of
// the cheapest valid choice ("a partir de" when a required group can change it).
export function cardPrice(item: MenuItem): { priceCents: number | null; from: boolean } {
  const p = fromPrice(item);
  return { priceCents: p.cents, from: p.from };
}

// cardPrice as text, as the card, the item sheet and the printed menu show it:
// "a partir de R$ 20,00" (fromTemplate) or the plain price; null when unpriced.
export function cardPriceText(item: MenuItem, country: string | null, fromTemplate: string): string | null {
  const { priceCents, from } = cardPrice(item);
  if (priceCents === null) return null;
  const formatted = formatPrice(priceCents, country);
  return from ? format(fromTemplate, { price: formatted }) : formatted;
}

export function MenuItemCard({
  name,
  description,
  priceCents,
  from,
  fromTemplate,
  country,
  groupLines,
}: {
  name: string;
  description?: string;
  priceCents: number | null;
  from?: boolean;
  fromTemplate?: string;
  country: string | null;
  // groupInfoLines(item): a page without ordering lists the options as information.
  groupLines?: string[];
}) {
  return (
    <li className={MENU_ITEM_CARD_CLASS}>
      <MenuItemBody
        name={name}
        description={description}
        priceCents={priceCents}
        from={from}
        fromTemplate={fromTemplate}
        country={country}
        groupLines={groupLines}
      />
    </li>
  );
}

// The card's content, with room for a control (the ordering "+") on the
// price line. With a photo (Pro, spec 2026-10-25) the text keeps the left and
// a 96 px square thumb takes the right, as in the delivery apps.
export function MenuItemBody({
  name,
  description,
  priceCents,
  from = false,
  fromTemplate,
  country,
  trailing,
  photo,
  groupLines,
}: {
  name: string;
  description?: string;
  priceCents: number | null;
  // True when priceCents is a "from" price; fromTemplate is the dictionary's "a partir de {price}".
  from?: boolean;
  fromTemplate?: string;
  country: string | null;
  trailing?: ReactNode;
  photo?: ItemPhoto;
  groupLines?: string[];
}) {
  const formatted = priceCents === null ? null : formatPrice(priceCents, country);
  const price = formatted !== null && from && fromTemplate ? format(fromTemplate, { price: formatted }) : formatted;
  if (photo) {
    return (
      <span className="flex items-stretch gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="menu-name block font-semibold leading-snug">{name}</span>
          {description && (
            <span className="menu-desc mt-0.5 line-clamp-2 text-[0.875em] leading-snug text-gray-500">{description}</span>
          )}
          {(price !== null || trailing) && (
            <span className="mt-auto flex min-h-[2em] items-center justify-between gap-3 pt-[0.5em]">
              <span className={price !== null ? "menu-price font-medium tabular-nums" : undefined}>{price}</span>
              {trailing}
            </span>
          )}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumb}
          alt={name}
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
          className="size-24 shrink-0 self-start rounded-xl bg-gray-100 object-cover"
        />
      </span>
    );
  }
  return (
    <>
      <span className="menu-name block font-semibold leading-snug">{name}</span>
      {description && (
        <span className="menu-desc mt-0.5 line-clamp-2 text-[0.875em] leading-snug text-gray-500">{description}</span>
      )}
      {groupLines?.map((line, i) => (
        <span key={i} className="menu-desc mt-0.5 block break-words text-[0.8em] leading-snug text-gray-500">
          {line}
        </span>
      ))}
      {(price !== null || trailing) && (
        <span className="mt-[0.4em] flex min-h-[2em] items-center justify-between gap-3">
          <span className={price !== null ? "menu-price font-medium tabular-nums" : undefined}>{price}</span>
          {trailing}
        </span>
      )}
    </>
  );
}

// Section headings read as headings now, not as tiny tracked-out caps.
export const MENU_SECTION_TITLE_CLASS = "menu-section-title mb-2.5 px-1 text-lg font-bold leading-tight";
// One panel per section, items as rows split by a hairline (2026-11-06).
export const MENU_SECTION_LIST_CLASS =
  "menu-list divide-y divide-black/[.06] overflow-hidden rounded-2xl border border-black/[.07] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]";
