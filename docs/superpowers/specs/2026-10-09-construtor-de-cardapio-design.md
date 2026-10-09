# Construtor de cardápio — design

Data: 2026-10-09 · Status: revisado (revisão do Fable incorporada), aguardando
aprovação do dono

## Por que

O teste de R$ 100 no Google Ads (02–06/10/2026, ver `docs/ads-2026-09.md`)
mostrou que o topo do funil funciona (CPC R$ 2,78, CTR 5,45%, 14% dos cliques
viram cadastro) e que o produto perde todo mundo no primeiro minuto do painel:
**5 cadastros reais, 3 restaurantes criados, 0 imagens enviadas**, e 2 pessoas
excluíram a própria conta logo depois de criar o restaurante. Os termos de
pesquisa ("cardápio de drinks para editar", "cardápio de bolos para editar")
indicam gente procurando um editor, não um lugar para subir foto — e, sem foto
de cardápio à mão, o painel atual não oferece nada para fazer.

**Objetivo:** quem não tem foto consegue montar e publicar um cardápio sozinho,
pelo celular, em poucos minutos.

**Sucesso:** cadastros não acompanhados pelo dono do menulala passam a
publicar. Referência: ≥ 1 em cada 5 dos próximos cadastros self-serve.

**Restrição de negócio:** o dono do menulala não monta cardápios para
restaurantes. Tudo aqui é autoatendimento, sem trabalho manual por cliente.

## Decisões tomadas

| # | Decisão | Alternativa descartada |
|---|---|---|
| 1 | O cardápio montado é exibido como **texto na página** (HTML) | Gerar imagem do cardápio — pesada, borra no zoom, precisa ser refeita a cada preço, invisível ao Google |
| 2 | Plano grátis publica **até 20 itens**; Pro, todos | Limite por "páginas" (não existe página em texto) |
| 3 | **Um modo por vez** por restaurante: fotos *ou* montado, trocável sem perder dados | Os dois juntos na mesma página; só montado para contas novas |
| 4 | Itens guardados como **JSON em colunas do `Restaurant`**, com rascunho e publicado separados | Tabelas normalizadas de seção/item; tabela de versões |
| 5 | Construtor em **passo a passo**: Visual → Itens → Prévia | Tela única; edição em cima da prévia |
| 6 | **Dois estilos de cabeçalho** à escolha: Centralizado (padrão) e Faixa | Um só; três ou mais |
| 7 | Quando o Pro vence, a página pública **passa a mostrar só os 20 primeiros itens**; nada é apagado | Manter o publicado intacto até a próxima publicação |
| 8 | Voz via **ditado do teclado do celular** num campo único "nome preço" | Botão de áudio próprio com serviço de transcrição (custo e fornecedor novos) |
| 9 | O passo 1 do construtor **confirma o país** do restaurante, que define idioma e moeda | Inferir do idioma do navegador (o cadastro não pede país, e `country` nulo cai em inglês sem moeda) |

## Fora de escopo

- Botão de gravação de áudio próprio e transcrição no servidor.
- Importar cardápio a partir de foto com IA.
- Foto por item; preços por tamanho (P/M/G); arrastar para reordenar.
- Versão para imprimir (imagem/PDF) do cardápio montado.
- Aplicar limite aos **cardápios de foto** quando o Pro vence. Hoje a página
  pública mostra todas as imagens mesmo depois do vencimento
  (`src/app/m/[slug]/page.tsx` não consulta o plano). Fica como tarefa separada.
- Edição simultânea em dois aparelhos: vale a última gravação (ver §3).

## Etapas de entrega

O trabalho é grande demais para um plano só. Três etapas, cada uma com plano
próprio, deploy próprio e conferência antes da seguinte:

| Etapa | Conteúdo | Vai ao ar sozinha? |
|---|---|---|
| **A — Base** | migração + script de verificação; `src/lib/menu.ts` (esquema, `visibleMenu`, moeda, `isPublished`, modo efetivo); `getRestaurant`; `BuiltMenu` + JSON-LD + ping de visualização; ação `publishMenu`; `isPublished` aplicado no painel e na telemetria; vitest | Sim. Nenhum dono vê mudança; um cardápio de teste é publicado por script e conferido em `/m/<slug>` |
| **B — Construtor** | `/dashboard/cardapio`; país; logo e cores; seções e itens; interpretação de linha; "colar lista"; salvamento automático; prévia; entrada pelo painel; eventos do PostHog | Sim. É a etapa que os donos veem |
| **C — Plano e medição** | aviso de itens escondidos no painel; e-mails de fim do Pro; `/pricing`; `funnel.ts` e skill `daily-ads-report`; Playwright | Sim |

