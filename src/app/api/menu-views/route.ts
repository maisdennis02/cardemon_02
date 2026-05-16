import { prisma } from "@/lib/prisma";
import { DELIVERY_APP_IDS } from "@/lib/delivery-apps";

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

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) return new Response(null, { status: 404 });

  const countryHeader = request.headers.get("x-vercel-ip-country");
  const country =
    countryHeader && /^[A-Za-z]{2}$/.test(countryHeader)
      ? countryHeader.toUpperCase()
      : null;

  await prisma.menuView.create({
    data: { restaurantId: restaurant.id, kind, country },
  });

  return new Response(null, { status: 204 });
}
