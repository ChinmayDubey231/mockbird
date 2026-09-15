# Mockbird

Describe an API in English, get a live mock endpoint in five seconds, with latency and failure injection built in.

**Live:** _add your deployment URL here_

```
$ curl -s https://mockbird.app/m/a8f3k2/orders

[
  { "id": "ord_92kd", "customer": "Rohan Mehta", "total": 4820, "status": "shipped" },
  { "id": "ord_71bz", "customer": "Ananya Iyer", "total": 1290, "status": "pending" }
]
```

_(Record a 20-second GIF here: type a description, watch the endpoint appear, curl the URL.)_

---

## Why

A frontend developer needs an endpoint the backend team hasn't written yet, so the screen waits. Mockbird gives them a live URL returning realistic JSON immediately, so the screen gets built today. It also does two things a real backend won't do on request: respond slowly, and fail one call in five — which is how loading and error states actually get tested.

## Quick start

```bash
docker compose up -d              # Postgres on :5432
cp .env.example .env
npm install && npm run db:push && npm run seed
npm run dev
```

Then, in another terminal:

```bash
curl -s http://localhost:3000/m/a8f3k2/orders
curl -s http://localhost:3000/m/a8f3k2/orders/ord_92kd     # 1.2s delay, fails 20% of the time
curl -s http://localhost:3000/m/a8f3k2/ordres              # 404 that tells you what does exist
```

