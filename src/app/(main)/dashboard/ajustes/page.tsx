import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { format } from "@/i18n/config";
import { isPro } from "@/lib/pricing";
import { RestaurantSettingsForm } from "../restaurant-settings-form";
import { ChangePasswordCard } from "../change-password-card";
import { DeleteAccountCard } from "../delete-account-card";
import { SignOutButton } from "../sign-out-button";

// Ajustes (spec §4): everything that is set once and rarely touched — business
// details, delivery apps, plan and account — kept off the home screen.
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [restaurant, user] = await Promise.all([
    prisma.restaurant.findFirst({ where: { ownerId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { proExpiresAt: true, billingCancelAtPeriodEnd: true, passwordHash: true },
    }),
  ]);
  // No business yet: the home screen is where one is created.
  if (!restaurant) redirect("/dashboard");

  const locale = await getLocale();
  const t = await getDictionary(locale);
  const p = t.dashboard.plan;
  const userIsPro = isPro(user);
  const proDate = user?.proExpiresAt?.toLocaleDateString(locale);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Link href="/dashboard" className="btn btn-ghost btn-sm self-start">
          {t.dashboard.back}
        </Link>

        <RestaurantSettingsForm restaurant={restaurant} />

        <section className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-[color:var(--color-navy)]">{p.title}</h2>
            {userIsPro && proDate && (
              <p className="text-sm text-gray-600">
                {format(user?.billingCancelAtPeriodEnd ? p.proUntil : p.proRenews, {
                  date: proDate,
                })}
              </p>
            )}
          </div>
          {userIsPro ? (
            <form action="/api/stripe/portal" method="post">
              <button className="btn btn-secondary btn-sm">{t.dashboard.managePlan}</button>
            </form>
          ) : (
            <Link href="/pricing" className="btn btn-primary btn-sm self-start">
              {t.dashboard.upgrade}
            </Link>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-[color:var(--color-navy)]">
            {t.dashboard.account.title}
          </h2>
          {/* Google-only accounts have no password to change; they can
              still set one through "Forgot password" if they want one. */}
          {!!user?.passwordHash && <ChangePasswordCard />}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <SignOutButton
              label={t.common.signOut}
              title={session.user.email ?? t.common.signOut}
            />
          </form>
          <DeleteAccountCard />
        </section>
      </main>
    </div>
  );
}
