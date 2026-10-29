# Cardápio impresso igual ao celular — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/m/<slug>/print` shows the text menu as fixed A4 sheets that look like the phone menu (header + logo, theme background, compact cards, photos for Pro), and the owner downloads them as PDF (print dialog) or one JPG per sheet.

**Architecture:** Pure layout functions (`print-layout.ts`) decide columns, scale and which block goes on which sheet from measured heights. A client component (`PrintPages`) measures the blocks off-screen, runs the layout and renders `PrintSheet`s; the PDF is `window.print()` over those sheets, the JPG is `modern-screenshot` over the same sheets, so both always match.

**Tech Stack:** Next 16 App Router, React 19, Tailwind v4, vitest + react-dom/server, `modern-screenshot` (new), `qrcode.react` (existing), PostHog `capture`.

**Spec:** `docs/superpowers/specs/2026-10-28-cardapio-impresso-igual-ao-celular-design.md` (e8fe4ab)

## Global Constraints

- Branch `cardapio-impresso`. Read `node_modules/next/dist/docs/` before touching route files (AGENTS.md).
- Sheet: A4 only, 794 × 1123 CSS px. Side padding 36 px, column gap 24 px, footer reserve 104 px, pages 2+ name strip 56 px.
- Columns: ≤ 8 items → 1 column, 480 px wide, centered; otherwise 2 columns.
- Content scale between **0.80 and 1.60**, applied to cards and section titles only (not header, not footer). Measurement slack: capacities × 0.96.
- Doesn't fit one sheet at 0.80 → scale 1.00, minimum sheet count, balanced.
- Restaurant name on sheet 1: 44 px (phone stays 30 px).
- Footer on every sheet, right-aligned: QR in the bottom-right corner; to its left, right-aligned, `footerOrder`/`footerNoOrder` and "Cardápio feito com menulala.com".
- Photos only via `printableMenu` (already strips them for non-Pro). Nothing clickable inside a sheet.
- JPG: `domToJpeg`, scale 2.5, quality 0.92, imported dynamically on click only. Names `<slug>-cardapio.jpg` / `<slug>-cardapio-pagina-N.jpg`. `navigator.canShare({files})` → `navigator.share`, else `<a download>` one by one. `AbortError` from share is not an error.
- Events: `menu_print_downloaded { format: "pdf" | "jpg", pages }`, `menu_print_jpg_failed { error }`.
- All new copy in pt-BR, en (`en.1.ts`), es. No PNG. No server rendering.
- Disk is failing (see memory): `git log -1 --format=%H` after each commit and re-run tests if anything behaves oddly.

## Review Focus

1. **Fonts or images not loaded when measuring** (logo/photo from Blob arrives late) → heights too small, cards run into the footer. Expect: measure only after `document.fonts.ready` and every `<img>` in the measuring box has loaded or errored. Test in Task 4.
2. **A single card taller than a column** (very long description at 1 column) → must sit alone in its column, never loop or drop items. Test in Task 1.
3. **A section title as the last block of a column** → moves with its first card. Test in Task 1.
4. **Empty description, null price, untitled section** → card renders without blank lines; untitled section adds no title block. Test in Task 3.
5. **Share sheet cancelled / `canShare` missing (desktop Firefox) / JPG library throws on Safari** → cancel is silent, desktop downloads, failure shows the "use PDF" message and keeps the PDF button usable. Test in Task 5.

---

### Task 1: Layout functions

**Files:**
- Create: `src/app/m/[slug]/print/print-layout.ts`
- Test: `src/app/m/[slug]/print/print-layout.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const SHEET = { width: 794, height: 1123, pad: 36, gap: 24, footer: 104, strip: 56, oneColumn: 480 } as const;
  export const SCALE_MIN = 0.8, SCALE_MAX = 1.6, SLACK = 0.96, ONE_COLUMN_MAX_ITEMS = 8;
  export type Block = { kind: "title" | "item"; key: string; height: number };
  export type Sheet = Block[][];            // columns → blocks
  export function columnsFor(itemCount: number): 1 | 2;
  export function columnWidth(columns: 1 | 2): number;   // 480 or (794 - 72 - 24) / 2
  export function paginate(blocks: Block[], columns: 1 | 2, cap1: number, capN: number): Sheet[];
  export function balance(blocks: Block[], columns: 1 | 2, cap1: number, capN: number): Sheet[];
  export function planLayout(input: {
    itemCount: number;
    headerHeight: number;                       // measured sheet-1 header incl. margin
    measureAt: (scale: number) => Block[];      // heights already multiplied by scale
  }): { columns: 1 | 2; scale: number; sheets: Sheet[] };
  ```

