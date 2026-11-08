# Adicionais e opções por item — design

Data: 2026-11-02 · Status: aguardando revisão do dono

## Por que

Comparando com o iFood (02/11), a maior lacuna do menulala é o item ter um
preço só. Lanchonete, açaí e pizzaria simples precisam de "escolha o tamanho"
e de "+bacon R$ 3". Hoje isso vai em observação de texto livre, e o total da
mensagem do WhatsApp sai errado. É a primeira de três entregas (depois vêm
"esgotado + horário de funcionamento" e "taxa de entrega + pedido mínimo").

**Sucesso:** um restaurante real publica um item com grupo de opções e recebe
um pedido pelo WhatsApp com as escolhas e o total certos.

## Decisões tomadas (dono, 02/11)

| # | Decisão |
|---|---|
| 1 | Escopo B: escolha obrigatória + extras opcionais com preço. Fora: limites de sabores com regra de preço (pizza meio a meio) |
| 2 | Grupos **por item**, com botão "copiar de outro item" (sem grupos compartilhados) |
| 3 | Modelo do iFood: um só tipo de grupo, com **mínimo e máximo** de escolhas |
| 4 | Preço da opção **sempre soma** ao preço do item; card mostra "a partir de" |
| 5 | **Grátis para todos**, com limites técnicos contra abuso |
| 6 | Guardado **dentro do item, no JSON do cardápio** (campo opcional; sem migração de banco) |

## Fora de escopo (v1)

- Quantidade por opção ("2x bacon"); cada opção é marcada ou não.
- Pausar/esgotar uma opção sozinha (a entrega 2 cuida de esgotar item).
- Foto de opção.
- Grupos compartilhados entre itens.
- Criar grupos por "colar lista" ou por voz.
- Pizza com sabores e regra de preço.

## 1. Formato e regras

`src/lib/menu.ts`:

```ts
export type MenuOption = { id: string; name: string; priceCents: number };
export type OptionGroup = {
  id: string;
  title: string;       // 1–60 caracteres
  min: number;         // 0 = opcional; ≥1 = obrigatório
  max: number;         // 1 = escolha única
  options: MenuOption[];
};
export type MenuItem = { /* campos de hoje */ groups?: OptionGroup[] };
```

Validação (`MenuSchema`, aplicada no salvar rascunho e no publicar):

- `title`: trim, 1–60. Opção `name`: trim, 1–60. `priceCents`: inteiro ≥ 0
  (sem `null`: opção nunca é "a combinar").
- 1–15 opções por grupo; até 5 grupos por item (`MAX_GROUPS_PER_ITEM`,
  `MAX_OPTIONS_PER_GROUP`).
- `0 ≤ min ≤ max`, `max ≥ 1`, `min ≤ options.length`. O `max` pode passar do
  número de opções (o atalho de extras nasce com `max 3` e uma opção); a tela
  mostra `min(max, nº de opções)`.
- ids únicos dentro do item (grupos e opções).
- Cardápio sem `groups` continua válido; `v` continua `1`.
- Grupos não contam no `FREE_ITEM_LIMIT`.

Preço (funções puras em `src/lib/menu.ts`):

- `selectionCents(item, opts)` = soma dos preços das opções escolhidas.
- Total da linha = (`item.priceCents` + `selectionCents`) × `qty`. Item "a
  combinar" (`priceCents === null`) continua "a combinar" na linha.
- `fromPrice(item)`: se algum grupo com `min ≥ 1` tem opção com preço > 0,
  devolve `item.priceCents + Σ (soma das `min` opções mais baratas de cada
  grupo obrigatório)` e o card mostra "a partir de {preço}". Caso contrário o
  card mostra o preço de hoje (extras opcionais não mudam o preço exibido).
- `validSelection(item, opts)`: cada id existe; por grupo, `min ≤ escolhidas ≤ max`.

## 2. O que o cliente vê

**Card** (`menu-item-card.tsx`, `orderable-menu.tsx`)
- Sem grupos: nada muda.
- Com grupos: "+" abre a ficha do item em vez de adicionar. Preço via
  `fromPrice`. Já no pedido: em vez do ±, mostra "{n} no pedido" (o mesmo item
  pode estar em várias linhas); ajuste de quantidade na tela do pedido.

