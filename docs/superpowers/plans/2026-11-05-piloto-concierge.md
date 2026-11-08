# Piloto concierge — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o produto pronto para o piloto concierge: estado "Pro de cortesia" coerente no painel, no `/pricing` e nos e-mails; um script que grava um cardápio transcrito na conta do restaurante e concede 60 dias de cortesia; e um script local que gera as imagens para a DM.

**Architecture:** A cortesia é derivada, sem migração: `planState(user)` em `src/lib/pricing.ts` devolve `"courtesy"` quando há Pro sem `billingSubscriptionId`. Ajustes, `/pricing` e os e-mails leem esse estado. A lógica do concierge (formato do arquivo transcrito, plano do preenchimento) fica em `src/lib/concierge.ts`, como funções puras. Os scripts em `scripts/` só fazem a entrada e a saída, no padrão de `scripts/publish-test-menu.ts`.

**Tech Stack:** Next.js 16 (leia `node_modules/next/dist/docs/` antes de mexer em rotas, conforme `AGENTS.md`), Prisma 7 + `@prisma/adapter-pg`, zod, vitest + `react-dom/server` (`renderToStaticMarkup`; o repo não tem Testing Library), `tsx` para scripts, `playwright-core` com o Chrome do sistema (`/usr/bin/google-chrome`).

**Spec:** `docs/superpowers/specs/2026-11-05-piloto-concierge-design.md`

## Global Constraints

- Sem migração de Prisma neste PR.
- Cortesia = `isPro(user) && user.billingSubscriptionId == null`.
- Duração da cortesia: **60 dias**; `proExpiresAt = max(atual, agora + 60 dias)`; `proEndingReminderSentAt = null` ao conceder.
- Uma conta com `billingSubscriptionId` não nulo nunca tem o plano alterado pelo script.
- O script de preenchimento nunca sobrescreve um `menuDraft` com itens e nunca toca em `menuPublished`.
- Todo texto novo existe em `pt-BR.ts`, `en.1.ts` e `es.ts`. Os dicionários são tipados, então faltar uma chave quebra o `tsc`.
- Textos exatos em pt-BR (os de en/es são traduções fiéis):
  - Ajustes: `"Pro de cortesia até {date}"`; botão `"Assinar o Pro"` → `/pricing`.
  - `/pricing`, cartão Pro em cortesia: `"Cortesia até {date}"`.
  - Lembrete da cortesia (7 dias): assunto `"Sua cortesia do Pro no menulala acaba em {date}"`; corpo `"Sua cortesia do Pro no menulala acaba em {date}. Depois disso, seu cardápio continua no ar, mas mostra só os {freeLimit} primeiros itens. Para manter todos, assine o Pro."`; CTA `"Assinar o Pro"` → `${siteUrl()}/pricing`.
  - Lembrete da cortesia (1 dia): assunto `"Sua cortesia do Pro no menulala acaba amanhã"`; corpo igual ao de 7 dias, com `"acaba amanhã, {date}"`.
  - Fim da cortesia: assunto `"Sua cortesia do Pro no menulala terminou"`; corpo `"Sua cortesia do Pro terminou. Seu cardápio continua no ar e agora mostra os {freeLimit} primeiros itens. Todos os outros ficam guardados e voltam no momento em que você assinar o Pro."`; CTA `"Assinar o Pro"` → `/pricing`.
  - `{freeLimit}` nos textos da cortesia = `FREE_ITEM_LIMIT` (20).
- Push para `main` = deploy de produção. Só o dono faz o merge.

## Review Focus

1. **Conta que já foi assinante** (assinatura cancelada e vencida, com `billingSubscriptionId` sobrando) → o script de preenchimento recusa a cortesia e explica que é para resolver à mão, em vez de gerar um estado misto. Teste na Task 5.
2. **Rodar o preenchimento duas vezes** → a segunda execução para em "rascunho já tem itens" e não estende a cortesia. Teste na Task 5.
3. **Arquivo transcrito com item sem preço** (`priceCents: null`) → é aceito. Ilegível nunca vira 0. Teste na Task 5.
4. **Cortesia vencida** (`proExpiresAt` no passado, sem assinatura) → `planState` = `"free"`, e Ajustes e `/pricing` mostram o plano grátis normal. Teste na Task 1.
5. **Script de imagens apontado para produção por engano** → ele lê `DATABASE_URL` só do `.env` (override do ambiente) e nunca do shell. Teste na Task 6.

