import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { getDictionary, getLocale } from "@/i18n";
import { currencyForLocale, isPro } from "@/lib/pricing";
import { PricingPlans } from "./plans";

export default async function PricingPage() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getDictionary(locale);

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { proExpiresAt: true },
      })
    : null;

  const signedIn = !!session?.user;
  const currentPlan: "FREE" | "PRO" | null = signedIn
    ? isPro(user)
      ? "PRO"
      : "FREE"
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                {t.common.dashboard}
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  {t.common.logIn}
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  {t.common.getStarted}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[color:var(--color-navy)] sm:text-5xl">
            {t.pricing.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-gray-600">
            {t.pricing.lead}
          </p>
        </div>

        <PricingPlans currentPlan={currentPlan} currency={currencyForLocale(locale)} />
      </main>
    </div>
  );
}
