# Construtor de cardápio — Etapa B (Construtor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a restaurant owner with no menu photos builds and publishes a text menu alone, on a phone, at `/dashboard/cardapio`.

**Architecture:** every rule that can be pure lives in `src/lib/` and is unit-tested with vitest: line parsing, the editing operations, autosave timing, logo colors, and input schemas. Server actions in `dashboard/menu-actions.ts` validate everything with those schemas. The builder is one client component (`menu-builder.tsx`) holding the menu in state, with one file per step. The dashboard gains an entry point chosen by `isPublished` and `effectiveMode`, which stage A already shipped.

**Tech Stack:** Next.js 16.2.6 App Router, React 19, Prisma 7 (`$executeRaw` for the draft), zod 4, `@vercel/blob/client` `upload()`, posthog-js through `capture()`, and vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-09-construtor-de-cardapio-design.md`, §3, §4 and §6 (stage B). Stage A is merged and in prod: `5a373af`.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing route or Server Action code (AGENTS.md).
- **Exports of `"use server"` files:** every export of such a file is a public endpoint. Helpers go in `guards.ts` or `src/lib/`.
- **Dictionaries:** they hold strings only, with `{placeholders}` filled by `format()`. New keys go into all three files: `pt-BR.ts`, `es.ts` and `en.1.ts`. `tsc` enforces parity.
- **`/m/[slug]`:** never call `cookies()` or `headers()` there. Corrupt published data must throw, never render empty (stage A invariant).
- **`saveMenuDraft`:**
  - it never calls `revalidatePath`;
  - it never changes `Restaurant.updatedAt`, so it writes with `$executeRaw`.
- **Free plan:** 20 items (`FREE_ITEM_LIMIT`). The cut is **only** `visibleMenu()`. Never block adding an item or publishing.
- **Logo:**
  - at most **2 MB**, jpeg/png/webp only;
  - Blob path `logos/<restaurantId>/…`;
  - replacing or removing it deletes the old file with `del`, and so does deleting the account.
- **Logo colors:** read pixels from the local file through an object URL, never from the Blob URL. Nothing is applied until the owner taps it.
- **Price parsing:** when in doubt the item gets **no price** and is marked. It never gets a wrong price silently.
- **PostHog events:** `menu_mode_chosen {mode}`, `builder_step {step}`, `item_added {via: typed|pasted}` and `logo_uploaded`, all through `capture()` from `@/lib/posthog`.
- **No new dependency, env var, migration or paid service.**
- **`npm run lint` is polluted by `.claude/worktrees`:** run `npx eslint src` instead. The only accepted pre-existing error is in `src/app/m/[slug]/error.tsx`.

## Review Focus

1. **Dictation output:** the keyboard writes "Coca 7 reais", "Coca R$ 7,50" or "Coca sete reais". The first two get a price; words get no price and are marked. Tests are in Task 2.
2. **A late autosave after publish:** an autosave in flight when "Publicar" is tapped must not land after the publish and leave the draft older than the screen. Covered by the `settle()` test in Task 3.
3. **A logo URL that isn't ours:** another host, or another restaurant's `logos/` path, is rejected by the server. Tests are in Tasks 1 and 5.
4. **Very long pasted lists:** pasting more than 300 items or 30 sections stops at the schema limits and says so, instead of a publish that fails with "invalid menu". Tests are in Task 3.
5. **A builder opened with a bad or missing draft:**
   - an invalid draft starts empty and shows a notice;
   - a null draft with a published menu starts from the published menu.

   Tests are in Task 3.

---

### Task 1: Tighten the theme schema; stage A's deferred tests and fixes

**Files:**
- Modify: `src/lib/menu.ts`, `src/lib/menu.test.ts`
- Modify: `src/app/m/[slug]/built-menu.css`, `scripts/publish-test-menu.ts`

**Interfaces:**
- Produces:
  - `MenuThemeSchema` accepts `logoUrl` only when it matches `LOGO_URL_RE`;
  - `color` must match `/^#[0-9a-f]{6}$/i`;
  - `export const LOGO_URL_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/logos\/[a-z0-9]+\//i`.

