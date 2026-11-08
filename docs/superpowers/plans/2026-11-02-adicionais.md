# Adicionais e opções por item — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** itens do cardápio montado ganham grupos de opções (mínimo/máximo, preço que soma), escolhidos pelo cliente na ficha do item, levados no carrinho, na mensagem do WhatsApp e no PDF, e editados pelo dono no painel.

**Architecture:** os grupos vivem dentro do item no JSON do cardápio (`MenuItem.groups?`), validados pelo `MenuSchema` de sempre. Regras puras (preço, validação de escolha, resumo) ficam em `src/lib/menu-options.ts`; operações do editor em `src/lib/option-groups-edit.ts`. O carrinho continua no navegador; cada linha ganha `opts?: string[]`, e a chave de linha sem opções é o próprio id do item, o que mantém os chamadores e carrinhos salvos de hoje.

**Tech Stack:** Next 16 App Router, React client components, zod, vitest + Testing Library, Tailwind v4. Ler `AGENTS.md` (Next diferente do conhecido).

**Spec:** `docs/superpowers/specs/2026-11-02-adicionais-design.md`

## Global Constraints

- Limites: `MAX_GROUPS_PER_ITEM = 5`, `MAX_OPTIONS_PER_GROUP = 15`; título do grupo e nome da opção: trim, 1–60.
- Regras do grupo: `0 ≤ min ≤ max`, `max ≥ 1`, `min ≤ options.length`. `priceCents` da opção: inteiro ≥ 0, nunca `null`.
- Preço da opção sempre soma ao do item; item "a combinar" continua "a combinar".
- Cardápio sem `groups` continua válido; `Menu.v` continua `1`; grupos não contam no `FREE_ITEM_LIMIT`.
- Grátis para todos (nenhum corte por plano).
- Textos novos nos três dicionários (`src/i18n/dictionaries/pt-BR.ts`, `es.ts`, `en.ts`), sempre strings com `{placeholders}` (nunca funções — ver memória i18n). Ignorar `en.1.ts`.
- Ids novos com `newId()` de `src/lib/menu-edit.ts` (regex `^[a-z0-9_-]{1,32}$`).
- Rodar testes com `npx vitest run <arquivo>`; checagem final `npx vitest run`, `npx tsc --noEmit` (ignorar erros em `.next/`), `npx eslint src` (erro já existente em `src/app/m/[slug]/error.tsx` não é desta branch).
- Nada de deploy; push só da branch `adicionais` e PR. Merge = dono.

## Review Focus

1. **Autosave com grupo pela metade** (opção sem nome, grupo sem opções): o rascunho não pode dar "cardápio inválido" — o editor envia só `cleanGroups(...)`. Teste na Task 6.
2. **Carrinho salvo antes do deploy** (`{id, qty}` sem `opts`) deve abrir e somar igual. Teste na Task 2.
3. **Dono apaga uma opção ou torna um grupo obrigatório com carrinho aberto**: a linha inválida some, as outras ficam. Teste na Task 2.
4. **Item "a combinar" com extras pagos**: linha e total ficam "a combinar"/"+ a combinar", sem somar só as opções. Teste na Task 2.
5. **`max` maior que o nº de opções** (atalho de extras nasce `max 3` com 1 opção): a dica mostra o efetivo ("Escolha 1"), e a seleção permite marcar todas. Teste na Task 1 e Task 4.

---

### Task 1: Tipos, schema e regras puras

**Files:**
- Modify: `src/lib/menu.ts` (tipos no topo; `ItemSchema` ~l.43)
- Create: `src/lib/menu-options.ts`
- Test: `src/lib/menu-options.test.ts`

