"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import {
  MenuSchema,
  MenuVisualInputSchema,
  PublishMenuInputSchema,
  SaveDraftInputSchema,
  isOwnLogoUrl,
  readMenuTheme,
} from "@/lib/menu";
import { dashT, requireOwnedRestaurant, requireUserId } from "./guards";

// Autosave target, called after every pause in editing. Two things it must
// never do: revalidate (in Next 16 that reloads the visited pages on every
// call) and bump Restaurant.updatedAt (the sitemap reports it to Google as a
// change to the public page, which a draft is not). Hence one raw UPDATE,
// which also checks ownership in its WHERE.
export async function saveMenuDraft(input: {
  restaurantId: string;
  menu: unknown;
}): Promise<{ error?: string }> {
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

  const updated = await prisma.$executeRaw`
    UPDATE "Restaurant" SET "menuDraft" = ${JSON.stringify(parsed.data)}::jsonb
    WHERE "id" = ${envelope.data.restaurantId} AND "ownerId" = ${userId}`;
  if (updated === 0) {
    const t = await dashT();
    return { error: t.errors.restaurantNotFound };
  }
  return {};
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

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { menuDraft: parsed.data, menuPublished: parsed.data, menuMode: "built" },
  });

  revalidatePath(`/m/${restaurant.slug}`);
  revalidatePath("/dashboard");
  return {};
}
