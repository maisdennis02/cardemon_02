# Cardápio impresso igual ao celular — PDF e JPG (28/10/2026)

Substitui o visual da folha de `docs/superpowers/specs/2026-10-26-cardapio-impresso-design.md` (lista A4 em
duas colunas com linha pontilhada). Rota, cache, regras de 404 e rodapé continuam.

## Entendimento

**O que o dono disse:** quer o cardápio que montou no app, em versão impressa,
para usar como cardápio físico no restaurante. Tem que ser igual ao que o cliente
vê no celular, só ajustado por dimensões. Manter header e logo do cardápio.
Formatos: PDF e JPG (PNG não). Layout B: o visual do celular em duas colunas na
folha A4. Cards compactos. Fotos seguem o celular. Um JPG por página. JPG gerado
no navegador.

**Assumido (corrigir se errado):** só A4 (também para EUA); o cabeçalho completo
só na página 1; as páginas seguintes começam com uma faixa fina com o nome.

**Sucesso:** o dono abre "Cardápio para imprimir", toca em "Baixar PDF" ou
"Baixar imagem (JPG)" e recebe folhas A4 que, lado a lado com o celular, são
reconhecidamente o mesmo cardápio; no iPhone e no Android os JPGs vão para a
galeria ou o WhatsApp num toque.

## 1. A folha

- Tamanho fixo A4: 210 × 297 mm (794 × 1123 px CSS). Cada página é um `div.print-page`.
- Fundo do tema (`menuBackgroundStyle`) em toda a página, com
  `print-color-adjust: exact` para sair na impressão.
- **Página 1:** `BuiltMenuHeader` reutilizado (estilo centralizado ou faixa, logo,
  cor e fonte do título) — o mesmo do celular.
  O nome do restaurante sai **maior que no celular** (cerca de 44 px na folha, contra
  30 px no celular): na prévia de 28/10 ele sumia perto da faixa colorida.
- **Páginas 2+:** faixa fina no topo com o nome na fonte e cor do título.
- **Corpo:** uma ou duas colunas (regras na §2). Títulos de seção com `MENU_SECTION_TITLE_CLASS` e a cor do
  tema. Cards iguais aos do celular (`MenuItemCard`; com foto, o card com miniatura),
  na variante `compact`: menos padding e espaço entre cards. Sem chips, sem botões
  de ação, sem "+", sem folha de detalhe (nada clicável).
- **Fotos:** vêm de `printableMenu` → `publicMenu(published, pro)`, que já remove as
  fotos de quem não é Pro. Nada novo aqui.
- **Rodapé em toda página, alinhado à direita:** o QR para `/m/<slug>` fica no canto
  inferior direito da folha, para facilitar o scan, e à esquerda dele, alinhados à
  direita, o texto atual (`footerOrder` / `footerNoOrder`) e "Cardápio feito com
  menulala.com". Altura reservada no fim de cada página. Sai o truque de `position: fixed` da versão anterior.

## 2. Paginação

PDF e JPG precisam das mesmas páginas, então a paginação é feita no DOM, e não pelo
navegador na hora de imprimir.

- Função pura `paginate(blocks, capacity)` em `src/app/m/[slug]/print/paginate.ts`:
  recebe blocos `{ kind: "title" | "item", height }` e a altura útil de uma coluna
  (diferente na página 1, por causa do header) e devolve
  `pages[] → columns[1 ou 2] → blocks[]`. Ordem: coluna 1 da página 1, coluna 2 da
  página 1, coluna 1 da página 2…
- Regras: um título de seção nunca fica sozinho no fim de uma coluna (vai junto com
  o primeiro card); um card nunca é partido; um card mais alto que a coluna ocupa a
  coluna sozinho.
- **As quatro regras de layout** (decididas na prévia de 28/10):
  1. **Colunas:** até 8 itens, uma coluna larga e centralizada (cerca de 480 px); com
     mais, duas colunas.
  2. **Escala para preencher a folha:** o conteúdo (cards e títulos de seção, não o
     header nem o rodapé) recebe a maior escala entre **80 % e 160 %** com a qual tudo
     cabe em uma folha. Cardápio curto é ampliado; longo, reduzido até 80 %.
  3. **Folhas divididas por igual:** se não couber em uma folha a 80 %, a escala volta a
     100 % e os blocos são distribuídos entre as folhas (o mínimo necessário) de modo
     equilibrado, sem uma última folha quase vazia.
  4. **Nome maior no papel** (ver §1).
  A escala e o número de colunas saem de uma função pura `planLayout(itemCount,
  measure)` ao lado de `paginate`, testada sozinha. A medição deixa 4 % de folga,
  porque na prévia a medida exata encostou no rodapé.
