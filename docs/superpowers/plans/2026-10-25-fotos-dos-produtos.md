# Fotos dos produtos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners attach a photo to each text-menu item; diners see it (card thumb + a bottom sheet with the big photo) only when the owner is Pro.

**Architecture:** The photo is a new optional field on `MenuItem` inside the existing `menuDraft`/`menuPublished` JSON (no migration). The owner's browser crops and encodes two WebP files and uploads them straight to Vercel Blob through the existing `/api/blob/upload` route. Pure functions in `src/lib` own every rule (schema, plan cut, cap, what to delete); server actions and components only call them.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching routing/server code — AGENTS.md), React 19, Zod, `@vercel/blob`, vitest with `renderToStaticMarkup`, Tailwind, PostHog `capture`.

**Spec:** `docs/superpowers/specs/2026-10-25-fotos-dos-produtos-design.md`

## Global Constraints

- No Prisma migration. The photo lives in the menu JSON: `photo?: { full: string; thumb: string }`.
- Blob folder: `item-photos/<restaurantId>/`; max **512 KB** per file; types `image/webp`, `image/jpeg`.
- Sizes: **thumb 240 px**, **full 800 px**, square, center crop; WebP quality **0.8**, JPEG fallback **0.82**.
- Free cap: **`FREE_ITEM_LIMIT` (20)** photos; a draft may keep `max(20, previous draft's count)`. Pro cap: `MENU_MAX_ITEMS`.
- Diners see photos only when the owner `isPro`. The dashboard preview always shows them.
- Every new string in `src/i18n/dictionaries/pt-BR.ts`, `es.ts` and `en.1.ts`, plain strings only (no functions).
- PostHog events, exactly: `item_photo_added {format, ms}`, `item_photo_removed`, `item_photo_failed {stage}`, `photo_pro_tapped {from: "notice" | "limit"}`.
- `saveMenuDraft` keeps its single raw `UPDATE` (no `updatedAt` bump, no revalidate).
- A failed Blob `del` is logged with its URL and never fails the save.
- Disk on this machine is failing: after every commit run `git hash-object <file>` vs `git ls-files -s <file>` for the files touched (see memory `disk_failing_sda`).
- Branch `fotos-dos-produtos`. No deploy; the owner deploys after a visual check on a healthy machine.

## Review Focus

1. **iPhone HEIC / unreadable file:** `createImageBitmap` throws → the owner sees "Não deu para enviar a foto. Tente de novo.", `item_photo_failed {stage: "read"}`, item unchanged. (Task 4 test.)
2. **12 MP photo that still encodes over 512 KB at 0.8:** re-encode once at quality 0.6 before giving up; never upload a file the route will refuse. (Task 4 test.)
3. **Owner who lost Pro with 50 photos keeps editing:** autosave must keep succeeding with 50; only the 51st is refused. (Task 2 test.)
4. **Free owner's published JSON has photos:** the public HTML has no `<img>` for items and the JSON-LD has no image; the cart still resolves those items. (Task 6 test.)
5. **Menus saved before this change (no `photo`)** still parse, render and order exactly as before. (Task 1 and Task 6 tests.)

---

### Task 1: Photo in the menu model and the plan cut

**Files:**
- Modify: `src/lib/menu.ts` (types, `ItemSchema`, new regex, `publicMenu`, `uploadRulesFor`)
- Test: `src/lib/menu.test.ts`

**Interfaces:**
- Produces:
  - `export type ItemPhoto = { full: string; thumb: string }`; `MenuItem` gains `photo?: ItemPhoto`.
  - `export const ITEM_PHOTO_URL_RE` — `/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/item-photos\/[a-z0-9]+\//i` (same shape as `LOGO_URL_RE`).
  - `export function publicMenu(menu: Menu, pro: boolean): Menu` — `visibleMenu(menu, pro).menu`, and when `!pro` every item without `photo`.
  - `uploadRulesFor` accepts `item-photos/<restaurantId>/` → `{ maxBytes: 512 * 1024, types: ["image/webp", "image/jpeg"] }`.

