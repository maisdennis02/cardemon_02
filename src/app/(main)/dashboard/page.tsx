import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "./onboarding-form";
import { MenuQrCard } from "./menu-qr-card";
import { MenuStatsCard, loadMenuStats } from "./menu-stats-card";
import { getDictionary, getLocale } from "@/i18n";
import type { Dictionary } from "@/i18n";
import { isPro } from "@/lib/pricing";
import { effectiveMode, isPublished, publishedItemCount } from "@/lib/menu";
import { DashboardTelemetry } from "./dashboard-telemetry";
import { MenuHomeCard } from "./menu-home-card";
import { NextStepCard } from "./next-step-card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // The old in-place edit mode moved to its own page. The browser keeps the
  // fragment across the redirect, so ?edit=1#country lands on #country there.
  const { edit } = await searchParams;
  if (edit === "1") redirect("/dashboard/ajustes");

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
  const stats = restaurant
    ? await loadMenuStats(restaurant.id, sevenDaysAgo)
    : { totalViews: 0, last7Days: 0, orders7Days: 0, clicks: {} };

  const hasDeliveryLink =
    !!restaurant &&
    !!(
      restaurant.ifoodUrl ||
      restaurant.ubereatsUrl ||
      restaurant.doordashUrl ||
      restaurant.rappiUrl ||
      restaurant.grubhubUrl ||
      restaurant.pedidosyaUrl ||
      restaurant.didifoodUrl
    );

  // Photos or a published text menu both count. publishedItemCount never
  // throws, so a corrupt menu can't take the dashboard down.
  const content = restaurant && {
    menuMode: restaurant.menuMode,
    imageCount: restaurant.images.length,
    publishedItemCount: publishedItemCount(restaurant.menuPublished),
  };
  const hasMenu = !!content && isPublished(content);
  const mode = content ? effectiveMode(content) : "photos";

  const userIsPro = isPro(user);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">
      {/* First authenticated page on every path in — e-mail signup, Google
          OAuth return and the Stripe return all land here, which is why the
          ad conversions fire from one place. */}
      <DashboardTelemetry
        email={session.user.email ?? null}
        hasMenu={hasMenu}
        menuMode={mode}
        isPro={userIsPro}
      />
      <DashboardHeader isPro={userIsPro} t={t} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {!restaurant ? (
          <OnboardingForm />
        ) : (
          // Spec §3: menu, one next step, QR, numbers. Everything else
          // (details, delivery apps, photos, account) lives in Ajustes/Fotos.
          <div className="flex flex-col gap-5 sm:gap-6">
            <MenuHomeCard
              name={restaurant.name}
              slug={restaurant.slug}
              hasMenu={hasMenu}
              mode={mode}
              itemCount={content ? content.publishedItemCount : 0}
              imageCount={restaurant.images.length}
            />
            <NextStepCard
              state={{
                hasMenu,
                mode,
                totalViews: stats.totalViews,
                hasWhatsapp: !!restaurant.whatsappNumber,
                hasDeliveryLink,
              }}
              restaurantId={restaurant.id}
              slug={restaurant.slug}
              t={t}
            />
            {hasMenu && <MenuQrCard slug={restaurant.slug} name={restaurant.name} />}
            <MenuStatsCard stats={stats} restaurant={restaurant} t={t} />
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardHeader({ isPro, t }: { isPro: boolean; t: Dictionary }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/dashboard/ajustes" className="btn btn-ghost btn-sm">
            <span aria-hidden>⚙</span>
            {t.dashboard.home.settings}
          </Link>
          {isPro ? (
            <Link
              href="/dashboard/ajustes"
              className="rounded-full bg-[color:var(--color-brand-50)] px-3 py-1.5 text-sm font-bold text-[color:var(--color-brand)]"
            >
              Pro
            </Link>
          ) : (
            <Link href="/pricing" className="btn btn-ghost btn-sm">
              {t.dashboard.upgrade}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
