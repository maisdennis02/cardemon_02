# Entrada curta (com voz) e painel enxuto — design

Data: 2026-10-13 · Status: revisado pelo Fable, aguardando revisão do dono ·
Não vai ao ar antes de 15/10

## Por que

Os dois testes de anúncio mostraram onde o funil vaza (dados de 02–12/10):

- **O cadastro em si não é o gargalo.** Das 13 sessões reais que abriram
  `/signup`, 6 terminaram — Google em 3–5 s, e-mail em 7–119 s. Quem desistiu
  saiu em ≤ 6 s sem tocar em nada. Desde 11/09: 2 contas por Google, 2 por e-mail.
- **O vazamento é logo depois do cadastro.** def\*\*\* e ren\*\*\* (teste 1)
  criaram conta e **nunca criaram o restaurante** — pararam no formulário de
  entrada de 5 campos (nome, endereço, WhatsApp, Instagram, descrição).
  Nenhuma das 5 contas reais vindas de anúncio publicou um cardápio de verdade;
  rod\*\*\* publicou 1 item e parou.
- **O painel é uma pilha de 9 blocos** no celular (abrir cardápio, dois avisos,
  formulário de dados, QR, estatísticas, cartão do cardápio com o envio de
  fotos dentro, senha, excluir conta). O dono não sabe o que fazer primeiro.

A abordagem "montar sem conta" foi descartada (o cadastro não é o atrito); o
público errado da landing é tratado no marketing, fora deste documento.

**Sucesso:** quem se cadastra chega ao construtor em **um toque**, publica, e
no celular o painel mostra primeiro o que importa no dia a dia.

**Como medir:** com um campo só, `no_restaurant` cai a ~0 por construção — não
é mérito. O número que importa passa a ser **contas de anúncio que saem de
`no_menu` para `live`/`viewed`** (`src/lib/funnel.ts`). A coluna "onboarded"
deixa de ser comparável com os testes 1 e 2.

## Decisões tomadas (dono, 12–13/10)

| # | Decisão |
|---|---|
| 1 | Entrada pede **só o nome do negócio**, com microfone (segurar e falar) |
| 2 | Endereço `/m/...` **gerado automaticamente** do nome; editável em Ajustes |
| 3 | Depois da entrada, **direto no construtor** de cardápio em texto, que **continua abrindo na etapa Visual** (ordem Visual → Itens → Prévia mantida) |
| 4 | Itens de exemplo como **lista fantasma**: desenhados só na tela, nunca salvos nem publicáveis |
| 5 | Painel = **Início enxuto + página Ajustes** (sem abas, sem checklist) |
| 6 | Início mostra **um único** "Próximo passo" por vez |

## Fora de escopo

- Construtor sem conta (rascunho no navegador) — descartado em 13/10.
- Mudanças no cadastro (`/signup`), na landing e nos anúncios.
- Reordenar as etapas do construtor.
- Mudanças no cardápio público (`/m/[slug]`) — nada aqui toca a rota ISR nem
  os schemas que `readPublishedMenu` usa.
- Novos campos no banco. **Sem migração.**
- Redesenho do `MenuQrCard` (é reaproveitado como está).

## 1. Entrada (`/dashboard` sem restaurante)

`OnboardingForm` vira uma tela de um campo:

- Título "Qual o nome do seu negócio?", campo `name` com `MicButton`
  (`lang` do locale, separador `" "`), botão **Começar meu cardápio**.
- Some: endereço, WhatsApp, Instagram, descrição.

`createRestaurant` passa a receber só `name`:

- Schema próprio: `CreateRestaurantSchema = z.object({ name: z.string().trim().min(1).max(120) })`
  (o `restaurantSchema` atual tem `superRefine` e não serve; o `trim` limpa o
  espaço final que o ditado deixa).
- **Idempotente:** se o usuário já tem restaurante, só redireciona (duplo
  toque, voltar do navegador).
- **País**: grava `country = COUNTRY_FOR_LOCALE[locale]` (o mesmo palpite que
  `dashboard/cardapio/page.tsx` já faz). Assim um cardápio nunca fica com país
  nulo (que renderiza em inglês com USD), mesmo que a etapa Visual mude depois.
- **Endereço** sai de uma função pura nova `pickSlug(name, isTaken)` em
  `src/lib/slug.ts`:
  1. `base = slugify(name).slice(0, 52)`; se `base.length < 2` (vazio, emoji,
     uma letra) → `base = "cardapio"`. O teto de 52 deixa espaço para os
     sufixos sem passar dos 60 que `updateRestaurant` valida.
  2. Candidatos `base`, `base-2`, `base-3`, … até `base-50`; o primeiro que
     **não** é reservado (`isReservedSlug`) e **não** existe no banco vence.
  3. Esgotados os 50 → `base-<6 caracteres aleatórios [a-z0-9]>`.
  `isTaken` é injetado para a função ser testável sem banco; a action passa um
  callback que consulta `prisma.restaurant.findUnique`.