**Interfaces:**
- Produces (em `menu.ts`): `type MenuOption = { id: string; name: string; priceCents: number }`; `type OptionGroup = { id: string; title: string; min: number; max: number; options: MenuOption[] }`; `MenuItem.groups?: OptionGroup[]`; `MAX_GROUPS_PER_ITEM`, `MAX_OPTIONS_PER_GROUP`.
- Produces (em `menu-options.ts`):
  - `normalizeOpts(opts: string[]): string[]` — sem repetidos, ordenado.
  - `selectionCents(item: MenuItem, opts: string[]): number`
  - `validSelection(item: MenuItem, opts: string[]): boolean`
  - `fromPrice(item: MenuItem): { cents: number | null; from: boolean }`
  - `selectionSummary(item: MenuItem, opts: string[]): { title: string; names: string[] }[]` — só grupos com escolha, na ordem dos grupos e das opções.
  - `choiceHint(group: OptionGroup): { kind: "one" | "exactly" | "upTo" | "range"; min: number; max: number }` — usa `max` efetivo = `min(max, options.length)`; `one` = (min≤1, max efetivo 1); `exactly` = min = max efetivo > 1; `upTo` = min 0; `range` = resto.
  - `hasGroups(item: MenuItem): boolean`

- [ ] **Step 1: testes que falham** em `menu-options.test.ts`, com um item fixo `burger` (priceCents 2000; grupo `size` min1 max1: `s` 0, `d` 800; grupo `extra` min0 max3: `b` 300, `c` 250):
  - `MenuSchema` aceita cardápio com esse item; aceita item sem `groups`; recusa: 6 grupos, 16 opções, `min > max`, `max 0`, `min 2` com 1 opção, opção com `priceCents: null`, título vazio, id de opção repetido no mesmo item. Aceita `min 0, max 3` com 1 opção.
  - `selectionCents(burger, ["d","b"]) === 1100`; `validSelection(burger, ["s"])` true; `[]` false (falta obrigatório); `["s","d"]` false (max 1); `["s","zz"]` false; `["s","b","c"]` true.
  - `fromPrice(burger)` → `{ cents: 2000, from: true }`; item só com `extra` → `{ cents: base, from: false }`; obrigatório só com opções 0 → `from: false`; obrigatório `min 2` soma as 2 mais baratas; item `priceCents: null` → `{ cents: null, from: false }`.
  - `selectionSummary(burger, ["b","d"])` → `[{title:"Tamanho",names:["Duplo"]},{title:"Extras",names:["Bacon"]}]`.
  - `choiceHint`: `size` → one; `extra` com 1 opção → `{kind:"one"}`; `extra` com 2 opções → `{kind:"upTo",max:2}`; min1 max2 → range; min2 max2 → exactly.
