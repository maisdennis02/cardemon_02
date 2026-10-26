# Cardápio impresso (PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A printable A4 version of a text menu at `/m/<slug>/print`, opened from the dashboard, saved as PDF by the device, with a menulala footer and QR on every page.

**Architecture:** A pure helper decides what may be printed (same cut as the public page). A server-renderable `PrintMenu` component draws the sheet; two tiny client pieces (the print button and the QR) sit inside it. The route reuses the `/m/[slug]` layout, ISR and `getRestaurant`. The dashboard QR card gets a link.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (`print:` variant), `qrcode.react`, vitest + `renderToStaticMarkup`.

**Spec:** `docs/superpowers/specs/2026-10-26-cardapio-impresso-design.md`

## Global Constraints

- Free for every plan; the menulala footer always shows.
- What prints = `publicMenu(published, isPro(owner))` — never different from the online menu; free shows 20 items.
- No item photos on the sheet; no theme background; theme color only on section titles; theme font kept.
- `/m/<slug>/print` is `noindex`, not in the sitemap, 404 when there is no published text menu, `revalidate = 60`, no `MenuViewPing`.
- Footer on every page: QR to `https://menulala.com/m/<slug>` (~22 mm), "Preços atualizados e pedido pelo WhatsApp: aponte a câmera." (without WhatsApp: "Preços atualizados: aponte a câmera."), "Cardápio feito com menulala.com".
- New copy in pt-BR, es and en.1 dictionaries (strings only, no functions).
- No new dependency, no server PDF generation.

## Review Focus

1. Item without price, section without title → nothing blank or "null" printed.
2. Long item names / descriptions → wrap inside the column, price stays right-aligned.
3. A free menu with more than 20 items → the sheet stops at the same item the public page does.
4. Restaurant with no logo → header is the name alone, no broken `<img>`.
5. Spanish/English restaurant → the sheet's copy is in that language.

(1, 3, 4 get tests in Task 1–2; 2 and 5 are covered by a render test of an es menu and a long-name item in Task 1.)

---

### Task 1: `PrintMenu` sheet, copy and print CSS

**Files:**
- Create: `src/app/m/[slug]/print/print-menu.tsx` (server-safe, no hooks)
- Create: `src/app/m/[slug]/print/print-controls.tsx` (`"use client"`: `PrintButton`, `PrintQr`)
- Create: `src/app/m/[slug]/print/print-menu.test.tsx`
- Modify: `src/i18n/dictionaries/pt-BR.ts`, `es.ts`, `en.1.ts` — new `menu.print` block

**Interfaces:**
- Produces: `PrintMenu({ slug, name, country, theme, menu, hasWhatsapp, labels }: { slug: string; name: string; country: string | null; theme: MenuTheme; menu: Menu; hasWhatsapp: boolean; labels: PrintLabels })`
- `type PrintLabels = { save: string; help: string; footerOrder: string; footerNoOrder: string; madeWith: string }` (= `t.menu.print`)
- Dictionary `menu.print` (pt-BR): `save: "Salvar PDF ou imprimir"`, `help: "No celular, escolha \"Salvar como PDF\" ou \"Imprimir\" na tela que abrir."`, `footerOrder: "Preços atualizados e pedido pelo WhatsApp: aponte a câmera."`, `footerNoOrder: "Preços atualizados: aponte a câmera."`, `madeWith: "Cardápio feito com"`; dashboard `dashboard.qr.print: "Cardápio para imprimir (PDF)"`.

- [ ] **Step 1: Write the failing tests** (`print-menu.test.tsx`)
  - `prints name, sections, items with formatted price and description` — R$ 28,00, section title present.
  - `prints an item without a price and a section without a title with no "null"` — html not containing `null`, item name present.
  - `draws no item photo even when the item has one` — no `xb-full`/`xb-thumb` in html.
  - `the footer QR points at the online menu and names menulala.com` — `https://menulala.com/m/<slug>` encoded as `<svg` present + `menulala.com`.
  - `footer says "pedido pelo WhatsApp" only when the restaurant has WhatsApp` — both variants.
  - `no logo → no <img>`; `with logo → <img src=logoUrl>`.
  - `a long item name stays in the item row` (smoke: renders, contains the name).
  - `es restaurant with es labels prints Spanish copy` (render with `es` dictionary labels).
- [ ] **Step 2: Run** `npx vitest run "src/app/m/[slug]/print"` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement.** Layout: `@page { size: A4; margin: 14mm }` in a `print.css` next to the component; sheet in `columns-2 gap-8`, item `break-inside-avoid`, section title `break-after-avoid`; name + dotted leader (`flex-1 border-b border-dotted`) + price; footer `print:fixed print:bottom-0` and normal flow on screen; toolbar `print:hidden`. QR via `QRCodeSVG` from `qrcode.react` in `PrintQr` (client), `size` ≈ 84 px. Copy keys in all 3 dictionaries.
- [ ] **Step 4: Run** the same command — Expected: PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** `Printable menu sheet: two columns, menulala footer and QR on every page`

### Task 2: What may be printed + the route

**Files:**
- Modify: `src/lib/menu.ts` — add `printableMenu`
- Modify: `src/lib/menu.test.ts`
- Create: `src/app/m/[slug]/print/page.tsx`

**Interfaces:**
- Consumes: `PrintMenu`, `t.menu.print` (Task 1).
- Produces: `printableMenu(r: { menuMode: string; imageCount: number; menuPublished: unknown; pro: boolean }, slug: string): Menu | null` — `null` unless `effectiveMode` is `"built"` with a published menu; otherwise `publicMenu(published, pro)`.

- [ ] **Step 1: Failing tests** in `menu.test.ts` ("printableMenu" block): photo mode → null; built but nothing published → null; free with 25 items → 20; Pro with 25 → 25.
- [ ] **Step 2: Run** `npx vitest run src/lib/menu.test.ts` — Expected: FAIL (not exported).
- [ ] **Step 3: Implement** `printableMenu`; then `page.tsx`: `revalidate = 60`, empty `generateStaticParams`, `generateMetadata` → `{ title: "<name> — <cardapioDigital>", robots: NOINDEX }`, page → `notFound()` when `printableMenu` is null or the restaurant is an example; renders `PrintMenu` with `hasWhatsapp: !!whatsappNumber`.
- [ ] **Step 4: Run** `npx vitest run src/lib/menu.test.ts` — PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** `/m/<slug>/print: the same items as the online menu, out of the index`

### Task 3: Dashboard link

**Files:**
- Modify: `src/app/(main)/dashboard/menu-qr-card.tsx` — prop `printable: boolean`
- Modify: `src/app/(main)/dashboard/page.tsx` — `printable={mode === "built"}`
- Create: `src/app/(main)/dashboard/menu-qr-card.test.tsx`

- [ ] **Step 1: Failing tests:** `printable` → link `href="/m/<slug>/print"`, `target="_blank"`, text `t.dashboard.qr.print`; not printable → no such link.
- [ ] **Step 2: Run** `npx vitest run "src/app/(main)/dashboard/menu-qr-card.test.tsx"` — FAIL.
- [ ] **Step 3: Implement** the link (`btn btn-secondary btn-sm`, `DownloadIcon`), `onClick={() => capture("menu_print_opened")}`.
- [ ] **Step 4: Run** it — PASS; full `npx vitest run`, `npx tsc --noEmit`, `npx eslint src` clean (bar the known `error.tsx` warning).
- [ ] **Step 5: Commit** `Dashboard: open the printable menu from the QR card`