- **Corrida** (dois cadastros simultâneos com o mesmo nome): violação de unique
  (P2002) no `create` → tenta o próximo candidato uma vez; se falhar de novo,
  devolve o erro genérico.
- Mantém `track("restaurant_created")`, `revalidatePath("/dashboard")` e
  `revalidatePath(\`/m/${slug}\`)` (um 404 cacheado antes da criação).
- Ao final: `redirect("/dashboard/cardapio")` (hoje é `/dashboard`).
- Sem evento PostHog novo: `restaurant_created` + `builder_step` já cobrem.

## 2. Construtor: exemplos fantasmas e saída para fotos

O construtor continua abrindo na etapa **Visual** para quem nunca publicou
(decisão 3); nada muda na ordem das etapas.

**Exemplos fantasmas** — vivem só no `StepItems`:

- Aparecem quando o cardápio **não tem nenhum item** (`countItems(menu) === 0`)
  e o dono não os dispensou.
- Conteúdo: os itens de `LANDING_DEMO[localeForCountry(country)].menu` — o
  locale segue o país escolhido no construtor (mesma regra do ditado e das
  sugestões de seção), não o idioma do painel.
- Visual: esmaecidos, com selo "exemplo" e o texto "Toque para usar, ou comece
  digitando". Botão **Esconder exemplos**.
- **Tocar em um exemplo** copia aquele item (com a seção dele, se ainda não
  existir) para o menu como item **real**, com id novo (`newId`), e abre a
  edição dele. A partir daí ele é um item comum (autosave, contador, limite).
- Ao primeiro item real (tocado ou digitado), a lista fantasma some.
- **Esconder exemplos** guarda a dispensa em `localStorage` (por restaurante,
  com try/catch); sem storage, a lista só some com o primeiro item.
- Nunca entram no rascunho, no `MenuSchema`, no contador "N/20", no limite
  grátis, na Prévia nem no `publishMenu`. Por construção, exemplo não publica.

**Seções vazias no publicar.** `publishMenu` passa a descartar seções sem
itens antes de gravar (hoje `visibleMenu` só faz isso no plano grátis, e o Pro
veria títulos vazios). Se sobrar zero itens, mantém o erro atual.

**Saída para fotos.** O construtor ganha um link discreto
"Já tenho fotos do cardápio →" para `/dashboard/fotos`, que dispara
`capture("menu_mode_chosen", { mode: "photos" })` (o evento hoje vem do
`MenuStartChoice`, que deixa de ser usado).

## 3. Início (`/dashboard` com restaurante)

De cima para baixo:

1. **Cartão do cardápio** — nome do negócio; situação: "● No ar · N itens"
   (texto), "● No ar · N fotos" (fotos) ou "Rascunho — ainda não publicado";
   botões grandes **Abrir cardápio ↗** (só se publicado) e **Editar** (texto →
   `/dashboard/cardapio`; fotos → `/dashboard/fotos`).
   Sem cardápio publicado: botão principal **Continuar meu cardápio** →
   construtor, e um link secundário **"Tenho fotos do cardápio"** →
   `/dashboard/fotos` (com o mesmo `menu_mode_chosen`).
2. **Próximo passo** — um único card, escolhido por função pura
   `nextStep(state)` em `src/lib/next-step.ts`, na ordem:
   1. `finish_menu` — nada publicado → "Termine seu cardápio" (→ construtor)
   2. `share` — publicado e `totalViews === 0` → o `MenuLiveCallout` de hoje
   3. `whatsapp` — modo texto e sem `whatsappNumber` → "Receba pedidos no
      WhatsApp", com o campo do número (com microfone) e Salvar ali mesmo
   4. `delivery` — nenhum link de app de entrega → "Adicione seus links do
      iFood…" (→ `/dashboard/ajustes#country`)
   5. `null` — tudo feito → nenhum card
   O passo `whatsapp` é pulado no modo fotos: o **pedido** pelo WhatsApp só
   existe no cardápio em texto (o botão de contato existe nos dois, e não
   depende disso).
   O campo inline usa uma action nova
   `saveWhatsappNumber(restaurantId, number)` — mesma regex de
   `restaurantSchema`, `requireOwnedRestaurant`, `revalidatePath("/dashboard")`
   e `revalidatePath(\`/m/${slug}\`)` (o botão de pedido depende do número).
   `updateRestaurant` não serve: exige nome e endereço.
3. **Divulgar** — `MenuQrCard` como está (mantém `id="menu-qr"`). Só aparece
   com cardápio publicado.
4. **Números** — uma linha "7 dias: X visitas · Y pedidos". `loadMenuStats`
   ganha a contagem de `click_order` nos últimos 7 dias (hoje só as visitas
   têm janela). O detalhe do `MenuStatsCard` atual fica num `<details>` fechado.

