---
name: daily-ads-report
description: Run the menulala daily Google Ads read — spend and clicks from the Ads UI, ground truth from /api/admin/events, and the session replays behind the numbers (PostHog) — then report it in pt-BR against the kill-or-scale rule. Use when asked for "relatório de ads", "ads report", "como foram os anúncios", "leitura do dia", "o que aconteceu com a campanha", or any daily/weekly check on the menulala ad run.
---

# menulala daily ads read

Three sources, in this order — each one only exists to explain the one before it:

| # | Source | Answers |
|---|---|---|
| A | `menulala.com/api/admin/events` | What actually happened (contas, cardápios publicados, assinaturas) |
| B | Google Ads UI | What it cost |
| C | PostHog | *Why* people did what they did |

The kill rule lives in `docs/ads-2026-09.md`; the running history is in the
`menulala-google-ads` memory. Read both before reporting, and append the day's
read to the memory when done.

## Time zones — get this right first

- Ads UI reports in **GMT-03:00 (Brasília)**. Its "Ontem" is a BRT day.
- `/api/admin/events` and PostHog both stamp **UTC**. BRT = UTC − 3 h.
- So a BRT day is `03:00 UTC` → `03:00 UTC` next day. Always state BRT in the
  report, and convert every timestamp you quote.
- Asked for "today's" report before ~09:00 BRT: today is still nearly empty.
  Say so in one line and report the **last closed BRT day** plus the run-to-date.

## A. App ground truth (start here, it's free)

In the user's Chrome (signed in as the `ADMIN_EMAIL` account), navigate to
`https://menulala.com/api/admin/events?days=7` and read it with `get_page_text`.
A **404** means that Chrome is not signed in as an admin — ask, don't guess.

What matters, in order:

- `totals` — `signups`, `adSignups`, `onboarded`, `published`, `viewed`,
  `ordered` (accounts with at least one order sent), `orders` (orders sent),
  `paying` for the window, plus `payingNow` (Pro accounts across the whole
  product, not just this window). `published` counts photo menus **and** text
  menus (since 10/10/2026; before that it counted photos only).
  **Test accounts are already out of every count** (since 10/10/2026): any
  `ADMIN_EMAIL` address plus `FUNNEL_TEST_EMAILS`. `totals.testAccounts` says
  how many were left out; they still appear in `accounts[]` with `test: true`
  — never report them as leads.
- `sources[]` — the attributed truth, one row per origin:
  `{source, signups, onboarded, published, viewed, ordered, paying}`. `source:
  "google-ads"` is the only row the budget is judged on.
- `daily[]` — per-UTC-day `signups / adSignups / published`.
- `accounts[]` — one row per account created in the window, newest first, with
  a masked e-mail, `source`, `ad`, `gclid`, `campaign`, `landing`, the menu
  `slug`, `mode` (`photos`, `built` = text menu, or `null` = nothing
  published), `images`, `items` (on the text menu), `views` (menu opened —
  clicks are not counted), `orders` (orders sent to WhatsApp — intent: the
  diner still taps send) and a `status`:

  | status | means | the question it raises |
  |---|---|---|
  | `no_restaurant` | signed up, never opened the onboarding | is the dashboard's first screen clear? |
  | `no_menu` | restaurant created, nothing published (no photos, no text menu) | did they open the builder (`builder_step` in PostHog) and stop? at which step? |
  | `live` | menu published, nobody has opened it — not even the owner | they never shared the QR |
  | `viewed` | menu published and opened | the product worked |
  | `paying` | Pro | — |

**What this endpoint cannot tell you: when a subscription started.** We store
`proExpiresAt`, not a start date. "Vendas de ontem" comes from the **Stripe
dashboard**, never from here — and `payingNow` counts every active Pro account,
including ones that predate the ad run, so never report it as sales.

## B. Google Ads

Give the window ~5 s and a second screenshot: the shell paints before the numbers.

- **Overview** with the date picker: "Ontem" for the closed day, then a custom
  range for the run. Read **Cliques / Impressões / CPC méd. / Custo**.
- **Date picker gotcha** (burned a read on the ESL account): clicking days in the
  calendar drifts — the month scrolls under the cursor and you silently get the
  wrong range. Type into the "Data de início" / "Data de término" fields
  instead — `triple_click`, type `DD/MM/AAAA` — then **Aplicar**.
- **Billing** (`/aw/billing/summary`): **Fundos disponíveis** (runway) and the
  current month's **Custo líquido**, which is what the judge point is set on.
- **Campaigns** (`/aw/campaigns`): only the menulala campaign may be green.
  Daily spend a little over the daily budget is normal overdelivery, not a
  misconfiguration.

Arithmetic to do every time:

```
custo por conta criada  = custo do run / sources["google-ads"].signups
custo por cardápio      = custo do run / sources["google-ads"].published   ← the real number
até o ponto de julgamento = teto do run − custo líquido do mês
runway                  = fundos disponíveis / gasto diário médio
cliques vs app          = cliques do Ads ≈ site_view com ad=true no PostHog, mesmo dia BRT
```

**Never judge a run on the Ads "Conversões" column.** It counts whatever
actions are enabled, including the mid-funnel ones, and double-counts across
them. Column A is the truth.

## C. PostHog — the replays

**Project 267290 is shared with DevRounds** (PostHog's free plan allows one
project per organisation). menulala stamps every event with a `product`
super property, so **every query below must carry**:

```sql
AND properties.product = 'menulala'
```

Forget it once and you are reading DevRounds' funnel and calling it menulala's.
Session replays are mixed in the same list too — filter the replay list by the
same property before opening anything.

