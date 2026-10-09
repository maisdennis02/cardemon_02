"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import { chooseMenuPhotos } from "./menu-actions";

// Replaces the photo uploader while the public page shows a text menu.
// "Usar fotos" flips back only when there are photos; otherwise it reveals
// the uploader (passed as children) and the first upload does the flip.
export function BuiltMenuCard({
  restaurantId,
  itemCount,
  whatsappNumber,
  children,
}: {
  restaurantId: string;
  itemCount: number;
  whatsappNumber: string | null;
  children: React.ReactNode;
}) {
  const t = useT();
  const c = t.dashboard.menuChoice;
  const [pending, startTransition] = useTransition();
  const [needsUpload, setNeedsUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchToPhotos() {
    capture("menu_mode_chosen", { mode: "photos" });
    setError(null);
    startTransition(async () => {
      const res = await chooseMenuPhotos({ restaurantId });
      if (res.error) setError(res.error);
      else if (res.needsUpload) setNeedsUpload(true);
    });
  }

  return (
    <>
      <section className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[color:var(--color-navy)]">{c.cardTitle}</h2>
            <p className="mt-1 text-sm text-gray-600">{format(c.cardItems, { n: itemCount })}</p>
            {/* Orders go wherever this number points; a typo sends them to a
                stranger, so the owner sees it spelled out. */}
            <p className="mt-1 text-sm text-gray-600">
              {whatsappNumber ? (
                format(c.ordersTo, { number: `+${whatsappNumber}` })
              ) : (
                <Link href="/dashboard?edit=1" className="font-semibold text-[color:var(--color-brand)] underline">
                  {c.ordersNeedWhatsapp}
                </Link>
              )}
            </p>
          </div>
          <Link href="/dashboard/cardapio" className="btn btn-primary btn-sm">
            {c.edit}
          </Link>
        </div>
        {!needsUpload && (
          <button
            type="button"
            disabled={pending}
            onClick={switchToPhotos}
            className="self-start text-sm font-semibold text-[color:var(--color-brand)] hover:text-[color:var(--color-brand-600)] disabled:opacity-50"
          >
            {pending ? c.switching : c.switchToPhotos}
          </button>
        )}
        {needsUpload && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{c.switchNeedsUpload}</p>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>
      {needsUpload && children}
    </>
  );
}
