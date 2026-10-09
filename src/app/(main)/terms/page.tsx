import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import { LegalArticle } from "@/components/legal-article";
import { TERMS_CONTENT, termsMetadata } from "./content";

// "/terms", language negotiated per request. The same document lives at
// "/pt-BR/terms" and "/es/terms" ((localized)/[locale]/terms/page.tsx).

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return termsMetadata(locale, await getDictionary(locale));
}

export default async function TermsPage() {
  const locale = await getLocale();
  return <LegalArticle content={TERMS_CONTENT[locale]} homeHref="/" />;
}