- [ ] **Step 1:** Write the failing tests in `menu.test.ts`:
  - `MenuThemeSchema` rejects `logoUrl` `"https://evil.com/logos/x/a.png"`, `"javascript:alert(1)"` and a Blob URL under `menu-pages/`;
  - it accepts `"https://abc.public.blob.vercel-storage.com/logos/ckabc123/logo-x.png"`;
  - it rejects `color` `"red"` and `"#fff"`, and accepts `"#a1b2c3"`.

  Also stage A's four deferred tests:
  - `menuJsonLd(visibleMenu(menu25, false).menu, "BR")` has 20 `MenuItem` entries;
  - `headerColors("red")` returns `{ accent: "#1f2937", title: "#1f2937" }`;
  - `readMenuTheme(null)` equals `DEFAULT_MENU_THEME`;
  - `visibleMenu(menu25, false)` leaves `menu25` untouched (`structuredClone` before, `toEqual` after).
- [ ] **Step 2:** Run `npx vitest run src/lib/menu.test.ts`. Expected: the new schema tests FAIL. The four deferred tests may pass right away: they pin existing behavior, so passing is fine.
- [ ] **Step 3:** Implement `LOGO_URL_RE` and the tighter `MenuThemeSchema`. `readMenuTheme` already falls back to the default on a parse failure.
- [ ] **Step 4:** In `built-menu.css`, add `.built-menu-actions:empty { display: none; }`. `MenuActions` returns `null` when there are no buttons, so the wrapper is empty.

  In `scripts/publish-test-menu.ts`, change the final message to say the change shows on the first visit after ~60 s, counting from the visit that triggered the regeneration.
- [ ] **Step 5:** Run `npm test && npx tsc --noEmit`. Expected: all tests pass and tsc is clean.
- [ ] **Step 6:** Commit with the message "Restrict menu theme logos to our Blob path and colors to hex; stage A follow-ups".

### Task 2: Item-line and pasted-list parsing

**Files:**
- Create: `src/lib/menu-parse.ts`, `src/lib/menu-parse.test.ts`

**Interfaces:**
- Consumes: `MenuSection`, `MenuItem` from `@/lib/menu`.
- Produces:
  - `parseItemLine(line: string): { name: string; priceCents: number | null } | null`, which returns `null` for a blank line;
  - `parsePastedList(text: string, newId: () => string): MenuSection[]`.

**The price rule (spec §3):**
- A price is a number **at the end of the line**, optionally preceded by `R$` or `$`.
- The number must be preceded by whitespace, the start of the line, or `$`. A number glued to `.`, `,` or a letter on its left is not a price.
- Forms accepted:
  - `25`, `25,9`, `25,90`, `25.90`;
  - each of those followed by ` reais`;
  - `25 e 90`, `25 reais e 90`, `25 reais e 90 centavos`.
- One decimal digit means tens of cents.
- The integer part has at most 5 digits.
- The name is what is left, trimmed of trailing ` -`, `:`, `…` and a stray `R$`.
- If the name is empty, the whole line becomes the name, with no price.
- The name is cut to 80 characters.

- [ ] **Step 1:** Write `menu-parse.test.ts`. Each case is `parseItemLine(input)` → `{name, priceCents}`:

  | input | name | priceCents |
  |---|---|---|
  | `"X-Burguer 25,90"` | `"X-Burguer"` | `2590` |
  | `"X-Burguer 25.90"` | `"X-Burguer"` | `2590` |
  | `"X-Burguer R$ 25"` | `"X-Burguer"` | `2500` |
  | `"X-Burguer R$25,9"` | `"X-Burguer"` | `2590` |
  | `"Suco 8 e 50"` | `"Suco"` | `850` |
  | `"Suco 8 reais e 50"` | `"Suco"` | `850` |
  | `"Coca 7 reais"` | `"Coca"` | `700` |
  | `"Coca sete reais"` | `"Coca sete reais"` | `null` |
  | `"X-Tudo 2 carnes 32,00"` | `"X-Tudo 2 carnes"` | `3200` |
  | `"Água 500ml"` | `"Água 500ml"` | `null` |
  | `"Coca 2L"` | `"Coca 2L"` | `null` |
  | `"Pizza 35cm"` | `"Pizza 35cm"` | `null` |
  | `"Água 500ml 4,00"` | `"Água 500ml"` | `400` |
  | `"Pizza 35cm 59,90"` | `"Pizza 35cm"` | `5990` |
  | `"Picanha 1.250"` | `"Picanha 1.250"` | `null` |
  | `"Pastel - 9,00"` | `"Pastel"` | `900` |
  | `"25,90"` | `"25,90"` | `null` |

  Plus: `"   "` → `null`; a 120-character name is cut to 80.

  `parsePastedList` cases (`newId` is a counter, `"id1"`, `"id2"`, and so on):
  - `"Lanches\nX-Burguer 20\nX-Salada 22\nBebidas\nCoca 7"` → two sections titled `"Lanches"` (2 items) and `"Bebidas"` (1 item);
  - `"X-Burguer 20\nCoca 7"` → one section with `title: null` and 2 items;
  - `"Lanches\nÁgua 500ml"` → one untitled section with 2 items, both priced `null`. An unpriced line counts as a title only when a priced line follows it.
  - blank lines are ignored;
  - a title longer than 60 characters is cut to 60.
