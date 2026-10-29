# Leitura final do 3º lote e decisão do Pro (rascunho de 25/10/2026)

Preparado antes da leitura de 27/10 para que a decisão leve minutos. Os números
até 25/10 já estão preenchidos; as linhas marcadas com "—" saem da leitura final.

## 1. Leitura final do lote (campanha 24378912921, 22 a 26/10)

| | até 25/10 11:20 BRT | final (26/10 fechado) |
|---|---|---|
| Impressões | 208 | — |
| Cliques | 11 | — |
| Custo | R$ 32,64 | — |
| Contas de anúncio | 2 | — |
| **Ativados** (publicado + WhatsApp) | **2** | — |
| Custo por ativado | R$ 16,32 | — |
| Pedidos enviados nos cardápios do lote | 5 (`casa-zahra`) | — |
| Pagantes | 0 | — |

Pela regra ("Terceiro lote: a regra nova" em `ads-2026-09.md`): **Passa** com
≥ 2 ativados. O lote deve fechar com 13 a 16 cliques, abaixo dos 25 que a
regra pede para não ser "inconclusivo".

**Decisão 1: o Passa vale com < 25 cliques?**
- Sim: o piso de 25 cliques existe para não se concluir nada de um zero com
  pouca amostra; 2 ativados com R$ 33 é um resultado, não ausência de dado.
- Não: 2 casos é pouco; estende-se a data final para gastar o resto dos
  R$ 100 (o saldo cobre) e lê-se de novo.

**Decisão 2: estender as datas da campanha?** Independe da 1. O Google só
entrega de 70 a 90 impressões por dia nessas palavras, então estender dá
amostra mas não acelera.

## 2. O valor do Pro

### Onde estamos

- Pro: R$ 29/mês ou R$ 232/ano. Grátis: 20 itens no cardápio em texto ou 2
  fotos de cardápio; pedido pelo WhatsApp **em todos os planos, sem taxa**
  (prometido na landing, na FAQ e no anúncio).
- Pagantes reais: 0. As contas Pro existentes vieram de cupom de 100%.
- Os dois ativados têm **3 itens** cada. Hoje nenhum limite do grátis chega
  perto deles: não existe motivo, dentro do produto, para pagar.

### As opções

**A. Pedido pelo WhatsApp vira Pro, com teste grátis (ex.: 14 dias)**
- A favor: é o que os ativados de fato usam (`casa-zahra` já tem 5 pedidos).
  Cobra pelo resultado, não por enfeite.
- Contra: desdiz "sem taxa, em todos os planos" da landing, da FAQ e do
  anúncio. Muda a métrica que acabamos de validar (o "ativado" passa a
  depender do teste). Clientes atuais precisariam de regra de transição.
- Código: médio (porta no pedido, contagem do teste, textos nos 3 idiomas).

**B. Fotos dos produtos como Pro** (a ideia do "degrau C")
- A favor: valor que o dono enxerga na hora; os cardápios de referência
  (Goomer, Cardápio Web, Square) mostram foto no item. Não desdiz nenhuma
  promessa: o grátis continua um produto completo, e "sem foto" do anúncio
  fala de não precisar foto *do cardápio*. O cartão do item já tem o lugar
  da foto à direita, igual aos de referência.
- Contra: só morde quando o dono quer foto, e nada prova ainda que ele quer.
  Pede esforço do dono (fotografar cada prato), o que pode deixar o cardápio
  ainda mais ralo se virar pré-requisito. Custo de armazenamento no Blob
  (pequeno com compressão no envio, mas é custo por cliente grátis se a foto
  ficar aberta a todos).
- Código: médio para grande (envio por item com corte e compressão, foto no
  cartão público, limite por plano, apagar a foto junto com o item).

**C. Baixar o limite de itens do grátis (ex.: 20 → 10)**
- A favor: zero código.
- Contra: ativados com 3 itens não sentem; quem sente é o cardápio completo,
  que é justamente quem queremos que publique.

**D. Pacote "visual profissional"** (destaques, frase no topo, sem a marca
menulala no rodapé)
- A favor: não tira nada de ninguém.
- Contra: valor menos óbvio que foto; é o "degrau B" que ficou parado.

### Recomendação

**B como alavanca do Pro, mantendo o pedido no grátis.** Fotos dos produtos
liberadas só no Pro, com um teste curto: quem tentar pôr foto vê o Pro. É a
única opção que cria um motivo para pagar sem tirar o que o anúncio e a
landing prometeram, e mantém o "ativado" medindo a mesma coisa.

Antes de construir, um teste barato para saber se o dono quer foto: um botão
"Adicionar foto" no editor de item que, por enquanto, só registra o toque
(`item_photo_tapped`) e mostra "em breve no Pro". Uma semana de cliques diz
se vale o trabalho grande.

A opção A fica como segunda escolha, se o botão de foto não receber toques.

**Não muda antes de decidir:** orçamento de anúncio. A regra do lote já diz
que, sem valor no Pro, mais anúncio só compra mais conta grátis.
