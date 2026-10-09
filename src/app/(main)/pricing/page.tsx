import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { isPro } from "@/lib/pricing";
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
        select: { proExpiresAt: true },
      })
    : null;

  const currentPlan: "FREE" | "PRO" | null = session?.user
    ? isPro(user)
      ? "PRO"
      : "FREE"
    : null;

  return <PricingContent locale={locale} t={t} currentPlan={currentPlan} pathPrefix="" />;
}
