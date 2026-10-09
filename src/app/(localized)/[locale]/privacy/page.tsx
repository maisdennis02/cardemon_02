import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { localePrefix } from "@/i18n/config";
import { LegalArticle } from "@/components/legal-article";
import { PRIVACY_CONTENT, privacyMetadata } from "@/app/(main)/privacy/content";
import { localeFromParams, type LocaleParams } from "../locale";

// "/pt-BR/privacy" and "/es/privacy": the same document as "/privacy", static.

export async function generateMetadata({ params }: { params: LocaleParams }): Promise<Metadata> {
  const locale = await localeFromParams(params);
  return privacyMetadata(locale, await getDictionary(locale));
}

export default async function LocalizedPrivacyPage({ params }: { params: LocaleParams }) {
  const locale = await localeFromParams(params);
  return <LegalArticle content={PRIVACY_CONTENT[locale]} homeHref={localePrefix(locale)} />;
}