---

### Task 1: `planState` em `src/lib/pricing.ts`

**Files:**
- Modify: `src/lib/pricing.ts` (perto de `isPro`, linha ~43)
- Test: `src/lib/pricing.test.ts` (criar)

**Interfaces:**
- Produces: `export type PlanState = "free" | "courtesy" | "renewing" | "ending";` e
  `export function planState(user: { proExpiresAt: Date | null; billingSubscriptionId: string | null; billingCancelAtPeriodEnd: boolean } | null | undefined, now?: Date): PlanState`

- [ ] **Step 1: Escrever os testes que falham**

```ts
const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);
const u = (o: Partial<{ proExpiresAt: Date | null; billingSubscriptionId: string | null; billingCancelAtPeriodEnd: boolean }>) =>
  ({ proExpiresAt: null, billingSubscriptionId: null, billingCancelAtPeriodEnd: false, ...o });

it("free without proExpiresAt", () => expect(planState(u({}))).toBe("free"));
it("free when null user", () => expect(planState(null)).toBe("free"));
it("courtesy = Pro without subscription", () => expect(planState(u({ proExpiresAt: future }))).toBe("courtesy"));
it("expired courtesy is free", () => expect(planState(u({ proExpiresAt: past }))).toBe("free"));
it("renewing subscription", () => expect(planState(u({ proExpiresAt: future, billingSubscriptionId: "sub_1" }))).toBe("renewing"));
it("canceled subscription still in period", () =>
  expect(planState(u({ proExpiresAt: future, billingSubscriptionId: "sub_1", billingCancelAtPeriodEnd: true }))).toBe("ending"));
```

- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/lib/pricing.test.ts`. Esperado: FAIL, `planState` não existe.
- [ ] **Step 3: Implementar `planState`** usando `isPro` para o teste de vigência; `now` padrão = `new Date()`.
- [ ] **Step 4: Rodar e ver passar:** `npx vitest run src/lib/pricing.test.ts`. Esperado: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Pricing: planState tells courtesy Pro from a subscription"`

### Task 2: Ajustes mostra a cortesia

**Files:**
- Create: `src/app/(main)/dashboard/ajustes/plan-summary.tsx`
- Modify: `src/app/(main)/dashboard/ajustes/page.tsx:20-60` (o `select` ganha `billingSubscriptionId`; a `<section>` do plano passa a renderizar `<PlanSummary>`)
- Modify: `src/i18n/dictionaries/pt-BR.ts` (`dashboard.plan.proCourtesy`, `dashboard.subscribePro`), `en.1.ts`, `es.ts`
- Test: `src/app/(main)/dashboard/ajustes/plan-summary.test.tsx`

**Interfaces:**
- Consumes: `planState`, `PlanState` (Task 1)
- Produces: `export function PlanSummary({ state, date }: { state: PlanState; date: string | null }): JSX.Element`. Cliente ou servidor, ele lê o dicionário via `useT()` dentro de `DictionaryProvider`, como em `built-menu.test.tsx`.

