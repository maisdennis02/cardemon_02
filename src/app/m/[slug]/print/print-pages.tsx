"use client";

import "./print.css";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { headerColors, menuFontFamilies, type Menu, type MenuTheme } from "@/lib/menu";
import { capture } from "@/lib/posthog";
import { absoluteUrl } from "@/lib/site";
import { BuiltMenuHeader } from "../built-menu";
import { SHEET, columnWidth, columnsFor, planLayout, type Block, type Sheet } from "./print-layout";
import { BLOCK_GAP, PrintBlockView, PrintSheet, menuBlocks, type PrintBlock } from "./print-sheet";
import { waitForAssets } from "./wait-for-assets";

export type PrintLabels = {
  savePdf: string;
  saveJpg: string;
  help: string;
  building: string;
  jpgProgress: string;
  jpgFailed: string;
  footerOrder: string;
  footerNoOrder: string;
  madeWith: string;
};

type Plan = { columns: 1 | 2; scale: number; sheets: Sheet[] };

const blockId = (b: { kind: string; key: string }) => `${b.kind}:${b.key}`;

// The printable menu (spec 2026-10-28): the blocks are drawn once off screen,
// measured with the real fonts and images, laid out by print-layout and drawn
// as A4 sheets. The PDF prints those sheets and the JPG captures them, so the
// two always match.
export function PrintPages({
  slug,
  name,
  country,
  theme,
  menu,
  hasWhatsapp,
  labels,
}: {
  slug: string;
  name: string;
  country: string | null;
  theme: MenuTheme;
  menu: Menu; // already cut by printableMenu
  hasWhatsapp: boolean;
  labels: PrintLabels;
}) {
  const blocks = useMemo(() => menuBlocks(menu), [menu]);
  const byId = useMemo(() => new Map(blocks.map((b) => [blockId(b), b])), [blocks]);
  const columns = columnsFor(blocks.filter((b) => b.kind === "item").length);
  const { title } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);

  const measureRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const fit = useScreenFit();

  useEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    let cancelled = false;
    waitForAssets(box, document.fonts ?? null).then(() => {
      if (cancelled) return;
      const header = box.querySelector<HTMLElement>("[data-measure=header]")!;
      const column = box.querySelector<HTMLElement>("[data-measure=column]")!;
      const measureAt = (scale: number): Block[] => {
        column.style.width = `${columnWidth(columns) / scale}px`;
        return Array.from(column.children as HTMLCollectionOf<HTMLElement>).map((el, i) => ({
          kind: blocks[i].kind,
          key: blocks[i].key,
          height: (el.offsetHeight + BLOCK_GAP) * scale,
        }));
      };
      // pt-3 above the columns belongs to the header's share of sheet 1.
      setPlan(planLayout({ itemCount: blocks.filter((b) => b.kind === "item").length, headerHeight: header.offsetHeight + 12, measureAt }));
    });
    return () => {
      cancelled = true;
    };
  }, [blocks, columns]);

  const footer = {
    qrValue: absoluteUrl(`/m/${slug}`),
    line: hasWhatsapp ? labels.footerOrder : labels.footerNoOrder,
    madeWith: labels.madeWith,
  };

  function savePdf() {
    capture("menu_print_downloaded", { format: "pdf", pages: plan?.sheets.length ?? 0 });
    window.print();
  }

  return (
    <div className="print-root min-h-dvh bg-gray-200 text-gray-900">
      <div className="sticky top-0 z-10 flex flex-col items-center gap-2 bg-white px-4 py-3 text-center shadow print:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={savePdf}
            disabled={!plan}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {labels.savePdf}
          </button>
          <button
            type="button"
            disabled
            className="rounded-full border border-gray-900 px-5 py-2.5 text-sm font-bold text-gray-900 disabled:opacity-50"
          >
            {labels.saveJpg}
          </button>
        </div>
        <p className="text-xs text-gray-500">{labels.help}</p>
      </div>

      {!plan && <p className="py-10 text-center text-sm text-gray-600 print:hidden">{labels.building}</p>}

      {!plan && (
        // Off screen, at sheet width: where the blocks are measured.
        <div ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[99999px] top-0" style={{ width: SHEET.width, fontFamily: fonts.body }}>
          <div data-measure="header" className="pb-4">
            <BuiltMenuHeader name={name} theme={theme} print />
          </div>
          <div data-measure="column" className="flex flex-col">
            {blocks.map((b) => (
              <div key={blockId(b)}>
                <PrintBlockView block={b} country={country} titleColor={title} titleFont={fonts.title} />
              </div>
            ))}
          </div>
        </div>
      )}

      {plan && (
        <div ref={sheetsRef} className="print-sheets flex flex-col items-center gap-6 py-6 print:block print:p-0">
          {plan.sheets.map((sheet, i) => (
            <div
              key={i}
              className="print-fit shadow-lg print:shadow-none"
              style={{ width: SHEET.width * fit, height: SHEET.height * fit }}
            >
              <div className="print-fit-inner origin-top-left" style={{ transform: `scale(${fit})` }}>
                <PrintSheet
                  index={i}
                  total={plan.sheets.length}
                  name={name}
                  theme={theme}
                  country={country}
                  columns={plan.columns}
                  scale={plan.scale}
                  blocks={sheet.map((col) => col.map((b) => byId.get(blockId(b)) as PrintBlock))}
                  footer={footer}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// On a phone the sheet is drawn smaller to fit the screen; never larger.
function useScreenFit(): number {
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const update = () => setFit(Math.min(1, (window.innerWidth - 32) / SHEET.width));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return fit;
}