- [ ] **Step 1: Write the failing tests** (`print-layout.test.ts`), using a fake `measureAt = (s) => blocks.map(b => ({...b, height: b.height * s}))`:
  - `columnsFor(8) === 1`, `columnsFor(9) === 2`.
  - `paginate`: 3 items of 100 in cap 1000 → 1 sheet, all in column 0; items overflow to column 1 then sheet 2 in order col0→col1→next sheet; a title followed by an item that doesn't fit moves to the next column with it (title never last in a column); an item of 2000 in cap 1000 sits alone in its column and nothing is dropped (total blocks in = out).
  - `balance`: 30 items of 100 with cap 1000, 2 columns → 2 sheets and the last sheet holds ≥ 40 % of the blocks (no near-empty last sheet); same block order as input.
  - `planLayout`: 5 items of 60 → `columns 1`, `scale 1.6`, 1 sheet; 25 items that fit only at 0.82 → 1 sheet, `0.8 ≤ scale ≤ 0.84`; 60 items of 100 → `scale 1`, balanced sheets; scale never < 0.8 nor > 1.6.
  - Capacities: `cap1 = (1123 - 104 - headerHeight) * 0.96`, `capN = (1123 - 104 - 56) * 0.96` — assert via a case that just fits/doesn't fit.

- [ ] **Step 2:** `npx vitest run "src/app/m/[slug]/print/print-layout.test.ts"` → FAIL (module not found).

