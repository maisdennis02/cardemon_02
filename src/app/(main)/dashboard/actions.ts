"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { del } from "@vercel/blob";
import { track } from "@vercel/analytics/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getDictionary, getLocale } from "@/i18n";
import { format } from "@/i18n/config";
import {
  DELIVERY_APP_IDS,
  DELIVERY_APPS,
  COUNTRY_APPS,
  SUPPORTED_COUNTRIES,
  isSupportedCountry,
  type DeliveryAppId,
  type DeliveryUrlColumn,
} from "@/lib/delivery-apps";
import { FREE_IMAGE_LIMIT, PRO_IMAGE_LIMIT, imageLimitFor, isPro } from "@/lib/pricing";

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
    include: { restaurant: { select: { slug: true } } },
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

const deliveryUrlSchemas = DELIVERY_APP_IDS.reduce(
  (acc, id) => {
    acc[DELIVERY_APPS[id].column] = z
      .string()
      .regex(DELIVERY_APPS[id].urlPattern)
      .optional()
      .or(z.literal(""));
    return acc;
  },
  {} as Record<DeliveryUrlColumn, z.ZodOptional<z.ZodString> | z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>,
);

const restaurantSchema = z
  .object({
    name: z.string().min(1).max(120),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
    description: z.string().max(500).optional(),
    whatsappNumber: z
      .string()
      .regex(/^\d{8,15}$/)
      .optional()
      .or(z.literal("")),
    instagramUrl: z
      .string()
      .regex(/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]{1,30}\/?$/i)
      .optional()
      .or(z.literal("")),
    country: z.enum(SUPPORTED_COUNTRIES).optional().or(z.literal("")),
    ...deliveryUrlSchemas,
  })
  .superRefine((data, ctx) => {
    const country = data.country;
    const allowed = country && isSupportedCountry(country) ? COUNTRY_APPS[country] : null;
    for (const id of DELIVERY_APP_IDS) {
      const column = DELIVERY_APPS[id].column;
      const value = data[column];
      if (!value) continue;
      if (!allowed || !allowed.includes(id)) {
        ctx.addIssue({
          code: "custom",
          path: [column],
          message: "country-mismatch",
        });
      }
    }
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

const URL_COLUMN_TO_APP_ID: Record<DeliveryUrlColumn, DeliveryAppId> = DELIVERY_APP_IDS.reduce(
  (acc, id) => {
    acc[DELIVERY_APPS[id].column] = id;
    return acc;
  },
  {} as Record<DeliveryUrlColumn, DeliveryAppId>,
);

function restaurantParseError(
  error: z.ZodError,
  t: Awaited<ReturnType<typeof dashT>>,
): string {
  const issue = error.issues[0];
  const path0 = issue?.path[0];
  if (path0 === "whatsappNumber") return t.errors.whatsappFormat;
  if (path0 === "instagramUrl") return t.errors.instagramFormat;
  if (path0 === "country") return t.errors.countryInvalid;
  if (typeof path0 === "string" && path0 in URL_COLUMN_TO_APP_ID) {
    const appId = URL_COLUMN_TO_APP_ID[path0 as DeliveryUrlColumn];
    const appName = DELIVERY_APPS[appId].displayName;
    const template =
      issue?.message === "country-mismatch"
        ? t.errors.deliveryUrlCountryMismatch
        : t.errors.deliveryUrlFormat;
    return format(template, { appName });
  }
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
    instagramUrl: formData.get("instagramUrl") || undefined,
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
      instagramUrl: parsed.data.instagramUrl || null,
    },
  });
  track("restaurant_created").catch(() => {});
  revalidatePath("/dashboard");
  // A scan before creation may have cached the 404 for this slug.
  revalidatePath(`/m/${parsed.data.slug}`);
  redirect("/dashboard");
}

export async function updateRestaurant(_p: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const t = await dashT();
  const id = String(formData.get("id") ?? "");
  const existing = await requireOwnedRestaurant(userId, id);

  const deliveryInput: Partial<Record<DeliveryUrlColumn, string | undefined>> = {};
  for (const appId of DELIVERY_APP_IDS) {
    const column = DELIVERY_APPS[appId].column;
    if (formData.has(column)) {
      deliveryInput[column] = (formData.get(column) as string) || undefined;
    }
  }

  const parsed = restaurantSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") ?? "")),
    description: formData.get("description") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    instagramUrl: formData.get("instagramUrl") || undefined,
    country: formData.get("country") || undefined,
    ...deliveryInput,
  });
  if (!parsed.success) return { error: restaurantParseError(parsed.error, t) };

  const slugTaken = await prisma.restaurant.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (slugTaken) return { error: t.errors.slugTaken };

  const deliveryUpdates: Partial<Record<DeliveryUrlColumn, string | null>> = {};
  for (const appId of DELIVERY_APP_IDS) {
    const column = DELIVERY_APPS[appId].column;
    if (formData.has(column)) {
      deliveryUpdates[column] = parsed.data[column] || null;
    }
  }

  await prisma.restaurant.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      whatsappNumber: parsed.data.whatsappNumber || null,
      instagramUrl: parsed.data.instagramUrl || null,
      country: parsed.data.country || null,
      ...deliveryUpdates,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/m/${parsed.data.slug}`);
  if (existing.slug !== parsed.data.slug) revalidatePath(`/m/${existing.slug}`);
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
  const restaurant = await requireOwnedRestaurant(userId, restaurantId);

  const [existingCount, user] = await Promise.all([
    prisma.menuImage.count({ where: { restaurantId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { proExpiresAt: true },
    }),
  ]);

  const limit = imageLimitFor(user);
  if (existingCount + urls.length > limit) {
    return {
      error: isPro(user)
        ? format(t.errors.imageLimitPro, { limit: PRO_IMAGE_LIMIT })
        : format(t.errors.imageLimitFree, {
            limit: FREE_IMAGE_LIMIT,
            pro: PRO_IMAGE_LIMIT,
          }),
    };
  }

  await prisma.menuImage.createMany({
    data: urls.map((url, i) => ({
      restaurantId,
      url,
      sortOrder: existingCount + i,
    })),
  });
  if (existingCount === 0 && urls.length > 0) {
    track("menu_first_upload").catch(() => {});
  }
  track("menu_image_uploaded", { count: urls.length }).catch(() => {});

  revalidatePath("/dashboard");
  revalidatePath(`/m/${restaurant.slug}`);
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
  revalidatePath(`/m/${image.restaurant.slug}`);
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
  const restaurant = await requireOwnedRestaurant(userId, restaurantId);

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
  revalidatePath(`/m/${restaurant.slug}`);
}

// LGPD Art. 18 self-service erasure: removes the user, their restaurants,
// images, view stats (DB cascade), the image blobs, and de-caches the public
// menu pages. Stripe keeps its own billing records; an active subscription is
// NOT auto-canceled here — the danger-zone copy tells the user to cancel it
// first via the billing portal.
export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();
  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: userId },
    select: { slug: true, images: { select: { url: true } } },
  });

  // Blobs before rows: once user.delete cascades, no record of the URLs
  // survives to retry from. A failed blob delete is logged with its URL so it
  // can be cleaned up by hand instead of orphaning silently.
  for (const r of restaurants) {
    for (const img of r.images) {
      await del(img.url).catch((err) =>
        console.error("[deleteAccount] blob delete failed:", img.url, err),
      );
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  track("account_deleted").catch(() => {});

  // The public menu page is ISR-cached; without this the deleted menu keeps
  // serving until its next revalidation.
  for (const r of restaurants) revalidatePath(`/m/${r.slug}`);

  await signOut({ redirectTo: "/" });
}