- [ ] **Step 1: Escrever os testes que falham** (renderizar com `DictionaryProvider` + `ptBR`):
  - `courtesy` + `"04/01/2027"` → o HTML contém `"Pro de cortesia até 04/01/2027"`, um link com `href="/pricing"` e o texto `"Assinar o Pro"`, e **não** contém `/api/stripe/portal`.
  - `renewing` → contém `"Pro · renova em 04/01/2027"` e `action="/api/stripe/portal"`.
  - `ending` → contém `"Pro até 04/01/2027"` e `action="/api/stripe/portal"`.
  - `free` → contém o texto atual de `t.dashboard.upgrade` com `href="/pricing"` e nenhuma linha de data.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run "src/app/(main)/dashboard/ajustes"`. Esperado: FAIL.
- [ ] **Step 3: Implementar `PlanSummary`, adicionar as chaves nos 3 dicionários e trocar o bloco do plano em `page.tsx`** por `<PlanSummary state={planState(user)} date={proDate ?? null} />`. O título "Plano" e o layout do card ficam como estão.
- [ ] **Step 4: Rodar e ver passar:** `npx vitest run "src/app/(main)/dashboard/ajustes" && npx tsc --noEmit`. Esperado: PASS, sem erros de tipo.
- [ ] **Step 5: Commit:** `git commit -m "Settings: courtesy Pro shows its end date and a subscribe button"`

### Task 3: `/pricing` deixa quem está em cortesia assinar

**Files:**
- Modify: `src/app/(main)/pricing/page.tsx:22-35` (seleciona `billingSubscriptionId`, `billingCancelAtPeriodEnd`; calcula `currentPlan` e `courtesyUntil`)
- Modify: `src/app/(main)/pricing/pricing-content.tsx:42-88` (repassa as props)
- Modify: `src/app/(main)/pricing/plans.tsx` (tipo local `Plan` ganha `"COURTESY"`)
- Modify: dicionários (`pricing.pro.courtesyUntil`)
- Test: `src/app/(main)/pricing/plans.test.tsx`

**Interfaces:**
- Consumes: `planState` (Task 1)
- Produces: `PricingPlans({ currentPlan: "FREE" | "PRO" | "COURTESY" | null; currency; courtesyUntil?: string })`. `PricingContent` aceita os mesmos dois campos novos. A página localizada `(localized)/[locale]/pricing` continua passando `null`.

- [ ] **Step 1: Escrever os testes que falham:**
  - `COURTESY` + `courtesyUntil="04/01/2027"` → o cartão Pro tem `action="/api/stripe/checkout"` e o texto `"Cortesia até 04/01/2027"`; nenhum `"/api/stripe/portal"`; o cartão grátis não mostra o botão desabilitado `"Plano atual"`.
  - `PRO` → continua com `action="/api/stripe/portal"` (regressão).
  - `FREE` → continua com `action="/api/stripe/checkout"` e `"Plano atual"` desabilitado no grátis (regressão).
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run "src/app/(main)/pricing"`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Em `page.tsx`, `courtesy` → `"COURTESY"`; `renewing`/`ending` → `"PRO"`; `free` → `"FREE"`. `courtesyUntil` = `proExpiresAt.toLocaleDateString(locale)`.
- [ ] **Step 4: Rodar e ver passar:** `npx vitest run "src/app/(main)/pricing" && npx tsc --noEmit`. Esperado: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Pricing: courtesy Pro can subscribe instead of hitting the portal"`

### Task 4: e-mails de fim da cortesia

**Files:**
- Modify: `src/lib/email.ts:181-240`
- Modify: `src/app/api/cron/pro-ending-reminders/route.ts` (o `select` ganha `billingSubscriptionId`; repassa `courtesy: u.billingSubscriptionId == null`)
- Modify: dicionários (`emails.proEndingCourtesy`, `emails.proEndedCourtesy`, com as mesmas chaves de `proEnding`/`proEnded`, menos `renewNote`)
- Test: `src/lib/email.test.ts` (criar)

**Interfaces:**
- Produces (exportadas para teste):
  `export function buildProEndingEmail(a: { dict: Dictionary; locale: Locale; stage: 7 | 1; expiresAt: Date; courtesy: boolean }): { subject: string; html: string }`
  `export function buildProEndedEmail(a: { dict: Dictionary; courtesy: boolean }): { subject: string; html: string }`
  `sendProEndingEmail` e `sendProEndedEmail` ganham `courtesy: boolean` e passam a chamar os builders.

- [ ] **Step 1: Escrever os testes que falham** (com `ptBR`, `expiresAt = new Date("2027-01-04T15:00:00Z")`):
  - `buildProEndingEmail({stage: 7, courtesy: true})`: `subject` = `"Sua cortesia do Pro no menulala acaba em 4 de janeiro de 2027"`; o `html` contém `"mostra só os 20 primeiros itens"` e `/pricing`, e não contém `"Gerenciar assinatura"`.
  - `stage: 1, courtesy: true`: `subject` = `"Sua cortesia do Pro no menulala acaba amanhã"`.
  - `courtesy: false`: `subject` = `"Seu plano Pro do menulala termina em 4 de janeiro de 2027"` (regressão).
  - `buildProEndedEmail({courtesy: true})`: `subject` = `"Sua cortesia do Pro no menulala terminou"`; o `html` contém `/pricing`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/lib/email.test.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar os builders**, mover a montagem de `sendPro*` para eles e atualizar o cron. `freeLimit` = `FREE_ITEM_LIMIT` na cortesia e `FREE_IMAGE_LIMIT` no texto antigo (sem mudança).
