"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import {
  MenuSchema,
  MenuVisualInputSchema,
  PublishMenuInputSchema,
  SaveDraftInputSchema,
  countItems,
  dropEmptySections,
  isOwnLogoUrl,
  readMenuTheme,
  type Menu,
} from "@/lib/menu";
import { menuRev, photoSaveError, photosToDelete } from "@/lib/menu-photos";
import { isPro } from "@/lib/pricing";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { COUNTRY_FOR_LOCALE } from "@/i18n/config";
import { getLocale } from "@/i18n";
import { dashT, requireOwnedRestaurant, requireUserId } from "./guards";

// A stored menu for comparing photos: never throws, so bad data can't block a save.
function storedMenu(raw: unknown): Menu | null {
  return raw == null ? null : (MenuSchema.safeParse(raw).data ?? null);
}

// A failed delete is logged with its URL for a hand cleanup; the save stands.
async function deletePhotos(urls: string[], where: string): Promise<void> {
  for (const url of urls) {
    await del(url).catch((err) => console.error(`[${where}] photo delete failed:`, url, err));
  }
}

// Autosave target, called after every pause in editing. Two things it must
// never do: revalidate (in Next 16 that reloads the visited pages on every
// call) and bump Restaurant.updatedAt (the sitemap reports it to Google as a
// change to the public page, which a draft is not). Hence one raw UPDATE,
// which also checks ownership in its WHERE.
export async function saveMenuDraft(input: {
  restaurantId: string;
  menu: unknown;
  baseRev?: string;
}): Promise<{ error?: string; rev?: string }> {
  const userId = await requireUserId();
  const envelope = SaveDraftInputSchema.safeParse(input);
  if (!envelope.success) {
    const t = await dashT();
    return { error: t.errors.invalidInput };
  }
  const parsed = MenuSchema.safeParse(envelope.data.menu);
  if (!parsed.success) {
    const t = await dashT();
    return { error: t.errors.invalidMenu };
  }

  const before = await prisma.restaurant.findFirst({
    where: { id: envelope.data.restaurantId, ownerId: userId },
    select: { menuDraft: true, menuPublished: true, owner: { select: { proExpiresAt: true } } },
  });
  if (!before) {
    const t = await dashT();
    return { error: t.errors.restaurantNotFound };
  }
  const previousDraft = storedMenu(before.menuDraft);
  const published = storedMenu(before.menuPublished);
  const refused = photoSaveError(parsed.data, envelope.data.restaurantId, isPro(before.owner), [previousDraft, published]);
  if (refused) {
    const t = await dashT();
    return { error: t.errors[refused] };
  }

  const updated = await prisma.$executeRaw`
    UPDATE "Restaurant" SET "menuDraft" = ${JSON.stringify(parsed.data)}::jsonb
    WHERE "id" = ${envelope.data.restaurantId} AND "ownerId" = ${userId}`;
  if (updated === 0) {
    const t = await dashT();
    return { error: t.errors.restaurantNotFound };
  }
  // Another tab or device saved since this one last did: its photos may be in
  // the draft this save replaces, so nothing is deleted (an orphan at worst).
  if (envelope.data.baseRev === menuRev(previousDraft)) {
    await deletePhotos(photosToDelete([previousDraft, published], [parsed.data, published]), "saveMenuDraft");
  }
  return { rev: menuRev(parsed.data) };
}

// The builder's first step. Country and theme are not drafted: they apply to
// the public page as soon as they are saved, which is why this one revalidates.
export async function saveMenuVisual(input: {
  restaurantId: string;
  country: string;
  theme: unknown;
}): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const parsed = MenuVisualInputSchema.safeParse(input);
  if (!parsed.success) {
    const t = await dashT();
    return { error: t.errors.invalidInput };
  }
  const { restaurantId, country, theme } = parsed.data;
  const restaurant = await requireOwnedRestaurant(userId, restaurantId);
  if (theme.logoUrl && !isOwnLogoUrl(theme.logoUrl, restaurant.id)) {
    const t = await dashT();
    return { error: t.errors.logoInvalid };
  }

  const previousLogo = readMenuTheme(restaurant.menuTheme).logoUrl;
  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { country, menuTheme: theme },
  });
  if (previousLogo && previousLogo !== theme.logoUrl) {
    await del(previousLogo).catch((err) =>
      console.error("[saveMenuVisual] logo delete failed:", previousLogo, err),
    );
  }

  revalidatePath(`/m/${restaurant.slug}`);
  return {};
}

