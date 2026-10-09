# Construtor de cardápio — Etapa A (Base) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurants can have a text menu (sections, items, prices) stored as JSON and shown on `/m/[slug]`, with the free 20-item cut, while every existing photo menu stays exactly as it is.

**Architecture:** Four nullable/defaulted columns on `Restaurant` hold the mode, theme, draft and published menu. A pure module `src/lib/menu.ts` owns the schema, the effective-mode rule, the free-plan cut, currency formatting, header contrast and the JSON-LD; the public page, the dashboard and a publish action all go through it. No owner-facing UI ships in this stage: a test menu is published by script and checked on the live page.

**Tech Stack:** Next.js 16.2.6 App Router (ISR), Prisma 7 + Neon Postgres, zod 4, Tailwind 4, vitest (new).

**Spec:** `docs/superpowers/specs/2026-10-09-construtor-de-cardapio-design.md` — this plan covers the rows of "Etapa A" in the spec's *Etapas de entrega* table. Read the spec's §1, §2 and §4 before starting.

## Global Constraints

- `AGENTS.md`: this Next.js has breaking changes vs. training data — read the relevant guide in `node_modules/next/dist/docs/` before writing route, ISR or Server Action code.
- Migration SQL uses `ADD COLUMN IF NOT EXISTS` and is applied **by hand** by the owner (Neon SQL Editor). Never run DDL against production from the agent.
- `src/app/m/[slug]/layout.tsx` and `page.tsx` must never call `cookies()` / `headers()` (keeps the route ISR).
- The public page must **throw** on DB or data failure — never render an empty/soft-error page with 200 (spec §1, memory `outage resilience`).
- Prices are integer cents (`priceCents`), formatted only at display time.
- Limits (spec §1): 30 sections, 300 items total, item `name` 1–80 chars, `description` ≤ 200, section `title` ≤ 60, ids match `/^[a-z0-9_-]{1,32}$/` and are unique across the whole menu; all strings `trim()`ed.
- `FREE_ITEM_LIMIT = 20`.
- i18n dictionaries hold plain strings only — no functions (memory `i18n architecture`). English strings live in `src/i18n/dictionaries/en.1.ts`.
- A `"use server"` file must export only async actions: every export becomes a callable endpoint. Helpers go in non-action modules.
- Keep comment density and idiom of the surrounding code; comments explain *why*.

## Review Focus

1. A restaurant with `menuMode = 'built'` but no published items (or published empty) and no images must render today's "preparing" slideshow, not a blank text menu → `effectiveMode` tests in Task 2.
2. Corrupt `menuPublished` JSON: the public page throws (ISR keeps the stale copy) but the dashboard still loads (counts it as 0 items) → Task 2 (`readPublishedMenu` vs `publishedItemCount`) and Task 4 manual check.
3. Free account with 25 items: 20 visible, a section emptied by the cut disappears, JSON-LD lists only the 20 → Task 2 tests.
4. `country = null` (every self-serve signup today): page in English, prices in USD; `'BR'` → `R$ 25,90` → Task 2 tests.
5. An item named `</script><script>alert(1)</script>` must not break out of the JSON-LD tag → Task 2 test through `jsonLdScript`.

---

### Task 1: Migration, schema and production check script

**Files:**
- Create: `prisma/migrations/20261009120000_add_menu_builder/migration.sql`
- Modify: `prisma/schema.prisma` (model `Restaurant`)
- Create: `scripts/verify-menu-builder.ts`

**Interfaces:**
- Produces: Prisma `Restaurant` fields `menuMode: string` (default `"photos"`), `menuTheme: Json?`, `menuDraft: Json?`, `menuPublished: Json?`.

- [ ] **Step 1: Write the migration**

```sql
-- Self-serve menu builder (docs/superpowers/specs/2026-10-09-construtor-de-cardapio-design.md).
-- IF NOT EXISTS so this stays safe to apply by hand, more than once.
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuMode" TEXT NOT NULL DEFAULT 'photos';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuTheme" JSONB;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuDraft" JSONB;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuPublished" JSONB;
```

