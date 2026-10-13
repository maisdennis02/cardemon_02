# Entrada curta (com voz) e painel enxuto — design

Data: 2026-10-13 · Status: aguardando revisão do dono · Não vai ao ar antes de 15/10

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
no celular o painel mostra primeiro o que importa no dia a dia. Mensurável:
contas com status `no_restaurant` perto de zero.

## Decisões tomadas (dono, 12–13/10)

| # | Decisão |
|---|---|
| 1 | Entrada pede **só o nome do negócio**, com microfone (segurar e falar) |
| 2 | Endereço `/m/...` **gerado automaticamente** do nome; editável em Ajustes |
| 3 | Depois da entrada, **direto no construtor** de cardápio em texto |
| 4 | Construtor começa com **itens de exemplo apagáveis**; publicar fica bloqueado enquanto sobrar exemplo intocado |
| 5 | Painel = **Início enxuto + página Ajustes** (sem abas, sem checklist) |
| 6 | Início mostra **um único** "Próximo passo" por vez |

## Fora de escopo

- Construtor sem conta (rascunho no navegador) — descartado em 13/10.
- Mudanças no cadastro (`/signup`), na landing e nos anúncios.
- Mudanças no cardápio público (`/m/[slug]`) — nada aqui toca a rota ISR.
- Novos campos no banco. **Sem migração.**

## 1. Entrada (`/dashboard` sem restaurante)

`OnboardingForm` vira uma tela de um campo:

- Título "Qual o nome do seu negócio?", campo `name` com `MicButton`
  (`lang` do locale, separador `" "`), botão **Começar meu cardápio**.
- Some: endereço, WhatsApp, Instagram, descrição.

`createRestaurant` passa a receber só `name`:

- O endereço sai de uma função pura nova `pickSlug(name, isTaken)` em
  `src/lib/slug.ts`:
  1. `base = slugify(name)`; se vazio (nome só com emoji/símbolos) →
     `base = "cardapio"`.
  2. Candidatos `base`, `base-2`, `base-3`, … até `base-50`; o primeiro que
     **não** é reservado (`isReservedSlug`) e **não** existe no banco vence.
  3. Esgotados os 50 → `base-<6 caracteres aleatórios>`.
  `isTaken` é injetado para a função ser testável sem banco; a action passa um
  callback que consulta `prisma.restaurant.findUnique`.
- Corrida (dois cadastros simultâneos com o mesmo nome): a violação de unique
  no `create` é capturada e o próximo candidato é tentado uma vez; se falhar de
  novo, devolve o erro genérico.
- Ao final: `redirect("/dashboard/cardapio")` (hoje é `/dashboard`).
- `restaurantSchema` para criação valida só `name` (mesmos limites de hoje).
- Novo evento PostHog `onboarding_submitted` (cliente, no submit), além do
  `track("restaurant_created")` que já existe.

## 2. Construtor: itens de exemplo e saída para fotos

**Exemplos.** Quando o restaurante não tem rascunho nem cardápio publicado,
`initialBuilderMenu` devolve o cardápio de exemplo do locale (reaproveita os
itens de `LANDING_DEMO[locale].menu`, sem nome de restaurante) com cada item
marcado `sample: true`.

- `MenuItem` ganha `sample?: true` (opcional; `MenuSchema` aceita no rascunho).
- Item de exemplo aparece esmaecido com o selo "exemplo" e o botão apagar.
- **Editar** qualquer campo de um item de exemplo remove o `sample` dele (vira
  item real). Apagar remove o item.
- Botão **Limpar exemplos** no topo do passo Itens, visível enquanto houver
  algum `sample`.
- **Publicar** com algum `sample` restante: bloqueado no cliente (botão
  desabilitado + aviso "Edite ou apague os itens de exemplo") **e** no servidor
  (`publishMenu` rejeita menu com `sample`). O cardápio publicado nunca contém
  `sample`.
- Seções de exemplo vazias depois de apagar os itens seguem as regras atuais
  do construtor (seção vazia não aparece no cardápio público).

**Saída para fotos.** O construtor ganha um link discreto
"Já tenho fotos do cardápio →" para `/dashboard/fotos` (abaixo).
`MenuStartChoice` deixa de ser usado (a entrada vai direto ao construtor).

## 3. Início (`/dashboard` com restaurante)

De cima para baixo:

1. **Cartão do cardápio** — nome do negócio; situação: "● No ar · N itens"
   (texto), "● No ar · N fotos" (fotos) ou "Rascunho — ainda não publicado";
   botões grandes **Abrir cardápio ↗** (só se publicado) e **Editar** (texto →
   `/dashboard/cardapio`; fotos → `/dashboard/fotos`). Sem cardápio publicado,
   o botão principal é **Continuar meu cardápio** → construtor.
