"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MenuSchema } from "@/lib/menu";
import { dashT, requireOwnedRestaurant, requireUserId } from "./guards";

// Takes the menu on the owner's screen rather than re-reading the saved draft,
// which can lag the screen by an autosave interval. Draft and published are
// written together so they can't drift apart on publish.
export async function publishMenu(input: {
  restaurantId: string;
  menu: unknown;
}): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const restaurant = await requireOwnedRestaurant(userId, input.restaurantId);
  const parsed = MenuSchema.safeParse(input.menu);
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