- [ ] **Step 2: Add the four fields to `Restaurant` in `prisma/schema.prisma`**, after `didifoodUrl`, with a one-line comment pointing at the spec. `menuMode String @default("photos")`, the other three `Json?`.

- [ ] **Step 3: Regenerate and type-check**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Write `scripts/verify-menu-builder.ts`**, modelled line-for-line on `scripts/verify-acquisition.ts` (read-only, prints host without password, exits non-zero when anything is missing). Checks: the four columns exist in `information_schema.columns` for table `Restaurant` with types `text`/`jsonb`; `column_default` of `menuMode` contains `'photos'`; prints `count(*)` of `Restaurant` and how many have `menuMode <> 'photos'` (expected 0 right after migrating).

- [ ] **Step 5: Run it against the local dev database**

Run: `npx prisma db execute --file prisma/migrations/20261009120000_add_menu_builder/migration.sql && npx tsx scripts/verify-menu-builder.ts`
Expected: four `OK` lines and exit code 0. (Local `.env` points at the dev branch — see memory `outage resilience`; this is not production.)

- [ ] **Step 6: Commit**

```bash
git add prisma/ scripts/verify-menu-builder.ts
git commit -m "Add menu builder columns to Restaurant, with a read-only prod check"
```

---

### Task 2: `src/lib/menu.ts` — schema and rules, with vitest

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Create: `vitest.config.mts` (node environment; alias `@` → `./src`)
- Modify: `src/lib/pricing.ts` (add `FREE_ITEM_LIMIT`)
- Create: `src/lib/menu.ts`
- Test: `src/lib/menu.test.ts`

**Interfaces:**
- Consumes: `isPro` and `FREE_ITEM_LIMIT` from `src/lib/pricing.ts`; `localeForCountry` from `src/i18n/config.ts`.
- Produces (all exported from `src/lib/menu.ts`, which must stay free of `server-only`, Prisma and React so it runs in tests and in client components later):

```ts
export type MenuItem = { id: string; name: string; description?: string; priceCents: number | null };
export type MenuSection = { id: string; title: string | null; items: MenuItem[] };
export type Menu = { v: 1; sections: MenuSection[] };
export type MenuTheme = { logoUrl?: string; color: string; headerStyle: "centered" | "band" };
export type MenuMode = "photos" | "built";

export const MENU_MAX_SECTIONS = 30;
export const MENU_MAX_ITEMS = 300;
export const MenuSchema: z.ZodType<Menu>;
export const MenuThemeSchema: z.ZodType<MenuTheme>;
export const DEFAULT_MENU_THEME: MenuTheme; // { color: "#1f2937", headerStyle: "centered" }

export class MenuDataError extends Error {}
export function readPublishedMenu(raw: unknown): Menu | null; // null/undefined → null; invalid → throws MenuDataError
export function publishedItemCount(raw: unknown): number;     // never throws; invalid → 0
export function readMenuTheme(raw: unknown): MenuTheme;        // invalid or null → DEFAULT_MENU_THEME
export function countItems(menu: Menu | null): number;

export function visibleMenu(menu: Menu, pro: boolean): { menu: Menu; hidden: number };

export type MenuContent = { menuMode: string; imageCount: number; publishedItemCount: number };
export function effectiveMode(r: MenuContent): MenuMode;
export function isPublished(r: MenuContent): boolean;

export const COUNTRY_CURRENCY: Record<string, string>;
export function currencyForCountry(country: string | null | undefined): string;
export function formatPrice(cents: number, country: string | null | undefined): string;

export function headerColors(color: string): { accent: string; title: string };

export function menuJsonLd(menu: Menu, country: string | null | undefined): Record<string, unknown>;
```

- [ ] **Step 1: Add vitest**

Run: `npm install -D vitest` then add `"test": "vitest run"` to `scripts` and create `vitest.config.mts` with `test.environment = "node"` and `resolve.alias` `{ "@": path.resolve(__dirname, "src") }` (use `fileURLToPath(new URL("./src", import.meta.url))` — `.mts` is ESM, no `__dirname`).

- [ ] **Step 2: Write the failing tests in `src/lib/menu.test.ts`**

