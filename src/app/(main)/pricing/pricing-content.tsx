import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { format, withPrefix, type Locale, type PathPrefix } from "@/i18n/config";
import {
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  currencyForLocale,
  pricesFor,
} from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { PricingPlans } from "./plans";

// The pricing page, rendered by two routes: (main)/pricing/page.tsx at
// "/pricing" (language negotiated, current plan read from the session) and
// (localized)/[locale]/pricing/page.tsx at "/pt-BR/pricing" and "/es/pricing"
// (language from the path, static, always the signed-out view). Nothing here
// may read the request or the database — it all arrives as props.

export function pricingMetadata(locale: Locale, t: Dictionary): Metadata {
  // Limits and price are read from the plan table, not written into the
  // sentence, so the description cannot advertise a stale price.
  const prices = pricesFor(currencyForLocale(locale));
  return pageMetadata({
    locale,
    title: t.metadata.pricingTitle,
    description: format(t.metadata.pricingDescription, {
      free: FREE_IMAGE_LIMIT,
      pro: PRO_IMAGE_LIMIT,
      price: `${prices.symbol}${prices.monthly}`,
    }),
    path: "/pricing",
  });
}

export function PricingContent({
  locale,
  t,
  currentPlan,
  pathPrefix,
}: {
  locale: Locale;
  t: Dictionary;
  // null: signed out.
  currentPlan: "FREE" | "PRO" | null;
  // Prefix of the URL being served: "" at "/pricing", "/es" at "/es/pricing".
  pathPrefix: PathPrefix;
}) {
  const signedIn = currentPlan !== null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo href={withPrefix(pathPrefix, "/")} />
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
