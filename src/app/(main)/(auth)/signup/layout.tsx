import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";

// The page itself is a client component and cannot export metadata, so the
// title lives in this pass-through layout. noindex comes from ../layout.tsx.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary(await getLocale());
  return { title: t.common.signUp };
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
