import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import { NOINDEX } from "@/lib/seo";

// The dashboard is behind sign-in (src/proxy.ts redirects anonymous visitors),
// but the noindex is stated here too so it does not depend on the redirect.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary(await getLocale());
  return { title: t.common.dashboard, robots: NOINDEX };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