`GROQ_API_KEY` is optional (get a free one at [console.groq.com](https://console.groq.com)). Without it the "Describe it" tab falls back to a hand-written skeleton and everything else works exactly the same — the product is fully usable with the AI switched off.

---

## How routing works

This is the part worth reading.

A stored path is never matched as a string. When an endpoint is saved, its path is split into segments and given a numeric specificity, and both are persisted:

```
"/orders/:id/items"  ->  [
  { type: "static", value: "orders" },
  { type: "param",  name:  "id"     },
  { type: "static", value: "items"  }
]
```

```
specificity = (staticSegments * 100) - (paramSegments * 10) - (hasWildcard ? 50 : 0)
```

At request time the handler asks Postgres for the active endpoints matching `(workspaceId, method)`, ordered by `specificity DESC`. That query is served by a compound index, so **the ordering happens in the database, not in Node**, and the matcher itself does no sorting at all — it walks the list and takes the first pattern that fits.

Precedence falls out of the numbers:

| Pattern | Specificity | `/orders/new` | `/orders/ord_92kd` | `/orders/a/b` |
|---|---:|---|---|---|
| `/orders/new` | 200 | ✅ wins | — | — |
| `/orders/:id` | 90 | (loses) | ✅ wins | — |
| `/orders/*` | 50 | (loses) | (loses) | ✅ wins |

Matching rules, in `src/lib/match.ts`:

- segment count must be equal, unless the pattern ends in a wildcard
- static segments compare case-sensitively
- param segments match any non-empty segment and capture it
- a trailing `*` matches any depth below it and captures the remainder

**When nothing matches**, the 404 body lists every path the workspace actually serves and runs a Damerau-Levenshtein comparison against the requested path, so `GET /ordres` answers with `"didYouMean": "/orders"` instead of a dead end.

There are 36 unit tests over this: `npm test`.

### Token substitution

The stored body may contain tokens that resolve against the request:

| Token | Resolves to |
|---|---|
| `{{id}}` | the matched path param of that name |
| `{{query.page}}` | a query-string value, `""` when absent |
| `{{wildcard}}` | everything captured by a trailing `*` |
| `{{now}}` | ISO timestamp at request time |
| `{{index}}` | position inside the enclosing array, as a number |
| `{{random.name}}`, `{{random.int}}` | fake data, different every request |

So `GET /orders/:id` returns a body whose `id` field matches what was asked for. A string that is nothing but one token takes that token's native type, so `"qty": "{{index}}"` comes back as `0`, not `"0"`.

### Collection filtering

When the body is an array, `?limit=`, `?offset=`, `?page=`, `?sort=`, `?order=` and any `?field=value` are applied server-side. One mock becomes a usable paginated list endpoint.

---

## Request lifecycle

```
GET /m/a8f3k2/orders/ord_92kd
  │
  ├─ middleware.ts        rate limit on the workspace key straight from the URL,
  │                       before the function does any work
  ├─ resolve workspace    Redis, 60s TTL; falls back to an in-process map
  ├─ load candidates      indexed on (workspaceId, method, specificity DESC)
  ├─ match route          first fit wins; capture params and wildcard
  ├─ roll failureRate     if it fires, return the failure body immediately
  ├─ sleep(delayMs)       capped at 8000ms
  ├─ substitute tokens    then apply collection query params
  ├─ write RequestLog     and increment hitCount
  └─ return responseBody  with the stored status and headers
```

No background worker, no websocket, no cron. Every operation completes inside one request. The log trims itself to the most recent 500 rows per workspace inside the write that overflows it, on roughly one call in twenty so the cost is amortised.

## Where the AI sits

Two things, once, at creation time: it turns the English description into a JSON Schema, and it generates sample records matching that schema. The result is shown in an editable field and nothing is written until you press **Create endpoint**.

**At request time there is no model call at all.** The response is read from Postgres and returned verbatim, so the same request returns the same bytes every time. That determinism is the whole point — a mock that returns different data on every call is useless to build a UI against, and per-request inference would add seconds of latency and real cost.

## Architecture

| Layer | Choice |
|---|---|
| App | Next.js App Router — the catch-all route handles every mock method and path |
| DB | Postgres via Prisma (Neon's pooled URL with `?pgbouncer=true` in production) |
| Cache + rate limits | Upstash Redis over HTTP, so it works in serverless; in-process fallback when unset |
| Identity | A cookie-backed user in `src/lib/auth.ts`. Everything above it only calls `currentUser()`, so dropping in Auth.js with a GitHub provider means replacing one function body |
| AI | Any chat completion endpoint, one call at creation |

```
src/lib/path.ts        compile a path into segments + specificity
src/lib/match.ts       the matcher and the "did you mean" hint
src/lib/template.ts    token substitution
src/lib/collection.ts  limit / offset / sort / field filtering
src/lib/endpoints.ts   validation and clamping before anything reaches the DB
src/app/m/[key]/[[...path]]/route.ts   the one handler that serves every mock
```

## Limitations, stated plainly

- **The landing-page demo is a real, temporary workspace.** Typing a description into the "Try it" card on `/` creates an actual workspace via `POST /api/demo` — same code path as the full editor — capped at 10 per hour per visitor and expiring in 24 hours, so the curl command a visitor copies keeps working for a day and then quietly 404s.
- **Mocks are public.** The workspace key is unguessable but not secret. Don't put real data in them.
- **POST doesn't persist.** It returns its configured body; it doesn't append to the collection `GET` returns. Stateful mocks would need per-workspace collection storage and a reset button — a deliberate omission, not an oversight.
- **Delay is capped at 8 seconds** by the serverless function timeout.
- **Request logging is a write on every call.** That's the first thing that breaks at scale; it would need batching or a queue.
- Response bodies are capped at 256KB and the log keeps 500 rows per workspace.

## Local setup

```bash
docker compose up -d
cp .env.example .env       # DATABASE_URL already points at the compose Postgres
npm install                # runs prisma generate
npm run db:push            # push the schema
npm run seed               # workspace a8f3k2 with four example endpoints
npm run dev

npm test                   # 36 unit tests over the matcher and substitution
npm run typecheck
```

### Deploying

- Vercel + Neon. Use the pooled connection string with `?pgbouncer=true`.
- Set `NEXT_PUBLIC_APP_URL` so the UI shows the right mock URLs.
- Add the Upstash variables to get shared caching and rate limiting across instances.
- `MOCK_RATE_LIMIT` controls requests per minute per workspace key (default 60).

---

Built by Chinmay Dubey · [github.com/ChinmayDubey231](https://github.com/ChinmayDubey231)