2. **Próximo passo** — um único card, escolhido por função pura
   `nextStep(state)` em `src/lib/next-step.ts`, na ordem:
   1. `finish_menu` — nada publicado → "Termine seu cardápio" (→ construtor)
   2. `share` — publicado e `totalViews === 0` → o `MenuLiveCallout` de hoje
   3. `whatsapp` — modo texto e sem `whatsappNumber` → "Receba pedidos no
      WhatsApp", com o campo do número (com microfone) e Salvar ali mesmo
   4. `delivery` — nenhum link de app de entrega → "Adicione seus links do
      iFood…" (→ Ajustes, âncora `#country`)
   5. `null` — tudo feito → nenhum card
   (No modo fotos o passo `whatsapp` é pulado: o pedido pelo WhatsApp só existe
   no cardápio em texto.)
3. **Divulgar** — `MenuQrCard` (mantém `id="menu-qr"`), em versão compacta.
   Só aparece com cardápio publicado.
4. **Números** — uma linha "7 dias: X visitas · Y pedidos"; o detalhe do
   `MenuStatsCard` atual fica num `<details>` fechado.

**Cabeçalho**: logo, **⚙ Ajustes**, selo do plano ("Pro" → Ajustes, ou "Fazer
upgrade" → `/pricing`). O botão Sair sai do cabeçalho e vai para Ajustes. O
link "Ver cardápio" do cabeçalho some (o cartão do cardápio já tem).

**Fica fora do Início**: formulário de dados, apps de entrega, envio de fotos,
troca de senha, excluir conta.

## 4. Ajustes (`/dashboard/ajustes`, página nova)

Topo: "← Início". Blocos:

1. **Dados do negócio** — `RestaurantSettingsForm` atual (nome, endereço,
   WhatsApp, Instagram, descrição, país), sempre em modo edição; cada campo de
   texto ganha `MicButton`.
2. **Apps de entrega** — os campos de links (hoje dentro do mesmo formulário;
   continuam no mesmo formulário, só com título próprio e `id="country"`).
3. **Plano** — "Pro até DD/MM/AAAA" + Gerenciar (portal Stripe), ou Fazer
   upgrade.
4. **Conta** — `ChangePasswordCard` (só com senha), Sair, `DeleteAccountCard`
   por último.

## 5. Fotos (`/dashboard/fotos`, página nova)

Hospeda o `ImageManager` de hoje, com "← Início". Para quem usa cardápio em
foto, e para quem sai do construtor por "Já tenho fotos". O comportamento de
`switchToPhotosOnUpload` continua: enviar fotos com um cardápio em texto no ar
troca o modo, como hoje.

## 6. Rotas, links e compatibilidade

- `/dashboard?edit=1` → redireciona para `/dashboard/ajustes` (e-mails e links
  antigos). `?edit=1#country` → `/dashboard/ajustes#country`.
- Links internos que apontam para `?edit=1` (`built-menu-card.tsx`,
  `delivery-setup-callout.tsx`) passam a apontar para `/dashboard/ajustes`.
- `proxy.ts` já guarda `/dashboard/*`; as duas páginas novas herdam a guarda.
- `/dashboard/ajustes` e `/dashboard/fotos` sem restaurante → `redirect("/dashboard")`
  (cai na entrada).
- `DashboardTelemetry` continua montado **só** no `/dashboard` (Início): é a
  página de chegada de todo caminho (cadastro, volta do Google, volta do
  Stripe). O construtor redireciona para `/dashboard` ao publicar (como hoje),
  então `menu_published` continua disparando.
- i18n: todos os textos novos nos três dicionários (pt-BR, es, en), como
  strings (sem funções).

## 7. Testes

- **vitest**:
  - `pickSlug`: acentos ("Lanchonete do Zé" → `lanchonete-do-ze`), colisão
    (`-2`, `-3`), slug reservado (`seu-restaurante` → `seu-restaurante-2`),
    nome vazio/emoji (`cardapio`), esgotamento (sufixo aleatório).
  - `nextStep`: as cinco situações, e o pulo de `whatsapp` no modo fotos.
  - Exemplos: `initialBuilderMenu` sem rascunho → itens `sample`; editar um item
    remove `sample`; `publishMenu`/validação rejeita menu com `sample`.
- **Manual (build de produção local, banco de dev)**: conta nova → nome por voz
  → construtor com exemplos → apagar/editar → publicar → Início → Ajustes →
  Fotos. Prints em largura de celular (375 px) do Início nas situações
  `finish_menu`, `whatsapp` e `null`.
- `tsc --noEmit`, `npm test`, lint em `src`, `next build`.

## 8. Entrada no ar

- **Só depois de 15/10** (fim do teste 2 de anúncios).
- Sem migração. Deploy normal (`vercel deploy --prod`, pelo dono).
- Depois do deploy: conta nova de teste em produção (dono) passando pelo
  fluxo; conferir `/m/<slug>` e o funil (`no_restaurant`) na semana seguinte.