## 1. Dados

Migração única em `Restaurant`, todas as colunas anuláveis ou com padrão, SQL
`IF NOT EXISTS` (seguro repetir):

| Coluna | Tipo | Conteúdo |
|---|---|---|
| `menuMode` | `text`, padrão `'photos'` | `'photos'` ou `'built'`; escrito **só** por "Publicar" e pelos links de troca de modo (ver §2, modo efetivo) |
| `menuTheme` | `jsonb`, anulável | `{ logoUrl?: string, color: string, headerStyle: 'centered' \| 'band' }` |
| `menuDraft` | `jsonb`, anulável | o cardápio em edição |
| `menuPublished` | `jsonb`, anulável | o que o cliente vê |

Formato do cardápio (rascunho e publicado são iguais):

```ts
type Menu = {
  v: 1;
  sections: {
    id: string;            // gerado no cliente, /^[a-z0-9_-]{1,32}$/, único no cardápio
    title: string | null;  // até 60 caracteres; null = seção sem título (lista única)
    items: {
      id: string;              // mesmo formato, único no cardápio
      name: string;            // 1–80 caracteres
      description?: string;    // até 200 caracteres
      priceCents: number | null; // inteiro ≥ 0; null = sem preço
    }[];
  }[];
};
```

- Esquema `zod` único em `src/lib/menu.ts`: `trim()` em todo texto, tetos de
  tamanho acima, ids únicos (`superRefine`), no máximo 30 seções e 300 itens.
  Toda gravação passa por ele no servidor; nada vindo do cliente é gravado sem
  validação.
- **Leitura inválida tem dois tratamentos diferentes:**
  - na **página pública**, `menuPublished` inválido → `console.error` +
    `throw`. A regeneração falha e o ISR continua servindo a última versão boa.
    Renderizar vazio com 200 substituiria o cardápio bom no cache (invariante da
    memória `outage resilience`);
  - no **construtor**, `menuDraft` inválido → começa vazio, com aviso.
- Preço em centavos inteiros. Moeda vem do país: tabela `COUNTRY_CURRENCY` em
  `src/lib/menu.ts` (BR→BRL, PT→EUR, ES→EUR, MX→MXN, AR→ARS, CL→CLP, CO→COP,
  US→USD, …, fallback USD). Formatação com
  `Intl.NumberFormat(localeForCountry(country), { style: 'currency', currency })`.
- Logo no Vercel Blob com prefixo `logos/<restaurantId>/`; `menuTheme` guarda só
  a URL.
- Restaurantes existentes ficam com `menuMode = 'photos'` e não mudam em nada.
- **O rascunho não altera `Restaurant.updatedAt`.** O `sitemap.ts` usa esse campo
  como `lastModified`; um salvamento de rascunho não muda a página pública e não
  deve sinalizar mudança ao Google. O salvamento do rascunho é feito com
  `$executeRaw` (ou equivalente que não dispare `@updatedAt`); "Publicar"
  atualiza `updatedAt` normalmente.

## 2. Página pública (`/m/[slug]`)

**Modo efetivo** — regra única em `src/lib/menu.ts`, usada pela página, pelo
painel e pelo funil:

```
temFotos   = ≥ 1 imagem
temMontado = menuPublished tem ≥ 1 item

modo efetivo = menuMode,            se o modo escolhido tem conteúdo
               o outro modo,        se só o outro tem conteúdo
               'photos',            se nenhum tem (estado "preparando" de hoje)
```

Assim, nenhuma combinação de cliques deixa a página em branco quando existe
algum cardápio: enquanto não houver cardápio montado publicado, o slideshow de
fotos continua no ar; e se o dono voltar para fotos e depois apagar todas as
imagens, o cardápio montado volta a aparecer.

**`isPublished(restaurant)`** = tem ≥ 1 imagem **ou** `menuPublished` com ≥ 1
item (no modo efetivo correspondente).