- Um componente cliente (`PrintPages`) renderiza os blocos uma vez numa área de
  medição invisível com a largura exata da coluna, espera `document.fonts.ready` e o
  carregamento das imagens, mede, chama `paginate` e renderiza as páginas. Até lá a
  tela mostra "Montando o cardápio…".

## 3. Tela e botões

- Barra no topo (fora da impressão): **Baixar PDF** e **Baixar imagem (JPG)**, mais a
  dica atual para celular.
- No celular as páginas aparecem reduzidas para caber na largura (escala CSS), uma
  embaixo da outra, para o dono ver exatamente a folha.
- **Baixar PDF:** `window.print()` com `@page { size: A4; margin: 0 }` e
  `break-after: page` em cada `.print-page`. Continua sendo a janela do sistema.
- **Baixar imagem (JPG):** `modern-screenshot` (`domToJpeg`), com import dinâmico só no
  clique. Escala 2,5 (≈ 1985 × 2808 px, cerca de 240 dpi), qualidade 0,92, uma página
  por vez. Nomes: `<slug>-cardapio.jpg` (uma página) ou `<slug>-cardapio-pagina-N.jpg`.
  - Se `navigator.canShare({ files })`, abre `navigator.share({ files })`: num toque o
    dono salva na galeria ou manda no WhatsApp (iPhone e Android).
  - Se não (desktop), baixa os arquivos um por um com `<a download>`.
  - Durante: botão desativado com "Gerando página 1 de 2…".
- Logo e fotos vêm do Vercel Blob, que responde `access-control-allow-origin: *`
  (conferido em 28/10), então entram na imagem. As fontes são do próprio domínio.

## 4. Erros e eventos

- Se a geração do JPG falhar: "Não deu para gerar a imagem. Use Baixar PDF." e o
  PostHog `menu_print_jpg_failed { error }`.
- Se o dono cancelar a tela de compartilhar (`AbortError`), não é erro: não mostra
  mensagem.
- Sucesso: `menu_print_downloaded { format: "pdf" | "jpg", pages }`. Para o PDF conta
  o clique, porque o navegador não diz se o arquivo foi salvo.
- Textos novos em pt-BR, en e es em `menu.print`.

## 5. Painel

Feito em 509fa58: o botão "Cardápio para imprimir" fica no cartão do topo, ao lado
de "Abrir meu cardápio" e "Editar", só para cardápio montado; o cartão do QR fica com
PNG, SVG e Abrir; a URL longa corta com "…".

## 6. Testes

- `planLayout`: 5 itens → 1 coluna e escala > 100 %; 25 itens que cabem a 80 % → 1 folha;
  que não cabem → 100 % e 2 folhas equilibradas; nunca abaixo de 80 % nem acima de 160 %.
- `paginate`: uma página; transbordo para a coluna 2 e para a página 2; título que não
  fica sozinho; card maior que a coluna; capacidade menor na página 1.
- Render da folha: header só na página 1, faixa com o nome nas seguintes, rodapé em
  todas, foto só quando o item tem foto, nenhum link ou botão dentro das páginas.
- Nomes dos arquivos.
- Checagem manual no preview, **condição para o deploy:** Chrome no desktop (PDF e
  JPG), iPhone Safari real (PDF, JPG pela tela de compartilhar, logo e foto aparecem
  no JPG) e Android Chrome. Com header em faixa e com header centralizado; com e
  sem logo; com fundo `doodles`.

## Fora do escopo

PNG; geração no servidor (Chrome headless, `@vercel/og`); tamanho Carta;
cardápio de fotos (ele já é a sua própria impressão); escolher quais seções imprimir.

## Custo e risco

Nenhum custo de servidor: tudo roda no navegador do dono. Uma dependência nova,
`modern-screenshot` (MIT), carregada só na página do impresso e só no clique. O risco
principal é o Safari do iPhone errar a imagem; se errar, o PDF continua funcionando e
o evento de falha avisa.