- [ ] **Step 4: Rodar e ver passar:** `npx vitest run src/lib/email.test.ts && npx tsc --noEmit`. Esperado: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Emails: courtesy Pro gets its own ending and ended reminders"`

### Task 5: `src/lib/concierge.ts` (formato do arquivo + plano do preenchimento)

**Files:**
- Create: `src/lib/concierge.ts`
- Test: `src/lib/concierge.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const COURTESY_DAYS = 60;
  // Arquivo que sai da transcrição e serve aos dois scripts.
  export const ConciergeFileSchema: z.ZodType<{ name: string; instagram: string; menu: Menu; theme?: MenuTheme }>;
  export type FillTarget = {
    restaurants: { id: string; slug: string; menuDraft: unknown }[];
    proExpiresAt: Date | null;
    billingSubscriptionId: string | null;
  };
  export type FillPlan =
    | { ok: true; restaurantId: string; slug: string; items: number; sections: number;
        proExpiresAtBefore: Date | null; proExpiresAtAfter: Date }
    | { ok: false; reason: "no-restaurant" | "many-restaurants" | "draft-not-empty" | "has-subscription" };
  export function planConciergeFill(target: FillTarget, menu: Menu, now: Date): FillPlan;
  ```
  `ConciergeFileSchema` usa `MenuSchema` e `MenuThemeSchema` de `src/lib/menu.ts`; `instagram` = @ sem URL.

- [ ] **Step 1: Escrever os testes que falham** (`now = new Date("2026-11-06T12:00:00Z")`; menu com 2 seções e 3 itens, um deles com `priceCents: null`):
  - Conta com 1 restaurante, rascunho `null`, sem assinatura, `proExpiresAt: null` → `ok: true`, `items: 3`, `sections: 2`, `proExpiresAtAfter` = `2027-01-05T12:00:00Z`.
  - O mesmo com `proExpiresAt` = `2027-03-01` → `proExpiresAtAfter` = `2027-03-01` (o max preserva o mais longo).
  - Rascunho `{ v: 1, sections: [] }` → conta como vazio → `ok: true`.
  - Rascunho com 1 item → `{ ok: false, reason: "draft-not-empty" }`.
  - `billingSubscriptionId: "sub_1"` → `{ ok: false, reason: "has-subscription" }`, inclusive com `proExpiresAt` no passado (Review Focus 1).
  - 0 restaurantes → `"no-restaurant"`; 2 restaurantes → `"many-restaurants"`.
  - `ConciergeFileSchema` aceita item com `priceCents: null` (Review Focus 3) e recusa um arquivo sem `menu.v`.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/lib/concierge.test.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar.** O rascunho vazio usa `readPublishedMenu`/`countItems` de `menu.ts` (um JSON nulo ou ilegível conta como vazio só se for `null`; ilegível não nulo → `draft-not-empty`, para nunca sobrescrever algo que não entendemos). A ordem das checagens é a da union.
- [ ] **Step 4: Rodar e ver passar:** `npx vitest run src/lib/concierge.test.ts`. Esperado: PASS.
- [ ] **Step 5: Commit:** `git commit -m "Concierge: transcribed-menu file format and fill plan"`

### Task 6: scripts `concierge-fill.ts` e `concierge-preview.ts`

**Files:**
- Create: `scripts/concierge-fill.ts`, `scripts/concierge-preview.ts`, `scripts/fixtures/concierge-example.json` (arquivo de exemplo válido para `ConciergeFileSchema`)
- Create: `src/lib/concierge-env.ts` + `src/lib/concierge-env.test.ts`
- Modify: `package.json` (devDependency `playwright-core`)
- Create: `docs/concierge-runbook.md`

**Interfaces:**
- Consumes: `ConciergeFileSchema`, `planConciergeFill`, `COURTESY_DAYS` (Task 5)
- Produces: `export function previewDatabaseUrl(dotenvParsed: Record<string, string>): string`, que devolve o `DATABASE_URL` do `.env` e lança um erro se ele faltar. **Nunca lê `process.env`.**