- [ ] **Step 1: Write the failing tests** in `menu.test.ts`:
  - `MenuSchema accepts an item photo on our Blob host` — both URLs under `item-photos/<cuid>/`.
  - `MenuSchema refuses a photo URL outside item-photos/` — e.g. a `logos/` URL and `https://evil.example/x.webp`.
  - `MenuSchema still accepts items with no photo` (old menus).
  - `publicMenu strips photos for free owners and keeps them for Pro` — free: `photo` undefined on every item; Pro: deep-equal to input.
  - `publicMenu still applies the free item cut` — 25 items, free → 20.
  - `uploadRulesFor item-photos` — own folder → 512 KB webp/jpeg; another restaurant's folder → `null`; `item-photos/<id>/../x` → `null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/menu.test.ts` — expected FAIL (`publicMenu` not exported, schema rejects `photo`).
- [ ] **Step 3: Implement** the Interfaces above. `ItemSchema` gains `photo: z.object({ full: z.string().regex(ITEM_PHOTO_URL_RE), thumb: z.string().regex(ITEM_PHOTO_URL_RE) }).optional()`.
- [ ] **Step 4: Run** `npx vitest run src/lib/menu.test.ts` — PASS; then `npx tsc --noEmit` — clean.
- [ ] **Step 5: Commit** `git add src/lib/menu.ts src/lib/menu.test.ts && git commit -m "Menu items can carry a photo; free owners' public menu drops it"`

### Task 2: Photo rules — ownership, cap, what to delete

**Files:**
- Create: `src/lib/menu-photos.ts`
- Modify: `src/lib/pricing.ts` (add `FREE_PHOTO_LIMIT`)
- Test: `src/lib/menu-photos.test.ts`

**Interfaces:**
- Consumes: `Menu`, `ItemPhoto`, `MENU_MAX_ITEMS` (Task 1); `FREE_ITEM_LIMIT`.
- Produces:
  - `pricing.ts`: `export const FREE_PHOTO_LIMIT = FREE_ITEM_LIMIT;`
  - `photoUrls(menu: Menu | null): string[]` — every `full` and `thumb`.
  - `countPhotos(menu: Menu | null): number` — items with a `photo`.
  - `photosBelongTo(menu: Menu, restaurantId: string): boolean` — every URL's pathname starts with `/item-photos/<restaurantId>/`.
  - `photoCap(pro: boolean, previousCount: number): number` — Pro → `MENU_MAX_ITEMS`; free → `Math.max(FREE_PHOTO_LIMIT, previousCount)`.
  - `photosToDelete(before: (Menu | null)[], after: (Menu | null)[]): string[]` — URLs in some `before` and in no `after`, deduplicated.

- [ ] **Step 1: Write the failing tests:**
  - `photosToDelete`: replaced photo → old two URLs; item removed → its two URLs; photo still in the published menu → `[]`; nothing changed → `[]`; `null` menus are ignored.
  - `photosBelongTo`: own folder → true; one URL from another restaurant → false; no photos → true.
  - `photoCap`: `(false, 0)` → 20; `(false, 50)` → 50; `(true, 0)` → 300.
  - `countPhotos` / `photoUrls` on a menu with 2 photos → 2 / 4 URLs.
