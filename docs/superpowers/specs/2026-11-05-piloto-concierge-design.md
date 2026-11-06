# Piloto concierge pelo Instagram — design

Data: 2026-11-05 · Status: aprovado em conversa (seção a seção) e revisado pelo
Fable. Aguardando a revisão do dono sobre este documento escrito.

## Por que

O 4º lote de Google Ads (31/10–04/11, ver `docs/ads-2026-09.md`) fechou com
24 cliques, 2 cadastros e **0 cardápios publicados**. Os dois cadastros
pararam no passo visual e não digitaram nenhum item. Nos lotes 3 e 4, o clique
vira cadastro em ~8% das vezes; o que cai é cadastro → publicado (3/4 no 3º
lote, 0/2 no 4º). Mais tráfego não resolve o problema: digitar os itens dá
trabalho.

Decisão do dono em 05/11: **agora nós montamos os cardápios.** Lemos a imagem
do cardápio que o restaurante já publicou e entregamos o cardápio pronto.

**Objetivo:** chegar aos primeiros restaurantes ativados sem que o dono
precise digitar itens, e medir se o restaurante que recebe o próprio cardápio
pronto responde, publica e, no fim, paga.

## Decisões tomadas

| # | Decisão | Alternativas descartadas |
|---|---|---|
| 1 | Canal: **DM no Instagram**. WhatsApp só como 2º passo, por um número separado e com pouco volume. Sem e-mail. | Visita pessoal (fica para um 2º momento), e-mail (Tânia não respondeu desde 30/10) |
| 2 | O "rascunho" que o restaurante vê é uma **imagem** (prints do cardápio dele no visual do menulala) enviada na DM 1 | Prévia navegável em `/previa/[token]`, que exigiria usuário "concierge", transferência de dono, link temporário e expiração. A imagem também evita que um link de desconhecido pareça golpe |
| 3 | Duas imagens: o cardápio e o carrinho com o botão de pedido no WhatsApp | Só o cardápio, que esconde o diferencial do produto |
| 4 | Os itens entram **na conta que o próprio restaurante criar**. Quem publica é sempre o dono do restaurante | Publicar por ele, o que tiraria o consentimento e arriscaria preço errado no ar |
| 5 | **Pro de cortesia por 60 dias** para quem vier do piloto | Mostrar o corte de 20 itens já na imagem; escolher só cardápios pequenos |
| 6 | Leads: o perfil de quem converteu nos anúncios (lanchonete, açaí, esfiharia, hamburgueria, pastelaria; delivery feito pelo próprio dono), em qualquer lugar do Brasil | Priorizar o litoral (viés de região, sem visita prevista) |
| 7 | Não raspar Google Maps em massa e não publicar nada sem o OK do restaurante | — |

## A operação

1. **Leads (agente).** No `menulala-leads`, 10 perfis do Instagram com:
   - cardápio em imagem legível no feed ou nos destaques;
   - WhatsApp na bio;
   - post nos últimos 30 dias;
   - nenhum cardápio digital ou iFood em uso;
   - entre 500 e 10 mil seguidores.

   Nas notas de cada lead ficam o link do post e o caminho do arquivo do
   cardápio. O dono aprova a lista antes de seguir.
2. **Transcrição (agente).** A imagem vira um JSON no formato de
   `src/lib/menu.ts` (`MenuSchema`). Preço ilegível vira `priceCents: null`,
   nunca um chute, e o que não foi lido fica anotado.
3. **Imagens (agente, só local).** `scripts/concierge-preview.ts` carrega o
   JSON no **banco local** e tira 2 prints em 390 px: o cardápio e o carrinho.
   Nada vai para produção.
4. **Conferência (dono).** O dono recebe as imagens e a DM 1 personalizada.
5. **DM 1 (dono)**, com as imagens. Follow-ups nos dias 3 e 7, no máximo.
   Todo texto passa pelos Princípios.
6. **"Quero" → link de cadastro**
   `menulala.com/signup?utm_source=concierge&utm_content=<@perfil>`.
   `parseAcquisition` grava a origem e `/api/admin/events` mostra a linha
   `concierge` em `sources[]`.
7. **Preenchimento (agente).** `scripts/concierge-fill.ts` grava o rascunho e
   a cortesia (ver abaixo).
8. **DM "Pronto" (dono):** diz que os itens estão no painel e que o Pro de
   cortesia vale até a data X, sem cobrança automática. O restaurante confere,
   coloca o WhatsApp e publica.

### Textos que passaram pelos Princípios

Os textos são finalizados por lead. Base da DM 1:

> Oi, *Nome*! Sou o Dennis, do menulala (cardápio digital). Vi o cardápio de
> vocês na foto do post de *data*, e o *prato* chamou atenção. Em foto o
> cliente não dá zoom e, quando um preço muda, a foto fica velha. Já digitei
> os *N* itens e preços dessa foto num cardápio para vocês (as imagens estão
> aqui), de graça, com botão de pedido direto no WhatsApp de vocês, sem taxa.
> Quer que eu deixe ele pronto na sua conta? Se tiver preço errado, me avisa
> que eu corrijo.

## Mudanças no código

**Sem migração.** Cortesia é um estado derivado:

```ts
isCourtesyPro(user) = isPro(user) && user.billingSubscriptionId == null
```

`endingSoonWhere` (`src/lib/pro-ending.ts`) já inclui
`billingSubscriptionId: null`, então os lembretes de 7 dias, 1 dia e fim já
disparam para a cortesia.

### A. `scripts/concierge-fill.ts`

