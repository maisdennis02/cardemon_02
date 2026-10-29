# Cardápio impresso (PDF) — design

Data: 26/10/2026 · Branch: `cardapio-impresso` (sai de `fotos-dos-produtos`;
entra no ar depois de `campo-de-preco` e das fotos).

## Por quê

O dono quer um cardápio de papel para o balcão e a mesa. Hoje ele só tem o
QR code. Dar o PDF de graça:

- fideliza o plano grátis: mudou o preço, ele volta, edita e imprime de novo;
- faz marketing: todo papel impresso leva "Cardápio feito com menulala.com" e
  um QR code para o cardápio online, onde o cliente pede pelo WhatsApp.

Decidido com o dono em 26/10: **grátis para todos**, com a marca sempre.

## 1. O que o dono vê

No painel, no cartão do QR code (`menu-qr-card.tsx`), quando o cardápio é de
texto (`mode === "built"`) e está publicado, entra um botão
**"Cardápio para imprimir (PDF)"**. Ele abre `/m/<slug>/print` numa aba nova
e dispara o PostHog `menu_print_opened`.

Cardápios em foto não ganham o botão: as fotos já são o cardápio impresso.

## 2. A página de impressão `/m/[slug]/print`

Página pública, como o cardápio (os dados são os mesmos), mas `noindex` e fora
do sitemap. ISR igual ao cardápio (`revalidate = 60`, `getRestaurant`).
404 quando não há cardápio de texto publicado.

**Na tela** (some na impressão, `print:hidden`): uma barra no topo com o botão
**"Salvar PDF ou imprimir"**, que chama `window.print()`, e uma linha de ajuda:
"No celular, escolha 'Salvar como PDF' ou 'Imprimir' na tela que abrir."
Abaixo, a prévia da folha A4, do jeito que vai sair.

**Na folha** (A4 retrato, `@page { size: A4; margin: 14mm }`):

- Cabeçalho: logo (se houver) e nome do restaurante, centralizados.
- Seções e itens, em **duas colunas**: nome em negrito, preço alinhado à
  direita na mesma linha com pontilhado entre os dois, descrição embaixo em
  corpo menor. Item nunca quebra entre colunas ou páginas
  (`break-inside: avoid`); título de seção fica junto do primeiro item.
- Item sem preço: só o nome. Seção sem título: itens sem cabeçalho.
- **Sem fotos** (gasta tinta e não cabe no formato de lista). A cor do tema só
  nos títulos de seção, que saem legíveis em preto e branco.
- Fonte do tema (`font`) mantida; fundo (`background`) ignorado: papel branco.
- O que entra é o mesmo corte do cardápio online: `publicMenu(published, pro)`
  (o grátis mostra os mesmos 20 itens). O impresso nunca difere do online.

**Rodapé em toda página** (`position: fixed; bottom: 0` na impressão, que
Chrome, Safari e Firefox repetem a cada folha):

- QR code (o mesmo `qrcode.react`) para `https://menulala.com/m/<slug>`, ~22 mm.
- Ao lado: "Preços atualizados e pedido pelo WhatsApp: aponte a câmera." Sem
  WhatsApp cadastrado: "Preços atualizados: aponte a câmera."
- Embaixo, discreto: "Cardápio feito com menulala.com".

O idioma segue o país do restaurante, como o cardápio (`localeForCountry`);
textos novos nos 3 dicionários.

## 3. O que fica de fora (agora)

- Imagem PNG/JPEG para status e Instagram (segundo passo, se pedirem).
- Pro tirar a marca do rodapé (decidir depois; hoje a marca vale mais).
- Fotos no impresso, outros tamanhos de papel, escolher colunas.
- Gerar o PDF no servidor: o "Salvar como PDF" do aparelho faz isso sem
  biblioteca nova nem custo na Vercel.

## 4. Testes

- Página (render): nome, seções, itens com preço formatado, item sem preço,
  descrição; nenhuma `<img>` de foto de item; QR com a URL do cardápio; texto
  do rodapé com e sem WhatsApp; "menulala.com" presente.
- Corte: cardápio grátis com 25 itens imprime 20; Pro imprime 25.
- 404 para cardápio em foto e para cardápio não publicado.
- `noindex` no metadata.
- Painel: botão aparece para cardápio de texto publicado, não para foto.
- Conferência visual (dono): imprimir/salvar PDF no iPhone, no Android e no
  PC; rodapé em toda página num cardápio de 2+ páginas.

## 5. Custo e risco

Nenhum serviço novo, nenhum custo variável. A página é cacheada como o
cardápio. Risco: o rodapé fixo pode não repetir em algum navegador; nesse caso
ele sai só no fim, o que ainda cumpre o objetivo.
