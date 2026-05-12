import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { ExternalIcon } from "@/components/icons";
import { OnboardingForm } from "./onboarding-form";
import { ImageManager } from "./image-manager";
import { MenuQrCard } from "./menu-qr-card";
import { RestaurantSettingsForm } from "./restaurant-settings-form";
import { getDictionary, getLocale } from "@/i18n";
import type { Dictionary } from "@/i18n";
import { imageLimitFor, isPro } from "@/lib/pricing";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const locale = await getLocale();
  const t = await getDictionary(locale);

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

  const userIsPro = isPro(user);
  const imageLimit = imageLimitFor(user);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">
      <DashboardHeader
        userEmail={session.user.email ?? null}
        publicMenuSlug={restaurant?.slug ?? null}
        isPro={userIsPro}
        t={t}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        {!restaurant ? (
          <OnboardingForm />
        ) : (
          <div className="flex flex-col gap-6">
            <RestaurantSettingsForm restaurant={restaurant} />
            <MenuQrCard slug={restaurant.slug} name={restaurant.name} />
            <ImageManager
              restaurant={restaurant}
              imageLimit={imageLimit}
              isPro={userIsPro}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardHeader({
  userEmail,
  publicMenuSlug,
  isPro,
  t,
}: {
  userEmail: string | null;
  publicMenuSlug: string | null;
  isPro: boolean;
  t: Dictionary;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Logo />
        <div className="flex items-center gap-2">
          {publicMenuSlug && (
            <Link
              href={`/m/${publicMenuSlug}`}
              target="_blank"
              className="btn btn-secondary btn-sm hidden sm:inline-flex"
            >
              {t.dashboard.viewPublicMenu}
              <ExternalIcon size={14} />
            </Link>
          )}
          {isPro ? (
            <form action="/api/stripe/portal" method="post">
              <button className="btn btn-ghost btn-sm">{t.dashboard.managePlan}</button>
            </form>
          ) : (
            <Link href="/pricing" className="btn btn-ghost btn-sm">
              {t.dashboard.upgrade}
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="btn btn-ghost btn-sm" title={userEmail ?? t.common.signOut}>
              {t.common.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
