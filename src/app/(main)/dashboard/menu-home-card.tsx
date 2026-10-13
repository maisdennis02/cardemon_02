"use client";

import Link from "next/link";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import { ExternalIcon } from "@/components/icons";

// Top of the dashboard home (spec §3.1): what the menu is, whether diners can
// see it, and the one or two buttons an owner reaches for from a phone.
export function MenuHomeCard({
  name,
  slug,
  hasMenu,
  mode,
  itemCount,
  imageCount,
}: {
  name: string;
  slug: string;
  hasMenu: boolean;
  mode: "photos" | "built";
  itemCount: number;
  imageCount: number;
}) {
  const t = useT();
  const h = t.dashboard.home;

  return (
    <section className="card flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[color:var(--color-navy)] sm:text-2xl">{name}</h1>
        {hasMenu ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-green-700">
            <span aria-hidden>●</span>
            {h.live} ·{" "}
            {mode === "built"
              ? format(h.itemsCount, { n: itemCount })
              : format(h.photosCount, { n: imageCount })}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-600">{h.draft}</p>
        )}
      </div>

      {hasMenu ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/m/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full py-3 text-base sm:w-auto"
          >
            {t.dashboard.openMenu}
            <ExternalIcon size={18} />
          </Link>
          <Link
            href={mode === "built" ? "/dashboard/cardapio" : "/dashboard/fotos"}
            className="btn btn-secondary w-full py-3 text-base sm:w-auto"
          >
            {h.edit}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/cardapio"
            onClick={() => capture("menu_mode_chosen", { mode: "built" })}
            className="btn btn-primary w-full py-3 text-base sm:w-auto sm:self-start"
          >
            {h.continueMenu}
          </Link>
          <Link
            href="/dashboard/fotos"
            onClick={() => capture("menu_mode_chosen", { mode: "photos" })}
            className="self-start py-1 text-sm font-semibold text-[color:var(--color-brand)] hover:text-[color:var(--color-brand-600)]"
          >
            {h.havePhotos} →
          </Link>
        </div>
      )}
    </section>
  );
}