**Cabeçalho**: logo, **⚙ Ajustes**, selo do plano ("Pro" → Ajustes, ou "Fazer
upgrade" → `/pricing`). O botão Sair sai do cabeçalho e vai para Ajustes. O
link "Ver cardápio" do cabeçalho some (o cartão do cardápio já tem).

**Fica fora do Início**: formulário de dados, apps de entrega, envio de fotos,
troca de senha, excluir conta.

## 4. Ajustes (`/dashboard/ajustes`, página nova)

Topo: "← Início". Blocos:

1. **Dados do negócio** — nome, endereço, WhatsApp, Instagram, descrição; cada
   campo de texto com `MicButton`.
   - **O endereço não acompanha o nome** em Ajustes (`slugTouched` começa
     `true`): renomear o negócio não pode trocar a URL de um QR já impresso.
     Ao lado do campo: "Mudar o endereço faz o QR code já impresso parar de
     funcionar."
2. **Apps de entrega** — o select de **país** (mantém `id="country"`) seguido
   dos links (mantém `id="delivery"`). O país mora aqui porque decide quais
   apps aparecem.
3. **Plano** — Pro: "Pro · renova em DD/MM/AAAA" ou, com
   `billingCancelAtPeriodEnd`, "Pro até DD/MM/AAAA"; + Gerenciar (portal
   Stripe). Grátis: Fazer upgrade.
4. **Conta** — `ChangePasswordCard` (só com senha), Sair, `DeleteAccountCard`
   por último.

Os blocos 1 e 2 continuam sendo **um** formulário (`updateRestaurant`), agora
sempre aberto: sai o modo "visualizar" e o botão Cancelar. `updateRestaurant`
passa a devolver `{ ok: true }` no sucesso e o formulário mostra "Salvo ✓".

## 5. Fotos (`/dashboard/fotos`, página nova)

Hospeda o `ImageManager` de hoje, com "← Início". Para quem usa cardápio em
foto, e para quem chega por "Tenho fotos do cardápio" (Início ou construtor).

- `switchToPhotosOnUpload` continua: enviar fotos com cardápio em texto no ar
  troca o modo, como hoje.
- Quando `mode === "built"` **e** já há fotos enviadas, a página mostra o botão
  **Usar as fotos em vez do texto** (`chooseMenuPhotos`, hoje no
  `BuiltMenuCard`) — é o único jeito de voltar para as fotos sem reenviar.

## 6. Rotas, links e compatibilidade

- `/dashboard?edit=1` → redireciona para `/dashboard/ajustes`. O fragmento
  (`#country`) não chega ao servidor; o navegador o preserva num redirect sem
  fragmento, então `?edit=1#country` cai em `/dashboard/ajustes#country`.
- Links internos para `?edit=1` (`built-menu-card.tsx`,
  `delivery-setup-callout.tsx`) passam a apontar direto para
  `/dashboard/ajustes` (nenhum e-mail usa `edit=1`).
- `proxy.ts` já guarda `/dashboard/*`; as páginas novas herdam a guarda.
- `/dashboard/ajustes` e `/dashboard/fotos` sem restaurante →
  `redirect("/dashboard")` (cai na entrada).
- `DashboardTelemetry` continua montado **só** no `/dashboard` (Início): é a
  página de chegada de todo caminho (cadastro, volta do Google, volta do
  Stripe). O construtor segue redirecionando para `/dashboard` ao publicar,
  então `menu_published` continua disparando com o marcador `once` atual.
- i18n: todos os textos novos nos três dicionários (pt-BR, es, en), como
  strings (sem funções).

## 7. Testes

- **vitest**:
  - `pickSlug`: acentos ("Lanchonete do Zé" → `lanchonete-do-ze`), colisão
    (`-2`, `-3`), reservado (`seu-restaurante` → `seu-restaurante-2`),
    vazio/emoji/uma letra (`cardapio`), nome longo (≤ 60 com sufixo),
    esgotamento (sufixo aleatório).
  - `nextStep`: as cinco situações, e o pulo de `whatsapp` no modo fotos.
  - `publishMenu`/função pura de limpeza: seções vazias descartadas.
  - Exemplos fantasmas: tocar copia como item real com id novo; o menu
    resultante passa no `MenuSchema` e não carrega nada além dos campos atuais.
- **Manual (build de produção local, banco de dev)**: conta nova → nome por voz
  → Visual → Itens com exemplos → tocar/digitar → publicar → Início → Ajustes
  (renomear sem trocar endereço; "Salvo ✓") → Fotos. Prints em largura de
  celular (375 px) do Início nas situações `finish_menu`, `whatsapp` e `null`.
- `tsc --noEmit`, `npm test`, lint em `src`, `next build`.

## 8. Entrada no ar

- **Só depois de 15/10** (fim do teste 2 de anúncios).
- Sem migração. Deploy normal (`vercel deploy --prod`, pelo dono).
- Depois do deploy: conta nova de teste em produção (dono) passando pelo
  fluxo; acompanhar `no_menu → live` das contas novas na semana seguinte.