- `getRestaurant` (`src/app/m/[slug]/data.ts`) passa a trazer também
  `menuMode`, `menuTheme`, `menuPublished` e o `proExpiresAt` do dono. Continua
  **uma chamada**, memoizada por `cache()` e compartilhada entre layout,
  metadata e página; por baixo o Prisma faz uma consulta por relação (hoje já
  são duas, com o dono passam a três), tudo dentro de uma regeneração.
- Modo efetivo `photos`: slideshow atual, sem mudança.
- Modo efetivo `built`: componente novo `BuiltMenu`:
  - cabeçalho Centralizado (logo redondo, nome em fonte de título, linha fina na
    cor) ou Faixa (faixa de cor encostada no topo, logo sobreposto, nome abaixo);
    sem logo, só o nome;
  - seções com título; linhas "nome … preço", descrição em fonte menor;
  - botões de WhatsApp, Instagram e delivery já existentes, mantidos;
  - **registra a visualização** como o slideshow faz
    (`pingMenuEvent(slug, "view")`, e os cliques de WhatsApp/delivery), senão as
    estatísticas e o aviso "cardápio no ar" nunca fecham para cardápios montados.
- Idioma da página: `localeForCountry(restaurant.country)`, como hoje.
- **Limite aplicado na renderização:** `visibleMenu(menu, isPro(owner))` corta
  nos 20 primeiros itens na ordem do cardápio quando não-Pro; seções que ficam
  sem itens visíveis somem. Nenhum aviso ao cliente final.
- **Quando a mudança de plano aparece:** `revalidate = 60` com
  stale-while-revalidate — o primeiro acesso depois de ~60 s ainda recebe a
  versão antiga e dispara a regeneração; o seguinte já vê o novo limite. Vale
  para vencimento e para assinatura (o webhook da Stripe não chama
  `revalidatePath`). Sem tráfego a página não regenera, o que é inofensivo.
- ISR mantido: com o banco fora do ar, a última versão boa continua servida.
- JSON-LD: o `Restaurant` existente ganha `hasMenu` como `Menu` com
  `MenuSection` / `MenuItem` / `offers` (`price`, `priceCurrency`), só com os
  itens visíveis. Serializado pelo `jsonLdScript` existente, que já escapa
  conteúdo para dentro de `<script>`.
- Contraste: se a cor escolhida tiver contraste insuficiente com o fundo branco
  (WCAG AA para texto grande), ela é usada só em linha/faixa e os títulos ficam
  escuros.

## 3. Construtor (`/dashboard/cardapio`)

Página própria, separada do painel, otimizada para celular.

**Entrada:** com restaurante criado e sem nada publicado (`isPublished` falso),
o estado vazio do `ImageManager` vira duas opções: **"Montar meu cardápio"**
(destacada) e "Tenho fotos do cardápio". No painel, conforme o modo efetivo:

- modo efetivo `photos`: link **"Montar cardápio em vez disso"**, que apenas
  **abre o construtor**. Não muda `menuMode`; a troca acontece no "Publicar".
- modo efetivo `built`: o `ImageManager` some e entra um cartão "Seu cardápio"
  com "Editar". Link **"Usar fotos em vez disso"** muda `menuMode` para
  `'photos'` **só se houver ≥ 1 imagem**; sem imagens, abre o envio de fotos e a
  troca acontece quando a primeira imagem é enviada. Nada é apagado em nenhum
  sentido.

**Passo 1 — Visual**
- **País** do restaurante: seletor pré-preenchido pelo idioma do painel, grava
  em `Restaurant.country`. Define idioma da página, moeda e as sugestões de seção.
- Envio de logo (opcional, até **2 MB**, jpeg/png/webp). Trocar ou remover apaga
  o arquivo anterior do Blob (`del`); excluir a conta também apaga o logo.
- Cores: extraídas **do arquivo local no celular, antes do envio** (canvas sobre
  um object URL), nunca da URL do Blob — o navegador bloqueia leitura de pixels
  de imagem de outra origem. As 3 cores mais saturadas e distintas; "mais cores"
  abre ~8 paletas prontas (as únicas opções sem logo). Nada é aplicado sem toque
  do dono.
