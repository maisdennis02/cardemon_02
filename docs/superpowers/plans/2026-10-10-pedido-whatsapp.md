# Pedido pelo WhatsApp (com voz) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** diners build an order on a text menu and send it to the restaurant's WhatsApp as a ready-made message, with a hold-to-talk microphone on every text field.

**Architecture:** the rules are pure and tested in `src/lib/`:
- `cart.ts`: the cart, its totals and its persistence;
- `order.ts`: form validation, the message and the `wa.me` URL;
- `speech.ts`: the language tag and how dictated text is appended.

The UI is client-only, under `src/app/m/[slug]/order/`. `BuiltMenu` stays a server component and hands its already-cut menu to a client `OrderableMenu` only when the restaurant has a WhatsApp number. The voice hook and button live in `src/components/voice/` so the builder can reuse them.

**Tech Stack:** Next.js 16.2.6, React 19, the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), `localStorage`, and vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-10-pedido-whatsapp-design.md`

## Global Constraints

- **`/m/[slug]`:**
  - no `cookies()` or `headers()`;
  - corrupt data still throws;
  - no DB write per order;
  - without a WhatsApp number, the HTML is unchanged.
- **Orderable items:** only the items `visibleMenu` returns (the free-plan cut stands).
- **Browser storage:** every `localStorage` read and write is wrapped in `try/catch`. The cart key is `cart:<slug>`, and a cart expires after 6 h.
- **Public strings:** they come from the page's dictionary (`menu.order.*`) in the restaurant's locale. Strings only, with `{placeholders}` filled by `format()`.
- **Voice:** append, never replace. The button is hidden when the browser has no support. An error never blocks the form.
- **Lint:** `npx eslint src`. The only accepted error is the pre-existing one in `src/app/m/[slug]/error.tsx`.

## Review Focus

1. **A dictated field that already has text:** the transcript is appended with a single space, never replacing the text, and never doubling the interim text. Tests are in Task 3.
2. **A cart restored after the owner edited the menu:** lines for items that are gone, or now hidden by the free cut, are dropped silently. Tests are in Task 1.
3. **Order text with WhatsApp-hostile characters** (`&`, `#`, newlines, emoji): the `wa.me` text is fully URI-encoded. Tests are in Task 2.
4. **Pickup without a table, delivery without an address:** pickup is valid; delivery needs an address. Tests are in Task 2.
5. **A cart with only unpriced items:** the total reads "a combinar" with no "R$ 0,00". Tests are in Tasks 1 and 2.

---

### Task 1: Cart rules — `src/lib/cart.ts`

**Interfaces (produces):**
- `type Cart = { lines: { id: string; qty: number }[]; savedAt: number }`
- `emptyCart(now: number): Cart`
- `addToCart(cart: Cart, id: string, now: number): Cart` adds 1.
- `setQty(cart: Cart, id: string, qty: number, now: number): Cart`: qty ≤ 0 removes the line; qty is capped at 99.
- `resolveCart(cart: Cart, menu: Menu): { item: MenuItem; qty: number }[]`, in cart order, dropping ids that are not in `menu`.
- `cartTotals(lines): { count: number; cents: number; hasUnpriced: boolean }`
- `readCart(raw: string | null, now: number): Cart`: parses JSON; anything invalid or older than 6 h returns `emptyCart(now)`.
- `CART_TTL_MS = 6 * 60 * 60 * 1000`

- [ ] **Step 1:** Write the tests `src/lib/cart.test.ts`:
  - adding twice gives qty 2;
  - `setQty` to 0 removes the line;
  - `setQty` to 150 stores 99;
  - `resolveCart` drops an id that is missing from the menu;
  - totals: 2 × 2590 plus 1 unpriced → `{count: 3, cents: 5180, hasUnpriced: true}`;
  - only unpriced → `{cents: 0, hasUnpriced: true}`;
  - `readCart` returns empty for `null`, for `"{"`, for `{"lines":"x"}` and for a cart saved 7 h ago, and returns a 1 h old cart intact.
- [ ] **Step 2:** Run `npx vitest run src/lib/cart.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 2: Order rules — `src/lib/order.ts`

**Interfaces (produces):**
- `type OrderDetails = { name: string; mode: "delivery" | "pickup" | null; address: string; table: string; notes: string }`
- `orderErrors(d: OrderDetails): { name?: true; mode?: true; address?: true }`. The rules:
  - `name` is required after trimming;
  - `mode` is required;
  - `address` is required only for delivery.
- `type OrderLabels`: the dictionary strings the message needs, namely `title`, `total`, `toArrange`, `plusToArrange`, `name`, `delivery`, `pickup`, `pickupTable`, `notes`, `footer`.
- `buildOrderMessage(args: { restaurantName: string; slug: string; country: string | null; lines: { item: MenuItem; qty: number }[]; details: OrderDetails; labels: OrderLabels }): string`
- `whatsappOrderUrl(number: string, text: string): string` builds `https://wa.me/<digits>?text=<encodeURIComponent(text)>`.

**The message shape (spec §3):**
- `*{title}*` (the title has `{name}`);
- a blank line, then the item lines `{qty}x {name} — {price}`, or `{toArrange}` when the item has no price;
- a blank line, then `*{total}*`, where the total is either the formatted cents, the cents plus `{plusToArrange}`, or `{toArrange}` alone when nothing has a price;
- a blank line, then `{name}: …`;
- either `{delivery}: {address}`, or pickup: `{pickupTable}` with `{table}` when a table is given, else `{pickup}`;
- `{notes}: …` only when there are notes;
- a blank line, then the footer with `menulala.com/m/{slug}`.

