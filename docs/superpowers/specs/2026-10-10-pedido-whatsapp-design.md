# Pedido pelo WhatsApp no cardápio em texto (com voz) — design

Data: 2026-10-10 · Status: aguardando revisão do dono

## Por que

Nenhum restaurante pagante ainda. Um cardápio que **recebe pedidos** é um
motivo concreto para o restaurante escolher o menulala, e o WhatsApp já é por
onde ele atende. O cardápio em texto (etapa B, no ar desde 09/10) já tem cada
item como dado estruturado, o que torna o carrinho possível sem trabalho do
dono.

**Sucesso:** um cliente monta um pedido no celular e o restaurante recebe no
WhatsApp uma mensagem pronta, legível e sem ambiguidade, sem o dono configurar
nada além do número que já existe no cadastro.

## Decisões tomadas (dono, 10/10)

| # | Decisão |
|---|---|
| 1 | Carrinho para **todos os planos** por enquanto (argumento de adesão) |
| 2 | O cliente informa **nome** e **entrega ou retirada**; entrega → **endereço**; retirada → **mesa** |
| 3 | Todo campo de texto do pedido tem **microfone** (segurar e falar) |
| 4 | Voz pelo **reconhecimento do próprio navegador** (Web Speech API), sem custo nem fornecedor novo |
| 5 | Sem skill; o componente de voz nasce aqui e é reaproveitado no construtor depois |

## Fora de escopo

- Pagamento, status do pedido, caixa de entrada de pedidos no painel.
- Variações (tamanho, adicionais), taxa de entrega, pedido mínimo.
- Carrinho no cardápio de **fotos** (não há itens estruturados).
- Transcrição no servidor (Whisper etc.).

## 1. Quando o carrinho aparece

- Só no cardápio em texto (modo efetivo `built`) **e** com
  `whatsappNumber` preenchido. Sem WhatsApp, a página fica como hoje.
- Só os itens **visíveis** (`visibleMenu`) podem ser pedidos; o corte do plano
  grátis continua valendo.
- Ligado automaticamente. Interruptor para o dono desligar fica para quando
  algum restaurante pedir.

## 2. Experiência do cliente

- **Tocar no item** adiciona 1. Com o item no carrinho, a linha mostra a
  quantidade e botões − / +; chegar a 0 remove.
- **Barra fixa no rodapé** quando há itens:
  `Ver pedido · 3 itens · R$ 45,80`.
- **Item sem preço** pode ser pedido; aparece como "preço a combinar" e o total
  vira `R$ 45,80 + itens a combinar`.
- **Tela do pedido** (painel por cima da página):
  - itens com − / +, subtotal por linha, total;
  - **Nome** (obrigatório);
  - **Entrega** ou **Retirada** (obrigatório escolher);
  - Entrega → **Endereço** (obrigatório);
  - Retirada → **Mesa** (opcional: quem retira no balcão não tem mesa);
  - **Observação** (opcional);
  - botão **"Enviar pedido pelo WhatsApp"**.
- **Microfone** ao lado de nome, endereço, mesa e observação (§4).
- Ao enviar, abre `https://wa.me/<número>?text=<mensagem>` e a tela mostra
  "Pedido aberto no WhatsApp — toque em enviar lá para concluir", com
  **"Fazer outro pedido"**, que limpa o carrinho.
- O carrinho fica **só no celular do cliente** (`localStorage`, chave por
  slug), sobrevive a recarregar a página, expira em 6 h, e descarta itens que
  sumiram do cardápio. Toda leitura/escrita em `try/catch` (modo privado).
- Textos no idioma do cardápio (`localeForCountry(restaurant.country)`), pelos
  dicionários, como o resto da página pública.

## 3. A mensagem

Montada por função pura, nos três idiomas, por exemplo:

```
*Pedido — Lanchonete Teste*

2x X-Burguer — R$ 51,80
1x Coca — R$ 7,90
1x Vegetariano — a combinar

*Total: R$ 59,70 + itens a combinar*

Nome: Ana
Entrega: Rua das Flores, 123, ap 4
Obs.: sem cebola

Pedido feito pelo cardápio menulala.com/m/lanchonete-teste
```

Retirada vira `Retirada — mesa 7` (ou só `Retirada`). Preços com
`formatPrice` e a moeda do país do restaurante. Texto do cliente vai como
digitado (o WhatsApp não interpreta HTML; `*` do cliente pode virar negrito,
aceitável).

## 4. Voz (componente reutilizável)

- Hook `useSpeechInput({ lang })` + botão `<MicButton>` em
  `src/components/voice/`, sem dependência nova.
- Usa `SpeechRecognition` / `webkitSpeechRecognition`. **Segurar** o botão
  começa a ouvir, **soltar** termina; o texto reconhecido é **acrescentado** ao
  campo (não substitui o que já foi digitado). Resultados parciais aparecem
  enquanto fala.
- Idioma = idioma do cardápio (`pt-BR`, `es-ES`, `en-US`).
- Navegador sem suporte (Firefox, alguns navegadores embutidos de apps): o
  botão **não aparece**; o teclado continua funcionando, inclusive o ditado do
  próprio teclado.
- Permissão negada ou erro: o botão mostra estado de erro discreto e some até
  recarregar; nunca bloqueia o formulário.
- Depois desta entrega, o mesmo componente vai para os campos do construtor
  (adicionar item, editor, colar lista) — item 3 da ordem combinada.

## 5. Página pública: o que não pode quebrar

- `/m/[slug]` continua ISR, sem `cookies()`/`headers()`, e continua lançando
  erro em dado corrompido. O carrinho é inteiramente do lado do cliente.
- `BuiltMenu` continua componente de servidor; a parte interativa (linhas
  clicáveis, barra, tela do pedido) é um componente de cliente que recebe o
  cardápio já cortado. Sem carrinho (sem WhatsApp), o HTML é o de hoje.
- Prévia do construtor: sem carrinho.
- Nenhuma escrita no banco por pedido.

## 6. Medição

- Evento `order_whatsapp` no `MenuView` (o mesmo canal dos cliques de
  WhatsApp/delivery), disparado ao tocar em "Enviar pedido".
- O cartão de estatísticas do painel passa a mostrar "pedidos enviados".
- PostHog não roda na página pública (de propósito); nada muda nisso.

## 7. Testes

- **vitest:** carrinho (adicionar, ±, remover em 0, total com item sem preço,
  descartar itens que sumiram, expiração); mensagem (entrega, retirada com e
  sem mesa, sem observação, os três idiomas, moeda); URL do `wa.me` com
  texto codificado; validação do formulário (nome; endereço só na entrega).
- **Manual, iPhone real (Safari) e Android (Chrome):** segurar e falar em cada
  campo; pedido completo chegando no WhatsApp do restaurante de teste.

## Riscos

- **Voz no iPhone:** o Safari suporta, mas pede permissão de microfone e
  reconhecimento de fala, e não funciona dentro de alguns apps (Instagram).
  Mitigação: o botão some sem suporte; o teclado sempre funciona.
- **Pedido "aberto" mas não enviado:** o `wa.me` só abre a conversa; o cliente
  ainda precisa tocar em enviar no WhatsApp. O evento conta intenção, não
  pedido recebido.
- **Número de WhatsApp errado no cadastro** faz o pedido ir para o lugar
  errado. Mitigação barata: o painel mostra "pedidos chegam em +55 …" ao lado
  do número.