- [ ] **Step 2: Run** `npx vitest run src/lib/menu-photos.test.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** the functions in `src/lib/menu-photos.ts` (no Prisma, no React, like `menu.ts`).
- [ ] **Step 4: Run** the test file — PASS.
- [ ] **Step 5: Commit** `git add src/lib/menu-photos.ts src/lib/menu-photos.test.ts src/lib/pricing.ts && git commit -m "Photo rules: ownership, free cap, and which blobs a save frees"`

### Task 3: Server actions enforce the rules and clean the Blob

**Files:**
- Modify: `src/app/(main)/dashboard/menu-actions.ts` (`saveMenuDraft`, `publishMenu`)
- Modify: `src/app/(main)/dashboard/actions.ts` (`deleteAccount`)
- Modify: `src/i18n/dictionaries/pt-BR.ts`, `es.ts`, `en.1.ts` (`errors`)

**Interfaces:**
- Consumes: `photosBelongTo`, `countPhotos`, `photoCap`, `photosToDelete`, `photoUrls` (Task 2); `isPro` from `@/lib/pricing`; `readPublishedMenu`-style safe parse of the stored JSON (use `MenuSchema.safeParse(...).data ?? null`, never throw).
- Produces: new dictionary keys `errors.photoInvalid` ("Essa foto não pertence a este cardápio.") and `errors.photoLimit` ("No grátis, até 20 fotos. No Pro, todas.").

- [ ] **Step 1: `saveMenuDraft`** — before the `UPDATE`, one `prisma.restaurant.findFirst({ where: { id, ownerId: userId }, select: { menuDraft: true, menuPublished: true, owner: { select: { proExpiresAt: true } } } })` (not found → `restaurantNotFound`). Refuse with `photoInvalid` when `!photosBelongTo`; refuse with `photoLimit` when `countPhotos(new) > photoCap(isPro(owner), countPhotos(previousDraft))`. Keep the raw `UPDATE`. After it, `del` each URL of `photosToDelete([prevDraft, published], [newDraft, published])`, each failure `console.error("[saveMenuDraft] photo delete failed:", url, err)`.
- [ ] **Step 2: `publishMenu`** — same `photosBelongTo` check on the menu being published; after the update, `del` `photosToDelete([prevPublished, prevDraft], [menu])` (draft and published become the same menu).
- [ ] **Step 3: `deleteAccount`** — select `menuDraft` and `menuPublished` too and add `photoUrls` of both to the list it already deletes.
- [ ] **Step 4: Dictionaries** — add the two keys in all three languages (es: "Esta foto no pertenece a este menú." / "En el plan gratis, hasta 20 fotos. En Pro, todas."; en: "This photo doesn't belong to this menu." / "Free plan: up to 20 photos. Pro: all of them.").
- [ ] **Step 5: Verify** `npx tsc --noEmit && npm run lint && npx vitest run` — all pass (dictionary parity tests, if any, included).
- [ ] **Step 6: Commit** the four files: `git commit -m "Saving and publishing check photo ownership and the free cap, and free replaced photos"`

### Task 4: Crop, encode and upload in the owner's browser

**Files:**
- Create: `src/lib/item-photo.ts`
- Test: `src/lib/item-photo.test.ts`
- Modify: `src/lib/menu.ts` only if a constant is better shared (`ITEM_PHOTO_MAX_BYTES = 512 * 1024`, used by `uploadRulesFor` and here)

**Interfaces:**
- Produces:
  - `centerSquare(w: number, h: number): { sx: number; sy: number; side: number }` — largest centered square.
  - `type PhotoDeps = { read: (f: File) => Promise<ImageBitmap>; encode: (img: ImageBitmap, size: number, type: string, quality: number) => Promise<Blob>; put: (path: string, b: Blob) => Promise<string> }` — the browser defaults use `createImageBitmap(file, { imageOrientation: "from-image" })`, an `OffscreenCanvas`/`<canvas>` `toBlob`, and `upload()` from `@vercel/blob/client` with `handleUploadUrl: "/api/blob/upload"` and `clientPayload: JSON.stringify({ restaurantId })` (as `step-visual.tsx` does for the logo).
  - `uploadItemPhoto(file: File, restaurantId: string, itemId: string, deps?: PhotoDeps): Promise<{ photo: ItemPhoto; format: "webp" | "jpeg" }>` — throws `PhotoError` with `stage: "read" | "encode" | "upload"`.
  - Paths: `item-photos/<restaurantId>/<itemId>-thumb.<ext>` and `-full.<ext>`.
- Encoding rule (the one the tests pin): ask for `image/webp` at 0.8; if the returned blob's `type` is not `image/webp`, use `image/jpeg` at 0.82 for both sizes; if a blob is over `ITEM_PHOTO_MAX_BYTES`, encode that size once more at 0.6; still over → `PhotoError("encode")`.

- [ ] **Step 1: Write the failing tests** with fake `deps` (no DOM): `centerSquare(4000, 3000)` → `{ sx: 500, sy: 0, side: 3000 }`; portrait `(3000, 4000)` → `{ sx: 0, sy: 500, side: 3000 }`; webp supported → two `put` calls with `.webp` paths and sizes 240 and 800; encoder returns PNG for webp → both re-encoded as `image/jpeg` 0.82, `format: "jpeg"`; full blob 600 KB at 0.8 → re-encoded at 0.6; still 600 KB → rejects with `stage: "encode"` and no `put`; `read` throws → rejects with `stage: "read"`; `put` throws → `stage: "upload"`.
- [ ] **Step 2: Run** `npx vitest run src/lib/item-photo.test.ts` — FAIL.
- [ ] **Step 3: Implement** `src/lib/item-photo.ts` per the Interfaces.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git commit -m "Item photos are cropped square and encoded in the owner's browser before upload"`

