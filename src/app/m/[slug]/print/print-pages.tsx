"use client";

import "./print.css";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { headerColors, menuFontFamilies, type Menu, type MenuTheme } from "@/lib/menu";
import { format } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import { absoluteUrl } from "@/lib/site";
import { SHEET, columnWidth, columnsFor, planLayout, type Block, type Sheet } from "./print-layout";
import { deliverJpgs, renderJpgs, type JpgResult } from "./export-jpg";
import { PrintBand, PrintItemRow, PrintSheet, PrintTitle, menuBlocks, type PrintBlock } from "./print-sheet";
import { waitForAssets } from "./wait-for-assets";

export type PrintLabels = {
  savePdf: string;
  saveJpg: string;
  help: string;
  building: string;
  jpgProgress: string;
  jpgFailed: string;
  jpgReady: string;
  kicker: string;
  footerOrder: string;
  footerNoOrder: string;
  madeWith: string;
};

type Plan = { columns: 1 | 2; scale: number; sheets: Sheet[] };
type JpgState =
  | { kind: "idle" }
  | { kind: "running"; n: number; total: number }
  | { kind: "needs-tap"; files: File[] }
  | { kind: "failed" };

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
  const { accent, title } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);

  const measureRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const fit = useScreenFit();
  const [jpg, setJpg] = useState<JpgState>({ kind: "idle" });

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
        return Array.from(column.children as HTMLCollectionOf<HTMLElement>).map((wrapper, i) => {
          const el = wrapper.firstElementChild as HTMLElement;
          const style = getComputedStyle(el);
          const margins = (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
          return { kind: blocks[i].kind, key: blocks[i].key, height: (el.offsetHeight + margins) * scale };
        });
      };
      // pt-5 above the columns belongs to the header's share of sheet 1.
      setPlan(planLayout({ itemCount: blocks.filter((b) => b.kind === "item").length, headerHeight: header.offsetHeight + 20, measureAt }));
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

  function finished(result: JpgResult, files: File[]) {
    if (result === "needs-tap") return setJpg({ kind: "needs-tap", files });
    setJpg({ kind: "idle" });
    if (result !== "cancelled") capture("menu_print_downloaded", { format: "jpg", pages: files.length });
  }

  function failed(e: unknown) {
    setJpg({ kind: "failed" });
    capture("menu_print_jpg_failed", { error: String((e as Error)?.name ?? e) });
  }

  async function saveJpg() {
    if (jpg.kind === "needs-tap") {
      // A fresh tap: hand the files already drawn to the share sheet.
      const files = jpg.files;
      return deliverJpgs(files).then((r) => finished(r, files), failed);
    }
    const sheets = Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>(".print-page") ?? []);
    if (!sheets.length) return;
    try {
      const files = await renderJpgs({ sheets, slug, onProgress: (n, total) => setJpg({ kind: "running", n, total }) });
      finished(await deliverJpgs(files), files);
    } catch (e) {
      failed(e);
    }
  }

  return (
    <div className="print-root min-h-dvh bg-gray-200 text-gray-900">
      <div className="sticky top-0 z-10 flex flex-col items-center gap-3 bg-white px-4 py-3 text-center shadow print:hidden">
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
            onClick={saveJpg}
            disabled={!plan || jpg.kind === "running"}
            className="rounded-full border border-gray-900 px-5 py-2.5 text-sm font-bold text-gray-900 disabled:opacity-50"
          >
            {jpg.kind === "running"
              ? format(labels.jpgProgress, { n: jpg.n, total: jpg.total })
              : jpg.kind === "needs-tap"
                ? labels.jpgReady
                : labels.saveJpg}
          </button>
        </div>
        <p className="text-xs text-gray-500">{labels.help}</p>
        {jpg.kind === "failed" && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {labels.jpgFailed}
          </p>
        )}
      </div>

      {!plan && <p className="py-10 text-center text-sm text-gray-600 print:hidden">{labels.building}</p>}

      {!plan && (
        // Off screen, at sheet width: where the blocks are measured.
        <div ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[99999px] top-0" style={{ width: SHEET.width, fontFamily: fonts.body }}>
          <div data-measure="header">
            <PrintBand name={name} theme={theme} kicker={labels.kicker} />
          </div>
          <div data-measure="column" className="flex flex-col">
            {blocks.map((b) => (
              <div key={blockId(b)}>
                {b.kind === "title" ? (
                  <PrintTitle title={b.title} accent={accent} titleFont={fonts.title} />
                ) : (
                  <PrintItemRow item={b.item} country={country} priceColor={title} />
                )}
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
                  kicker={labels.kicker}
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