PostHog is loaded **only on the owner-facing pages** — landing, `/pricing`,
`/login`, `/signup`, `/dashboard`. Public menu pages (`/m/[slug]`) carry none
of it by design, so a diner scanning a QR code will never appear here. Menu
traffic lives in the `MenuView` table and in the owner's own stats card.

Custom events worth querying, on top of autocapture:

- `site_view` — one per page, with `ad` (came from a Google click),
  `utm_source`, `utm_campaign`, `referrer`, `path`. This is the pre-signup
  funnel's step zero.
- `cta_click` — a click on a `/signup`, `/login` or `/pricing` link, with the
  button's text and the page it was on.
- `signup_completed`, `menu_published`, `subscription_started` — the same three
  moments the Google Ads conversions fire on, so the two can be reconciled.

### Query API from the page context (fast, no virtualized grid)

The SQL page's results grid is virtualized in both directions and unreadable.
Open any PostHog page, then use `javascript_tool`:

```js
window.__r = {status:'pending'};
const csrf = document.cookie.split('; ').find(c=>c.startsWith('posthog_csrftoken='))?.split('=')[1];
const q = `<HogQL>`;
fetch('/api/projects/<PROJECT_ID>/query/', {method:'POST',
  headers:{'Content-Type':'application/json','X-CSRFToken':csrf},
  body: JSON.stringify({query:{kind:'HogQLQuery', query:q}})})
 .then(r=>r.json()).then(j=>{window.__r={status:'done', rows:j.results};})
 .catch(e=>{window.__r={status:'error', err:String(e)};});
'kicked'
```

Then read `window.__r` in a second call. **Kick-and-poll is mandatory**: a
synchronous `await` on the fetch blows the 45 s CDP timeout and the tool
reports a frozen renderer.

**Print gotcha:** any URL still carrying `?gclid=…`/`?gad_source=…` makes the
harness blank the whole output ("BLOCKED: Cookie/query string data"). Strip it
in the query (`splitByChar('?', url)[1]`) or in JS (`String(u).split('?')[0]`).

Three queries cover a normal day:

1. **Session map** — one row per session:
   `SELECT properties.$session_id AS sid, formatDateTime(min(timestamp),'%d %H:%i') AS t0,
    dateDiff('second',min(timestamp),max(timestamp)) AS secs, any(properties.$device_type),
    any(properties.$browser), any(properties.$geoip_city_name), count() FROM events
    WHERE timestamp >= toDateTime('<BRT day start in UTC>') AND timestamp < …
    AND properties.product = 'menulala'
    GROUP BY sid ORDER BY min(timestamp)`
2. **One session's story** — `timestamp, event, properties.$el_text, properties.$pathname,
   properties.$event_type` for `properties.$session_id IN (…)`, ordered by time.
   `$rageclick` shows up here.
3. **Which element** — `substring(elements_chain, 1, 180)`; pull `aria-label`
   and the class out of it.

Useful extras: `event='$web_vitals'` (`$web_vitals_LCP_value`) to rule page
speed in or out; `event='$exception'` for crashes — but zero rows for days may
mean capture is not firing, so don't claim "nenhum erro" on that alone.

### Watching an actual replay

`https://eu.posthog.com/project/<PROJECT_ID>/replay/<session_id>?t=<seconds from session start>`
— compute `t` from the session's first event. Expect three states before a
frame is usable: "PostHog is taking longer than usual to load" (click
**Reload**), "Buffering…", and "Skipping inactivity". Screenshot, wait ~8 s,
screenshot again. Seeking by clicking the scrub bar is unreliable;
re-navigating with a new `?t=` is not.

Every form input is masked (`maskAllInputs`), so the e-mail, the password and
the restaurant name render as blocks — the chrome, the buttons, the error
banners and the cursor are all visible, and that is where the answers are.

## Reading traps

- **`el_text` can be Chrome's auto-translation, not our copy.** menulala ships
  pt-BR, en and es; if the strings in autocapture are in a language the
  restaurant would not have picked, the visitor's browser translated the page.
- **The owner's own accounts** (`den.roadkill333@`, and any test signup) appear
  in PostHog like anyone else. Match them by city and desktop, and drop them.
  Never sign off on a fix from a test you ran yourself on your own account.
- **Bot traffic inflates the landing numbers** (see the `menulala marketing
  state` memory). A `site_view` with `ad: false` and no `cta_click` in the same
  session, from a datacentre city, is not a person.
- **`status: "live"` is not failure** — it is a menu nobody has been shown yet.
  The dashboard already nudges those owners; the ads read should count them
  separately from `no_menu`, which *is* a product failure.
- **`adSignups` can be lower than the Ads conversion count** and that is
  correct: attribution is only written for accounts created within a day of the
  click, in the same browser that stored the parameters.

## The report (pt-BR, in this shape)

1. **Hoje até agora** — one line; if the day just started, say it plainly.
2. **Último dia fechado** — a small table: Ads (impressões, cliques, CTR, CPC,
   custo) next to the app (contas criadas, quantas de anúncio, cardápios
   publicados, cardápios abertos).
3. **Run acumulado** — cliques, custo, contas, cardápios publicados,
   assinaturas, **custo por conta** e **custo por cardápio publicado**.
4. **Onde a regra de kill está** — X/N do gatilho, quanto falta até o ponto de
   julgamento, runway do saldo.
5. **Sinais do produto** — what the replays found, one bullet per person, named
   by the masked e-mail prefix and the BRT time, with the `status` from column A.
6. **Recomendação** — one call, and what *not* to touch before the judge point.

Then: append the read to the `menulala-google-ads` memory (numbers, new
accounts, what the replays showed, any new UI gotcha) and update the
`MEMORY.md` hook line. If the day produced a decision (a fix, a pause, a budget
change), also add it to `docs/ads-2026-09.md`.
