import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { localePrefix } from "@/i18n/config";
import { LegalArticle } from "@/components/legal-article";
import { TERMS_CONTENT, termsMetadata } from "@/app/(main)/terms/content";
import { localeFromParams, type LocaleParams } from "../locale";

// "/pt-BR/terms" and "/es/terms": the same document as "/terms", static.

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await localeFromParams(params);
  return termsMetadata(locale, await getDictionary(locale));
}

export default async function LocalizedTermsPage({ params }: { params: LocaleParams }) {
  const locale = await localeFromParams(params);
  return <LegalArticle content={TERMS_CONTENT[locale]} homeHref={localePrefix(locale)} />;
}