Use a helper `menuWith(counts: number[])` that builds a valid `Menu` with one section per entry, titles `"S1"`, `"S2"`…, items named `"Item N"` priced `1000`, ids `s1`, `i1`… unique. Tests, each its own `it`:

```ts
// schema
expect(MenuSchema.safeParse(menuWith([2])).success).toBe(true);
expect(MenuSchema.safeParse(menuWith(Array(31).fill(1))).success).toBe(false);   // > 30 sections
expect(MenuSchema.safeParse(menuWith([150, 151])).success).toBe(false);           // > 300 items
// duplicate item id across sections → false; id "Has Space" → false; name "" → false;
// name of 81 chars → false; description of 201 chars → false; title of 61 chars → false;
// priceCents -1 → false; priceCents 1.5 → false;
// "  X-Burguer  " parses to "X-Burguer" (trim)

// reading
expect(readPublishedMenu(null)).toBeNull();
expect(() => readPublishedMenu({ v: 1, sections: "nope" })).toThrow(MenuDataError);
expect(publishedItemCount({ v: 1, sections: "nope" })).toBe(0);
expect(publishedItemCount(menuWith([3, 2]))).toBe(5);
expect(readMenuTheme({ color: 42 })).toEqual(DEFAULT_MENU_THEME);

// free-plan cut
const cut = visibleMenu(menuWith([15, 10]), false);
expect(countItems(cut.menu)).toBe(20); expect(cut.hidden).toBe(5);
expect(visibleMenu(menuWith([20, 5]), false).menu.sections).toHaveLength(1); // emptied section disappears
expect(visibleMenu(menuWith([15, 10]), true).hidden).toBe(0);

// effective mode — one `it` per row
// {menuMode,imageCount,publishedItemCount} → effectiveMode / isPublished
// built,0,3 → built/true    built,2,0 → photos/true    built,0,0 → photos/false
// photos,2,3 → photos/true  photos,0,3 → built/true    photos,0,0 → photos/false
// "garbage",0,3 → built/true (unknown mode treated as photos, then falls back)

// currency
expect(currencyForCountry("BR")).toBe("BRL");
expect(currencyForCountry(null)).toBe("USD");
expect(currencyForCountry("ZZ")).toBe("USD");
const nb = (s: string) => s.replace(/ /g, " ");
expect(nb(formatPrice(2590, "BR"))).toBe("R$ 25,90");
expect(nb(formatPrice(2590, null))).toBe("$25.90");

// contrast (WCAG AA large text = 3:1 against #ffffff)
expect(headerColors("#1f2937")).toEqual({ accent: "#1f2937", title: "#1f2937" });
expect(headerColors("#f9e79f")).toEqual({ accent: "#f9e79f", title: "#1f2937" }); // too light for text

// JSON-LD
const ld = menuJsonLd(menuWith([1]), "BR");
expect(ld).toMatchObject({ "@type": "Menu", hasMenuSection: [{ "@type": "MenuSection", name: "S1",
  hasMenuItem: [{ "@type": "MenuItem", name: "Item 1", offers: { "@type": "Offer", price: "10.00", priceCurrency: "BRL" } }] }] });
// item with priceCents null → MenuItem without `offers`
// section with title null → MenuSection without `name`
// jsonLdScript(menuJsonLd(<menu with item name "</script><script>alert(1)</script>">, "BR")) does not contain "</script"
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — `src/lib/menu.ts` does not exist.

- [ ] **Step 4: Add `export const FREE_ITEM_LIMIT = 20;` to `src/lib/pricing.ts`** next to `FREE_IMAGE_LIMIT`, then **implement `src/lib/menu.ts`** to the interfaces above. Decisions the tests don't force:
  - `effectiveMode`: chosen mode = `"built"` only if `menuMode === "built"`, else `"photos"`; return it if it has content (`imageCount > 0` for photos, `publishedItemCount > 0` for built), else the other mode if *it* has content, else `"photos"`.
  - `visibleMenu`: walk sections then items in order, keep the first `FREE_ITEM_LIMIT` when `!pro`, drop sections left with zero items; never mutate the input.
  - `COUNTRY_CURRENCY`: `BR:BRL, PT:EUR, ES:EUR, US:USD, MX:MXN, AR:ARS, UY:UYU, CO:COP, CL:CLP, PE:PEN` plus every other country in `COUNTRY_LOCALE` (`src/i18n/config.ts`); unknown → `USD`.
  - `formatPrice`: `new Intl.NumberFormat(localeForCountry(country), { style: "currency", currency }).format(cents / 100)`.
  - `headerColors`: relative-luminance contrast ratio vs `#ffffff`; `title = color` if ≥ 3, else `"#1f2937"`. Accept `#rgb` and `#rrggbb`; anything else is treated as `DEFAULT_MENU_THEME.color`.
  - `menuJsonLd`: `price` as a decimal string with two places (`(cents / 100).toFixed(2)`).

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors (the pre-existing `react-hooks/set-state-in-effect` in `src/app/m/[slug]/error.tsx` is known and out of scope).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.mts src/lib/pricing.ts src/lib/menu.ts src/lib/menu.test.ts
git commit -m "Add the menu module: schema, effective mode, free cut, currency, JSON-LD"
```

---

### Task 3: Test-menu script

**Files:**
- Create: `scripts/fixtures/test-menu.json` (25 items: section "Lanches" with 15, "Bebidas" with 10, one item with `description`, one with `priceCents: null`, one named `Água 500ml` priced `400`)
- Create: `scripts/publish-test-menu.ts`

**Interfaces:**
- Consumes: `MenuSchema`, `countItems` from Task 2.

- [ ] **Step 1: Write `scripts/publish-test-menu.ts`**, same shape as `scripts/verify-acquisition.ts` (dotenv, `PrismaPg`, prints host without password). Usage:

```
DATABASE_URL='<url>' npx tsx scripts/publish-test-menu.ts <slug> scripts/fixtures/test-menu.json
DATABASE_URL='<url>' npx tsx scripts/publish-test-menu.ts <slug> --revert
```

Publish: read the file, `MenuSchema.parse` (exit 1 with the zod error on failure), update the restaurant by slug with draft = published = menu and `menuMode = "built"` (the same write Task 5's `publishMenu` makes), print slug, item count and "visible in ≤ 60 s". `--revert`: set `menuMode = "photos"` and `menuDraft`/`menuPublished` to `Prisma.DbNull`. Refuse (exit 1) if the slug doesn't exist.

- [ ] **Step 2: Run it on the dev DB** against a restaurant without images, then `--revert`.
Expected: publish prints 25 items and exits 0; `--revert` exits 0; a bad file (e.g. `{"v":1,"sections":"x"}`) exits 1 with the zod error. (The page itself is checked in Task 4.)

- [ ] **Step 3: Commit**

```bash
git add scripts/publish-test-menu.ts scripts/fixtures/test-menu.json
git commit -m "Add a script to publish and revert a test text menu"
```

---

### Task 4: Public page renders text menus

**Files:**
- Create: `src/app/m/[slug]/menu-actions.tsx` (`"use client"`)
- Create: `src/app/m/[slug]/menu-actions.css` (the `.social-*` rules moved out of `slideshow.css`)
- Modify: `src/app/m/[slug]/slideshow.tsx` (use `MenuActions`; keep its own view ping)
- Modify: `src/app/m/[slug]/slideshow.css` (remove the moved rules)
- Create: `src/app/m/[slug]/built-menu.tsx` (server component)
- Modify: `src/app/m/[slug]/data.ts`
- Modify: `src/app/m/[slug]/page.tsx`

**Interfaces:**
- Consumes: everything from Task 2; `scripts/publish-test-menu.ts` from Task 3 for verification.
- Produces:

```ts
// menu-actions.tsx
export function pingMenuEvent(slug: string, kind: string): void;
export function MenuViewPing({ slug }: { slug: string }): null; // once per session, same sessionStorage key `mv:${slug}` as today
export function MenuActions(props: {
  slug: string; whatsappNumber: string | null; instagramUrl: string | null;
  country: string | null; deliveryUrls: DeliveryUrls;
}): React.ReactNode; // today's floating WhatsApp/Instagram/delivery buttons, unchanged markup and classes

