import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DELIVERY_APP_IDS } from "@/lib/delivery-apps";

// Slug → id barely ever changes; caching it halves the DB round trips this
// endpoint adds per menu visit (it fires on every view and button tap).
const cachedRestaurantId = unstable_cache(
  async (slug: string) => {
    const r = await prisma.restaurant.findUnique({ where: { slug }, select: { id: true } });
    return r?.id ?? null;
  },
  ["menu-views-restaurant-id"],
  { revalidate: 3600 },
);

const ALLOWED_KINDS: ReadonlySet<string> = new Set([
  "view",
  "click_whatsapp",
  "click_instagram",
  ...DELIVERY_APP_IDS.map((id) => `click_${id}`),
]);

export async function POST(request: Request): Promise<Response> {
  let slug: unknown;
  let kindRaw: unknown;
  try {
    const body = await request.json();
    slug = (body as { slug?: unknown })?.slug;
    kindRaw = (body as { kind?: unknown })?.kind;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    return new Response(null, { status: 400 });
  }

  const kind = kindRaw === undefined ? "view" : kindRaw;
  if (typeof kind !== "string" || !ALLOWED_KINDS.has(kind)) {
    return new Response(null, { status: 400 });
  }

  let restaurantId = await cachedRestaurantId(slug);
  if (!restaurantId) {
    // A cached null can just mean the restaurant was created within the cache
    // window — recheck the DB before dropping the event.
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    restaurantId = restaurant?.id ?? null;
  }
  if (!restaurantId) return new Response(null, { status: 404 });

  const countryHeader = request.headers.get("x-vercel-ip-country");
  const country =
    countryHeader && /^[A-Za-z]{2}$/.test(countryHeader)
      ? countryHeader.toUpperCase()
      : null;

  // Abuse cap: this endpoint is unauthenticated, so without a ceiling anyone
  // can inflate a restaurant's stats (and our row count) at wire speed. No
  // legitimate menu gets 600 events/hour at our scale; beyond that we drop
  // silently — a 204 either way, so bots learn nothing from the response.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.menuView.count({
    where: { restaurantId, viewedAt: { gte: oneHourAgo } },
  });
  if (recentCount >= 600) return new Response(null, { status: 204 });

  await prisma.menuView.create({
    data: { restaurantId, kind, country },
  });

  return new Response(null, { status: 204 });
}