- Uso: `npx tsx scripts/concierge-fill.ts <email> <menu.json> [--apply]`.
- Por padrão faz só um ensaio: imprime restaurante, slug, número de seções e
  itens, e o plano atual e o que ficaria depois.
- Valida o JSON com `MenuSchema` e para se ele for inválido.
- Para se a conta não existir, se não tiver restaurante ou se tiver mais de um.
- **Para se o `menuDraft` já tiver itens.** Nunca sobrescreve.
- Com `--apply`, numa transação:
  - grava `menuDraft` e define `menuMode = "built"`;
  - se a conta **não** tem assinatura (`billingSubscriptionId` nulo), define
    `proExpiresAt = max(atual, agora + 60 dias)` e zera
    `proEndingReminderSentAt`.

  Uma conta com assinatura nunca tem o plano alterado.
- Não publica (`menuPublished` não é tocado).
- A lógica fica numa função pura testável, `planConciergeFill(...)`, e o script
  só faz a entrada e a saída.
- Roda contra o banco de produção. Se a proteção da sessão bloquear o agente,
  o dono roda com `! npx tsx …`.

### B. Ajustes (`src/app/(main)/dashboard/ajustes/page.tsx`)

| Estado | Linha do plano | Botão |
|---|---|---|
| Cortesia | **"Pro de cortesia até {date}"** (novo) | **"Assinar o Pro"** → `/pricing` |
| Assinatura ativa | "Pro · renova em {date}" (como hoje) | "Gerenciar assinatura" (como hoje) |
| Assinatura cancelada | "Pro até {date}" (como hoje) | "Gerenciar assinatura" (como hoje) |

Textos novos em pt-BR, en e es.

### C. `/pricing`

Hoje `currentPlan === "PRO"` manda o botão do Pro para `/api/stripe/portal`,
que falha sem cliente Stripe. Em cortesia, o botão do Pro vai para
`/api/stripe/checkout`, como acontece com o FREE, e o cartão mostra "Cortesia
até {date}".

**Limitação conhecida:** assinar durante a cortesia começa a cobrança na hora,
e o webhook regrava `proExpiresAt` com o fim do 1º período, o que pode
encurtar a cortesia. Isso fica aceito para o piloto, e o texto orienta a
assinar perto do fim.

### D. Lembretes de fim do Pro

Hoje o texto fala de "assinatura", de "páginas" e de "Gerenciar assinatura".
Isso está errado para a cortesia e também para quem tem cardápio em texto.
Para a cortesia vale uma variante própria (assunto, corpo, CTA "Assinar o Pro"
→ `/pricing`):

> Sua cortesia do Pro no menulala acaba em {date}. Depois disso, seu cardápio
> continua no ar, mas mostra só os {freeLimit} primeiros itens. Para manter
> todos, assine o Pro.

O texto de quem cancelou a assinatura não muda (corrigir "páginas" → "itens"
para o cardápio em texto fica fora deste escopo e entra como item anotado).

### E. `scripts/concierge-preview.ts` (só local)

Recebe o JSON e o tema, e se recusa a rodar se `DATABASE_URL` apontar para o
host de produção. Grava num restaurante de teste do banco local, publica
localmente e usa o Playwright em 390 px para gerar `cardapio.png` e
`carrinho.png` em `branding/concierge/<@perfil>/` (pasta não versionada,
como o resto de `branding/`). Reaproveita `scripts/publish-test-menu.ts`.

### F. `menulala-leads`

Sem código. O pipeline atual (novo → dm1 → dm2 → dm3 → respondeu → …) e as
notas do lead cobrem o piloto.

## Medição

Caminho de cada lead: DM enviada → respondeu → "quero" → conta criada
(`concierge` em `/api/admin/events`) → **publicou com WhatsApp válido
(ativado)** → recebeu pedido → **pagou depois da cortesia**.

| Veredito | Regra (20 DMs, 14 dias desde a 1ª, máx. DM 1 + 2 follow-ups) |
|---|---|
| Passa | ≥ 3 ativados |
| Fraco | 1–2 ativados |
| Falha | 0 ativados com as 20 DMs e os follow-ups feitos |

- **Checagem do meio:** enviar 10 primeiro. Se ninguém responder em 5 dias,
  revisar a DM e as imagens antes de enviar as outras 10.
- **Leitura de pagantes:** perto do fim da cortesia (~04/01/2027).
- **Custo:** zero de mídia. O custo é o tempo do dono nas conversas.

## Testes

- Unitários: `isCourtesyPro`; `planConciergeFill` (JSON inválido, rascunho não
  vazio, conta com assinatura, conta sem restaurante, data da cortesia).
- Markup estático: a linha e o botão de Ajustes nos 3 estados; o botão do Pro
  em `/pricing` na cortesia.
- E-mail: a variante de cortesia é escolhida quando `billingSubscriptionId` é
  nulo, e o texto tem a data e o limite.
- Ponta a ponta no preview com a conta de teste: preencher → abrir o painel →
  ver os itens → publicar → Ajustes mostra a cortesia.

## Deploy

Um PR, sem migração. O merge é feito pelo dono (push para `main` = deploy de
produção). Depois do deploy, o smoke de sempre e o preenchimento numa conta de
teste em produção, apagada em seguida.

## Fora do escopo

- Botão "mande a foto do seu cardápio" no autosserviço (próximo passo, se o
  piloto passar).
- Visitas pessoais e WhatsApp em volume.
- Corrigir "páginas" → "itens" nos lembretes de quem cancelou a assinatura.