- [ ] **Step 1: Escrever o teste que falha** de `previewDatabaseUrl`: com `process.env.DATABASE_URL = "postgres://prod"` e `{ DATABASE_URL: "postgres://local" }`, devolve `"postgres://local"` (Review Focus 5); com `{}`, lança.
- [ ] **Step 2: Rodar e ver falhar:** `npx vitest run src/lib/concierge-env.test.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar `previewDatabaseUrl`** e ver passar com o mesmo comando.
- [ ] **Step 4: Implementar `scripts/concierge-fill.ts`.**
  - Uso: `DATABASE_URL='<url>' npx tsx scripts/concierge-fill.ts <email> <arquivo.json> [--apply]`.
  - Imprime o host do banco (nunca a senha), como em `publish-test-menu.ts`.
  - Lê o usuário por e-mail com os restaurantes e chama `planConciergeFill`.
  - Sem `--apply`, imprime o plano e sai com código 0. Com `--apply` e `ok: true`, faz numa `prisma.$transaction`:
    - restaurante: `menuDraft = menu`, `menuMode = "built"`;
    - usuário: `proExpiresAt = proExpiresAtAfter`, `proEndingReminderSentAt = null`.
  - `ok: false` → mensagem em pt-BR por motivo e código 1.
- [ ] **Step 5: Implementar `scripts/concierge-preview.ts`.**
  - Uso: `npx tsx scripts/concierge-preview.ts <arquivo.json> --owner <email-de-teste> --base http://localhost:3100`.
  - Conecta com `previewDatabaseUrl(dotenv.parse(readFileSync(".env")))`.
  - Garante o restaurante de slug `concierge-previa` do dono de teste: cria se faltar e, se existir com outro dono, para. Grava `name`, `menuMode = "built"`, `menuDraft = menuPublished = menu` e `menuTheme = theme ?? DEFAULT_MENU_THEME`.
  - Com `playwright-core` (`executablePath: "/usr/bin/google-chrome"`, viewport 390×844, `deviceScaleFactor: 2`), abre `${base}/m/concierge-previa` e salva `branding/concierge/<instagram>/cardapio.png` (página inteira).
  - Adiciona ao carrinho o primeiro item com preço e sem grupo obrigatório, abre o carrinho e salva `carrinho.png`. Os seletores saem dos componentes em `src/app/m/[slug]/order/`; prefira `aria-label`/role a classes.
- [ ] **Step 6: Escrever `docs/concierge-runbook.md`:** os 8 passos da operação da spec, com os comandos reais destes scripts, a ordem `ensaio → --apply`, e o lembrete de que o `!` do dono é o caminho quando a sessão bloqueia o acesso ao banco de produção.
- [ ] **Step 7: Verificação local.**
  - `npx tsx scripts/concierge-fill.ts <conta-de-teste-local> scripts/fixtures/concierge-example.json` com o `DATABASE_URL` do `.env` mostra o plano sem gravar.
  - `next dev -p 3100` + `concierge-preview.ts` com a fixture gera as 2 imagens, e elas abrem.
  - Lembretes:
    - a primeira compilação no HDD leva 2–5 min;
    - derrube a porta com `fuser -k 3100/tcp`, nunca `pkill -f`;
    - scripts com `@/` ficam em `scripts/` e usam `main()`.
- [ ] **Step 8: Rodar tudo:** `npm test && npx tsc --noEmit && npx eslint scripts src/lib/concierge*.ts`. Esperado: tudo verde.
- [ ] **Step 9: Commit:** `git commit -m "Concierge: fill and preview scripts plus runbook"`

### Task 7: verificação de ponta a ponta no preview

**Files:** nenhum (só verificação).

- [ ] **Step 1:** Push do branch `piloto-concierge` (o preview da Vercel usa o banco de preview, não o de produção) e esperar o build ficar READY.
- [ ] **Step 2:** Criar a conta de teste no preview por `/signup?utm_source=concierge&utm_content=teste`.
- [ ] **Step 3:** Rodar `concierge-fill.ts` contra o banco de preview, primeiro o ensaio e depois `--apply`.
- [ ] **Step 4:** No painel do preview:
  - os itens aparecem no construtor;
  - Ajustes mostra "Pro de cortesia até <hoje+60>" e "Assinar o Pro";
  - `/pricing` mostra "Cortesia até …" com o botão de checkout;
  - publicar funciona e `/m/<slug>` mostra todos os itens, mesmo acima de 20.
- [ ] **Step 5:** Rodar `concierge-fill.ts --apply` de novo e confirmar que ele para com "rascunho já tem itens" (Review Focus 2).
- [ ] **Step 6:** Relatar ao dono com prints. Abrir o PR com o resumo e **não** fazer merge (o merge é do dono).