- [ ] **Step 2:** Run `npx vitest run src/lib/menu-parse.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement both functions in `menu-parse.ts`. Use one regex anchored at `$` for the "e"/"reais e" form, and one for the decimal form. Check the left-boundary rule on the match index.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Parse typed and dictated item lines and pasted menu lists".

### Task 3: Editing operations, initial builder menu, autosaver

**Files:**
- Create: `src/lib/menu-edit.ts`, `src/lib/menu-edit.test.ts`
- Create: `src/lib/autosave.ts`, `src/lib/autosave.test.ts`

**Interfaces:**
- Consumes: `Menu`, `MenuSchema`, `MENU_MAX_ITEMS`, `MENU_MAX_SECTIONS`, `countItems` from `@/lib/menu`.
- Produces from `menu-edit.ts`:
  - `newId(): string`: 10 base36 characters from `crypto.getRandomValues`, matching `/^[a-z0-9_-]{1,32}$/`.
  - `initialBuilderMenu(draftRaw: unknown, publishedRaw: unknown): { menu: Menu; draftWasInvalid: boolean }`.
  - Every operation below is pure, returns a new `Menu`, and returns the input unchanged when the target id doesn't exist or a limit would be passed:
    - `addSection(menu, title: string | null, id = newId())`
    - `renameSection(menu, sectionId, title)`
    - `removeSection(menu, sectionId)`: its items move to the previous section, or to the next one if it was first. They are never lost.
    - `moveSection(menu, sectionId, dir: -1 | 1)`
    - `addItem(menu, sectionId: string | null, item: Omit<MenuItem, "id">, id = newId())`: a `null` sectionId means the first section, creating an untitled one if there is none.
    - `updateItem(menu, itemId, patch: Partial<Omit<MenuItem, "id">>)`
    - `removeItem(menu, itemId)`
    - `moveItem(menu, itemId, dir: -1 | 1)`: moves within its section only.
    - `moveItemToSection(menu, itemId, sectionId)`: appends at the end.
    - `appendSections(menu, sections: MenuSection[]): { menu: Menu; dropped: number }`: used by "Colar lista". It adds up to the limits and reports how many items didn't fit.
- Produces from `autosave.ts`: `createAutosaver<T>(opts: { save: (v: T) => Promise<void>; delayMs?: number; retryMs?: number; onStatus: (s: "idle" | "pending" | "saving" | "saved" | "error") => void })` returns `{ push(v: T): void; settle(): Promise<void>; dispose(): void }`. Defaults: `delayMs = 2000`, `retryMs = 5000`.

- [ ] **Step 1:** Write `menu-edit.test.ts`:
  - `newId()` matches the id regex; 1000 calls are all distinct.
  - `initialBuilderMenu(null, null)` → `{ menu: { v: 1, sections: [] }, draftWasInvalid: false }`.
  - `initialBuilderMenu(null, published)` → the published menu.
  - `initialBuilderMenu({ v: 2 }, published)` → empty menu, `draftWasInvalid: true`.
  - `initialBuilderMenu(draft, published)` → the draft.
  - `addItem(empty, null, {name: "Coca", priceCents: 700})` → one section, `title: null`, one item.
  - `addItem` at `MENU_MAX_ITEMS` items returns the same object (`toBe`).
  - `addSection` at `MENU_MAX_SECTIONS` returns the same object.
  - `removeSection` on the first of two sections moves its items to the start of the second.
  - `removeSection` on the only section keeps its items in an untitled section.
  - `moveItem` up on the first item is a no-op (`toBe`).
  - `moveItemToSection` appends at the end.
  - `appendSections` with 310 items into an empty menu → 300 items, `dropped: 10`.
  - Every result of a sequence of operations passes `MenuSchema.safeParse`.
- [ ] **Step 2:** Write `autosave.test.ts` with `vi.useFakeTimers()`:
  - three `push` calls 500 ms apart, then 2000 ms: `save` called once, with the last value. Statuses go `pending` → `saving` → `saved`.
  - `save` rejects once: status `error`; after `retryMs`, `save` is called again with the **latest** value, and the status ends at `saved`.
  - `push(a)`, advance 2000 ms (save in flight), `push(b)`, then `await settle()`: no timer is left pending, and `b` is **not** saved. `settle()` cancels pending work and waits for the in-flight save; the caller publishes `b` itself.
  - `dispose()` cancels a pending save.
- [ ] **Step 3:** Run `npx vitest run src/lib/menu-edit.test.ts src/lib/autosave.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 4:** Implement both modules.
- [ ] **Step 5:** Run the same command, then `npm test`. Expected: PASS.
- [ ] **Step 6:** Commit with the message "Add pure menu editing operations and a debounced autosaver".