**Ficha do item** (`item-sheet.tsx`)
- Com pedido (restaurante tem WhatsApp): grupos abaixo da descrição. Cada um
  com título, selo "Obrigatório"/"Opcional" e dica ("Escolha 1", "Escolha até
  3", "Escolha de 1 a 2"). `max === 1` → rádio; `max > 1` → caixas, as
  restantes desativadas ao chegar no máximo. Opção com preço mostra
  "+ R$ 3,00". Quantidade ± e botão "Adicionar · {total ao vivo}". Faltando
  obrigatório: o toque rola até o grupo pendente e o marca em vermelho, sem
  adicionar.
- Sem pedido (cardápio só de leitura, inclusive `PhotoItemCard`): grupos
  listados como informação (opção e preço), sem seleção.
- Cardápios de exemplo: modo demo de hoje, igual.

**Carrinho** (`src/lib/cart.ts`)
- Linha: `{ id, opts?: string[], qty }`; `opts` ordenado. Mesmo `id` + mesmos
  `opts` soma na linha; diferente, nova linha. Linhas antigas (sem `opts`)
  continuam válidas.
- Operações por linha (chave = id + opts), não mais por item.
- `resolveCart` descarta a linha se o item sumiu **ou** `validSelection` falha
  (dono editou o cardápio), como hoje com item apagado.
- `cartTotals` soma `selectionCents`.

**Mensagem do WhatsApp** (`src/lib/order.ts`)
```
2x X-Burguer — R$ 57,80
   Tamanho: Duplo
   Turbine seu lanche: Bacon
1x Coca-Cola lata — R$ 7,90
```
Uma linha por grupo com escolha, na ordem dos grupos, nomes das opções
separados por vírgula. Grupo opcional sem escolha não aparece.

**PDF** (`/m/[slug]/print`): embaixo do item, uma linha por grupo:
"Tamanho: Simples · Duplo +R$ 8,00".

**Exemplos** (`src/lib/example-full-menus.ts`): X-Burguer (tamanho + extras)
e Suco natural (sabor, obrigatório, sem custo) nos três idiomas, com o
equivalente local.

## 3. Editor do dono

`dashboard/cardapio/item-editor.tsx`, nova área "Adicionais e opções" abaixo
do preço (componente próprio, `option-groups-editor.tsx`):

- Atalhos: "+ Escolha obrigatória (ex.: tamanho)" → `min 1, max 1`;
  "+ Extras opcionais (ex.: bacon, ovo)" → `min 0, max 3`. Cada um cria o
  grupo com uma opção vazia em foco.
- Por grupo: título; caixa "Obrigatório" (liga `min = 1` / `min = 0`);
  contador "Máximo de escolhas" (a partir de 1); subir/descer/remover
  grupo (mesmos `IconButton` de hoje).
- Por opção: nome, preço (vazio ou 0 = "sem custo"), remover; "+ opção".
- Remover opções baixa o `min` se preciso, nunca deixa o grupo inválido.
- "Copiar de outro item ▾": lista os itens com grupos; escolher **acrescenta**
  cópias com ids novos, até o limite de 5.
- Limites: botões desativados em 5 grupos / 15 opções.
- Dica sob o preço quando há obrigatório com preço: "Pode deixar 0 aqui e pôr
  o valor em cada tamanho."
- Linha fechada do item mostra etiqueta "{n} grupos".
- Rascunho, pré-visualização e publicação: fluxo de hoje; o servidor valida de
  novo com `MenuSchema` e devolve erro traduzido.
- Textos nos três dicionários (pt-BR, es, en), como strings (sem funções).

## 4. Testes

TDD na lógica (vitest):
- `MenuSchema`: limites, `min/max`, ids, cardápio antigo sem `groups`.
- `fromPrice`, `selectionCents`, `validSelection`.
- Carrinho: junção por id+opts, linhas antigas, descarte após edição do dono.
- Mensagem do WhatsApp e PDF com grupos.

Componentes:
- Ficha: rádio vs caixas, máximo, obrigatório pendente, total ao vivo, modo
  só leitura.
- Editor: atalhos, obrigatório/máximo, remover baixa o mínimo, copiar, limites.

Visual: 390px no exemplo e no painel (conta de teste do banco local), depois
no preview do PR. Deploy só com aprovação do dono.

## Riscos

- **Carrinhos salvos** no celular dos clientes: `opts` opcional mantém
  compatibilidade; coberto por teste.
- **Cardápio publicado editado** com carrinho aberto: linha inválida some em
  silêncio (comportamento de hoje para item apagado).
- **Tamanho do JSON** do cardápio: 20 itens × 5 grupos × 15 opções ainda é
  pequeno para a coluna `Json`; sem impacto no banco ou no ISR.
- Sem custo de serviço novo: tudo roda no navegador e no fluxo de salvar de hoje.