Prices use `formatPrice(cents × qty, country)`.

- [ ] **Step 1:** Write the tests `src/lib/order.test.ts`:
  - **validation:** delivery with no address is an error; pickup with no table is valid; a blank name is an error;
  - **message:** delivery, and pickup with and without a table, each against the exact expected multi-line string (pt-BR labels, country BR);
  - **unpriced items:** a line reads "a combinar", and the total reads "R$ 51,80 + itens a combinar"; with only unpriced items, the total is the "a combinar" text alone;
  - **no notes:** the notes line is absent;
  - **URL:** `whatsappOrderUrl("5511999999999", "a & b\n#1 🍔")` equals `"https://wa.me/5511999999999?text=" + encodeURIComponent("a & b\n#1 🍔")`.
- [ ] **Step 2:** Run `npx vitest run src/lib/order.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3: Voice — `src/lib/speech.ts` + `src/components/voice/`

**Interfaces (produces):**
- `speechLang(locale: Locale): string`: `pt-BR` → `"pt-BR"`, `es` → `"es-ES"`, `en` → `"en-US"`.
- `appendTranscript(base: string, transcript: string): string`: trims the transcript and joins with one space; an empty transcript returns `base`.
- `useSpeechInput({ lang, onText }: { lang: string; onText: (text: string) => void })` returns `{ supported: boolean; listening: boolean; failed: boolean; start(): void; stop(): void }`.
- `MicButton({ value, onChange, lang, label }: { value: string; onChange: (v: string) => void; lang: string; label: string })`. It returns `null` when unsupported.

**Behaviour:**
- The base value is captured on `start`.
- Each result event calls `onChange(appendTranscript(base, allResultsSoFar))`, so interim text never doubles.
- `pointerdown` starts, and `pointerup`, `pointerleave` and `pointercancel` stop.
- The button has `touch-action: none` and its context menu is prevented, so a long press doesn't select text on iOS.
- An `error` event sets `failed`, and the button then shows a muted state.

- [ ] **Step 1:** Write the tests `src/lib/speech.test.ts`:
  - the three `speechLang` mappings;
  - `appendTranscript("Rua A", " 123 ")` gives `"Rua A 123"`;
  - `appendTranscript("", "Ana")` gives `"Ana"`;
  - `appendTranscript("Ana", "  ")` gives `"Ana"`.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3:** Implement `speech.ts`, then the hook and the button. The hook reads `window.SpeechRecognition ?? window.webkitSpeechRecognition` inside an effect, so the server render never touches `window`.
- [ ] **Step 4:** Run `npm test && npx tsc --noEmit`. Expected: green.
- [ ] **Step 5:** Commit.

### Task 4: Order UI on the public text menu

**Files:**
- Create `src/app/m/[slug]/order/orderable-menu.tsx` (client). It does all of the following:
  - renders the sections and rows like `BuiltMenu`;
  - each row is a button that adds the item;
  - a row in the cart shows `− qty +`;
  - shows the bottom bar and the order sheet;
  - keeps the cart in `localStorage`.
- Create `src/app/m/[slug]/order/order-sheet.tsx` (client): the lines with ±, the form with a `MicButton` on name, address, table and notes, validation, send, and the "sent" state with "Fazer outro pedido".
- Modify `src/app/m/[slug]/built-menu.tsx`: a new optional `ordering?: { whatsappNumber: string }` prop. When set, render `<OrderableMenu>` in place of the static `<Main>` list; when unset, the output is unchanged.
- Modify `src/app/m/[slug]/page.tsx`: pass `ordering` when `restaurant.whatsappNumber` is set.
- Modify `src/app/api/menu-views/route.ts`: allow the kind `click_order`.
- Modify `src/app/(main)/dashboard/menu-stats-card.tsx`: a row "Pedidos enviados", shown when there is WhatsApp.
- Add `menu.order.*` and `dashboard.stats.clickOrder` to the three dictionaries.

- [ ] **Step 1:** Write the components and the wiring. On send:
  - `pingMenuEvent(slug, "click_order")`;
  - `window.location.href = whatsappOrderUrl(...)`;
  - show the sent state.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src && npm test`. Expected: clean.
- [ ] **Step 3:** Manual check on a prod build on the dev DB, 375 px wide, `lanchonete-teste` given a WhatsApp number:
  - tap items, use ±, then reload: the cart is still there;
  - the bar shows the totals;
  - the sheet: validation errors show;
  - delivery and pickup: the wa.me URL opens with the expected text (check it without leaving the page by reading the computed URL);
  - a restaurant without WhatsApp shows the menu exactly as before.
- [ ] **Step 4:** Commit.

### Task 5: Dashboard hint for where orders arrive

- [ ] **Step 1:** In `BuiltMenuCard`, show the line "Pedidos feitos pelo cardápio chegam no WhatsApp +{number}" when there is a number, or "Cadastre um WhatsApp para receber pedidos pelo cardápio" with a link to `/dashboard?edit=1`. This needs a new `whatsappNumber` prop, passed from the page, and keys in the three dictionaries.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src`. Commit.

### Task 6: Rollout (owner)

- [ ] Push, then `vercel deploy --prod`.
- [ ] On an iPhone (Safari) and an Android (Chrome):
  - set a WhatsApp number on ads-test;
  - order two items;
  - hold to talk in each field;
  - send; the message arrives formatted.
