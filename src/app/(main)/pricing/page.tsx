import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { formatPlanDate, planState } from "@/lib/pricing";
import { PricingContent, pricingMetadata } from "./pricing-content";

// "/pricing", language negotiated per request, current plan from the session.
// The same page lives at "/pt-BR/pricing" and "/es/pricing"
// ((localized)/[locale]/pricing/page.tsx).

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pricingMetadata(locale, await getDictionary(locale));
}

export default async function PricingPage() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getDictionary(locale);

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { proExpiresAt: true, billingSubscriptionId: true, billingCancelAtPeriodEnd: true },
      })
    : null;

  const state = session?.user ? planState(user) : null;
  const currentPlan: "FREE" | "PRO" | "COURTESY" | null =
    state === null ? null : state === "free" ? "FREE" : state === "courtesy" ? "COURTESY" : "PRO";
  const courtesyUntil =
    state === "courtesy" && user?.proExpiresAt ? formatPlanDate(user.proExpiresAt, locale) : undefined;

  return <PricingContent locale={locale} t={t} currentPlan={currentPlan} courtesyUntil={courtesyUntil} pathPrefix="" />;
}
