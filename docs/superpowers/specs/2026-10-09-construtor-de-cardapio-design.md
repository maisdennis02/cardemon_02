# Construtor de cardápio — design

Data: 2026-10-09 · Status: rascunho para revisão

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

## Fora de escopo

- Botão de gravação de áudio próprio e transcrição no servidor.
- Importar cardápio a partir de foto com IA.
- Foto por item; preços por tamanho (P/M/G); arrastar para reordenar.
- Versão para imprimir (imagem/PDF) do cardápio montado.
- Aplicar limite aos **cardápios de foto** quando o Pro vence. Hoje a página
  pública mostra todas as imagens mesmo depois do vencimento
  (`src/app/m/[slug]/page.tsx` não consulta o plano). Fica como tarefa separada.

## 1. Dados

Migração única em `Restaurant`, todas as colunas anuláveis ou com padrão, SQL
`IF NOT EXISTS` (seguro repetir):

| Coluna | Tipo | Conteúdo |
|---|---|---|
| `menuMode` | `text`, padrão `'photos'` | `'photos'` ou `'built'` |
| `menuTheme` | `jsonb`, anulável | `{ logoUrl?: string, color: string, headerStyle: 'centered' \| 'band' }` |
| `menuDraft` | `jsonb`, anulável | o cardápio em edição |
| `menuPublished` | `jsonb`, anulável | o que o cliente vê |

Formato do cardápio (rascunho e publicado são iguais):

```ts
type Menu = {
  v: 1;
  sections: {
    id: string;          // gerado no cliente, estável entre edições
    title: string | null; // null = seção sem título (lista única)
    items: {
      id: string;
      name: string;            // 1–80 caracteres
      description?: string;    // até 200 caracteres
      priceCents: number | null; // null = sem preço
    }[];
  }[];
};
```

- Preço em centavos inteiros; formatação só na exibição, pelo `country` do
  restaurante (`Intl.NumberFormat`).
- Teto contra abuso, validado no servidor: 30 seções, 300 itens no total.
- Esquema `zod` único em `src/lib/menu.ts`, usado ao salvar e ao ler. Leitura
  inválida vira cardápio vazio, nunca exceção na página pública.
- Logo enviado ao Vercel Blob pela rota de upload existente; `menuTheme` guarda
  só a URL.
- Restaurantes existentes ficam com `menuMode = 'photos'` e não mudam em nada.

## 2. Página pública (`/m/[slug]`)

- `getRestaurant` (`src/app/m/[slug]/data.ts`) passa a trazer também
  `menuMode`, `menuTheme`, `menuPublished` e o `proExpiresAt` do dono — ainda
  **uma consulta** por regeneração.
- `menuMode = 'photos'`: slideshow atual, sem mudança.
- `menuMode = 'built'`: componente novo `BuiltMenu`:
  - cabeçalho Centralizado (logo redondo, nome em fonte de título, linha fina na
    cor) ou Faixa (faixa de cor encostada no topo, logo sobreposto, nome abaixo);
    sem logo, só o nome;
  - seções com título; linhas "nome … preço", descrição em fonte menor;
  - botões de WhatsApp, Instagram e delivery já existentes, mantidos.
- **Limite aplicado na renderização:** `visibleMenu(menu, isPro(owner))` corta
  nos 20 primeiros itens na ordem do cardápio quando não-Pro; seções que ficam
  sem itens visíveis somem. Nenhum aviso ao cliente final.
- `revalidate = 60` continua: o vencimento do Pro aparece em até 60 s, sem cron.
- ISR mantido: a página continua servida do cache com o banco fora do ar
  (invariante da memória `outage resilience`).
- JSON-LD: o `Restaurant` existente ganha `hasMenu` como objeto `Menu` com
  `MenuSection` / `MenuItem` / `offers.price` (só os itens visíveis).
- Contraste: se a cor escolhida tiver contraste insuficiente com o fundo
  branco (WCAG AA para texto grande), ela é usada só em linha/faixa e os
  títulos ficam escuros.

## 3. Construtor (`/dashboard/cardapio`)

Página própria, separada do painel, otimizada para celular.

**Entrada:** com restaurante criado e sem cardápio publicado, o estado vazio do
`ImageManager` vira duas opções: **"Montar meu cardápio"** (destacada) e
"Tenho fotos do cardápio". No painel, um link permite trocar de modo depois
("Usar fotos em vez disso" / "Montar cardápio em vez disso"); trocar só muda
`menuMode` e reconstrói a página — nada é apagado.

**Passo 1 — Visual**
- Envio de logo (opcional), remover/trocar.
- Cores: extração no navegador (canvas) das 3 cores mais saturadas e distintas
  do logo; "mais cores" abre ~8 paletas prontas (as únicas opções sem logo).
  Nada é aplicado sem toque do dono.
- Estilo de cabeçalho: duas miniaturas, Centralizado é o padrão.
- Prévia ao vivo do cabeçalho.

**Passo 2 — Itens**
- Sugestões de seção para tocar: Lanches, Pratos, Pizzas, Porções, Bebidas,
  Sobremesas, Açaí, "outra…" (pt-BR, en, es). "+ Nova seção" no fim da lista.
  Sem nenhuma seção criada, existe uma seção implícita sem título.
- Cada seção tem um campo "adicionar item" que interpreta uma linha:
  **o último número da linha é o preço**. Aceita `25,90`, `25.90`, `R$ 25,90`,
  `25`, `25 e 90`, `25 reais e 90`. Sem número reconhecido, o item entra sem
  preço e fica marcado para completar. O campo funciona igual com o ditado do
  teclado do celular.
