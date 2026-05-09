"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { put, del } from "@vercel/blob";
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

async function requireOwnedCategory(userId: string, categoryId: string) {
  const c = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurant: { ownerId: userId } },
    include: { restaurant: true },
  });
  if (!c) throw new Error("Category not found.");
  return c;
}

async function requireOwnedItem(userId: string, itemId: string) {
  const i = await prisma.menuItem.findFirst({
    where: { id: itemId, category: { restaurant: { ownerId: userId } } },
    include: { category: { include: { restaurant: true } } },
  });
  if (!i) throw new Error("Item not found.");
  return i;
}

const createRestaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

export async function createRestaurant(_p: { error?: string }, formData: FormData) {
  const userId = await requireUserId();
  const parsed = createRestaurantSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") ?? "")),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const taken = await prisma.restaurant.findUnique({ where: { slug: parsed.data.slug } });
  if (taken) return { error: "That slug is already taken." };

  await prisma.restaurant.create({
    data: { ...parsed.data, ownerId: userId },
  });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createCategory(formData: FormData) {
  const userId = await requireUserId();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await requireOwnedRestaurant(userId, restaurantId);

  const count = await prisma.menuCategory.count({ where: { restaurantId } });
  await prisma.menuCategory.create({
    data: { restaurantId, name, sortOrder: count },
  });
  revalidatePath("/dashboard");
}

export async function deleteCategory(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await requireOwnedCategory(userId, id);

  // Clean up blob images for items in this category.
  const items = await prisma.menuItem.findMany({
    where: { categoryId: id, imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  await Promise.all(items.map((i) => i.imageUrl && del(i.imageUrl).catch(() => {})));

  await prisma.menuCategory.delete({ where: { id } });
  revalidatePath("/dashboard");
}

const itemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a price like 9.99"),
});

export async function createItem(_p: { error?: string }, formData: FormData) {
  const userId = await requireUserId();
  const parsed = itemSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await requireOwnedCategory(userId, parsed.data.categoryId);

  const priceCents = Math.round(parseFloat(parsed.data.price) * 100);

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { error: "Image must be under 5MB." };
    if (!file.type.startsWith("image/")) return { error: "File must be an image." };
    const blob = await put(`menu-items/${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    imageUrl = blob.url;
  }

  const count = await prisma.menuItem.count({ where: { categoryId: parsed.data.categoryId } });
  await prisma.menuItem.create({
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      priceCents,
      imageUrl,
      sortOrder: count,
    },
  });
  revalidatePath("/dashboard");
  return { error: undefined };
}

export async function deleteItem(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const item = await requireOwnedItem(userId, id);
  if (item.imageUrl) await del(item.imageUrl).catch(() => {});
  await prisma.menuItem.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function toggleItemAvailability(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const item = await requireOwnedItem(userId, id);
  await prisma.menuItem.update({
    where: { id },
    data: { available: !item.available },
  });
  revalidatePath("/dashboard");
}