- [ ] **Step 3: Implement.** `paginate` is greedy (for a title, need = its height + next block's). `balance` first gets `n = paginate(...).length`; if `n === 1` return it; otherwise binary-search (20 iterations) a factor `f ∈ (0, 1]` on both capacities for the smallest `f` that still gives `n` sheets, and paginate with it. `planLayout`: columns from `columnsFor`; for `s` from 1.60 down to 0.80 in steps of 0.02 (round to 2 decimals), the first `s` where `paginate(measureAt(s), …)` has 1 sheet wins; none → `balance(measureAt(1), …)` with scale 1.

- [ ] **Step 4:** run the test → PASS.

- [ ] **Step 5: Commit** `git add src/app/m/[slug]/print/print-layout*.ts && git commit -m "Printable menu: layout functions for columns, scale and balanced sheets"`

### Task 2: Phone card and header, print variants

**Files:**
- Modify: `src/app/m/[slug]/menu-item-card.tsx` (`MenuItemCard`)
- Modify: `src/app/m/[slug]/built-menu.tsx` (`BuiltMenuHeader`)
- Test: `src/app/m/[slug]/built-menu.test.tsx` (add cases)

**Interfaces:**
- Produces:
  - `MenuItemCard({ name, description, priceCents, country, photo?: ItemPhoto, compact?: boolean })` — `photo` passes through to `MenuItemBody` (thumb, no button); `compact` swaps the card padding to `px-3 pb-1.5 pt-2`, the price line to `min-h-0 mt-0.5`, and the photo thumb to `size-16`. Export `MENU_ITEM_CARD_COMPACT_CLASS`.
  - `BuiltMenuHeader({ name, theme, print?: boolean })` — `print` sets the h1 to `text-[44px]`; everything else (band/centered, logo, colors, fonts) unchanged.

- [ ] **Step 1: Failing tests:** `MenuItemCard` with `photo` renders an `<img src=thumb>` and no `<button>`; with `compact` the `<li>` has `MENU_ITEM_CARD_COMPACT_CLASS`; without either, markup equals today's (snapshot the class string). `BuiltMenuHeader` with `print` has `text-[44px]` and keeps the logo `<img>` for both `headerStyle: "band"` and `"centered"`; without `print`, `text-3xl`.
- [ ] **Step 2:** run `npx vitest run "src/app/m/[slug]/built-menu.test.tsx"` → FAIL.
- [ ] **Step 3:** implement the props. `MenuItemBody` gets an optional `compact` for the price line and thumb size.
- [ ] **Step 4:** run → PASS; also `npx vitest run "src/app/m/[slug]"` (the public page and ordering list must be unchanged).
- [ ] **Step 5: Commit** "Menu card and header gain the compact/print variants the printable sheet uses".

### Task 3: The sheet (static)

**Files:**
- Create: `src/app/m/[slug]/print/print-sheet.tsx` (no `"use client"`, no hooks)
- Modify: `src/app/m/[slug]/print/print-controls.tsx` (`PrintQr` size 88)
- Test: `src/app/m/[slug]/print/print-sheet.test.tsx`

**Interfaces:**
- Consumes: `SHEET`, `Sheet`, `columnWidth` (Task 1); `MenuItemCard` compact + `BuiltMenuHeader` print (Task 2).
- Produces:
  ```ts
  export type PrintBlock = { kind: "title"; key: string; title: string } | { kind: "item"; key: string; item: MenuItem };
  export function menuBlocks(menu: Menu): PrintBlock[];   // untitled section → no title block
  export function PrintBlockView(props: { block: PrintBlock; country: string | null; titleColor: string; titleFont: string }): JSX.Element;
  export function PrintSheet(props: {
    index: number; total: number; name: string; theme: MenuTheme; country: string | null;
    columns: 1 | 2; scale: number; blocks: PrintBlock[][];           // per column
    footer: { qrValue: string; line: string; madeWith: string };
  }): JSX.Element;   // root: div.print-page, 794×1123, theme background, overflow hidden
  ```
  Sheet 1 (`index 0`) renders `BuiltMenuHeader print`; others the 56 px strip with the name in title font/color. Columns are `div`s of width `columnWidth(columns) / scale` with `style.zoom = scale`. Footer: absolute, bottom 22 px, left/right 36 px, `flex-row-reverse`, text right-aligned, border-top.

- [ ] **Step 1: Failing tests:** `menuBlocks` of the fixture menu in `print-menu.test.tsx` (copy it) → `[title Lanches, item xb, item agua]` (untitled section adds no title). `PrintSheet index 0` contains the header h1 with `text-[44px]` and the logo; `index 1` contains the strip and no `<header>`; every sheet contains the QR `<svg>` and `menulala.com`; footer root has `flex-row-reverse`; an item with a photo renders its thumb, one without renders no `<img>`; item with null price and no description renders no empty price/description span; no `<a>` or `<button>` inside `.print-page`; `es` labels pass through.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** "Printable menu: the A4 sheet drawn with the phone header and cards".

### Task 4: Measure, plan, render — and the PDF

**Files:**
- Create: `src/app/m/[slug]/print/print-pages.tsx` (`"use client"`)
- Modify: `src/app/m/[slug]/print/page.tsx` (render `PrintPages` instead of `PrintMenu`)
- Modify: `src/app/m/[slug]/print/print.css` (rewrite)
- Delete: `src/app/m/[slug]/print/print-menu.tsx`, `print-menu.test.tsx` (their cases moved to Task 3)
- Modify: dictionaries `menu.print` (pt-BR, `en.1.ts`, es): replace `save` with `savePdf`, add `building`
- Test: `src/app/m/[slug]/print/print-pages.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `PrintPages(props: { slug; name; country; theme; menu; hasWhatsapp; labels: PrintLabels })` where
  `PrintLabels = { savePdf; saveJpg; help; building; jpgProgress; jpgFailed; footerOrder; footerNoOrder; madeWith }` (Task 5 fills `saveJpg`, `jpgProgress`, `jpgFailed`; add them now with their final copy below). Renders the toolbar (`print:hidden`) and a `div.print-sheets` holding the sheets; exposes the sheet elements to Task 5 through a ref (`sheetsRef: RefObject<HTMLDivElement>`).
- Copy (pt-BR / en / es):
  - `savePdf`: "Baixar PDF" / "Download PDF" / "Descargar PDF"
  - `saveJpg`: "Baixar imagem (JPG)" / "Download image (JPG)" / "Descargar imagen (JPG)"
  - `building`: "Montando o cardápio…" / "Laying out the menu…" / "Armando el menú…"
  - `jpgProgress`: "Gerando página {n} de {total}…" / "Making page {n} of {total}…" / "Generando página {n} de {total}…"
  - `jpgFailed`: "Não deu para gerar a imagem. Use Baixar PDF." / "Couldn't make the image. Use Download PDF." / "No se pudo generar la imagen. Usa Descargar PDF."

- [ ] **Step 1: Failing tests:** server render of `PrintPages` shows `building` and the two buttons, and no `.print-page` yet (layout runs after mount); a pure helper `waitForAssets(root: HTMLElement): Promise<void>` resolves only after every `<img>` in `root` fires `load` or `error` (jsdom-free: test with a fake root exposing `querySelectorAll` returning objects with `complete`/`addEventListener`), and awaits `document.fonts?.ready` when present.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement `PrintPages`.** After mount: render all `menuBlocks` once in an off-screen box (`position:absolute; left:-99999px`) at `columnWidth / s` width, `await waitForAssets(box)`, then call `planLayout` with `measureAt(s)` = set the box width to `columnWidth(columns)/s`, read each block's `offsetHeight` + its bottom margin, multiply by `s`; header height measured the same way from a `BuiltMenuHeader print` in the box. Store the result in state and render `PrintSheet`s. Screen: sheets stacked with 24 px gap, scaled to fit the viewport width on phones (`transform: scale(min(1, (innerWidth - 32)/794))` with a wrapper of the scaled height). "Baixar PDF" → `capture("menu_print_downloaded", { format: "pdf", pages })` then `window.print()`.
- [ ] **Step 4: Rewrite `print.css`:** `@page { size: A4; margin: 0 }`; in `@media print`: toolbar hidden, wrappers unscaled, `.print-page { break-after: page; box-shadow: none; print-color-adjust: exact }`, last one `break-after: auto`. Drop the fixed-footer rules and their comment; one comment saying the sheets are laid out in the DOM so PDF and JPG match.
- [ ] **Step 5:** run `npx vitest run "src/app/m/[slug]"` and `npx tsc --noEmit` → PASS / no errors.
- [ ] **Step 6: Commit** "Printable menu: sheets measured and laid out in the page; PDF prints those sheets".

### Task 5: JPG export

**Files:**
- Modify: `package.json` / lockfile (`npm i modern-screenshot`, pin the exact version installed)
- Create: `src/app/m/[slug]/print/export-jpg.ts`
- Modify: `src/app/m/[slug]/print/print-pages.tsx` (button + progress + error)
- Test: `src/app/m/[slug]/print/export-jpg.test.ts`

**Interfaces:**
- Consumes: `sheetsRef` from Task 4.
- Produces:
  ```ts
  export function jpgFileName(slug: string, index: number, total: number): string;
  export async function exportJpgs(opts: {
    sheets: HTMLElement[]; slug: string;
    render?: (el: HTMLElement) => Promise<Blob>;          // default: modern-screenshot domToBlob jpeg, scale 2.5, quality 0.92
    onProgress?: (n: number, total: number) => void;
    nav?: Pick<Navigator, "canShare" | "share">;          // default: navigator
    download?: (file: File) => void;                      // default: <a download> click
  }): Promise<"shared" | "downloaded" | "cancelled">;
  ```

- [ ] **Step 1: Failing tests:** `jpgFileName("ze",0,1) === "ze-cardapio.jpg"`, `jpgFileName("ze",1,3) === "ze-cardapio-pagina-2.jpg"`; with `nav.canShare → true` it calls `share({ files })` once with all files and returns `"shared"`; `share` rejecting with `DOMException("", "AbortError")` returns `"cancelled"` and does not throw; `canShare` undefined → `download` called once per sheet in order, returns `"downloaded"`; `render` throwing → the promise rejects (the caller shows `jpgFailed`); `onProgress` called with (1,2),(2,2).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement; default `render` does `const { domToBlob } = await import("modern-screenshot")` with `{ type: "image/jpeg", quality: 0.92, scale: 2.5 }`. Render the unscaled sheet (temporarily remove the screen transform while capturing).
- [ ] **Step 4: Wire the button** in `PrintPages`: disabled while running, label `jpgProgress`; on success `capture("menu_print_downloaded", { format: "jpg", pages })`; on error show `jpgFailed` under the toolbar and `capture("menu_print_jpg_failed", { error: String(e?.name ?? e) })`; `"cancelled"` shows nothing.
- [ ] **Step 5:** run `npx vitest run` (whole suite), `npx tsc --noEmit`, `npx eslint src/app/m` → all green.
- [ ] **Step 6: Commit** "Printable menu: download each sheet as a JPG, shared on phones".

### Task 6: Verify on the preview

- [ ] **Step 1:** `npm run build` → succeeds; push `cardapio-impresso`; wait for the Vercel preview.
- [ ] **Step 2:** In Chrome (desktop) on `/m/teste-fotos/print`: 25 items → 1 or 2 sheets per the rules, QR bottom-right, photo on X-Burguer; "Baixar PDF" → print preview shows the same sheets, backgrounds on; "Baixar imagem (JPG)" → files named per Task 5, open them and compare with the screen.
- [ ] **Step 3:** In the builder, temporarily switch `teste-fotos` to band header, then centered, with and without a logo, and background `doodles`; check each; restore. The 1-column case is covered by the Task 1 tests, not by editing the test menu.
- [ ] **Step 4:** Report to the owner what was seen; hand over the **owner-only checks that gate deploy**: iPhone Safari (PDF, JPG via share sheet, logo and photo present in the JPG) and Android Chrome.
- [ ] **Step 5:** Update `memory/menu_builder_state.md` with the head commit and what is still owed.
