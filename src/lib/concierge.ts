// Concierge pilot (docs/superpowers/specs/2026-11-05-piloto-concierge-design.md):
// the agent transcribes a restaurant's menu image into a file, renders it into
// images for the Instagram DM, and — once the restaurant has created its own
// account — drops the menu into that account's draft with 60 days of
// courtesy Pro. The restaurant checks it and publishes; we never publish.
import { z } from "zod";
import { MenuSchema, MenuThemeSchema, countItems, type Menu, type MenuTheme } from "./menu";

export const COURTESY_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

// The transcription file both scripts read. `instagram` is the bare handle.
export const ConciergeFileSchema: z.ZodType<{ name: string; instagram: string; menu: Menu; theme?: MenuTheme }> =
  z.object({
    name: z.string().trim().min(1).max(120),
    instagram: z.string().regex(/^[a-z0-9._]{1,30}$/i),
    menu: MenuSchema,
    theme: MenuThemeSchema.optional(),
  });

export type FillTarget = {
  restaurants: { id: string; slug: string; menuDraft: unknown }[];
  proExpiresAt: Date | null;
  billingSubscriptionId: string | null;
  // Set once a Stripe checkout ever ran. The webhook clears the subscription
  // id when a subscription lapses, but keeps the customer: this is what
  // still marks a former subscriber.
  billingCustomerId: string | null;
};

export type FillPlan =
  | {
      ok: true;
      restaurantId: string;
      slug: string;
      items: number;
      sections: number;
      proExpiresAtBefore: Date | null;
      proExpiresAtAfter: Date;
    }
  | { ok: false; reason: "no-restaurant" | "many-restaurants" | "draft-not-empty" | "has-subscription" };

// A draft is empty only when it is null or a valid menu with no items. Anything
// we can't read counts as not empty: never overwrite what we don't understand.
function draftIsEmpty(raw: unknown): boolean {
  if (raw == null) return true;
  const parsed = MenuSchema.safeParse(raw);
  return parsed.success && countItems(parsed.data) === 0;
}

export function planConciergeFill(target: FillTarget, menu: Menu, now: Date): FillPlan {
  if (target.restaurants.length === 0) return { ok: false, reason: "no-restaurant" };
  if (target.restaurants.length > 1) return { ok: false, reason: "many-restaurants" };
  const [restaurant] = target.restaurants;
  if (!draftIsEmpty(restaurant.menuDraft)) return { ok: false, reason: "draft-not-empty" };
  // Any billing history (live subscription, or a Stripe customer left by a
  // lapsed one) must not be papered over with a courtesy: sort it out by hand.
  if (target.billingSubscriptionId != null || target.billingCustomerId != null) {
    return { ok: false, reason: "has-subscription" };
  }

  const courtesyEnd = new Date(now.getTime() + COURTESY_DAYS * DAY_MS);
  const before = target.proExpiresAt;
  return {
    ok: true,
    restaurantId: restaurant.id,
    slug: restaurant.slug,
    items: countItems(menu),
    sections: menu.sections.length,
    proExpiresAtBefore: before,
    proExpiresAtAfter: before && before > courtesyEnd ? before : courtesyEnd,
  };
}

// The courtesy end date as the owner types it into the "Pronto" DM: the
// restaurant is in Brazil, so São Paulo time, never the machine's UTC.
export function courtesyDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
