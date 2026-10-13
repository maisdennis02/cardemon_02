import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { imageLimitFor, isPro } from "@/lib/pricing";
import { effectiveMode, publishedItemCount } from "@/lib/menu";
import { ImageManager } from "../image-manager";
import { UsePhotosButton } from "./use-photos-button";

// Fotos (spec §5): the uploader and the way back to photos from a text menu,
// off the home screen.
export default async function PhotosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [restaurant, user] = await Promise.all([
    prisma.restaurant.findFirst({
      where: { ownerId: session.user.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { proExpiresAt: true },
    }),
  ]);
  // No business yet: the home screen is where one is created.
  if (!restaurant) redirect("/dashboard");

  const t = await getDictionary(await getLocale());
  const mode = effectiveMode({
    menuMode: restaurant.menuMode,
    imageCount: restaurant.images.length,
    publishedItemCount: publishedItemCount(restaurant.menuPublished),
  });

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Link href="/dashboard" className="btn btn-ghost btn-sm self-start">
          {t.dashboard.back}
        </Link>

        <ImageManager
          restaurant={restaurant}
          imageLimit={imageLimitFor(user)}
          isPro={isPro(user)}
          switchToPhotosOnUpload={mode === "built"}
        />

        {mode === "built" && restaurant.images.length > 0 && (
          <UsePhotosButton restaurantId={restaurant.id} />
        )}
      </main>
    </div>
  );
}
