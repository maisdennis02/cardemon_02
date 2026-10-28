import type { ReactNode } from "react";
import { formatPrice, type ItemPhoto } from "@/lib/menu";

// One item of a text menu, as a card: name, description, then the price on
// its own line — never a right-hand price column, which makes a diner read
// the menu by price (what the menu-engineering people call "price scanning").
// No hooks and no "use client": the public page renders it on the server,
// the ordering list renders it inside a button.

// The <li> itself; the ordering list needs its own <li> (a button plus the
// quantity control inside), so the card look is a class it can reuse.
export const MENU_ITEM_CARD_CLASS = "rounded-2xl border border-black/[.07] bg-white px-4 pb-3 pt-3.5 shadow-[0_1px_2px_rgba(0,0,0,.04)]";
// The same card on the printable sheet (spec 2026-10-28): less padding, so a
// menu fits on fewer sheets without changing how it looks.
export const MENU_ITEM_CARD_COMPACT_CLASS = "rounded-xl border border-black/[.07] bg-white px-3 pb-1.5 pt-2 shadow-[0_1px_2px_rgba(0,0,0,.04)]";

export function MenuItemCard({
  name,
  description,
  priceCents,
  country,
  photo,
  compact = false,
}: {
  name: string;
  description?: string;
  priceCents: number | null;
  country: string | null;
  photo?: ItemPhoto; // a plain thumb: on the public page a photo card is PhotoItemCard
  compact?: boolean;
}) {
  return (
    <li className={compact ? MENU_ITEM_CARD_COMPACT_CLASS : MENU_ITEM_CARD_CLASS}>
      <MenuItemBody
        name={name}
        description={description}
        priceCents={priceCents}
        country={country}
        photo={photo}
        compact={compact}
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
  country,
  trailing,
  photo,
  compact = false,
}: {
  name: string;
  description?: string;
  priceCents: number | null;
  country: string | null;
  trailing?: ReactNode;
  photo?: ItemPhoto;
  compact?: boolean;
}) {
  const price = priceCents === null ? null : formatPrice(priceCents, country);
  const priceLine = compact ? "min-h-0" : "min-h-[2em]";
  if (photo) {
    return (
      <span className="flex items-stretch gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="block font-semibold leading-snug">{name}</span>
          {description && (
            <span className="mt-0.5 line-clamp-2 text-[0.875em] leading-snug text-gray-500">{description}</span>
          )}
          {(price !== null || trailing) && (
            <span className={`mt-auto flex ${priceLine} items-center justify-between gap-3 ${compact ? "pt-1" : "pt-[0.5em]"}`}>
              <span className="font-medium tabular-nums">{price}</span>
              {trailing}
            </span>
          )}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumb}
          alt={name}
          width={compact ? 64 : 96}
          height={compact ? 64 : 96}
          loading={compact ? undefined : "lazy"}
          decoding="async"
          className={`${compact ? "size-16" : "size-24"} shrink-0 self-start rounded-xl bg-gray-100 object-cover`}
        />
      </span>
    );
  }
  return (
    <>
      <span className="block font-semibold leading-snug">{name}</span>
      {description && <span className="mt-0.5 block text-[0.875em] leading-snug text-gray-500">{description}</span>}
      {(price !== null || trailing) && (
        <span className={`${compact ? "mt-1" : "mt-[0.5em]"} flex ${priceLine} items-center justify-between gap-3`}>
          <span className="font-medium tabular-nums">{price}</span>
          {trailing}
        </span>
      )}
    </>
  );
}

// Section headings read as headings now, not as tiny tracked-out caps.
export const MENU_SECTION_TITLE_CLASS = "mb-2.5 px-1 text-lg font-bold leading-tight";
export const MENU_SECTION_LIST_CLASS = "grid gap-2.5";
