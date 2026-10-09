"use client";

import type { Locale } from "@/i18n/config";
import type { Menu } from "@/lib/menu";

// Placeholder until the items step lands (plan Task 8).
export function StepItems(_props: {
  menu: Menu;
  setMenu: (next: Menu) => void;
  isPro: boolean;
  country: string;
  sectionSuggestions: Record<Locale, string[]>;
}) {
  return <p>items</p>;
}
