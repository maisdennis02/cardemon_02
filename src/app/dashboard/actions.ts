"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getDictionary, getLocale } from "@/i18n";

async function dashT() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return dict.dashboard;
}

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
  if (!r) {
    const t = await dashT();
    throw new Error(t.errors.restaurantNotFound);
  }
  return r;
}

async function requireOwnedImage(userId: string, imageId: string) {
  const img = await prisma.menuImage.findFirst({
    where: { id: imageId, restaurant: { ownerId: userId } },
  });
  if (!img) {
    const t = await dashT();
    throw new Error(t.errors.imageNotFound);
  }
  return img;
}

const cuid = z.string().cuid();
const blobUrl = z
  .string()
  .regex(/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i);

const restaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  whatsappNumber: z
    .string()
    .regex(/^\d{8,15}$/)
    .optional()
    .or(z.literal("")),
});

const recordMenuImagesSchema = z.object({
  restaurantId: cuid,
  urls: z.array(blobUrl).min(1).max(50),
});

const deleteMenuImageSchema = z.object({ id: cuid });

const reorderMenuImagesSchema = z.object({
  restaurantId: cuid,
  orderedIds: z.array(cuid).min(1).max(200),
});

export type ActionState = { error?: string };

function restaurantParseError(
  error: z.ZodError,
  t: Awaited<ReturnType<typeof dashT>>,
): string {
  const issue = error.issues[0];
  if (issue?.path[0] === "whatsappNumber") return t.errors.whatsappFormat;
  return t.errors.invalidInput;
}

export async function createRestaurant(_p: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const t = await dashT();
  const parsed = restaurantSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") ?? "")),
    description: formData.get("description") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
  });
  if (!parsed.success) return { error: restaurantParseError(parsed.error, t) };

  const taken = await prisma.restaurant.findUnique({ where: { slug: parsed.data.slug } });
  if (taken) return { error: t.errors.slugTaken };

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
  const t = await dashT();
  const id = String(formData.get("id") ?? "");
  await requireOwnedRestaurant(userId, id);

  const parsed = restaurantSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") ?? "")),
    description: formData.get("description") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
  });
  if (!parsed.success) return { error: restaurantParseError(parsed.error, t) };

  const slugTaken = await prisma.restaurant.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (slugTaken) return { error: t.errors.slugTaken };

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
  const t = await dashT();
  const parsed = recordMenuImagesSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "urls") return { error: t.errors.blobUrlInvalid };
    return { error: t.errors.invalidInput };
  }

  const { restaurantId, urls } = parsed.data;
  await requireOwnedRestaurant(userId, restaurantId);

  const existingCount = await prisma.menuImage.count({ where: { restaurantId } });

  await prisma.menuImage.createMany({
    data: urls.map((url, i) => ({
      restaurantId,
      url,
      sortOrder: existingCount + i,
    })),
  });

  revalidatePath("/dashboard");
  return {};
}

export async function deleteMenuImage(formData: FormData) {
  const userId = await requireUserId();
  const t = await dashT();
  const parsed = deleteMenuImageSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error(t.errors.invalidImageId);
  const { id } = parsed.data;
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
  const t = await dashT();
  const parsed = reorderMenuImagesSchema.safeParse({
    restaurantId: formData.get("restaurantId"),
    orderedIds: String(formData.get("orderedIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success) throw new Error(t.errors.reorderInvalid);
  const { restaurantId, orderedIds } = parsed.data;
  await requireOwnedRestaurant(userId, restaurantId);

  // Verify all IDs belong to this restaurant.
  const owned = await prisma.menuImage.findMany({
    where: { id: { in: orderedIds }, restaurantId },
    select: { id: true },
  });
  if (owned.length !== orderedIds.length) throw new Error(t.errors.reorderMismatch);

  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.menuImage.update({ where: { id }, data: { sortOrder: i } })),
  );

  revalidatePath("/dashboard");
}
