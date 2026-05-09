import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await prisma.restaurant.findUnique({ where: { slug } });
  if (!r) return {};
  return {
    title: `${r.name} — Menu`,
    description: r.description ?? `Digital menu for ${r.name}`,
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { available: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!restaurant) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold">{restaurant.name}</h1>
        {restaurant.description && (
          <p className="mt-2 text-gray-600">{restaurant.description}</p>
        )}
      </header>

      {restaurant.categories.length === 0 && (
        <p className="text-center text-gray-500">This menu is being prepared.</p>
      )}

      <div className="flex flex-col gap-10">
        {restaurant.categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-4 border-b pb-2 text-xl font-medium">{category.name}</h2>
            {category.items.length === 0 ? (
              <p className="text-sm text-gray-400">No items yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {category.items.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="h-24 w-24 flex-shrink-0 rounded object-cover"
                      />
                    ) : null}
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium">{item.name}</h3>
                        <span className="whitespace-nowrap text-sm">
                          {formatPrice(item.priceCents, item.currency)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
