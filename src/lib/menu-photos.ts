// Rules for item photos that the server actions apply on save and publish:
// whose folder a photo may live in, how many the free plan may add, and which
// blobs a save leaves unreferenced. Free of Prisma and React, like menu.ts.
// Design: docs/superpowers/specs/2026-10-25-fotos-dos-produtos-design.md

import { MENU_MAX_ITEMS, type Menu } from "@/lib/menu";
import { FREE_PHOTO_LIMIT } from "@/lib/pricing";

function photos(menu: Menu | null) {
  return menu ? menu.sections.flatMap((s) => s.items.flatMap((i) => (i.photo ? [i.photo] : []))) : [];
}

export function photoUrls(menu: Menu | null): string[] {
  return photos(menu).flatMap((p) => [p.full, p.thumb]);
}

export function countPhotos(menu: Menu | null): number {
  return photos(menu).length;
}

// The schema already holds every URL to our Blob host; this pins the folder to
// the restaurant being saved, so one owner can't show another's photo.
export function photosBelongTo(menu: Menu, restaurantId: string): boolean {
  return photoUrls(menu).every((url) => {
    try {
      return new URL(url).pathname.startsWith(`/item-photos/${restaurantId}/`);
    } catch {
      return false;
    }
  });
}

// An owner who lost Pro keeps the photos already in the draft (autosave must
// go on working); they just can't add more past the free limit.
export function photoCap(pro: boolean, previousCount: number): number {
  return pro ? MENU_MAX_ITEMS : Math.max(FREE_PHOTO_LIMIT, previousCount);
}

// The blobs a save frees: referenced by some menu before it and by none after.
// Comparing the stored menus costs no Blob list operation.
export function photosToDelete(before: (Menu | null)[], after: (Menu | null)[]): string[] {
  const kept = new Set(after.flatMap(photoUrls));
  return [...new Set(before.flatMap(photoUrls))].filter((url) => !kept.has(url));
}