- Estilo de cabeçalho: duas miniaturas, Centralizado é o padrão.
- Prévia ao vivo do cabeçalho.

**Passo 2 — Itens**
- Sugestões de seção para tocar: Lanches, Pratos, Pizzas, Porções, Bebidas,
  Sobremesas, Açaí, "outra…", no idioma de
  `localeForCountry(restaurant.country)`. "+ Nova seção" no fim da lista. Sem
  nenhuma seção criada, existe uma seção implícita sem título.
- Cada seção tem um campo "adicionar item" que interpreta uma linha. **Preço é
  um número no fim da linha**, opcionalmente precedido de `R$`/`$`, e que **não
  esteja colado a unidade** (`ml`, `l`, `g`, `kg`, `cm`, `un`, `x`). Aceita
  `25,90`, `25.90`, `R$ 25,90`, `25`, `25 e 90`, `25 reais e 90`. Qualquer outro
  caso: o item entra **sem preço**, marcado para completar — nunca com preço
  errado silencioso. Exemplos: "Água 500ml" → sem preço; "Água 500ml 4,00" →
  R$ 4,00; "Pizza 35cm 59,90" → R$ 59,90. O campo funciona igual com o ditado
  do teclado do celular.
- Tocar no item abre edição: nome, descrição, preço, mover de seção, excluir.
  Setas ↑↓ reordenam itens e seções; título da seção é editável.
- "Colar lista": textarea; cada linha com preço vira item; linha sem preço
  seguida de linhas com preço vira título de seção. Mostra prévia do resultado
  antes de adicionar.
- Contador "N / 20 grátis". A partir do 21º item (não-Pro), itens excedentes
  aparecem acinzentados com "não aparece no plano grátis" e um aviso inline com
  link para `/pricing`. Nunca bloqueia cadastro nem publicação.

**Salvamento automático**
- Ação `saveMenuDraft({ restaurantId, menu })`: confere que o restaurante é do
  usuário da sessão, valida com o esquema, grava só `menuDraft`. **Não chama
  `revalidatePath`** — no Next 16, revalidar dentro de uma Server Action
  recarrega as páginas visitadas, e isso aconteceria a cada 2 s.
- Disparo ~2 s após a última mudança (uma escrita por pausa), indicador
  "salvo ✓"; falha de rede mostra "não salvo, tentando de novo" e mantém o
  estado local.
- Dois aparelhos editando ao mesmo tempo: vale a última gravação. Aceito
  conscientemente; o caso é raro para um dono de restaurante.

**Passo 3 — Prévia e publicar**
- A prévia renderiza `BuiltMenu` com o estado atual da tela e o plano atual
  (mesma `visibleMenu`), com uma linha "daqui para baixo, só no Pro" quando
  houver excedente.
- Ação `publishMenu({ restaurantId, menu })`: recebe **o cardápio que está na
  tela** (não lê o rascunho do banco, que pode estar até 2 s atrasado), confere
  dono, valida, e num único `update` grava `menuDraft` e `menuPublished` com o
  mesmo valor, define `menuMode = 'built'` e atualiza `updatedAt`. Depois
  `revalidatePath('/m/<slug>')` e `revalidatePath('/dashboard')`, e volta ao
  painel, onde o `MenuLiveCallout` aparece.

**Depois da primeira publicação:** o construtor abre direto em Itens e os
passos viram abas.

## 4. Painel: pontos que passam a usar `isPublished` / modo efetivo

Hoje tudo está preso a `images.length`. Passam a usar as regras da §2:

- `src/app/(main)/dashboard/page.tsx` — condição do `MenuLiveCallout` (hoje
  `restaurant.images.length > 0 && stats.totalViews === 0`), o `hasMenu`
  passado à telemetria, e a escolha entre `ImageManager` e o cartão "Seu
  cardápio".
- `src/app/(main)/dashboard/dashboard-telemetry.tsx` — `hasMenu`, para que a
  conversão "cardápio publicado" do Google Ads e o `menu_published` do PostHog
  disparem para o cardápio montado (propriedade `mode`).
- `src/lib/funnel.ts` — contagem de "publicado" e status (etapa C, ver §6).

## 5. Plano grátis/Pro e avisos (etapa C)

