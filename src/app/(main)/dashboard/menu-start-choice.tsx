"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/provider";
import { capture } from "@/lib/posthog";

// The dashboard's first question when nothing is published yet (spec §3,
// "Entrada"). The ad test lost every owner here: they had no photo of their
// menu, and the uploader was the only thing on offer.
export function MenuStartChoice({ children }: { children: React.ReactNode }) {
  const t = useT();
  const c = t.dashboard.menuChoice;
  const [photos, setPhotos] = useState(false);

  if (photos) return <>{children}</>;

  return (
    <section className="card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--color-navy)]">{c.startTitle}</h2>
        <p className="mt-1 text-sm text-gray-600">{c.startLead}</p>
      </div>
      <Link
        href="/dashboard/cardapio"
        onClick={() => capture("menu_mode_chosen", { mode: "built" })}
        className="flex flex-col gap-1 rounded-xl border-2 border-[color:var(--color-brand)] bg-[color:var(--color-brand-50)] p-4"
      >
        <span className="font-bold text-[color:var(--color-brand)]">{c.build}</span>
        <span className="text-sm text-gray-600">{c.buildHint}</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          capture("menu_mode_chosen", { mode: "photos" });
          setPhotos(true);
        }}
        className="flex flex-col gap-1 rounded-xl border-2 border-gray-200 p-4 text-left"
      >
        <span className="font-bold text-[color:var(--color-navy)]">{c.photos}</span>
        <span className="text-sm text-gray-600">{c.photosHint}</span>
      </button>
    </section>
  );
}

// Under the photo uploader: the way into the builder. Only opens it — the
// public page switches when the owner publishes there.
export function BuildInsteadLink() {
  const t = useT();
  return (
    <Link
      href="/dashboard/cardapio"
      onClick={() => capture("menu_mode_chosen", { mode: "built" })}
      className="self-start text-sm font-semibold text-[color:var(--color-brand)] hover:text-[color:var(--color-brand-600)]"
    >
      {t.dashboard.menuChoice.switchToBuilt} →
    </Link>
  );
}