// "Usar fotos em vez disso". Only flips the mode when there are photos to show;
// otherwise the dashboard opens the uploader and the first upload flips it
// (recordMenuImages with switchToPhotos). Nothing is deleted either way.
export async function chooseMenuPhotos(input: {
  restaurantId: string;
}): Promise<{ error?: string; needsUpload?: boolean }> {
  const userId = await requireUserId();
  const parsed = PublishMenuInputSchema.pick({ restaurantId: true }).safeParse(input);
  if (!parsed.success) {
    const t = await dashT();
    return { error: t.errors.invalidInput };
  }
  const restaurant = await requireOwnedRestaurant(userId, parsed.data.restaurantId);
  const images = await prisma.menuImage.count({ where: { restaurantId: restaurant.id } });
  if (images === 0) return { needsUpload: true };

  await prisma.restaurant.update({ where: { id: restaurant.id }, data: { menuMode: "photos" } });
  revalidatePath(`/m/${restaurant.slug}`);
  revalidatePath("/dashboard");
  return {};
}

// Takes the menu on the owner's screen rather than re-reading the saved draft,
// which can lag the screen by an autosave interval. Draft and published are
// written together so they can't drift apart on publish.
export async function publishMenu(input: {
  restaurantId: string;
  menu: unknown;
  whatsappNumber?: string;
  baseRev?: string;
}): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const envelope = PublishMenuInputSchema.safeParse(input);
  if (!envelope.success) {
    const t = await dashT();
    return { error: t.errors.invalidInput };
  }
  const restaurant = await requireOwnedRestaurant(userId, envelope.data.restaurantId);
  const parsed = MenuSchema.safeParse(envelope.data.menu);
  if (!parsed.success) {
    const t = await dashT();
    return { error: t.errors.invalidMenu };
  }
  const menu = dropEmptySections(parsed.data);
  if (countItems(menu) === 0) {
    const t = await dashT();
    return { error: t.errors.invalidMenu };
  }
  const previousDraft = storedMenu(restaurant.menuDraft);
  const previousPublished = storedMenu(restaurant.menuPublished);
  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { proExpiresAt: true } });
  const refused = photoSaveError(menu, restaurant.id, isPro(owner), [previousDraft, previousPublished]);
  if (refused) {
    const t = await dashT();
    return { error: t.errors[refused] };
  }

  // A blank field publishes without a number; anything typed must be valid,
  // so a typo doesn't publish a menu that silently takes no orders.
  const typed = envelope.data.whatsappNumber?.trim();
  let whatsappNumber: string | undefined;
  if (typed) {
    const normalized = normalizeWhatsapp(typed, restaurant.country ?? COUNTRY_FOR_LOCALE[await getLocale()]);
    if (!normalized) {
      const t = await dashT();
      return { error: t.errors.whatsappFormat };
    }
    whatsappNumber = normalized;
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { menuDraft: menu, menuPublished: menu, menuMode: "built", ...(whatsappNumber && { whatsappNumber }) },
  });
  // As in saveMenuDraft: a publish from a stale tab deletes nothing.
  if (envelope.data.baseRev === menuRev(previousDraft)) {
    await deletePhotos(photosToDelete([previousPublished, previousDraft], [menu]), "publishMenu");
  }

  revalidatePath(`/m/${restaurant.slug}`);
  revalidatePath("/dashboard");
  return {};
}