- `FREE_ITEM_LIMIT = 20` em `src/lib/pricing.ts`, junto ao `FREE_IMAGE_LIMIT`.
  `visibleMenu()` é a única implementação do corte, usada pela página pública,
  pela prévia, pelo contador e pelos avisos. (A constante e a função entram já
  na etapa A, porque a página pública depende delas.)
- Painel: com modo efetivo `built`, não-Pro e itens escondidos > 0, um aviso
  "N itens não aparecem no seu cardápio" com botão para o Pro.
- E-mails de fim do Pro (`src/lib/pro-ending.ts`, estágios 7, 1 e 0): quando o
  restaurante está no modo efetivo `built` com mais de 20 itens publicados, o
  e-mail ganha uma frase com quantos itens deixam (ou deixaram) de aparecer.
  Textos nos três dicionários, como strings com marcadores substituídos depois
  (dicionários não podem conter funções — memória `i18n architecture`).
- `/pricing`: "Grátis: até 20 itens ou 2 fotos"; "Pro: itens ilimitados ou 20
  fotos", nos três idiomas.

## 6. Medição

- Etapa A: `hasMenu` da telemetria passa a usar `isPublished` (§4).
- Etapa B — eventos novos no PostHog, com o super property
  `product: 'menulala'`: `menu_mode_chosen {mode}`, `builder_step {step}`,
  `item_added {via: typed|pasted}`, `logo_uploaded`.
- Etapa C — `src/lib/funnel.ts`: "publicado" passa a ser `isPublished`. Status
  `no_images` vira `no_menu`; cada conta ganha `mode`. A skill
  `daily-ads-report` é atualizada para os nomes novos.

## 7. Deploy (vale para cada etapa que tiver migração — só a A tem)

1. Dono cola a migração no SQL Editor do Neon de produção (`menulala-prod`).
2. Script somente-leitura (no molde de `scripts/verify-acquisition.ts`) confirma
   host, as quatro colunas e o padrão de `menuMode`.
3. Dono roda `vercel deploy --prod`.
4. Conferência: login, painel, um cardápio de fotos existente inalterado, um
   cardápio montado de teste publicado e visível em `/m/<slug>`.

Sem variável de ambiente nova, sem serviço pago novo. Escritas no Neon: uma por
pausa de edição.

**O que quebra se o código for antes da migração:** o login **não** (o adapter
do Auth.js só lê `User`). O painel e qualquer leitura de `Restaurant` dão erro.
A página pública continua servindo a versão em cache; só um slug sem cache dá
erro. Por isso a ordem acima continua obrigatória.

## 8. Testes

O projeto hoje não tem `vitest` nem Playwright; `vitest` entra na etapa A e
Playwright na etapa C, ambos como `devDependencies`.

- **vitest:**
  - interpretação de linha: `25,90`, `25.90`, `R$ 25`, `25 e 90`, sem preço,
    nome com número ("X-Tudo 2 carnes 32,00"), unidades ("Água 500ml",
    "Coca 2L", "Pizza 35cm", "Água 500ml 4,00");
  - "Colar lista";
  - `visibleMenu` (corte em 20, seção vazia some, Pro mostra tudo);
  - modo efetivo e `isPublished` (todas as combinações de `menuMode`, imagens e
    `menuPublished`);
  - esquema `zod` (tetos, ids duplicados, ids fora do formato, `trim`);
  - moeda por país e fallback;
  - extração de cor e regra de contraste.
- **Playwright (viewport de celular, etapa C):** montar → publicar → abrir
  `/m/<slug>` e ver os itens; com 25 itens em conta grátis, a página mostra 20.
- **Manual, celular real, build de produção** (o iPhone não hidrata contra
  `next dev` pela rede): ditado do teclado no iOS e no Android no campo de item.

## Riscos

- **Interpretação de preço ditado:** o texto que o ditado produz varia por
  aparelho e idioma. Mitigação: na dúvida o item entra sem preço e marcado; o
  teste manual no celular real é obrigatório antes de anunciar.
- **Deploy antes da migração** quebra o painel (§7). Mitigação: script de
  verificação no passo 2.
- **Hipótese não comprovada:** que quem desistiu desistiu por falta de foto. Se
  o construtor não mover a taxa de publicação, o problema está antes (entender
  o que é o produto), e a próxima investigação é o replay de quem abre o
  construtor e não publica (`builder_step`).