- Tocar no item abre edição: nome, descrição, preço, mover de seção, excluir.
  Setas ↑↓ reordenam itens e seções; título da seção é editável.
- "Colar lista": textarea; cada linha com preço vira item; linha sem preço
  seguida de linhas com preço vira título de seção. Mostra prévia do resultado
  antes de adicionar.
- Contador "N / 20 grátis". A partir do 21º item (não-Pro), itens excedentes
  aparecem acinzentados com "não aparece no plano grátis" e um aviso inline com
  link para `/pricing`. Nunca bloqueia cadastro nem publicação.
- Salvamento automático do rascunho (~2 s após a última mudança, uma escrita
  por pausa) com indicador "salvo ✓"; falha de rede mostra "não salvo, tentando
  de novo" e mantém o estado local.

**Passo 3 — Prévia e publicar**
- A prévia renderiza `BuiltMenu` com o rascunho e o plano atual (mesma função
  de corte), com uma linha "daqui para baixo, só no Pro" quando houver excedente.
- "Publicar cardápio": copia `menuDraft` → `menuPublished`, define
  `menuMode = 'built'`, `revalidatePath('/m/<slug>')` e `/dashboard`, e volta ao
  painel, onde o `MenuLiveCallout` existente ("seu cardápio está no ar") aparece.

**Depois da primeira publicação:** o construtor abre direto em Itens e os
passos viram abas.

## 4. Plano grátis/Pro e avisos

- `FREE_ITEM_LIMIT = 20` em `src/lib/pricing.ts`, junto ao `FREE_IMAGE_LIMIT`.
  `visibleMenu()` é a única implementação do corte, usada pela página pública,
  pela prévia, pelo contador e pelos avisos.
- Painel: com `menuMode = 'built'`, não-Pro e itens escondidos > 0, um aviso
  "N itens não aparecem no seu cardápio" com botão para o Pro.
- E-mails de fim do Pro (`src/lib/pro-ending.ts`, estágios 7, 1 e 0): quando o
  restaurante usa o cardápio montado e tem mais de 20 itens publicados, o
  e-mail ganha uma frase com quantos itens deixam (ou deixaram) de aparecer.
  Textos nos três dicionários, como strings com marcadores substituídos depois
  (dicionários não podem conter funções — memória `i18n architecture`).
- `/pricing`: "Grátis: até 20 itens ou 2 fotos"; "Pro: itens ilimitados ou 20
  fotos", nos três idiomas.

## 5. Medição

- `src/lib/funnel.ts`: "publicado" passa a ser *tem ≥ 1 imagem* **ou** *tem
  `menuPublished` com ≥ 1 item*. Status `no_images` vira `no_menu`; cada conta
  ganha `mode`. A skill `daily-ads-report` é atualizada para os nomes novos.
- `dashboard-telemetry.tsx`: `hasMenu` segue a mesma regra, então a conversão
  "cardápio publicado" do Google Ads e o `menu_published` do PostHog disparam
  para o cardápio montado, com a propriedade `mode`.
- Eventos novos no PostHog (com o super property `product: 'menulala'`):
  `menu_mode_chosen {mode}`, `builder_step {step}`, `item_added {via: typed|pasted}`,
  `logo_uploaded`.

## 6. Deploy

Ordem obrigatória (a mesma lição de 01/10):

1. Dono cola a migração no SQL Editor do Neon de produção (`menulala-prod`).
2. Script somente-leitura (no molde de `scripts/verify-acquisition.ts`) confirma
   host, as quatro colunas e o padrão de `menuMode`.
3. Dono roda `vercel deploy --prod`.
4. Conferência: login, painel, um cardápio de fotos existente inalterado, um
   cardápio montado de teste publicado e visível em `/m/<slug>`.

Sem variável de ambiente nova, sem serviço pago novo. Escritas no Neon: uma por
pausa de edição.

## 7. Testes

O projeto hoje não tem `vitest` nem Playwright; ambos entram como
`devDependencies`.

- **vitest:** interpretação de linha (`25,90`, `25.90`, `R$ 25`, `25 e 90`,
  sem preço, nome com número como "X-Tudo 2 carnes 32,00"), "Colar lista",
  `visibleMenu` (corte em 20, seção vazia some, Pro mostra tudo), esquema `zod`
  (rejeita acima dos tetos, leitura inválida vira vazio), extração de cor e
  regra de contraste.
- **Playwright (viewport de celular):** montar → publicar → abrir `/m/<slug>` e
  ver os itens; com 25 itens em conta grátis, a página mostra 20.
- **Manual, celular real, build de produção** (o iPhone não hidrata contra
  `next dev` pela rede): ditado do teclado no iOS e no Android no campo de item.

## Riscos

- **Interpretação de preço ditado:** o texto que o ditado produz varia por
  aparelho e idioma. Mitigação: item sem preço reconhecido entra marcado para
  completar, nunca com preço errado silencioso; o teste manual no celular real
  é obrigatório antes de anunciar.
- **Deploy antes da migração** quebra painel e página pública. Mitigação: passo
  2 do deploy.
- **Hipótese não comprovada:** que quem desistiu desistiu por falta de foto. Se
  o construtor não mover a taxa de publicação, o problema está antes (entender
  o que é o produto), e a próxima investigação é o replay de quem abre o
  construtor e não publica (`builder_step`).
