# Landing page nova — design

Data: 2026-10-10 · Status: estrutura aprovada pelo dono no chat ("pode seguir,
manda bala")

## Por que

A landing ainda vende o menulala de antes de 09/10: só cardápio em foto, e diz
textualmente "talvez não seja pra você se precisa receber pedidos". Desde
então o produto ganhou:
- o construtor de cardápio em texto, digitando ou falando;
- logo, cores, cabeçalho e fonte;
- o pedido pelo WhatsApp com carrinho;
- o microfone nos campos.

O pedido pelo WhatsApp é o argumento mais forte para um restaurante aderir.

**Sucesso:** quem chega pela landing entende em 5 segundos que dá para montar
o cardápio sem foto e receber pedido no WhatsApp, e clica em criar conta.

## Decisões (dono, 10/10)

- **Reforma da página atual** (`src/app/(main)/landing-page.tsx`), não uma
  página do zero. URLs por idioma, SEO e exemplos ficam como estão.
- **Depoimentos em pt-BR mantidos** como estão (o dono confirmou mantê-los).
  en/es continuam com os cardápios de exemplo, rotulados como exemplo.
- **Fable revisa** o resultado no fim: o executor **pede ao dono** para
  rodar essa revisão antes do deploy.

## Estrutura (de cima para baixo)

1. **Hero**
   - Título: "Seu cardápio no celular do cliente. O pedido no seu WhatsApp."
   - Subtítulo: "Monte digitando ou falando — ou envie a foto que você já
     tem. Grátis para começar."
   - CTA primário "Criar meu cardápio grátis" → `/signup` (ou o painel, se
     logado); link "Ver um cardápio de verdade/de exemplo", com os mesmos
     destinos de hoje por idioma.
   - **Celular**: cardápio em texto ilustrado em código: cabeçalho de faixa,
     seções e itens com "+", um item com "− 1 +", barra "Ver pedido ·
     2 itens · R$ …". Rótulo discreto "Exemplo" no celular.
2. **Como funciona** — 3 passos: Monte (digite, fale ou envie foto) →
   Compartilhe (QR, link, Instagram) → Receba o pedido no WhatsApp.
3. **Pedido pelo WhatsApp** (seção de destaque): à esquerda o resumo do
   pedido; à direita um balão de conversa do WhatsApp com a mensagem
   **gerada pela mesma `buildOrderMessage`** usada no produto (nunca um texto
   à parte que possa divergir). Pontos: sem taxa por pedido, sem app para o
   cliente, chega no WhatsApp que você já usa.
4. **Monte pelo celular, até falando** — microfone, "Colar lista", 20 itens
   grátis, preço ditado ("Coca 7 reais").
5. **Com a cara do seu restaurante** — miniaturas: 2 estilos de topo × cores,
   e as 4 fontes escritas nelas mesmas.
6. **Já tem o cardápio em arte? Só envie a foto** — o celular atual com o
   slideshow de fotos (`HeroPhonePreview`) desce para cá.
7. **Saiba o que funciona** — visualizações, cliques e pedidos enviados no
   painel; QR code para as mesas.
8. **Quem já usa** — seção atual (`LANDING_SHOWCASE`), sem mudança de regra.
9. **Por que não um PDF do Canva** — seção atual, enxugada para 3 cartões.
10. **Para quem é** — reescrita: sai "receber pedidos" do "não é pra você";
    entram pagamento online, gestão de entregadores, PDV/estoque, rede com
    várias unidades.
11. **Planos (teaser) + FAQ** — "Grátis: até 20 itens ou 2 fotos · Pro a
    partir de {price}/mês"; FAQ ganha "Preciso de foto do cardápio?",
    "Como o pedido chega?", "Tem taxa por pedido?"; perguntas sobre páginas
    passam a falar de itens ou fotos.
12. **CTA final**.

`/pricing`: os textos dos planos passam a citar itens ("até 20 itens ou 2
fotos" / "itens ilimitados ou até 20 fotos"), nos três idiomas. A seção
removida "Dor e solução" (`PainSolution`) sai; os pontos dela que continuam
verdadeiros entram nos passos 2, 7 e 9.

## Regras

- Tudo nos três idiomas, só strings nos dicionários.
- Nenhuma pessoa, frase ou cidade inventada (regra de `landing-showcase.ts`);
  o cardápio do hero é rotulado "Exemplo", com itens genéricos, sem nome de
  restaurante real.
- Ilustrações em HTML/CSS (sem imagem nova), legíveis a 360 px, sem rolagem
  horizontal.
- Moeda e preços da ilustração pela `formatPrice` do país da página (pt-BR →
  BRL, es → MXN, en → USD), como o hero de hoje escolhe o país.
- Página continua estática nas URLs `/pt-BR`, `/es` (nenhum `cookies()` no
  componente da landing).

## Testes

- `landing-examples.test.tsx`: o teste "pt-BR idêntico ao fixture" é
  substituído por um fixture novo da landing nova; continuam valendo os
  testes de links que existem, exemplos rotulados, depoimentos só em pt-BR,
  nada inventado em en/es.
- Novos: a mensagem da seção 3 é igual à `buildOrderMessage` com os dados da
  ilustração; "receber pedidos" não aparece na lista do "não é pra você";
  FAQ e teaser citam 20 itens; cada idioma renderiza as 12 seções.
- Manual: 360 px e desktop, os três idiomas, conferido no navegador.
- **Revisão do Fable** (pedida ao dono) antes do deploy.
