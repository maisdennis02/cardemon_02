// Address and opening hours (2026-11-06): free text typed in Ajustes and shown
// under the restaurant's name on the menu. Free text on purpose — structured
// hours ("open now") wait for the delivery-2 decision on closed-shop orders.
export const ADDRESS_MAX = 160;
export const HOURS_MAX = 120;

// One line, no stray spaces; blank means "no value" (null), so erasing the
// field clears it.
export function cleanInfoText(raw: string | null | undefined, max: number): string | null {
  const text = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
