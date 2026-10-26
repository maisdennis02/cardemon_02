# Fotos dos produtos (o valor do Pro) — design

Data: 2026-10-25 · Status: aguardando revisão do dono
Prévia visual aprovada: https://claude.ai/artifact/LC8WdiTHFE2guvtju4efBw

## Por que

Nenhum pagante real. Os ativados do 3º lote têm 3 itens cada, então nenhum
limite do grátis chega perto deles: dentro do produto não existe motivo para
pagar (`docs/decisao-pro-2026-10.md`, opção B). Foto no item é o valor que o
dono enxerga na hora, é o padrão dos apps de delivery que ele e os clientes
dele já usam, e não desdiz nenhuma promessa da landing: o pedido pelo WhatsApp
continua grátis, sem taxa, em todos os planos.

**Sucesso:** um restaurante paga o Pro por causa das fotos. Sinal antecipado:
toques em "Ver o Pro" vindos do aviso de foto (`photo_pro_tapped`).

## Decisões tomadas (dono, 25/10)

| # | Decisão |
|---|---|
| 1 | O Pro oferece **fotos dos produtos**; pedido pelo WhatsApp segue grátis |
| 2 | Construir direto, sem o botão de teste antes |
| 3 | Layout = padrão iFood/DoorDash, "não inventar a roda" (prévia aprovada) |
| 4 | **Grátis envia e vê na prévia; só o Pro mostra aos clientes.** Pro vencido: as fotos somem da página pública e ficam guardadas |
| 5 | Teto de **20 fotos no grátis** (= `FREE_ITEM_LIMIT`, o mesmo corte de itens) |

## Fora de escopo

- Tela de recorte/enquadramento (corte automático pelo centro; se ficar ruim,
  o dono troca a foto).
- Carrossel "Destaques"/"Mais pedidos" no topo.
- Foto no cardápio de **fotos** (páginas de cardápio já são fotos).
- Foto nos cardápios de exemplo e no telefone da landing.
- Varredura de arquivos órfãos no Blob (ver §5, "vazamento conhecido").

## 1. Dados

- `MenuItem` ganha `photo?: { full: string; thumb: string }`, dentro do JSON
  `menuDraft`/`menuPublished` que já existe. **Sem migração de banco.**
- `ItemSchema` valida os dois endereços com `ITEM_PHOTO_URL_RE`:
  `https://<loja>.public.blob.vercel-storage.com/item-photos/<restaurantId>/…`.
- As ações que gravam o cardápio (`saveMenuDraft`, `publishMenu`) conferem
  que **toda foto está na pasta do próprio restaurante** (`photosBelongTo(menu,
  restaurantId)`); qualquer outra é recusada, como a logo.
- Cardápio salvo antes desta mudança não tem `photo`: continua válido.

## 2. Envio (painel do dono)

- No editor do item (`item-editor.tsx`), à esquerda de nome e preço, um
  quadrado de 96 px: **"Adicionar foto"** (`<input type="file"
  accept="image/*">`, que no celular oferece câmera ou galeria). Com foto: a
  miniatura e os botões **Trocar** e **Tirar**.
- Na lista de itens do passo 2, cada linha mostra a miniatura (ou um quadrado
  tracejado vazio).
- No próprio aparelho (`src/lib/item-photo.ts`, puro, testável onde der):
  1. lê a imagem (`createImageBitmap`, respeitando a orientação EXIF);
  2. corta o maior quadrado central;
  3. gera **thumb 240 px** e **full 800 px**, em WebP qualidade 0,8; se o
     navegador não codificar WebP (`toBlob` devolve outro tipo, caso de
     Safari antigo), usa JPEG 0,82;
  4. envia as duas com `upload()` do `@vercel/blob/client` para
     `item-photos/<restaurantId>/<itemId>-thumb.webp` e `-full.webp`
     (`addRandomSuffix` já vem da rota).
- `uploadRulesFor` ganha a pasta `item-photos/<restaurantId>/`: até **512 KB**,
  `image/webp` e `image/jpeg`.
- Enquanto envia: o quadrado mostra "Enviando…" e o botão Pronto continua
  ativo (o rascunho só ganha a foto quando as duas chegaram). Falhou: mensagem
  "Não deu para enviar a foto. Tente de novo." e o item fica como estava.

## 3. A regra do plano

- **Página pública:** função nova `publicMenu(menu, pro)` = `visibleMenu` (o
  corte dos 20 itens) **e, quando `pro` é falso, sem `photo` em nenhum item**.
  A página pública passa a chamar `publicMenu`, então o pedido e o JSON-LD
  herdam a regra. `visibleMenu` fica como está porque a prévia do painel
  também a usa, e lá as fotos aparecem sempre.
- **Prévia do painel:** mostra sempre as fotos.
- **Aviso no editor** (grátis, item com foto): "Na prévia você já vê o
  cardápio com as fotos. Para os clientes, as fotos aparecem no Pro. **Ver o
  Pro**" → `/pricing`, evento `photo_pro_tapped`.
- **Teto do grátis:** com 20 itens com foto no rascunho, "Adicionar foto"
  mostra "No grátis, até 20 fotos. No Pro, todas." e um link para o Pro (o
  mesmo evento, com `from: "limit"`).