### Task 5: Photo slot in the builder

**Files:**
- Modify: `src/app/(main)/dashboard/cardapio/item-editor.tsx`
- Modify: `src/app/(main)/dashboard/cardapio/step-items.tsx` (pass props; thumbnail on each item row)
- Modify: `src/app/(main)/dashboard/cardapio/menu-builder.tsx` only to pass `restaurantId`/`isPro` if `StepItems` doesn't already have them (it has both)
- Modify: dictionaries (`dashboard.builder.editor`)
- Test: `src/app/(main)/dashboard/cardapio/item-editor.test.tsx`

**Interfaces:**
- Consumes: `uploadItemPhoto`, `PhotoError` (Task 4); `countPhotos`, `photoCap` (Task 2); `capture` from `@/lib/posthog`.
- Produces: `ItemEditor` gains props `restaurantId: string`, `isPro: boolean`, `photoCount: number` (photos in the whole menu, from `countPhotos(menu)`); its `Patch` gains `photo?: ItemPhoto | undefined` (passing `undefined` removes it, via the existing `updateItem`).
- New dictionary keys under `dashboard.builder.editor` (pt-BR; translate for es/en): `photoAdd` "Adicionar foto", `photoChange` "Trocar", `photoRemove` "Tirar", `photoUploading` "Enviando…", `photoFailed` "Não deu para enviar a foto. Tente de novo.", `photoProNotice` "Na prévia você já vê o cardápio com as fotos. Para os clientes, as fotos aparecem no Pro.", `photoProLink` "Ver o Pro", `photoLimit` "No grátis, até 20 fotos. No Pro, todas.".

