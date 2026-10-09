"use client";

import type { Menu, MenuTheme } from "@/lib/menu";
import type { BuilderRestaurant } from "./menu-builder";

// Placeholder until the preview step lands (plan Task 9).
export function StepPreview(_props: {
  restaurant: BuilderRestaurant;
  menu: Menu;
  theme: MenuTheme;
  country: string;
  isPro: boolean;
  settle: () => Promise<void>;
}) {
  return <p>preview</p>;
}
