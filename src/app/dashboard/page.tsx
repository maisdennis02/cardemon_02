import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { ExternalIcon } from "@/components/icons";
import { OnboardingForm } from "./onboarding-form";
import { ImageManager } from "./image-manager";
import { MenuQrCard } from "./menu-qr-card";
import { MenuStatsCard } from "./menu-stats-card";
import { RestaurantSettingsForm } from "./restaurant-settings-form";
import { DeliverySetupCallout } from "./delivery-setup-callout";
import { getDictionary, getLocale } from "@/i18n";
import type { Dictionary } from "@/i18n";
import { imageLimitFor, isPro } from "@/lib/pricing";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [totalViews, last7Days] = restaurant
    ? await Promise.all([
        prisma.menuView.count({ where: { restaurantId: restaurant.id } }),
        prisma.menuView.count({
          where: { restaurantId: restaurant.id, viewedAt: { gte: sevenDaysAgo } },
        }),
      ])
    : [0, 0];

  const { edit } = await searchParams;
  const initialEdit = edit === "1";

  const needsDeliverySetup =
    !!restaurant &&
    !restaurant.ifoodUrl &&
    !restaurant.ubereatsUrl &&
    !restaurant.doordashUrl &&
    !restaurant.rappiUrl &&
    !restaurant.grubhubUrl &&
    !restaurant.pedidosyaUrl &&
    !restaurant.didifoodUrl;

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
            {needsDeliverySetup && !initialEdit && <DeliverySetupCallout t={t} />}
            <RestaurantSettingsForm
              key={initialEdit ? "edit" : "view"}
              restaurant={restaurant}
              initialEdit={initialEdit}
            />
            <MenuQrCard slug={restaurant.slug} name={restaurant.name} />
            <MenuStatsCard totalViews={totalViews} last7Days={last7Days} t={t} />
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
