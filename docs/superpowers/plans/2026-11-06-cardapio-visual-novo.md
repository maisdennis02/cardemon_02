# Cardápio: visual novo — plano

> Executado inline (superpowers:executing-plans), na branch `cardapio-visual-novo`.

**Objetivo:** cardápio de texto mais compacto e com cara de restaurante, a tempo das DMs do piloto concierge de 07/11.

**Aprovado pelo dono em 06/11 (conversa, com maquetes):** lista compacta (A), cabeçalho padrão com o nome do restaurante como textura, estilo "Cartaz" (B) como opção, endereço e horário (texto livre) no cadastro aparecendo no cabeçalho, passo Visual reorganizado. **Fora:** foto de capa (upload), horário estruturado/"aberto agora".

## Decisões

- **Item em lista, não cartão.** Cada seção é um painel branco com linhas separadas por fio; nome, descrição (máx. 2 linhas), preço embaixo à esquerda, "+" à direita. O preço continua fora de uma coluna à direita (regra de 22/10, "price scanning"); a maquete A tinha o preço à direita do nome — decisão: estrutura da maquete C sem foto (o ± de 7,5rem espremeria o nome).
- **Cabeçalho "faixa" = textura.** `headerStyle: "band"` passa a desenhar a faixa na cor do restaurante com o nome repetido, inclinado, em caixa alta e baixa opacidade. Sem campo novo; quem já usa "faixa" ganha a textura. "centered" fica como está (nome "Simples" no construtor).
- **Estilo Cartaz:** `MenuTheme.style?: "light" | "poster"` (ausente = light). Poster: fundo #141414, textura na cor do restaurante apagada, título de seção numa faixa na cor, nome do item na cor (se o contraste em fundo escuro bastar; senão branco), preço numa etiqueta branca, "+" vazado. O fundo (papel, linho…) é ignorado e o seletor some no construtor.
- **Endereço e horário:** `Restaurant.address String?` (máx. 160) e `Restaurant.hours String?` (máx. 120), texto livre, editados em Ajustes junto da descrição. Aparecem sob o nome; o endereço vira link para o Google Maps. Migração: `20261106120000_add_restaurant_address_hours` — **dono roda em produção antes do deploy**.
- **Concierge:** `ConciergeFileSchema` aceita `address?`, `hours?`; o fill grava; o preview desenha.

## Tarefas

1. **Tema:** `style` em `MenuTheme`/`MenuThemeSchema` (+ teste: tema antigo sem `style` continua válido; `poster` aceito; valor estranho cai no padrão).
2. **Banco + Ajustes:** campos, migração, `MenuData`/`getRestaurant`, `restaurantSchema` + `updateRestaurant`, formulário, dicionários (3 idiomas).
3. **Cabeçalho:** textura, endereço (link Maps), horário; poster escuro. Testes de markup.
4. **Lista:** classes de linha para `MenuItemCard`/`OrderableItem`/`PhotoItemCard`, painel por seção, descrição com 2 linhas; poster (cores via CSS vars). Testes atualizados (o comentário de 22/10 vira o de 06/11).
5. **Construtor:** escolha de Estilo (Claro/Cartaz) com miniatura; rótulos do cabeçalho; fundo só no Claro. Dicionários.
6. **Concierge:** schema, fill, preview; regenerar as imagens do Tony's.
7. **Verificação:** suíte, tsc, lint, build; telas no `next dev` (390 px): Claro com/sem logo, Cartaz, com pedido, com foto, item com opções no carrinho; construtor.

## Review Focus

- Cor clara (amarelo do Dois Irmãos) no Cartaz e na textura: contraste do texto.
- Nome longo (60+ caracteres) na textura e no título.
- Cardápio sem WhatsApp (sem pedido) e exemplo (`readExampleMenuTheme`) continuam renderizando.
- Item com foto (Pro) e item com ± aberto não sobrepõem texto em 360 px.
- Ajustes: apagar endereço/horário grava `null`, não string vazia.