- [ ] **Step 2:** `npx vitest run src/lib/menu-options.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3:** tipos + `GroupSchema`/`OptionSchema` no `ItemSchema` (`groups: z.array(GroupSchema).max(MAX_GROUPS_PER_ITEM).optional()`, `superRefine` para `min ≤ max`, `min ≤ options.length` e ids únicos no item); implementar `menu-options.ts`.
- [ ] **Step 4:** teste → PASS; `npx vitest run src/lib` → tudo verde.
- [ ] **Step 5:** commit `Menu: option groups in the item (schema + pure rules)`.

### Task 2: Carrinho com opções

**Files:**
- Modify: `src/lib/cart.ts`
- Test: `src/lib/cart.test.ts` (existente; acrescentar)

**Interfaces:**
- Consumes: `normalizeOpts`, `selectionCents`, `validSelection` (Task 1).
- Produces:
  - `type CartLine = { id: string; opts?: string[]; qty: number }`; `Cart = { lines: CartLine[]; savedAt: number }`
  - `lineKey(id: string, opts?: string[]): string` — `id` quando sem opções, senão `` `${id}|${normalizeOpts(opts).join(",")}` ``.
  - `addToCart(cart, id, now, opts: string[] = [], qty = 1): Cart` (soma na linha de mesma chave)
  - `setQty(cart, key: string, qty, now): Cart` — agora por **chave de linha** (para itens sem opções, chave = id, então chamadores de hoje seguem iguais).
  - `qtyOfItem(cart: Cart, itemId: string): number` — soma de todas as linhas do item.
  - `type ResolvedLine = { key: string; item: MenuItem; opts: string[]; qty: number }`; `resolveCart(cart, menu): ResolvedLine[]`
  - `cartTotals(lines: { item: MenuItem; opts?: string[]; qty: number }[])` — mesma forma de retorno; soma `selectionCents`.

- [ ] **Step 1: testes que falham:**
  - carrinho JSON antigo `{"lines":[{"id":"a","qty":2}],"savedAt":now}` → `readCart` + `resolveCart` dá 1 linha com `opts: []`, `key: "a"`.
  - `addToCart` 2× com `["d","b"]` e 1× com `["b","d"]` → uma linha qty 3; com `["s"]` → segunda linha; `qtyOfItem` = 4.
  - `setQty(cart, lineKey("burger",["s"]), 0, now)` remove só essa linha.
  - `resolveCart` com menu onde a opção `d` foi apagada → linha `["d","b"]` some, `["s"]` fica; grupo `extra` virou `min 1` → linha `["s"]` some.
  - `cartTotals`: 2× burger `["d","b"]` = 2×(2000+1100); item `priceCents: null` com extra pago → `cents` não inclui a linha e `hasUnpriced: true`.
- [ ] **Step 2:** `npx vitest run src/lib/cart.test.ts` → FAIL.
- [ ] **Step 3:** implementar; `CartSchema` com `opts: z.array(z.string()).max(MAX_GROUPS_PER_ITEM * MAX_OPTIONS_PER_GROUP).optional()`.
- [ ] **Step 4:** PASS; `npx vitest run src/lib src/app/m` verde (o `orderable-menu` ainda compila porque `setQty` por id = chave).
- [ ] **Step 5:** commit `Cart: lines carry chosen options; old carts still load`.

### Task 3: Mensagem do WhatsApp e PDF

**Files:**
- Modify: `src/lib/order.ts` (`buildOrderMessage`), `src/app/m/[slug]/print/print-sheet.tsx` (`PrintItemRow`)
- Test: `src/lib/order.test.ts`, `src/app/m/[slug]/print/print-sheet.test.tsx`

**Interfaces:**
- Consumes: `selectionCents`, `selectionSummary` (Task 1).
- Produces: `buildOrderMessage` aceita `lines: { item: MenuItem; opts?: string[]; qty: number }[]` (landing `demoOrderLines` segue compatível).

- [ ] **Step 1: testes que falham:**
  - mensagem com 2× burger `["d","b"]` + 1× coca: contém exatamente as linhas `"2x X-Burguer — R$ 62,00"`, `"   Tamanho: Duplo"`, `"   Extras: Bacon"`, seguidas de `"1x Coca-Cola lata — R$ 7,90"`; total `R$ 69,90`. Grupo opcional sem escolha não gera linha. Teste antigo sem opções continua igual (byte a byte).
  - `PrintItemRow` com `burger`: texto `"Tamanho: Simples · Duplo +R$ 8,00"` e `"Extras: Bacon +R$ 3,00 · Cheddar +R$ 2,50"`; item sem grupos renderiza igual a hoje.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** preço da linha = `(priceCents + selectionCents) × qty`; linhas de escolha com 3 espaços de recuo, `title: nomes.join(", ")`. No PDF, uma `<p>` por grupo abaixo da descrição, mesmo estilo da descrição, opção paga com `+{formatPrice}`. Opção com nome longo quebra linha normalmente (sem medir de novo: `print-layout` já mede blocos renderizados — conferir em `print-layout.test.ts` que nada quebra).
- [ ] **Step 4:** PASS; `npx vitest run src/lib src/app/m/[slug]/print` verde.
- [ ] **Step 5:** commit `Order message and print list the chosen options`.

### Task 4: Ficha do item com escolhas

**Files:**
- Create: `src/app/m/[slug]/option-picker.tsx`
- Modify: `src/app/m/[slug]/item-sheet.tsx`, os três dicionários (`menu.order`)
- Test: `src/app/m/[slug]/item-sheet.test.tsx` (existente; acrescentar)

**Interfaces:**
- Consumes: `choiceHint`, `validSelection`, `selectionCents`, `normalizeOpts`.
- Produces:
  - `ItemSheet` prop `onAdd?: (qty: number, opts: string[]) => void` (antes `(qty)`).
  - `OptionPicker({ item, country, accent, value, onChange, missing, readOnly })` — `value: string[]`; `missing: string | null` (id do grupo pendente, marcado em vermelho com `aria-invalid` e `scrollIntoView`).
  - Chaves novas em `menu.order` (pt-BR; traduzir es/en): `required: "Obrigatório"`, `optional: "Opcional"`, `chooseOne: "Escolha 1"`, `chooseExactly: "Escolha {n}"`, `chooseUpTo: "Escolha até {n}"`, `chooseRange: "Escolha de {min} a {max}"`, `optionPrice: "+ {price}"`, `fromPrice: "a partir de {price}"`, `inOrder: "{n} no pedido"`, `missingChoice: "Escolha uma opção em “{group}”"`.

- [ ] **Step 1: testes que falham** (Testing Library):
  - grupo `max 1` renderiza `radio`; `max 3` renderiza `checkbox`; com 3 opções e `max 2`, depois de 2 marcadas a 3ª fica `disabled`.
  - botão "Adicionar" mostra total ao vivo: base 20,00 → marcar Duplo + Bacon → `R$ 31,00`; qty 2 → `R$ 62,00`.
  - tocar "Adicionar" sem tamanho: `onAdd` não é chamado, o grupo fica `aria-invalid="true"` e aparece `missingChoice`; escolher tamanho e tocar → `onAdd(1, ["b","d"])` (normalizado).
  - `extra` com 1 opção e `max 3`: dica "Escolha 1" e a opção marcável.
  - sem `onAdd` (página sem pedido): lista grupos e preços, sem `radio`/`checkbox`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementar `OptionPicker`; `ItemSheet` guarda `opts` e `missing` em estado; o preço mostrado no botão usa `selectionCents`; item "a combinar" mantém botão sem preço.
- [ ] **Step 4:** PASS; `npx vitest run src/app/m` verde.
- [ ] **Step 5:** commit `Item sheet: diners choose options before adding`.

### Task 5: Card, lista de pedido e tela do pedido

**Files:**
- Modify: `src/app/m/[slug]/order/orderable-menu.tsx`, `src/app/m/[slug]/order/order-sheet.tsx`, `src/app/m/[slug]/menu-item-card.tsx` (`MenuItemBody`), `src/app/m/[slug]/built-menu.tsx` (só se passar preço ao card)
- Test: `src/app/m/[slug]/built-menu.test.tsx`, `src/app/m/[slug]/order/*.test.tsx` existentes (acrescentar)

**Interfaces:**
- Consumes: `fromPrice`, `hasGroups`, `selectionSummary`, `addToCart(cart,id,now,opts,qty)`, `setQty(cart,key,…)`, `qtyOfItem`, `ResolvedLine`.
- Produces: `OrderSheet` prop `onQty: (key: string, qty: number) => void`; `lines: ResolvedLine[]`.

- [ ] **Step 1: testes que falham:**
  - card de item com obrigatório pago mostra `"a partir de R$ 20,00"`; item só com extras mostra `"R$ 20,00"`; página estática (sem WhatsApp) também usa `fromPrice`.
  - "+" de item com grupos abre o diálogo (não adiciona); "+" de item sem grupos adiciona como hoje.
  - após adicionar 2 linhas diferentes do mesmo item, o card mostra `"3 no pedido"` e não mostra ±.
  - tela do pedido: uma linha por escolha, com `Tamanho: Duplo` em texto menor embaixo do nome; ± altera só aquela linha.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementar; `MenuItemBody` ganha `from?: boolean` (prefixa com `fromPrice`). `key` do `<li>` da tela do pedido = `line.key`.
- [ ] **Step 4:** PASS; `npx vitest run` verde.
- [ ] **Step 5:** commit `Menu page: from-price, options open the sheet, one order line per choice`.

### Task 6: Operações do editor (puras)

**Files:**
- Create: `src/lib/option-groups-edit.ts`
- Test: `src/lib/option-groups-edit.test.ts`

**Interfaces:**
- Consumes: `newId` (`menu-edit.ts`), tipos da Task 1.
- Produces:
  - `newGroup(kind: "required" | "extras", title: string): OptionGroup` — required: `min 1, max 1`; extras: `min 0, max 3`; uma opção `{ name: "", priceCents: 0 }`.
  - `setRequired(g, on: boolean): OptionGroup` (`min` 1/0; liga `max ≥ 1`)
  - `setMax(g, max: number): OptionGroup` (piso 1; se `min > max`, `min = max`)
  - `addOption(g)`, `updateOption(g, optionId, patch: Partial<Omit<MenuOption,"id">>)`, `removeOption(g, optionId)` (respeitando `MAX_OPTIONS_PER_GROUP`)
  - `moveGroup(groups, groupId, dir: -1 | 1)`, `removeGroup(groups, groupId)`
  - `copyGroups(into: OptionGroup[], from: OptionGroup[]): OptionGroup[]` — cópias com ids novos (grupo e opções), acrescentadas, cortando em `MAX_GROUPS_PER_ITEM`.
  - `cleanGroups(groups: OptionGroup[]): OptionGroup[] | undefined` — tira opções de nome vazio (após trim); grupo sem opções ou de título vazio sai; `min` baixa para `≤ options.length`; resultado vazio → `undefined`. **Sempre** passa no `MenuSchema`.

- [ ] **Step 1: testes que falham:** um para cada função acima, mais: `MenuSchema` aceita item com `groups: cleanGroups([newGroup("required","Tamanho")])` (vira `undefined`) e com grupo meio preenchido; `copyGroups` não reaproveita nenhum id do original; `removeOption` de um grupo obrigatório com 1 opção restante deixa `cleanGroups` válido.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** commit `Option-group edit operations, always cleaned before save`.

### Task 7: Editor no painel

**Files:**
- Create: `src/app/(main)/dashboard/cardapio/option-groups-editor.tsx`
- Modify: `src/app/(main)/dashboard/cardapio/item-editor.tsx` (`Patch` ganha `groups?: OptionGroup[] | undefined`; nova área abaixo do preço; dica no preço), `src/app/(main)/dashboard/cardapio/step-items.tsx` (etiqueta na linha fechada; passa a lista de itens para "copiar"), três dicionários (`dashboard.builder.editor`)
- Test: `src/app/(main)/dashboard/cardapio/option-groups-editor.test.tsx`, `item-editor.test.tsx` (acrescentar)

**Interfaces:**
- Consumes: tudo da Task 6.
- Produces: `OptionGroupsEditor({ groups, otherItems, country, onChange })` — `groups: OptionGroup[] | undefined`; `otherItems: { id: string; name: string; groups: OptionGroup[] }[]` (só itens com grupos, exceto o atual); `onChange(next: OptionGroup[] | undefined)` recebe **sempre** `cleanGroups(rascunhoLocal)`. Estado local guarda o rascunho cru (com opções vazias) para o dono continuar digitando.
- Chaves novas em `dashboard.builder.editor` (pt-BR; traduzir es/en): `groupsTitle: "Adicionais e opções"`, `addRequired: "+ Escolha obrigatória (ex.: tamanho)"`, `addExtras: "+ Extras opcionais (ex.: bacon, ovo)"`, `defaultRequiredTitle: "Tamanho"`, `defaultExtrasTitle: "Adicionais"`, `groupTitleLabel: "Nome do grupo"`, `requiredLabel: "Obrigatório"`, `maxLabel: "Máximo de escolhas"`, `optionNameLabel: "Opção"`, `optionPriceLabel: "Preço"`, `optionFree: "sem custo"`, `addOption: "+ opção"`, `removeOption: "Remover opção"`, `removeGroup: "Remover grupo"`, `copyFrom: "Copiar de outro item"`, `limitGroups: "Até {n} grupos por item"`, `limitOptions: "Até {n} opções por grupo"`, `priceHint: "Pode deixar 0 aqui e pôr o valor em cada tamanho."`, `groupsTagOne: "1 grupo"`, `groupsTag: "{n} grupos"`.

- [ ] **Step 1: testes que falham:**
  - "+ Escolha obrigatória" cria grupo "Tamanho" com caixa Obrigatório marcada e uma opção vazia em foco; `onChange` recebe `undefined` (nada válido ainda); digitar "Simples" → `onChange` com 1 grupo válido no `MenuSchema`.
  - "+ Extras opcionais" → Obrigatório desmarcado, máximo 3.
  - com 5 grupos, os dois atalhos ficam `disabled` e aparece `limitGroups`; com 15 opções, "+ opção" fica `disabled`.
  - preço vazio mostra placeholder "sem custo" e salva `0`; "8,00" salva `800` (usar `parsePrice`).
  - "Copiar de outro item" lista só `otherItems`; escolher acrescenta grupos com ids novos.
  - `ItemEditor`: dica de preço aparece só com obrigatório pago; linha fechada em `StepItems` mostra "2 grupos".
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** implementar, reaproveitando `IconButton` e classes `btn` de `step-items.tsx`.
- [ ] **Step 4:** PASS; `npx vitest run` verde.
- [ ] **Step 5:** commit `Dashboard: owners add option groups to an item`.

### Task 8: Exemplos com grupos, verificação e PR

**Files:**
- Modify: `src/lib/example-full-menus.ts` (existe só depois do merge do PR #5; se ainda não estiver em `main`, fazer `git merge cardapio-exemplo` na branch `adicionais` antes), `src/lib/example-built-menus.test.ts`

- [ ] **Step 1: teste que falha:** nos três exemplos, o 1º lanche/taco/burger tem grupo obrigatório de tamanho/porção com opção paga e grupo de extras; a bebida "Suco natural"/"Agua de…"/"Milkshake" tem grupo obrigatório de sabor sem custo; todos passam no `MenuSchema`.
- [ ] **Step 2:** FAIL. **Step 3:** acrescentar os grupos (pt-BR: X-Burguer `Tamanho` Simples 0 / Duplo 800, `Turbine seu lanche` Bacon 300 / Cheddar 250 / Ovo 200, máx. 3; Suco `Sabor` Laranja/Limão/Maracujá; equivalentes locais em es/en). **Step 4:** PASS.
- [ ] **Step 5: verificação completa:** `npx vitest run` (tudo verde, anotar o número), `npx tsc --noEmit` (sem erros fora de `.next/`), `npx eslint src` (só o erro antigo de `error.tsx`).
- [ ] **Step 6: visual a 390px** com `next dev -p 3457`. Página estática (card com "a partir de"): `google-chrome --headless=new --window-size=390,844 --force-device-scale-factor=2 --screenshot=<scratchpad>/…png http://localhost:3457/m/seu-restaurante`. Interações (abrir a ficha do X-Burguer, escolher Duplo + Bacon, adicionar, abrir o pedido; e no painel `/dashboard/cardapio` com a conta de teste do banco local, criar um grupo): Claude in Chrome (`mcp__claude-in-chrome__*`, janela redimensionada para 390px), com print de cada tela. Playwright não está instalado no projeto. Desligar o servidor ao fim (`pkill -f "next dev -p 345[7]"`).
- [ ] **Step 7:** commit `Examples show option groups`; `git push -u origin adicionais`; abrir PR para `main` com resumo + prints; **não** fazer merge.

---

## Self-review (feito)

- Cobertura do spec: §1 → Tasks 1–2; §2 card/ficha/carrinho/mensagem/PDF/exemplos → Tasks 2–5, 8; §3 editor → Tasks 6–7; §4 testes → em cada task; riscos → Review Focus 2–3.
- Nomes conferidos entre tasks: `lineKey`, `ResolvedLine`, `setQty(cart,key,…)`, `addToCart(cart,id,now,opts,qty)`, `cleanGroups`, `OptionGroupsEditor`.