// built-menu.tsx
export function BuiltMenu(props: {
  slug: string; name: string; country: string | null;
  theme: MenuTheme; menu: Menu;               // already cut by visibleMenu
  labels: { cardapioDigital: string; madeBy: string };
  actions: React.ReactNode;                   // <MenuActions …/> rendered by the page
}): React.ReactNode;
```

- [ ] **Step 1: Extract `MenuActions`, `pingMenuEvent`, `MenuViewPing` and `DeliveryButton` from `slideshow.tsx` into `menu-actions.tsx`.** Pure move: same markup, same class names, same ping kinds (`view`, `click_whatsapp`, `click_instagram`, `click_<appId>`). `MenuSlideshow` renders `<MenuActions …/>` and `<MenuViewPing slug={slug} />` in place of the inlined code.

- [ ] **Step 2: Verify the photo menu did not change**

Run: `npm run build && npm start`, open a local photo menu `http://localhost:3000/m/<an existing slug in the dev DB>`.
Expected: identical to `main` — buttons in the same place, swipe works, one `POST /api/menu-views` with `kind: "view"` per session in the network tab.

- [ ] **Step 3: Extend `getRestaurant` in `data.ts`** to also include `owner: { select: { proExpiresAt: true } }`. Still a single `cache()`-wrapped call; update the comment to say "one call", not "one query".

