"use client";

import { useState } from "react";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import type { Menu } from "@/lib/menu";
import { parsePastedList } from "@/lib/menu-parse";
import { appendSections, newId } from "@/lib/menu-edit";

// "Colar lista": a whole menu from a note or a chat, shown as sections and
// items before anything is added.
export function PasteList({
  menu,
  setMenu,
  onClose,
}: {
  menu: Menu;
  setMenu: (next: Menu) => void;
  onClose: () => void;
}) {
  const t = useT();
  const it = t.dashboard.builder.items;
  const [text, setText] = useState("");
  const [dropped, setDropped] = useState(0);
  const preview = parsePastedList(text, newId);
  const count = preview.reduce((n, s) => n + s.items.length, 0);

  function confirm() {
    const result = appendSections(menu, parsePastedList(text, newId));
    setMenu(result.menu);
    capture("item_added", { via: "pasted", count: count - result.dropped });
    if (result.dropped > 0) {
      setDropped(result.dropped);
      setText("");
    } else {
      onClose();
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="font-bold text-[color:var(--color-navy)]">{it.paste}</h2>
      <p className="text-sm text-gray-600">{it.pasteLead}</p>
      {dropped > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{format(it.pasteDropped, { n: dropped })}</p>
      )}
      <textarea
        autoFocus
        className="input font-mono"
        rows={8}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDropped(0);
        }}
      />
      {count > 0 && (
        <div className="rounded-lg border border-gray-200 p-3 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{it.pastePreview}</p>
          {preview.map((section) => (
            <div key={section.id} className="mb-2 last:mb-0">
              {section.title && <p className="font-bold">{section.title}</p>}
              <ul>
                {section.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{item.name}</span>
                    <span className={item.priceCents === null ? "text-amber-700" : "tabular-nums"}>
                      {item.priceCents === null ? it.noPrice : (item.priceCents / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {it.pasteCancel}
        </button>
        <button type="button" className="btn btn-primary btn-sm" disabled={count === 0} onClick={confirm}>
          {format(it.pasteConfirm, { n: count })}
        </button>
      </div>
    </section>
  );
}
