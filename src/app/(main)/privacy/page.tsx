import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import { LegalArticle } from "@/components/legal-article";
import { PRIVACY_CONTENT, privacyMetadata } from "./content";

// "/privacy", language negotiated per request. The same document lives at
// "/pt-BR/privacy" and "/es/privacy" ((localized)/[locale]/privacy/page.tsx).

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return privacyMetadata(locale, await getDictionary(locale));
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalArticle content={PRIVACY_CONTENT[locale]} homeHref="/" />;
}
