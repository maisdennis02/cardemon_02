import { prisma } from "@/lib/prisma";

export async function POST(request: Request): Promise<Response> {
  let slug: unknown;
  try {
    const body = await request.json();
    slug = (body as { slug?: unknown })?.slug;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
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
    data: { restaurantId: restaurant.id, country },
  });

  return new Response(null, { status: 204 });
}