### Task 4: Logo colors and preset palettes

**Files:**
- Create: `src/lib/menu-colors.ts`, `src/lib/menu-colors.test.ts`

**Interfaces:**
- Produces:
  - `pickLogoColors(rgba: Uint8ClampedArray, max = 3): string[]`, returning lowercase `#rrggbb`;
  - `MENU_PALETTES: readonly string[]`: exactly 8 hex colors, each with contrast ≥ 3 against white under `headerColors`, so the title uses them.

**Algorithm:**
1. Skip pixels with alpha < 128.
2. Skip pixels with HSL saturation < 0.25 or lightness outside 0.15–0.85. This drops white, black and grey.
3. Bucket the rest by 4 bits per channel. Score each bucket as count × saturation.
4. Take buckets in score order, skipping any whose RGB distance to an already picked one is under 64. Return each bucket's average color.

- [ ] **Step 1:** Write the tests:
  - 100 red pixels and 50 blue pixels → `["#ff0000", "#0000ff"]`, red first;
  - all white or all transparent → `[]`;
  - two reds 10 apart count as one color;
  - every `MENU_PALETTES` entry satisfies `headerColors(c).title === c`.
- [ ] **Step 2:** Run `npx vitest run src/lib/menu-colors.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit with the message "Extract a logo's dominant colors; add preset menu palettes".

### Task 5: Server side: draft, visual, mode switch, logo upload, cleanup

**Files:**
- Modify: `src/lib/menu.ts`, `src/lib/menu.test.ts` (input schemas and logo helpers)
- Modify: `src/app/(main)/dashboard/menu-actions.ts`
- Modify: `src/app/(main)/dashboard/actions.ts`: `recordMenuImages` and `deleteAccount`
- Modify: `src/app/api/blob/upload/route.ts`
- Modify: the three dictionaries (new `dashboard.errors` keys)

**Interfaces:**
- Consumes: `MenuSchema`, `MenuThemeSchema` from Task 1, and `requireUserId`, `requireOwnedRestaurant`, `dashT` from `guards.ts`.
- Produces in `src/lib/menu.ts`:
  - `SaveDraftInputSchema = PublishMenuInputSchema` (same envelope);
  - `MenuVisualInputSchema = z.object({ restaurantId: z.string().cuid(), country: z.enum(SUPPORTED_COUNTRIES), theme: MenuThemeSchema })`;
  - `isOwnLogoUrl(url: string, restaurantId: string): boolean`, which requires `LOGO_URL_RE` **and** the path segment `logos/<restaurantId>/`;
  - `uploadRulesFor(pathname: string, restaurantId: string): { maxBytes: number; types: string[] } | null`:
    - `logos/<id>/…` → 2 MB, jpeg/png/webp;
    - `menu-pages/<id>/…` → 10 MB, jpeg/png/webp/gif;
    - anything else → `null`.
- Produces in `menu-actions.ts`:
  - `saveMenuDraft(input: { restaurantId: string; menu: unknown }): Promise<{ error?: string }>`;
  - `saveMenuVisual(input: { restaurantId: string; country: string; theme: unknown }): Promise<{ error?: string }>`;
  - `useMenuPhotos(input: { restaurantId: string }): Promise<{ error?: string; needsUpload?: boolean }>`.
- Produces in `actions.ts`: `recordMenuImages` accepts an optional `switchToPhotos?: boolean`.

- [ ] **Step 1:** Write the failing tests in `menu.test.ts`:
  - `isOwnLogoUrl` is true for its own restaurant's path, false for another restaurant's id, and false for a `menu-pages/` URL;
  - `uploadRulesFor("logos/abc/x.png", "abc").maxBytes === 2 * 1024 * 1024`;
  - `uploadRulesFor("logos/other/x.png", "abc") === null`;
  - `uploadRulesFor("menu-pages/abc/x.png", "abc").maxBytes === 10 * 1024 * 1024`;
  - `uploadRulesFor("../x", "abc") === null`;
  - `MenuVisualInputSchema` rejects country `"XX"` and accepts `"BR"` with a valid theme.
- [ ] **Step 2:** Run `npx vitest run src/lib/menu.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the helpers in `menu.ts`. Importing `SUPPORTED_COUNTRIES` from `@/lib/delivery-apps` is fine: it is a pure module.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Implement the actions in `menu-actions.ts`. Each one first calls `requireUserId()`, then the envelope `safeParse` (failure → `t.errors.invalidInput`).
  - **`saveMenuDraft`:**
    - validate with `MenuSchema` (failure → `t.errors.invalidMenu`);
    - write with a single query: `` prisma.$executeRaw`UPDATE "Restaurant" SET "menuDraft" = ${JSON.stringify(menu)}::jsonb WHERE "id" = ${restaurantId} AND "ownerId" = ${userId}` ``. The query also checks ownership.
    - an affected row count of 0 → `t.errors.restaurantNotFound`;
    - **no `revalidatePath`, no `updatedAt`.**
  - **`saveMenuVisual`:**
    - `requireOwnedRestaurant`;
    - if `theme.logoUrl` is set and `!isOwnLogoUrl(...)`, return `t.errors.logoInvalid`;
    - read the old theme with `readMenuTheme(restaurant.menuTheme)`;
    - `update` `country` and `menuTheme`;
    - if the old `logoUrl` exists and differs from the new one, call `del(old).catch(log)`;
    - `revalidatePath('/m/<slug>')` only.
  - **`useMenuPhotos`:**
    - `requireOwnedRestaurant`;
    - count images; if there are none, return `{ needsUpload: true }` and write nothing;
    - otherwise `update` `menuMode: "photos"`, then `revalidatePath` for `/m/<slug>` and `/dashboard`.
