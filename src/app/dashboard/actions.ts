"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

async function requireOwnedRestaurant(userId: string, restaurantId: string) {
  const r = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  });
  if (!r) throw new Error("Restaurant not found.");
  return r;
}

async function requireOwnedImage(userId: string, imageId: string) {
  const img = await prisma.menuImage.findFirst({
    where: { id: imageId, restaurant: { ownerId: userId } },
  });
  if (!img) throw new Error("Image not found.");
  return img;
}

const restaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  whatsappNumber: z
    .string()
    .regex(/^\d{8,15}$/, "WhatsApp number must be 8–15 digits, no symbols")
    .optional()
    .or(z.literal("")),
});

export type ActionState = { error?: string };

export async function createRestaurant(_p: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = restaurantSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") ?? "")),
    description: formData.get("description") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const taken = await prisma.restaurant.findUnique({ where: { slug: parsed.data.slug } });
  if (taken) return { error: "That slug is already taken." };

  await prisma.restaurant.create({
    data: {
      ownerId: userId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      whatsappNumber: parsed.data.whatsappNumber || null,
    },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateRestaurant(_p: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await requireOwnedRestaurant(userId, id);

  const parsed = restaurantSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") ?? "")),
    description: formData.get("description") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const slugTaken = await prisma.restaurant.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (slugTaken) return { error: "That slug is already taken." };

  await prisma.restaurant.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      whatsappNumber: parsed.data.whatsappNumber || null,
    },
  });
  revalidatePath("/dashboard");
  return {};
}

export async function recordMenuImages(input: {
  restaurantId: string;
  urls: string[];
}): Promise<ActionState> {
  const userId = await requireUserId();
  await requireOwnedRestaurant(userId, input.restaurantId);

  const validUrls = input.urls.filter((u) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(u));
  if (validUrls.length === 0) return { error: "No valid uploads to record." };

  const existingCount = await prisma.menuImage.count({ where: { restaurantId: input.restaurantId } });

  await prisma.menuImage.createMany({
    data: validUrls.map((url, i) => ({
      restaurantId: input.restaurantId,
      url,
      sortOrder: existingCount + i,
    })),
  });

  revalidatePath("/dashboard");
  return {};
}

export async function deleteMenuImage(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const image = await requireOwnedImage(userId, id);
  await del(image.url).catch(() => {});
  await prisma.menuImage.delete({ where: { id } });

  // Resequence remaining sortOrders so they stay 0..n-1.
  const remaining = await prisma.menuImage.findMany({
    where: { restaurantId: image.restaurantId },
    orderBy: { sortOrder: "asc" },
  });
  await Promise.all(
    remaining.map((img, i) =>
      img.sortOrder === i ? null : prisma.menuImage.update({ where: { id: img.id }, data: { sortOrder: i } }),
    ),
  );

  revalidatePath("/dashboard");
}

export async function reorderMenuImages(formData: FormData) {
  const userId = await requireUserId();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  await requireOwnedRestaurant(userId, restaurantId);

  const orderedIds = String(formData.get("orderedIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (orderedIds.length === 0) return;

  // Verify all IDs belong to this restaurant.
  const owned = await prisma.menuImage.findMany({
    where: { id: { in: orderedIds }, restaurantId },
    select: { id: true },
  });
  if (owned.length !== orderedIds.length) throw new Error("Reorder mismatch.");

  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.menuImage.update({ where: { id }, data: { sortOrder: i } })),
  );

  revalidatePath("/dashboard");
}