- [ ] **Step 1: Write the failing tests** (`renderToStaticMarkup` inside `DictionaryProvider`, as `built-menu.test.tsx` does): no photo → button text `photoAdd`; with photo → `<img>` with the thumb URL plus `photoChange` and `photoRemove`; free + photo → `photoProNotice` and a link to `/pricing`; Pro + photo → no notice; free, no photo on this item, `photoCount` 20 → `photoLimit` shown instead of the add button; ex-Pro free with `photoCount` 50 and this item without photo → `photoLimit` (cap is `max(20, 50)` = 50 counts what exists, so adding the 51st is blocked).
- [ ] **Step 2: Run** `npx vitest run "src/app/(main)/dashboard/cardapio/item-editor.test.tsx"` — FAIL.
- [ ] **Step 3: Implement** the 96 px slot left of name/price per the approved preview (artboard "Painel do dono"): hidden `<input type="file" accept="image/*">` behind the button; on change call `uploadItemPhoto`, `onChange({ photo })`, `capture("item_photo_added", { format, ms })`; on `PhotoError` show `photoFailed` and `capture("item_photo_failed", { stage })`; "Tirar" → `onChange({ photo: undefined })` + `item_photo_removed`; the Pro link and the limit link fire `photo_pro_tapped` with `from: "notice"` / `"limit"`. Adding is blocked when `!isPro && !item.photo && photoCount >= FREE_PHOTO_LIMIT` (the server's `photoCap` is the backstop). In `step-items.tsx`, each non-editing row shows a 44 px thumb (or a dashed empty square).
- [ ] **Step 4: Run** the test, then `npx tsc --noEmit && npm run lint` — PASS/clean.
- [ ] **Step 5: Commit** `git commit -m "Builder: add, change or remove an item's photo"`

### Task 6: Photo on the public menu and the item sheet

**Files:**
- Modify: `src/app/m/[slug]/menu-item-card.tsx` (`MenuItemBody`/`MenuItemCard` take `photo?: ItemPhoto`)
- Create: `src/app/m/[slug]/item-sheet.tsx` (`"use client"`)
- Modify: `src/app/m/[slug]/order/orderable-menu.tsx` (`OrderableItem`: card opens the sheet, separate "+" button)
- Modify: `src/app/m/[slug]/built-menu.tsx` (non-ordering branch: items with a photo open the sheet)
- Modify: `src/app/m/[slug]/page.tsx` (`visibleMenu(...).menu` → `publicMenu(published, isPro(restaurant.owner))`)
- Modify: dictionaries (`menu.order`: `close` "Fechar", `addWithPrice` "Adicionar · {price}", `open` "Ver {name}")
- Test: `src/app/m/[slug]/built-menu.test.tsx`, new `src/app/m/[slug]/item-sheet.test.tsx`

**Interfaces:**
- Consumes: `ItemPhoto`, `publicMenu` (Task 1).
- Produces: `ItemSheet({ item, country, accent, onClose, onAdd?: (qty: number) => void })` — `role="dialog"` `aria-modal="true"`, `<img src={item.photo.full}>` when there is a photo, close button `aria-label={o.close}`, Esc and backdrop close, focus moved in on open and back to the opener on close; quantity `− n +` (starts at 1) and the `addWithPrice` button only when `onAdd` is given.

- [ ] **Step 1: Write the failing tests:**
  - Card with photo → `<img src="…thumb…" alt="X-Burguer" width="96" height="96" loading="lazy">`; card without photo → markup has no `<img>` (old menus unchanged).
  - `OrderableItem` with photo → two buttons: one `aria-label` "Ver X-Burguer" (`aria-haspopup="dialog"`), one "+" with the existing `o.add` label; qty > 0 → `QtyControl` as today.
  - `BuiltMenu` rendered from `publicMenu(menuWithPhotos, false)` → no item `<img>` and the JSON-LD string from `menuJsonLd` has no `"image"`; with `true` → thumbs present.
  - `ItemSheet` with `onAdd` → full image, `R$ 28,00` in the add button, `aria-modal="true"`; without `onAdd` → no add button.
- [ ] **Step 2: Run** `npx vitest run "src/app/m/[slug]"` — FAIL.
- [ ] **Step 3: Implement** per the approved preview (artboards "menulala com fotos" and "Toque no item"): card is a flex row, text left (description `line-clamp-2` only when there is a photo), thumb 96 × 96 `rounded-xl` right, the "+" (size-9, white, shadow) absolute over the thumb's bottom-right corner; sheet slides from the bottom, `max-w-lg`, photo `aspect-[4/3] object-cover` full width, `rounded-t-2xl`. Without ordering, only cards with a photo are buttons that open the sheet; the rest stay server-rendered `<li>` as today.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npm run lint` — all pass.
- [ ] **Step 5: Commit** `git commit -m "Public menu: item photo on the card and a sheet with the big photo, Pro only"`

### Task 7: Whole-branch check

- [ ] **Step 1:** `npx vitest run && npx tsc --noEmit && npm run lint` — all green; note the count of tests.
- [ ] **Step 2:** Disk check on every file the branch touched: `git diff --name-only campo-de-preco | while read f; do [ "$(git hash-object "$f")" = "$(git ls-files -s "$f" | awk '{print $2}')" ] || echo "MISMATCH $f"; done` — no output.
- [ ] **Step 3:** Update memory `menu_builder_state.md` with the branch state (not deployed, visual check owed after the SSD swap).
- [ ] **Step 4:** Report to the owner: what shipped on the branch, that nothing is deployed, and the visual check list (card with/without photo at 390 px, sheet open/close, upload from an iPhone and an Android, free notice, limit at 20).