- [ ] **Step 6:** Change `actions.ts`:
  - **`recordMenuImages`:** when `switchToPhotos` is true **and** `existingCount === 0`, the same `createMany` call is followed by a `restaurant.update` setting `menuMode: "photos"`. Wrap both in `prisma.$transaction`.
  - **`deleteAccount`:** also select `menuTheme`, and `del(readMenuTheme(r.menuTheme).logoUrl)` when present, logged on failure like the images.
- [ ] **Step 7:** Change `route.ts`:
  - in `onBeforeGenerateToken`, use `uploadRulesFor(pathname, restaurantId)`;
  - `null` → throw `"Invalid upload path"`;
  - otherwise use its `maxBytes` and `types` instead of the hard-coded values.
- [ ] **Step 8:** Add `dashboard.errors.logoInvalid` to the three dictionaries. Run `npm test && npx tsc --noEmit`. Expected: green.
- [ ] **Step 9:** Commit with the message "Save menu drafts without touching updatedAt; save visual settings; switch back to photos; size-limit logo uploads".

### Task 6: `BuiltMenu` usable as a preview

**Files:**
- Modify: `src/app/m/[slug]/built-menu.tsx`

**Interfaces:**
- Produces:
  - `BuiltMenuHeader({ name, theme }: { name: string; theme: MenuTheme })`, exported from `built-menu.tsx` and used by the step 1 live preview;
  - `BuiltMenu` gains an optional `preview?: boolean`. When true, it skips `MenuViewPing`, uses `min-h-0` instead of `min-h-dvh`, and its footer is not a link.

- [ ] **Step 1:** Extract the `<header>` block into `BuiltMenuHeader` without changing its markup, and add the `preview` prop. The file stays free of hooks and `"use client"`, so it renders from both the server page and the client builder.
- [ ] **Step 2:** Run `npx tsc --noEmit && npm test`. Then do a production build, `npm run build`. Then on the dev DB, load a built-mode test restaurant with `npm start`: the public page is unchanged and still pings the view (one `POST /api/menu-views` in the server log). Expected: as described.
- [ ] **Step 3:** Commit with the message "Let BuiltMenu render as a dashboard preview, and export its header".

### Task 7: Builder page, shell and step 1 (Visual)

