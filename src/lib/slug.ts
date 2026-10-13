import { isReservedSlug } from "@/lib/example-menus";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// Leaves room for "-50" (or a 6-char random suffix) under the 60-char slug cap.
export const SLUG_BASE_MAX = 52;

function defaultSuffix(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Derives a free, valid menu address from the business name (spec §1). */
export async function pickSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
  randomSuffix: () => string = defaultSuffix,
): Promise<string> {
  let base = slugify(name).slice(0, SLUG_BASE_MAX).replace(/-+$/, "");
  if (base.length < 2) base = "cardapio";

  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (isReservedSlug(candidate)) continue;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${base}-${randomSuffix()}`;
}
