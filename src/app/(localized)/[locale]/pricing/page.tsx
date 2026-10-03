import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { localePrefix } from "@/i18n/config";
import { PricingContent, pricingMetadata } from "@/app/(main)/pricing/pricing-content";
import { localeFromParams, type LocaleParams } from "../locale";

// "/pt-BR/pricing" and "/es/pricing": static, always the signed-out view, so
// both plan buttons lead to /signup — checkout is only ever reached from the
// un-prefixed /pricing, where the plan and the currency come from the same
// request.

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await localeFromParams(params);
  return pricingMetadata(locale, await getDictionary(locale));
}

export default async function LocalizedPricingPage({ params }: { params: LocaleParams }) {
  const locale = await localeFromParams(params);
  const t = await getDictionary(locale);

  return (
    <PricingContent locale={locale} t={t} currentPlan={null} pathPrefix={localePrefix(locale)} />
  );
}