**Files:**
- Create: `src/app/(main)/dashboard/cardapio/page.tsx` (server component)
- Create: `src/app/(main)/dashboard/cardapio/menu-builder.tsx` (`"use client"`: state, steps or tabs, autosave, save indicator, events)
- Create: `src/app/(main)/dashboard/cardapio/step-visual.tsx` (`"use client"`)
- Create: `src/app/(main)/dashboard/cardapio/logo-colors.ts` (`"use client"` helper `readLogoPixels(file: File): Promise<Uint8ClampedArray>`: object URL, `<img>`, canvas downscaled to ≤ 64 px, then `getImageData`, and revoke the URL)
- Modify: the three dictionaries (`dashboard.builder.*`)

**Interfaces:**
- Consumes:
  - `initialBuilderMenu`, `createAutosaver` (Task 3), `pickLogoColors` and `MENU_PALETTES` (Task 4);
  - `saveMenuDraft` and `saveMenuVisual` (Task 5), `BuiltMenuHeader` (Task 6);
  - `readMenuTheme`, `isPro`, `localeForCountry`, `getDictionary`, and `capture` from `@/lib/posthog`.
- Produces (props for Tasks 8 and 9):
  - `MenuBuilder({ restaurant: { id, slug, name, country }, initialTheme: MenuTheme, initial: { menu: Menu; draftWasInvalid: boolean }, hasPublished: boolean, isPro: boolean, sectionSuggestions: Record<Locale, string[]>, defaultCountry: string })`;
  - the builder holds `menu` and `setMenu(next: Menu)`; `setMenu` also calls `autosaver.push(next)`;
  - the step files receive `menu`, `setMenu` and whatever else they need as props.

**Page (`page.tsx`):**
- `auth()`, then redirect to `/login` with no session.
- Find the owner's restaurant; redirect to `/dashboard` if there is none.
- Read the user's `proExpiresAt`, then `initialBuilderMenu(restaurant.menuDraft, restaurant.menuPublished)`.
- Pass `sectionSuggestions` for all three locales, read from `getDictionary(locale).dashboard.builder.sectionSuggestions` (a string array). The client then picks by `localeForCountry(country)` as the country changes.
- `defaultCountry`: `restaurant.country`, else by dashboard locale: `pt-BR` → `BR`, `es` → `MX`, `en` → `US`.

**Shell:**
- Without `hasPublished`, show the step-by-step flow Visual → Itens → Prévia, with "Continuar" and "Voltar".
- With `hasPublished`, open on Itens with the three steps as tabs.
- Each step shown fires `capture("builder_step", { step })` once per visit.
- A save indicator reads "salvo ✓", "salvando…" or "não salvo, tentando de novo".
- `draftWasInvalid` shows a dismissible notice that the saved draft couldn't be read and the builder starts empty.
- `beforeunload` warns while the status is `pending`, `saving` or `error`.
- A "← Painel" link goes to `/dashboard`.

**Step 1 (Visual):**
- A country `<select>` over `SUPPORTED_COUNTRIES`, using the names already in `dashboard.settings.countries`.
- The logo input (`accept="image/jpeg,image/png,image/webp"`): reject other types and files > 2 MB with an inline message. Then:
  - `readLogoPixels`, then `pickLogoColors`, shown as up to 3 swatches;
  - `upload("logos/<restaurantId>/<file.name>", file, { access: "public", handleUploadUrl: "/api/blob/upload", clientPayload: JSON.stringify({ restaurantId }) })`;
  - set `theme.logoUrl`, and fire `capture("logo_uploaded")`.
- A "remover logo" control.
- Swatches for the logo colors. "mais cores" reveals `MENU_PALETTES`, which are the only options when there is no logo. The color changes only on a tap.
- Two header thumbnails, Centralizado (default) and Faixa, then a live `BuiltMenuHeader`.
- "Continuar" calls `saveMenuVisual({ restaurantId, country, theme })`. It moves on only on success and shows `error` otherwise.

