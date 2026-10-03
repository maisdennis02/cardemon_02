import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";

// Sign-in, sign-up and password screens are private pages: they keep a real
// <title> (set by each segment below) but must never be indexed. Before this
// layout existed they inherited "index, follow" and a canonical pointing at
// the home page from the root layout.
export const metadata: Metadata = { robots: NOINDEX };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
