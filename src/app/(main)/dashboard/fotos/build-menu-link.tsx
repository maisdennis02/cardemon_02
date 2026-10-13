"use client";

import Link from "next/link";
import { useT } from "@/i18n/provider";
import { capture } from "@/lib/posthog";

// A photo menu's way to the text builder: the builder is where the choice of a
// text menu is actually made, so the event fires on the way in.
export function BuildMenuLink() {
  const t = useT();
  return (
    <Link
      href="/dashboard/cardapio"
      onClick={() => capture("menu_mode_chosen", { mode: "built" })}
      className="self-start py-1 text-sm font-semibold text-[color:var(--color-brand)] hover:text-[color:var(--color-brand-600)]"
    >
      {t.dashboard.menuChoice.switchToBuilt} →
    </Link>
  );
}
