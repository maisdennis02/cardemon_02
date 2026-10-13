# Entrada curta e painel enxuto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Depois do cadastro, o dono digita (ou fala) só o nome do negócio e cai no construtor; o painel vira um Início enxuto + páginas Ajustes e Fotos.

**Architecture:** A lógica nova vive em funções puras testadas em `src/lib/` (`pickSlug`, `nextStep`, `dropEmptySections`, exemplos fantasmas, `normalizeWhatsapp`); as páginas do painel só montam componentes existentes em outra ordem. Nada toca `/m/[slug]` nem o banco (sem migração).

**Tech Stack:** Next.js 16 App Router (leia `node_modules/next/dist/docs/` antes de usar APIs de rota/redirect), Auth.js v5, Prisma 7, zod, vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-13-entrada-curta-e-painel-design.md` — leia antes de cada tarefa; as seções citadas (§N) são de lá.

## Global Constraints

- Sem migração; nenhum campo novo no Prisma.
- Nada muda em `src/app/m/**` nem nos schemas que `readPublishedMenu` usa (`MenuSchema`, `ItemSchema`, `SectionSchema`).
- Todo texto novo entra nos **três** dicionários (`src/i18n/dictionaries/pt-BR.ts`, `es.ts`, `en.ts`) como **string**, nunca função; textos com variável usam `{nome}` + `format()`.
- Ações de servidor nunca exportam helpers de arquivos `"use server"` (helpers vão para `guards.ts` ou `src/lib/`).
- Campos de texto novos com voz usam `MicButton` (`src/components/voice/mic-button.tsx`) com `lang` do locale e `label` do dicionário.
- Lint só em `src` (`npx eslint src`); o lint da raiz é poluído por `.claude/worktrees`.
- Não vai ao ar antes de 15/10. Não rodar `vercel deploy`.

## Review Focus

1. **Dono antigo com rascunho ou cardápio já publicado** abre o construtor → os exemplos fantasmas **não** aparecem (só com zero itens). Teste em Task 4.
2. **Nome ditado** chega com espaço/ponto final ("Lanchonete do Zé.") → nome gravado com `trim`, slug `lanchonete-do-ze`. Teste em Task 1.
3. **WhatsApp ditado** chega como "11 91234-5678" ou "+55 11 9 1234 5678" → só dígitos são gravados; menos de 8 ou mais de 15 dígitos → erro de formato. Teste em Task 6.
4. **Pro com seções de exemplo esvaziadas** publica → nenhuma seção sem item no cardápio público. Teste em Task 3.
5. **Renomear em Ajustes** um restaurante com slug automático → o slug **não** muda. Verificação manual em Task 8 (o form é client-only; checar no navegador).

---

### Task 1: `pickSlug` — endereço automático

**Files:**
- Modify: `src/lib/slug.ts`
- Test: `src/lib/slug.test.ts` (novo)

**Interfaces:**
- Consumes: `slugify(input: string): string` (já existe), `isReservedSlug(slug: string): boolean` de `src/lib/example-menus.ts`.
- Produces: `export async function pickSlug(name: string, isTaken: (slug: string) => Promise<boolean>, randomSuffix: () => string = defaultSuffix): Promise<string>` e `export const SLUG_BASE_MAX = 52`.

- [ ] **Step 1: Write the failing tests** em `src/lib/slug.test.ts`:

```ts
const none = async () => false;
it("acentos e pontuação do ditado", async () => {
  expect(await pickSlug("  Lanchonete do Zé. ", none)).toBe("lanchonete-do-ze");
});
it("colisão vira -2, -3", async () => {
  const taken = new Set(["bar-do-ze", "bar-do-ze-2"]);
  expect(await pickSlug("Bar do Zé", async (s) => taken.has(s))).toBe("bar-do-ze-3");
});
it("slug reservado é pulado", async () => {
  expect(await pickSlug("Seu Restaurante", none)).toBe("seu-restaurante-2");
});
it.each(["🍔🍟", "", "A"])("nome sem slug útil (%j) vira cardapio", async (n) => {
  expect(await pickSlug(n, none)).toBe("cardapio");
});
it("nome longo cabe em 60 com sufixo", async () => {
  const s = await pickSlug("x".repeat(100), async (c) => c === "x".repeat(52));
  expect(s).toBe(`${"x".repeat(52)}-2`);
  expect(s.length).toBeLessThanOrEqual(60);
});
it("esgotou -50 → sufixo aleatório", async () => {
  expect(await pickSlug("Pizza", async (s) => s !== "pizza-abc123" , () => "abc123")).toBe("pizza-abc123");
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/slug.test.ts` — Expected: FAIL (`pickSlug` não existe).
- [ ] **Step 3: Implement** `pickSlug` conforme §1 da spec: `base = slugify(name).slice(0, SLUG_BASE_MAX)` sem hífen final; `base.length < 2` → `"cardapio"`; candidatos `base`, `base-2`…`base-50`, primeiro não reservado e não tomado; senão `${base}-${randomSuffix()}` (`defaultSuffix` = 6 chars `[a-z0-9]` via `crypto.getRandomValues`).
- [ ] **Step 4: Run** `npx vitest run src/lib/slug.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/slug.ts src/lib/slug.test.ts && git commit -m "pickSlug: a free, valid menu address from the business name"`

---

### Task 2: Entrada de um campo com voz

**Files:**
- Modify: `src/i18n/config.ts` (mover `COUNTRY_FOR_LOCALE` para cá, exportado)
- Modify: `src/app/(main)/dashboard/cardapio/page.tsx` (importar de `@/i18n/config`)
- Modify: `src/app/(main)/dashboard/actions.ts:135-169` (`createRestaurant`)
- Modify: `src/app/(main)/dashboard/onboarding-form.tsx`
- Modify: `src/i18n/dictionaries/{pt-BR,es,en}.ts` (`dashboard.onboarding`)
- Test: `src/i18n/config.test.ts`

**Interfaces:**
- Consumes: `pickSlug`, `SLUG_BASE_MAX` (Task 1).
- Produces: `export const COUNTRY_FOR_LOCALE: Record<Locale, string>` em `src/i18n/config.ts` (`{ "pt-BR": "BR", es: "MX", en: "US" }`). `createRestaurant(_p: ActionState, formData: FormData): Promise<ActionState>` lê só `name`.

- [ ] **Step 1: Failing test** em `src/i18n/config.test.ts`: `expect(COUNTRY_FOR_LOCALE).toEqual({ "pt-BR": "BR", es: "MX", en: "US" })` e, para cada locale, `localeForCountry(COUNTRY_FOR_LOCALE[l]) === l`.
- [ ] **Step 2: Run** `npx vitest run src/i18n/config.test.ts` — FAIL.
- [ ] **Step 3:** Mover a constante; atualizar o import em `cardapio/page.tsx`. Run de novo — PASS.
- [ ] **Step 4: `createRestaurant`** (§1): `CreateRestaurantSchema = z.object({ name: z.string().trim().min(1).max(120) })`; se `prisma.restaurant.findFirst({ where: { ownerId } })` existe → `redirect("/dashboard/cardapio")`; `country = COUNTRY_FOR_LOCALE[await getLocale()]`; `slug = await pickSlug(name, async (s) => !!(await prisma.restaurant.findUnique({ where: { slug: s }, select: { id: true } })))`; `create`; em `Prisma.PrismaClientKnownRequestError` com `code === "P2002"` → recalcula `pickSlug` e tenta **uma** vez; segunda falha → `{ error: t.errors.invalidInput }`. Manter `track("restaurant_created")`, os dois `revalidatePath` e trocar o `redirect` final para `"/dashboard/cardapio"`. `restaurantSchema` continua para `updateRestaurant`.
- [ ] **Step 5: `OnboardingForm`**: um `<input name="name" required maxLength={120}>` controlado + `MicButton` (`value`/`onChange` do estado, `lang={locale}`, `label={ob.micLabel}`), botão submit, erro. Remover os outros campos e o slug.
- [ ] **Step 6: Dicionários** — `dashboard.onboarding` passa a ter exatamente: `title`, `lead`, `nameLabel`, `namePlaceholder`, `micLabel`, `submit`, `submitting` (remover as chaves que deixaram de existir nos três). pt-BR: `title: "Qual o nome do seu negócio?"`, `lead: "É o nome que aparece no topo do cardápio. Dá para mudar depois."`, `namePlaceholder: "Ex.: Lanchonete do Zé"`, `micLabel: "Segure para falar o nome"`, `submit: "Começar meu cardápio"`, `submitting: "Criando…"`. es/en: tradução equivalente.
- [ ] **Step 7: Verify** `npx tsc --noEmit` e `npm test` — sem erros.
- [ ] **Step 8: Commit** `git commit -am "Onboarding asks only the business name (with voice) and opens the builder"`

---

### Task 3: Publicar descarta seções vazias

**Files:**
- Modify: `src/lib/menu.ts`, `src/app/(main)/dashboard/menu-actions.ts:107-132`
- Test: `src/lib/menu.test.ts`

**Interfaces:**
- Produces: `export function dropEmptySections(menu: Menu): Menu` (mesmo objeto se nada muda).

- [ ] **Step 1: Failing tests**: menu com seções `[A: 2 itens, B: 0 itens, C: 1 item]` → `dropEmptySections` devolve só A e C, na ordem; menu sem seção vazia → `toBe(menu)` (mesma referência).
- [ ] **Step 2: Run** `npx vitest run src/lib/menu.test.ts` — FAIL.
- [ ] **Step 3: Implement** e usar em `publishMenu`: `const menu = dropEmptySections(parsed.data)`; se `countItems(menu) === 0` → `{ error: t.errors.invalidMenu }`; gravar `menu` em `menuDraft` e `menuPublished`.
- [ ] **Step 4: Run** testes — PASS.
- [ ] **Step 5: Commit** `git commit -am "Publishing drops empty sections, so Pro menus never show bare titles"`

---

### Task 4: Exemplos fantasmas no passo Itens + saída para fotos

**Files:**
- Modify: `src/lib/menu-edit.ts`, `src/app/(main)/dashboard/cardapio/step-items.tsx`, `src/app/(main)/dashboard/cardapio/menu-builder.tsx` (passar `restaurantId`/`country` se o `StepItems` ainda não recebe)
- Modify: dicionários (`dashboard.builder` ou o namespace que `step-items.tsx` já usa)
- Test: `src/lib/menu-edit.test.ts`

**Interfaces:**
- Consumes: `LANDING_DEMO` (`src/lib/landing-demo.ts`), `localeForCountry`, `newId`.
- Produces:
  - `export function sampleMenu(locale: Locale): Menu` — `LANDING_DEMO[locale].menu`.
  - `export function adoptSample(menu: Menu, sample: Menu, itemId: string): { menu: Menu; newItemId: string | null }` — copia o item `itemId` de `sample` para `menu` com `newId()`; se a seção (comparada pelo **título**) não existe em `menu`, cria com `newId()`; item desconhecido → `{ menu, newItemId: null }` (mesma referência).
  - `export function showSamples(menu: Menu, dismissed: boolean): boolean` — `!dismissed && countItems(menu) === 0`.

- [ ] **Step 1: Failing tests** em `menu-edit.test.ts`:
  - `showSamples(EMPTY, false) === true`; `showSamples(menuOf(["Lanches", ["X"]]), false) === false`; `showSamples(EMPTY, true) === false`.
  - `adoptSample(EMPTY, sampleMenu("pt-BR"), primeiroItemId)` → 1 seção com o título do exemplo, 1 item com nome/preço do exemplo, id **diferente** do exemplo, e `MenuSchema.safeParse(result.menu).success === true`.
  - Adotar dois itens da mesma seção → uma seção só, dois itens.
  - Id desconhecido → `result.menu` `toBe` o menu de entrada, `newItemId === null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/menu-edit.test.ts` — FAIL.
- [ ] **Step 3: Implement** as três funções.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: UI em `StepItems`** (§2): quando `showSamples(menu, dismissed)`, renderizar `sampleMenu(localeForCountry(country))` esmaecido (`opacity-60`), selo `t.sampleBadge`, texto `t.samplesLead`; tocar num item → `setMenu(adoptSample(...).menu)` e abrir a edição de `newItemId` (o mesmo estado que o "adicionar item" já usa); botão `t.hideSamples` grava `localStorage["menulala:samples-hidden:<restaurantId>"] = "1"` em try/catch e esconde. Os exemplos não entram em `countItems`, no contador "N/20", na Prévia nem no autosave (eles nunca estão em `menu`).
- [ ] **Step 6: Link para fotos** no fim do `StepItems` (ou do construtor): `<Link href="/dashboard/fotos" onClick={() => capture("menu_mode_chosen", { mode: "photos" })}>{t.haveMenuPhotos} →</Link>`.
- [ ] **Step 7: Dicionários** — pt-BR: `sampleBadge: "exemplo"`, `samplesLead: "Toque num exemplo para usar e editar, ou comece digitando."`, `hideSamples: "Esconder exemplos"`, `haveMenuPhotos: "Já tenho fotos do cardápio"`; es/en equivalentes.
- [ ] **Step 8: Verify** `npx tsc --noEmit`, `npm test`.
- [ ] **Step 9: Commit** `git commit -am "Builder shows tap-to-use sample items on an empty menu, and a way out to photos"`

---

### Task 5: `nextStep` — o único próximo passo

**Files:**
- Create: `src/lib/next-step.ts`
- Test: `src/lib/next-step.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type NextStep = "finish_menu" | "share" | "whatsapp" | "delivery" | null;
  export type NextStepState = { hasMenu: boolean; mode: "photos" | "built"; totalViews: number; hasWhatsapp: boolean; hasDeliveryLink: boolean };
  export function nextStep(s: NextStepState): NextStep;
  ```

- [ ] **Step 1: Failing tests** (ordem do §3): `!hasMenu` → `finish_menu` (mesmo com tudo o resto vazio); `hasMenu, totalViews 0` → `share`; `built, views>0, !hasWhatsapp` → `whatsapp`; `photos, views>0, !hasWhatsapp, !hasDeliveryLink` → `delivery` (pula whatsapp); `built, views>0, whatsapp, !delivery` → `delivery`; tudo feito → `null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/next-step.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add src/lib/next-step* && git commit -m "nextStep: the one thing to do next on the dashboard"`

---

### Task 6: Pedidos em 7 dias e WhatsApp inline

**Files:**
- Modify: `src/app/(main)/dashboard/menu-stats-card.tsx:25-47` (`loadMenuStats`)
- Create: `src/lib/whatsapp.ts` (ou adicionar a um módulo existente de telefone, se houver — `grep -rn "\\\\d{8,15}" src/lib`)
- Modify: `src/app/(main)/dashboard/actions.ts` (nova action)
- Test: `src/lib/whatsapp.test.ts`

**Interfaces:**
- Produces:
  - `MenuStats` ganha `orders7Days: number` (contagem de `kind: "click_order"` com `viewedAt >= sevenDaysAgo`, na mesma `Promise.all`).
  - `export function normalizeWhatsapp(input: string): string | null` — remove tudo que não é dígito; `/^\d{8,15}$/` → dígitos, senão `null`.
  - `export async function saveWhatsappNumber(_p: ActionState, formData: FormData): Promise<ActionState>` — campos `restaurantId`, `whatsappNumber`; `requireUserId` + `requireOwnedRestaurant`; `normalizeWhatsapp` null → `{ error: t.errors.whatsappFormat }`; `update`; `revalidatePath("/dashboard")` e `revalidatePath(\`/m/${slug}\`)`; `{ ok: true }`.

- [ ] **Step 1: Failing tests** `normalizeWhatsapp`: `"11 91234-5678"` → `"11912345678"`; `"+55 11 9 1234 5678"` → `"5511912345678"`; `"1234"` → `null`; `"1".repeat(16)` → `null`; `""` → `null`.
- [ ] **Step 2: Run** `npx vitest run src/lib/whatsapp.test.ts` — FAIL.
- [ ] **Step 3: Implement** `normalizeWhatsapp`, `orders7Days`, `saveWhatsappNumber`.
- [ ] **Step 4: Run** testes + `npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit** `git commit -am "Seven-day order count, and saving the WhatsApp number on its own (dictation-friendly)"`

---

### Task 7: Início enxuto

**Files:**
- Modify: `src/app/(main)/dashboard/page.tsx` (corpo e `DashboardHeader`)
- Create: `src/app/(main)/dashboard/menu-home-card.tsx`, `src/app/(main)/dashboard/next-step-card.tsx`, `src/app/(main)/dashboard/whatsapp-step.tsx` (client, form de `saveWhatsappNumber` + `MicButton`)
- Modify: `src/app/(main)/dashboard/menu-stats-card.tsx` (linha-resumo + `<details>`)
- Modify: `src/app/(main)/dashboard/delivery-setup-callout.tsx` (href → `/dashboard/ajustes#country`)
- Modify: dicionários (`dashboard.home`)

**Interfaces:**
- Consumes: `nextStep`/`NextStepState` (Task 5), `orders7Days` + `saveWhatsappNumber` (Task 6), `MenuLiveCallout`, `DeliverySetupCallout`, `MenuQrCard`, `DashboardTelemetry` (sem mudança).
- Produces: `/dashboard` sem restaurante → `<OnboardingForm/>`; com restaurante → cartão do cardápio, próximo passo, QR (só publicado), números. `?edit=1` → `redirect("/dashboard/ajustes")`.

- [ ] **Step 1:** No topo do `DashboardPage`, `if (edit === "1") redirect("/dashboard/ajustes")` (antes de qualquer query).
- [ ] **Step 2: `MenuHomeCard`** (§3.1): props `{ name, slug, hasMenu, mode, itemCount, imageCount }`; situação "● No ar · {n} itens" / "● No ar · {n} fotos" / "Rascunho — ainda não publicado"; publicado → **Abrir cardápio ↗** (`/m/slug`, nova aba) + **Editar** (built → `/dashboard/cardapio`, photos → `/dashboard/fotos`); não publicado → **Continuar meu cardápio** (`/dashboard/cardapio`) + link "Tenho fotos do cardápio" (`/dashboard/fotos`, `capture("menu_mode_chosen", { mode: "photos" })`).
- [ ] **Step 3: `NextStepCard`**: `switch (nextStep(state))` → `finish_menu`: card com botão para o construtor; `share`: `<MenuLiveCallout/>`; `whatsapp`: `<WhatsappStep restaurantId/>`; `delivery`: `<DeliverySetupCallout/>`; `null`: nada.
- [ ] **Step 4: Números**: `MenuStatsCard` mostra no topo "7 dias: {views} visitas · {orders} pedidos" e o conteúdo atual dentro de `<details>` fechado.
- [ ] **Step 5: Montar a página** na ordem do §3; remover `RestaurantSettingsForm`, `ImageManager`, `MenuStartChoice`, `BuiltMenuCard`, `ChangePasswordCard`, `DeleteAccountCard` e o botão "Abrir cardápio" solto. `user` passa a selecionar também `billingCancelAtPeriodEnd` só se o cabeçalho precisar (não precisa: o selo é só Pro/upgrade).
- [ ] **Step 6: Cabeçalho**: logo, link **⚙ Ajustes** (`/dashboard/ajustes`), selo "Pro" (→ Ajustes) ou "Fazer upgrade" (→ `/pricing`). Remover "Ver cardápio" e o Sair.
- [ ] **Step 7: Dicionários** `dashboard.home` (pt-BR): `live: "No ar"`, `itemsCount: "{n} itens"`, `photosCount: "{n} fotos"`, `draft: "Rascunho — ainda não publicado"`, `edit: "Editar"`, `continueMenu: "Continuar meu cardápio"`, `havePhotos: "Tenho fotos do cardápio"`, `finishTitle: "Termine seu cardápio"`, `finishLead: "Falta pouco: confira os itens e publique."`, `whatsappTitle: "Receba pedidos no WhatsApp"`, `whatsappLead: "Informe o número com DDD. Os pedidos do cardápio chegam nele."`, `whatsappMic: "Segure para falar o número"`, `save: "Salvar"`, `saved: "Salvo ✓"`, `settings: "Ajustes"`, `statsLine: "7 dias: {views} visitas · {orders} pedidos"`; es/en equivalentes.
- [ ] **Step 8: Verify** `npx tsc --noEmit`, `npm test`, `npx eslint src`.
- [ ] **Step 9: Commit** `git commit -am "Dashboard home: the menu card, one next step, QR and a one-line stats summary"`

---

### Task 8: Ajustes

**Files:**
- Create: `src/app/(main)/dashboard/ajustes/page.tsx`
- Modify: `src/app/(main)/dashboard/restaurant-settings-form.tsx`, `src/app/(main)/dashboard/actions.ts` (`updateRestaurant` devolve `{ ok: true }`), `src/app/(main)/dashboard/built-menu-card.tsx:53` (se o componente sobreviver em Fotos; senão nada)
- Modify: dicionários (`dashboard.settings`, `dashboard.plan`)

**Interfaces:**
- Consumes: `RestaurantSettingsForm`, `ChangePasswordCard`, `DeleteAccountCard`, `SignOutButton`, `signOut`.
- Produces: rota `/dashboard/ajustes`; sem sessão → `/login`; sem restaurante → `redirect("/dashboard")`.

- [ ] **Step 1: Form sempre aberto** (§4): remover o estado `open`, o modo de visualização e o Cancelar; `slugTouched` inicia **`true`**; aviso `s.slugWarning` sob o campo de endereço; `MicButton` em **nome, WhatsApp e descrição** (Instagram é URL, sem microfone); WhatsApp submetido passa por `normalizeWhatsapp` em `updateRestaurant` antes do schema. Mostrar `s.saved` ("Salvo ✓") quando `state.ok`.
- [ ] **Step 2: Reordenar o form** em dois blocos com título: "Dados do negócio" (nome, endereço, WhatsApp, Instagram, descrição) e "Apps de entrega" (select de país com `id="country"` + fieldset `id="delivery"`).
- [ ] **Step 3: `updateRestaurant`** devolve `{ ok: true }` no sucesso (hoje `{}`).
- [ ] **Step 4: Página** `ajustes/page.tsx`: "← Início"; form; bloco **Plano** — `isPro(user)`: `billingCancelAtPeriodEnd ? "Pro até {date}" : "Pro · renova em {date}"` + form POST `/api/stripe/portal` "Gerenciar"; grátis: link `/pricing` "Fazer upgrade"; bloco **Conta**: `ChangePasswordCard` (só com `passwordHash`), Sair (o mesmo `<form action>` com `signOut` que hoje está no cabeçalho), `DeleteAccountCard` por último. Data com `toLocaleDateString(locale)`.
- [ ] **Step 5: Dicionários** pt-BR: `settings.businessTitle: "Dados do negócio"`, `settings.deliveryTitle: "Apps de entrega"`, `settings.slugWarning: "Mudar o endereço faz o QR code já impresso parar de funcionar."`, `settings.saved: "Salvo ✓"`, `plan.title: "Plano"`, `plan.proUntil: "Pro até {date}"`, `plan.proRenews: "Pro · renova em {date}"`, `plan.manage: "Gerenciar"`, `account.title: "Conta"`, `back: "← Início"`; es/en equivalentes.
- [ ] **Step 6: Verify** `npx tsc --noEmit`, `npm test`, `npx eslint src`; no navegador (build local, Task 10): renomear sem trocar o endereço; "Salvo ✓" aparece.
- [ ] **Step 7: Commit** `git commit -am "Settings page: business data, delivery apps, plan and account, out of the home screen"`

---

### Task 9: Fotos

**Files:**
- Create: `src/app/(main)/dashboard/fotos/page.tsx`
- Modify: `src/app/(main)/dashboard/built-menu-card.tsx` (extrair o botão "Usar as fotos" para um componente reaproveitável `UsePhotosButton`), ou mover a lógica para `fotos/use-photos-button.tsx`

**Interfaces:**
- Consumes: `ImageManager` (props atuais), `chooseMenuPhotos({ restaurantId })`, `imageLimitFor`, `isPro`, `effectiveMode`.
- Produces: rota `/dashboard/fotos`; sem restaurante → `redirect("/dashboard")`.

- [ ] **Step 1: Página**: "← Início"; `ImageManager` com `switchToPhotosOnUpload` quando `mode === "built"`; quando `mode === "built" && images.length > 0`, o botão **Usar as fotos em vez do texto** (`chooseMenuPhotos`, depois `router.push("/dashboard")`).
- [ ] **Step 2:** Se `BuiltMenuCard` deixar de ter uso em qualquer página, apagá-lo (e suas chaves de dicionário sem uso).
- [ ] **Step 3: Verify** `npx tsc --noEmit`, `npm test`, `npx eslint src`.
- [ ] **Step 4: Commit** `git commit -am "Photos page: the uploader and the switch back to photos, off the home screen"`

---

### Task 10: Verificação ponta a ponta

**Files:** nenhum (só correções que aparecerem).

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npx eslint src && npx next build` — tudo limpo.
- [ ] **Step 2:** `next start` local com `AUTH_TRUST_HOST=true AUTH_URL=http://localhost:<porta>` contra o **banco de dev** (`.env` local, nunca prod). Conta nova de teste (credenciais registradas no seed/exemplo do projeto, não no chat) → nome → construtor (Visual) → Itens com exemplos → tocar num exemplo → editar preço → publicar → Início → WhatsApp inline "11 91234-5678" → Ajustes (renomear; endereço igual; "Salvo ✓") → Fotos.
- [ ] **Step 3:** Prints em 375 px (`google-chrome --headless=new --window-size=375,1400 --screenshot`) do Início em `finish_menu`, `whatsapp` e `null`; anexar ao relatório final.
- [ ] **Step 4:** `grep -rn "posthog\|gtag" .next/server/app/m` — nenhuma ocorrência (invariante do `/m`).
- [ ] **Step 5:** Não fazer deploy. Relatar ao dono: commits, prints, e que o deploy é dele, depois de 15/10.