- [ ] **Step 4: Write `BuiltMenu`** per spec §2: header `centered` (round logo if `theme.logoUrl`, name in a title font, thin rule in `headerColors(theme.color).accent`) or `band` (full-width accent band flush with the top, logo overlapping its lower edge, name below; no logo → band and name only); sections with titles (`title: null` → no heading); rows `name … formatPrice(priceCents, country)` with `description` below in smaller type; `priceCents: null` → no price; footer with `labels.cardapioDigital`, `name`, `labels.madeBy` and the menulala.com link like the slideshow's last slide. Render `actions` above the content and `<MenuViewPing slug={slug} />`. Logo is a plain `<img>` with `alt={name}` (same as the slideshow images). Mobile-first, max width ~ 32rem centered.

- [ ] **Step 5: Branch in `page.tsx`**

```ts
const published = readPublishedMenu(restaurant.menuPublished); // throws MenuDataError on bad data — let it propagate
const mode = effectiveMode({
  menuMode: restaurant.menuMode,
  imageCount: restaurant.images.length,
  publishedItemCount: countItems(published),
});
```

`mode === "photos"` → today's `<MenuSlideshow …/>` unchanged. `mode === "built"` → `visibleMenu(published!, isPro(restaurant.owner))`, then `<BuiltMenu … actions={<MenuActions …/>} />`, labels from `getDictionary(localeForCountry(restaurant.country))`. In built mode the JSON-LD `restaurantLd` gains `hasMenu: menuJsonLd(visible.menu, restaurant.country)` instead of the bare URL. `generateMetadata` is unchanged (it uses `images[0]` for the cover, which is simply absent for text menus).

- [ ] **Step 6: Verify both modes locally** (dev DB only) on a restaurant **with images**: `npx tsx scripts/publish-test-menu.ts <slug> scripts/fixtures/test-menu.json` (Task 3), then `npm run build && npm start` → `/m/<slug>`:
- text menu shows 20 items if the owner is free; the band/centered header follows `menuTheme` (null theme → centered, dark);
- page source has a JSON-LD `Menu` with 20 `MenuItem`s;
- in `npx prisma studio` set `menuPublished` to `{"v":1,"sections":"x"}` and wait > 60 s: the stale menu keeps being served (the regeneration throws), and the server log shows `MenuDataError`;
- set `menuMode = built` with `menuPublished` null: the photo slideshow is back.
Finish with `publish-test-menu.ts <slug> --revert`.

- [ ] **Step 7: Type-check, lint, test, commit**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: clean.

```bash
git add src/app/m/
git commit -m "Render text menus on the public page, sharing the action buttons with the slideshow"
```

