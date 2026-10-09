"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { countItems, visibleMenu, type Menu, type MenuTheme } from "@/lib/menu";
import { BuiltMenu } from "@/app/m/[slug]/built-menu";
import { publishMenu } from "../menu-actions";
import type { BuilderRestaurant } from "./menu-builder";

// Step 3: the menu exactly as diners will see it on the current plan, and the
// publish button. Publishing sends the menu on screen, not the saved draft.
export function StepPreview({
  restaurant,
  menu,
  theme,
  country,
  isPro,
  settle,
}: {
  restaurant: BuilderRestaurant;
  menu: Menu;
  theme: MenuTheme;
  country: string;
  isPro: boolean;
  settle: () => Promise<void>;
}) {
  const t = useT();
  const p = t.dashboard.builder.preview;
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { menu: shown, hidden } = visibleMenu(menu, isPro);
  const empty = countItems(menu) === 0;

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      // No autosave may land after the publish with an older draft.
      await settle();
      const res = await publishMenu({ restaurantId: restaurant.id, menu });
      if (res.error) {
        setError(res.error);
        setPublishing(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(t.dashboard.builder.visual.saveFailed);
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">{p.lead}</p>
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <BuiltMenu
          preview
          slug={restaurant.slug}
          name={restaurant.name}
          country={country}
          theme={theme}
          menu={shown}
          labels={{ cardapioDigital: t.menu.cardapioDigital, madeBy: t.menu.madeBy }}
          actions={null}
        />
        {hidden > 0 && (
          <p className="border-t border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
            {format(p.hiddenLine, { n: hidden })}
          </p>
        )}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {empty && <p className="text-sm text-gray-500">{p.empty}</p>}
      <button type="button" className="btn btn-primary" disabled={empty || publishing} onClick={publish}>
        {publishing ? p.publishing : p.publish}
      </button>
    </div>
  );
}
