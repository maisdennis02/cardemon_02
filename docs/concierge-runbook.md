# Piloto concierge: passo a passo

Spec: `docs/superpowers/specs/2026-11-05-piloto-concierge-design.md`.
Quem faz o quê: **agente** = Claude Code; **dono** = dono do menulala.

## 1. Leads (agente → dono aprova)

No `menulala-leads`, 10 perfis do Instagram:

- lanchonete, açaí, esfiharia, hamburgueria ou pastelaria, com delivery feito pelo próprio dono;
- cardápio em imagem legível no feed ou nos destaques;
- WhatsApp na bio;
- post nos últimos 30 dias;
- nenhum cardápio digital ou iFood em uso;
- entre 500 e 10 mil seguidores.

Nas notas do lead ficam o link do post do cardápio e o caminho do arquivo transcrito.

## 2. Transcrição (agente)

A imagem vira `branding/concierge/<instagram>/cardapio.json`:

```json
{ "name": "Nome do restaurante", "instagram": "handle_sem_arroba",
  "menu": { "v": 1, "sections": [ { "id": "s1", "title": "Lanches",
    "items": [ { "id": "i1", "name": "X-Burguer", "description": "…", "priceCents": 2590 } ] } ] },
  "theme": { "color": "#c84630", "headerStyle": "band", "background": "paper" } }
```

- Preço ilegível → `"priceCents": null`. Nunca chutar e nunca usar 0.
- Anote nas notas do lead o que não deu para ler.
- O formato é validado pelos dois scripts (`ConciergeFileSchema` em `src/lib/concierge.ts`).

## 3. Imagens (agente, só local)

```bash
npx next dev -p 3100           # na raiz, com o .env local; 1ª compilação leva minutos
npx tsx scripts/concierge-preview.ts branding/concierge/<instagram>/cardapio.json \
  --owner builder-test-1791569377@example.com --base http://localhost:3100
fuser -k 3100/tcp              # derrubar o servidor (nunca pkill -f)
```

- Saída: `cardapio.png` e `carrinho.png` em `branding/concierge/<instagram>/`.
- O script **só usa o `DATABASE_URL` do `.env`**, nunca o do shell. Ele não alcança a produção.
- O WhatsApp da prévia é fictício.

## 4. Conferência (dono)

O dono confere as imagens e a DM 1 personalizada (nome, post, prato, número de itens).

## 5. DM 1 (dono), com as 2 imagens

> Oi, *Nome*! Sou o Dennis, do menulala (cardápio digital). Vi o cardápio de
> vocês na foto do post de *data*, e o *prato* chamou atenção. Em foto o
> cliente não dá zoom e, quando um preço muda, a foto fica velha. Já digitei
> os *N* itens e preços dessa foto num cardápio para vocês (as imagens estão
> aqui), de graça, com botão de pedido direto no WhatsApp de vocês, sem taxa.
> Quer que eu deixe ele pronto na sua conta? Se tiver preço errado, me avisa
> que eu corrijo.

- Follow-ups nos dias 3 e 7, no máximo.
- Todo texto novo passa pelos Princípios antes de ser enviado.

## 6. "Quero" → link de cadastro (dono)

`https://menulala.com/signup?utm_source=concierge&utm_content=<instagram>`

A conta aparece em `/api/admin/events` com `source: "concierge"`.

## 7. Preenchimento (agente; o dono roda se a sessão bloquear o banco de produção)

```bash
DATABASE_URL='<prod>' npx tsx scripts/concierge-fill.ts <email> branding/concierge/<instagram>/cardapio.json          # ensaio
DATABASE_URL='<prod>' npx tsx scripts/concierge-fill.ts <email> branding/concierge/<instagram>/cardapio.json --apply  # grava
```

- Sempre rode o ensaio primeiro.
- O script para, sem gravar nada, se a conta não tiver restaurante, se o rascunho já tiver itens ou se houver assinatura no Stripe.
- Ele grava o rascunho e a cortesia de 60 dias, e **não publica**.
- Se a sessão bloquear o acesso do agente ao banco de produção, o dono roda o mesmo comando com `!`.

## 8. DM "Pronto" (dono)

> Pronto! Seu cardápio já está no painel do menulala. Entra, confere os
> preços, coloca o WhatsApp e toca em Publicar. Coloquei o plano Pro de
> cortesia até *data* para o cardápio aparecer inteiro; depois disso você
> escolhe se quer continuar, nada é cobrado sozinho.

## Leitura

| Veredito | Regra (20 DMs, 14 dias desde a 1ª, máx. DM 1 + 2 follow-ups) |
|---|---|
| Passa | ≥ 3 ativados (publicado com WhatsApp válido) |
| Fraco | 1–2 ativados |
| Falha | 0 ativados |

- Mandar 10 DMs primeiro. Se ninguém responder em 5 dias, revisar a DM e as imagens.
- Os pagantes são lidos perto do fim da cortesia.
