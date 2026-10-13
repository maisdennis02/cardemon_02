"use client";

import { useT } from "@/i18n/provider";
import { formatPrice, type Menu } from "@/lib/menu";

// Ghost samples (spec §2): faded example items the owner can tap to adopt.
// They are never part of the menu, so they never count, autosave or publish.
export function SampleItems({
  sample,
  country,
  onAdopt,
  onHide,
}: {
  sample: Menu;
  country: string;
  onAdopt: (itemId: string) => void;
  onHide: () => void;
}) {
  const t = useT();
  const it = t.dashboard.builder.items;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">{it.samplesLead}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onHide}>
          {it.hideSamples}
        </button>
      </div>
      {sample.sections.map((section) => (
        <div key={section.id} className="card flex flex-col gap-1 p-4 opacity-60">
          <p className="font-semibold">{section.title}</p>
          <ul className="divide-y divide-gray-100">
            {section.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onAdopt(item.id)}
                  className="flex w-full items-baseline gap-3 py-2.5 text-left"
                >
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{it.sampleBadge}</span>
                  {item.priceCents !== null && (
                    <span className="whitespace-nowrap font-bold tabular-nums">
                      {formatPrice(item.priceCents, country)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