- [ ] **Step 1:** Write the page, shell, step 1, `logo-colors.ts` and dictionary keys. Temporary placeholders render where steps 2 and 3 go: a `<p>` with the step name, replaced in Tasks 8 and 9.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src && npm test`. Expected: clean, apart from the known `error.tsx` error.
- [ ] **Step 3:** Manual check on the dev DB with `npm run build && npm start` at a 390 px wide viewport:
  - log in, open `/dashboard/cardapio`, pick a country, upload a PNG logo; 3 or fewer swatches appear;
  - pick a swatch and a header style;
  - tap Continuar, then check that `menuTheme` and `country` are written in the DB;
  - upload a second logo and Continuar again: the first blob URL now returns 404;
  - a 3 MB file shows the inline error;
  - with no logo, the palettes show.
- [ ] **Step 4:** Commit with the message "Add the menu builder page with the visual step: country, logo, colors, header style".

### Task 8: Step 2 (Itens)

**Files:**
- Create: `src/app/(main)/dashboard/cardapio/step-items.tsx` (`"use client"`)
- Create: `src/app/(main)/dashboard/cardapio/item-editor.tsx` (`"use client"`: name, description, price, section, delete)
- Create: `src/app/(main)/dashboard/cardapio/paste-list.tsx` (`"use client"`)
- Modify: `menu-builder.tsx` (replace the step 2 placeholder), the three dictionaries

**Interfaces:**
- Consumes:
  - `parseItemLine` and `parsePastedList` (Task 2);
  - every operation in `menu-edit.ts` (Task 3);
  - `countItems`, `formatPrice`, `FREE_ITEM_LIMIT`;
  - `menu`, `setMenu`, `isPro`, `country` and `sectionSuggestions` from the shell.

**Behaviour (spec §3):**
- With no sections, show suggestion chips for the country's locale, plus "outra…". A chip calls `addSection(menu, title)`. The chips stay visible above "+ Nova seção" while there are fewer than 3 sections.
- With no sections, the add field still works: the item goes into an implicit untitled section.
- Each section has:
  - an editable title (`renameSection`) and ↑↓ buttons (`moveSection`);
  - its items as rows "name … price". An item with `priceCents === null` shows a "sem preço" mark.
  - one "adicionar item" input with `enterKeyHint="done"`. On Enter it runs `parseItemLine`, then `addItem`, clears the input and keeps focus. That keeps keyboard dictation flowing. It also fires `capture("item_added", { via: "typed" })`.
- Tapping an item opens `ItemEditor`, an inline panel rather than a modal, with:
  - name, description, and price in a text input parsed by `parseItemLine("x " + value)`;
  - a section `<select>` for `moveItemToSection`, ↑↓ for `moveItem`, and Excluir.
- "Colar lista" opens a textarea. Then:
  - a preview of `parsePastedList(text, newId)` as sections and items before confirming;
  - confirm runs `appendSections`; if `dropped > 0`, show how many didn't fit;
  - fire `capture("item_added", { via: "pasted", count })`.
- The counter reads `"{n} / 20 grátis"` (`FREE_ITEM_LIMIT`), and is hidden for Pro.
- Items past position 20 in menu order are greyed out with "não aparece no plano grátis". An inline notice links to `/pricing`. The free cut is decided by comparing ids against `visibleMenu(menu, isPro).menu`, so it is never recomputed separately.

- [ ] **Step 1:** Write the three components and the dictionary keys, and wire step 2 into the shell.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src && npm test`. Expected: clean.
- [ ] **Step 3:** Manual check on the dev DB with a production build at 390 px:
  - type `"X-Burguer 25,90"` then Enter: the row shows R$ 25,90 and focus stays in the field;
  - `"Água 500ml"` gets the "sem preço" mark;
  - paste the 25 lines from `scripts/fixtures/test-menu.json` (written as text): the preview shows 2 sections; confirm; items 21–25 are greyed out and the counter reads 25 / 20;
  - reorder and move an item between sections;
  - reload the page: everything is back, read from the draft;
  - the restaurant's `updatedAt` hasn't changed since before the session (check in the DB).
- [ ] **Step 4:** Commit with the message "Add the items step: typed and dictated lines, paste a list, edit, reorder, free-plan counter".

### Task 9: Step 3 (Prévia and Publicar)

**Files:**
- Create: `src/app/(main)/dashboard/cardapio/step-preview.tsx` (`"use client"`)
- Modify: `menu-builder.tsx` (replace the step 3 placeholder), the three dictionaries

**Interfaces:**
- Consumes: `BuiltMenu` (`preview`), `visibleMenu`, `publishMenu` (stage A), and `autosaver.settle()`.

**Behaviour:**
- Render `<BuiltMenu preview … menu={visibleMenu(menu, isPro).menu} theme={theme} actions={null} />` inside a bordered frame.
- If `hidden > 0`, show a line under the preview: "daqui para baixo, só no Pro ({hidden} itens)".
- **Publicar:**
  1. disable the button;
  2. `await autosaver.settle()`;
  3. `publishMenu({ restaurantId, menu })`;
  4. on error, show it and re-enable;
  5. on success, `router.push("/dashboard")`. There the `MenuLiveCallout` appears for a menu with zero views.
- Publicar is disabled while the menu has zero items.