---

### Task 5: Dashboard and telemetry recognise text menus; publish action

**Files:**
- Create: `src/app/(main)/dashboard/guards.ts` (`import "server-only"`; moved `dashT`, `requireUserId`, `requireOwnedRestaurant` out of `actions.ts`)
- Modify: `src/app/(main)/dashboard/actions.ts` (import the guards instead of defining them)
- Create: `src/app/(main)/dashboard/menu-actions.ts` (`"use server"`)
- Modify: `src/app/(main)/dashboard/page.tsx`
- Modify: `src/i18n/dictionaries/pt-BR.ts`, `es.ts`, `en.1.ts` (`dashboard.errors.invalidMenu`)

**Interfaces:**
- Consumes: `MenuSchema`, `publishedItemCount`, `isPublished` from Task 2.
- Produces:

```ts
// menu-actions.ts
export async function publishMenu(input: { restaurantId: string; menu: unknown }): Promise<{ error?: string }>;
```

- [ ] **Step 1: Move the three guards to `guards.ts`** unchanged and import them in `actions.ts`. They must not live in a `"use server"` file once shared — an exported helper there becomes a public endpoint.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Add `invalidMenu` to `dashboard.errors`** in the three dictionaries: pt-BR `"Não foi possível salvar o cardápio. Confira os itens e tente de novo."`, es `"No fue posible guardar el menú. Revisa los ítems e inténtalo de nuevo."`, en `"Couldn't save the menu. Check the items and try again."`.

- [ ] **Step 3: Implement `publishMenu`**: `requireUserId` → `requireOwnedRestaurant` → `MenuSchema.safeParse(input.menu)`; on failure return `{ error: t.errors.invalidMenu }`. On success, one `prisma.restaurant.update` setting `menuDraft` and `menuPublished` to the parsed menu and `menuMode: "built"` (`updatedAt` moves on its own — intended, the public page changed). Then `revalidatePath(\`/m/${restaurant.slug}\`)` and `revalidatePath("/dashboard")`, return `{}`. No caller in this stage; stage B's builder calls it.

- [ ] **Step 4: Use the shared rule in `dashboard/page.tsx`**: compute once

```ts
const content = restaurant && {
  menuMode: restaurant.menuMode,
  imageCount: restaurant.images.length,
  publishedItemCount: publishedItemCount(restaurant.menuPublished),
};
const hasMenu = !!content && isPublished(content);
```

and use `hasMenu` for both the `DashboardTelemetry hasMenu` prop and the `MenuLiveCallout` condition (replacing `restaurant.images.length > 0`). `publishedItemCount` never throws, so a corrupt menu cannot take the dashboard down.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: clean. Then with the dev restaurant from Task 4 (built mode, 0 views): `/dashboard` shows the "seu cardápio está no ar" callout; with `menuPublished` set to garbage the dashboard still loads.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(main\)/dashboard/ src/i18n/dictionaries/
git commit -m "Count text menus as published in the dashboard and telemetry; add publishMenu"
```

---

### Task 6: Production rollout

No code. The owner runs the 🔴 steps; the agent stops and asks before each.

- [ ] **Step 1: Roll out in this order**
  1. 🔴 Owner pastes `prisma/migrations/20261009120000_add_menu_builder/migration.sql` into the Neon SQL Editor (`menulala-prod`, branch `production`).
  2. Owner runs `DATABASE_URL='<prod>' npx tsx scripts/verify-menu-builder.ts`. Expected: four `OK`, restaurant count ≈ production's (not the dev branch's), `menuMode <> 'photos'` = 0.
  3. 🔴 Owner runs `vercel deploy --prod`.
  4. Checks: log in; `/dashboard` loads; `menulala.com/m/nils-bar-restaurante` unchanged (photo menu).
  5. Owner runs `publish-test-menu.ts ads-test scripts/fixtures/test-menu.json` against prod; after ~60 s and a second load, `menulala.com/m/ads-test` shows the text menu with 20 items; Google's Rich Results Test on that URL parses the `Menu`.
  6. Owner decides whether to leave `ads-test` on the text menu or `--revert` it.