- **No servidor**, `saveMenuDraft` recusa um rascunho de conta grátis com mais
  fotos que `max(FREE_ITEM_LIMIT, fotos do rascunho anterior)`. O `max`
  existe para quem perdeu o Pro: o rascunho dele pode ter 50 fotos e precisa
  continuar salvando; ele só não adiciona novas.
- Pro: o teto é o limite de itens do cardápio (`MENU_MAX_ITEMS`).

## 4. Cardápio público

- **Cartão** (`menu-item-card.tsx`): com foto, uma linha flex — texto à
  esquerda (nome, descrição cortada em 2 linhas, preço embaixo) e a thumb de
  96 × 96 px, cantos de 12 px, à direita; com pedido ligado, o "+" redondo fica
  sobre o canto inferior direito da foto. Sem foto, o cartão é o de hoje.
  `<img loading="lazy" decoding="async" width="96" height="96">` com `alt` = o
  nome do item.
- **Folha do item** (componente cliente novo, `item-sheet.tsx`): tocar no
  cartão abre uma folha de baixo para cima com a foto `full` na largura toda,
  botão fechar, nome, descrição inteira, preço e — com pedido ligado — `− 1 +`
  e "Adicionar · R$ x". Fecha com o X, com toque fora ou com Esc; o foco vai
  para a folha e volta ao cartão ao fechar.
  - **Mudança de comportamento:** hoje, com pedido ligado, tocar no item
    adiciona 1 (spec de 10/10, §2). Passa a: **tocar abre a folha; o "+"
    adiciona direto.** É o padrão iFood/DoorDash e o único jeito de ver a foto
    grande. Os controles − / + de um item já no carrinho continuam no cartão.
  - Sem pedido ligado, só cartões **com foto** abrem a folha (sem foto não há
    nada a mais para mostrar).
- A página continua renderizada no servidor (ISR); só a folha é cliente.

## 5. Limpeza do Blob

- Função pura `photosToDelete(before: Menu[], after: Menu[]): string[]` — os
  endereços presentes em algum cardápio de `before` e em nenhum de `after`.
- `saveMenuDraft`: `before = [rascunho anterior, publicado]`,
  `after = [rascunho novo, publicado]`.
- `publishMenu`: `before = [publicado anterior, rascunho]`,
  `after = [publicado novo, rascunho]`.
- `deleteAccount` (o único lugar que apaga restaurante hoje) inclui as fotos dos
  dois cardápios na lista de `del` que já existe para logo e páginas.
- `del` falhou: registra no log com o endereço, como a logo faz; nunca derruba
  o salvamento.
- **Vazamento conhecido:** uma foto enviada cujo rascunho nunca foi salvo (aba
  fechada no meio) fica órfã. É pequena e rara; uma varredura por `list()` fica
  para quando o painel de uso mostrar que importa.

## 6. Custo (Vercel Blob, plano Pro do time, conferido 25/10)

Preços da página oficial (atualizada 23/09/2026): armazenamento US$ 0,023/GB-mês;
envio = operação avançada a US$ 5 por milhão; leitura servida do cache não
conta como operação; transferência ~US$ 0,05/GB; exclusão grátis. Cobrado
contra o crédito mensal do Pro.

- Uma foto = 2 envios e ~120 KB. 1.000 fotos ≈ 120 MB ≈ US$ 0,003/mês de
  armazenamento e US$ 0,01 de envio.
- Um cardápio de 20 itens com foto pesa ~400 KB de thumbs; 10 mil aberturas ≈
  4 GB ≈ US$ 0,20.
- Conclusão: custo desprezível na escala atual; o teto de 20 no grátis existe
  pela coerência do plano, não pelo custo. Recomendado: um alerta de gasto no
  Spend Management da Vercel.

## 7. Medição

PostHog (painel do dono), com `product: menulala` como todo evento:

- `item_photo_added` `{ format: "webp" | "jpeg", ms }`
- `item_photo_removed`
- `item_photo_failed` `{ stage: "read" | "encode" | "upload" }`
- `photo_pro_tapped` `{ from: "notice" | "limit" }`

## 8. Idiomas

Todos os textos novos em `pt-BR.ts`, `en.1.ts` e `es.ts`, strings simples
(sem funções), como pede a arquitetura de i18n.

## 9. Testes

- `menu.test.ts`: esquema aceita `photo` válida e recusa endereço de fora;
  `visibleMenu` tira `photo` no grátis e mantém no Pro; cardápio antigo sem
  `photo` continua válido.
- `photosToDelete`: troca, remoção, item apagado, foto que só existe no
  publicado (não apaga), nada mudou (lista vazia).
- `uploadRulesFor`: pasta nova aceita, outra pasta de restaurante recusada,
  tamanho e tipo.
- Regra do teto: grátis com 20 recusa a 21ª; ex-Pro com 50 salva com 50 e
  recusa a 51ª; Pro aceita.
- `item-photo.ts`: o cálculo do quadrado central (puro).
- Componentes: cartão com e sem foto; folha abre, fecha, adiciona.
- **Conferência visual no celular: só depois da troca do HD pelo SSD** (o
  servidor de desenvolvimento não roda nesta máquina hoje).

## 10. Entrega

- Branch `fotos-dos-produtos`, a partir de `campo-de-preco` (os dois mexem no
  editor do item).
- Nada vai para produção antes da leitura do 3º lote (27/10). Deploy pelo dono
  (`vercel deploy --prod`), depois da conferência visual.