- [ ] **Step 1:** Write the component and keys, and wire them in.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src && npm test`. Expected: clean.
- [ ] **Step 3:** Manual check on the dev DB with a production build:
  - Publicar lands on `/dashboard` with the "cardápio no ar" callout;
  - `/m/<slug>` shows the text menu with 20 items and the chosen header;
  - reopening `/dashboard/cardapio` opens on Itens with tabs;
  - edit one price, then publish quickly, under 2 s: the public page shows the new price, and the DB `menuDraft` equals `menuPublished`.
- [ ] **Step 4:** Commit with the message "Add the preview step and publish from the screen's menu".

### Task 10: Dashboard entry points and the mode on `menu_published`

**Files:**
- Create: `src/app/(main)/dashboard/menu-start-choice.tsx` (`"use client"`)
- Create: `src/app/(main)/dashboard/built-menu-card.tsx` (`"use client"`)
- Modify: `src/app/(main)/dashboard/page.tsx`, `image-manager.tsx`, `dashboard-telemetry.tsx`, the three dictionaries

**Interfaces:**
- Consumes: `effectiveMode`, `isPublished`, `publishedItemCount` (stage A), and `useMenuPhotos` and `recordMenuImages({ …, switchToPhotos })` (Task 5).
- Produces:
  - `ImageManager` gains `switchToPhotosOnUpload?: boolean`, passed through to `recordMenuImages`;
  - `DashboardTelemetry` gains `menuMode: "photos" | "built"`, sent as `capture("menu_published", { mode })`.

**The choice in `page.tsx` (spec §3 "Entrada"), with `mode = effectiveMode(...)`:**
- `!hasMenu` → `<MenuStartChoice>`:
  - "Montar meu cardápio" is the primary button, a link to `/dashboard/cardapio`;
  - "Tenho fotos do cardápio" is secondary, and reveals the `ImageManager` passed as `children`;
  - both fire `capture("menu_mode_chosen", { mode: "built" | "photos" })`.
- `hasMenu && mode === "photos"` → `ImageManager`, plus a link "Montar cardápio em vez disso" to `/dashboard/cardapio`, firing `menu_mode_chosen {mode: "built"}`. It does not change `menuMode`.
- `mode === "built"` → `<BuiltMenuCard>` with "Seu cardápio", the published item count, an "Editar" link to `/dashboard/cardapio`, and "Usar fotos em vez disso":
  - this calls `useMenuPhotos`;
  - on `needsUpload`, the card reveals `ImageManager` with `switchToPhotosOnUpload`;
  - it fires `menu_mode_chosen {mode: "photos"}`.

- [ ] **Step 1:** Write the two components, the page wiring, the `ImageManager` prop, the telemetry prop and the dictionary keys.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src && npm test`. Expected: clean.
- [ ] **Step 3:** Manual check on the dev DB with a production build, on three restaurants or by toggling one:
  - **nothing published:** the two choices show, and "Tenho fotos" reveals the uploader;
  - **photos:** the uploader and the "Montar…" link show;
  - **built:** the card shows. "Usar fotos" with no images reveals the uploader, and the first upload flips `/m/<slug>` to photos. "Usar fotos" with images flips it right away.
  - In none of these cases does the public page end up empty.
- [ ] **Step 4:** Commit with the message "Offer the builder from the dashboard and switch between photo and text menus".

### Task 11: Rollout (owner-run; no migration)

- [ ] **Step 1:** `npm test && npx tsc --noEmit && npm run build` on `main` after merge. Expected: all green.
- [ ] **Step 2:** The owner runs `vercel deploy --prod`.
- [ ] **Step 3:** Smoke checks:
  - `/api/health` returns 200;
  - Nil's and Cavalo Marinho photo menus are unchanged;
  - `/m/ads-test` still shows the text menu.
- [ ] **Step 4:** The owner, logged in as the `ads-test` account (`den…@gmail.com`) on a **real phone**, does the following:
  - opens `/dashboard/cardapio`;
  - sets the country to BR, so the page turns pt-BR and R$;
  - adds items **by keyboard dictation** on iOS and Android, if both are at hand ("Coca sete reais", "Coca 7 reais", "X-Burguer 25 e 90");
  - publishes, then checks `menulala.com/m/ads-test`.

  Any dictation form that comes out with a wrong price is a bug to fix before announcing. One that comes out with no price is expected.
- [ ] **Step 5:** Update the memory file `menu_builder_state.md`: stage B deployed, plus what the dictation test showed.
