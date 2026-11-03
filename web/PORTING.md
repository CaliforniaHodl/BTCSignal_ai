# Porting guide (legacy Hugo site → web/)

Read this whole file before writing code. Also read `AGENTS.md` — this is **Next.js 16 with
`cacheComponents: true`**; check `node_modules/next/dist/docs/` before using an API you're unsure of.

## Where the legacy code is
Repo root (one level up from `web/`):
- `layouts/<slug>/` — page templates (HTML structure, copy)
- `content/<slug>/_index.md` — frontmatter: which JS files the page loads (`js:`), title, copy
- `static/src/js/<name>.js` — the page's client logic (port the *feature*, not the code)
- `netlify/functions/*.ts` + `netlify/functions/lib/*.ts` — server logic
- `content/posts/*.md`, `content/learn/*.md` — articles

The legacy site is known-buggy. Port intent and features; fix bugs; do not copy its patterns.

## Hard rules
1. **No fake data, ever.** Legacy code often fills gaps with `Math.random()`, hardcoded
   "accuracy" numbers, or zeros. Never do this. If a real source fails → render
   `<Unavailable/>`. If a metric has no free real source → either compute it honestly from
   data we have and mark it `<ModeledTag how="..."/>` with the method, or drop it and say so
   in your report.
2. **Browser never calls third-party APIs.** All external data goes through server code in
   `src/lib/**` and, if the client needs live updates, a route under `src/app/api/v1/...`.
   Wrap results in `Datum<T>` (`src/lib/market/http.ts` → `datum()`, `getJson()`).
   Reuse `getMarketSnapshot()` / `getCandles()` (`src/lib/market/snapshot.ts`) — they're
   cached and give the whole site one price. Add new sources to `src/lib/market/sources.ts`
   style modules with `"use cache"` + `cacheLife(...)` + `cacheTag(...)`.
   US-reachable sources only: Coinbase, Kraken, mempool.space, alternative.me, CoinGecko,
   OKX, Deribit, Hyperliquid. (Binance futures = 451, Bybit = 403 from US.)
3. **One indicator library:** `src/lib/indicators`. Don't re-implement RSI/EMA/etc.
   Add missing indicators there, with tests.
4. **Premium = server-enforced.** Wrap premium page bodies in `<ProGate feature="Name">`
   (`src/components/pro-gate.tsx`). Premium API routes start with
   `const deny = await requirePro(); if (deny) return deny;` (`src/lib/pay/access.ts`).
   Never ship premium data to a non-Pro browser. Free/premium per `src/lib/site/registry.ts`.
5. **Claude features** (trade coach, setup grader, chart analysis, summaries): follow
   `src/lib/agent/review.ts` exactly — `@anthropic-ai/sdk`, model `claude-opus-5-5`,
   `client.beta.messages.parse` with `betaZodOutputFormat`, `thinking: {type:"adaptive"}`,
   explicit `output_config.effort`, `betas: ["server-side-fallback-2026-07-01"]` +
   `fallbacks: "default"`, check `stop_reason === "refusal"`, typed error handling.
   Premium only. If no `ANTHROPIC_API_KEY`, return a clear 503 "not configured" — never a
   canned fake answer. Image input: base64 `image` content blocks, validate type/size (≤5 MB).
6. **Dynamic data in pages:** under cacheComponents, anything reading cookies/DB/uncached
   data must be inside `<Suspense>` and call `await connection()` (see `src/app/agent/page.tsx`).
7. **Design:** dark tokens in `src/app/globals.css`; primitives in `src/components/ui.tsx`
   (`Page`, `PageHeader`, `Card`, `Stat`, `DatumView`, `Unavailable`, `SourceLine`,
   `ModeledTag`, `Badge`, `Disclaimer`). Numbers use `.num`. Charts: `lightweight-charts`
   for price/time series (see `src/components/price-chart.tsx`), `recharts` for other
   charts. Must work at 375px width. Every data point shows source + age.
8. **Per-browser state** (watchlists, journal, alert drafts) may use localStorage wrapped
   in try/catch. Anything that must be shared, durable, or acted on by a cron goes in the DB.
9. **Database:** don't edit `src/db/schema.ts`. Put new tables in
   `src/db/schema-<yourbatch>.ts` and `export` them; import them directly where used.
   You may run `npx drizzle-kit generate` locally to test, but **do not commit anything under
   `drizzle/`** — the lead regenerates migrations after merging all batches.
10. **Don't edit shared files** other agents also touch: `src/lib/site/registry.ts`,
   `vercel.json`, `src/components/site-chrome.tsx`, `package.json`. If you need a new
   dependency, a cron entry, or a nav change, list it in your final report instead.
11. **Tests:** pure logic (calculators, parsers, indicators, scoring) gets vitest tests
   next to it (`*.test.ts`). Before finishing: `npx tsc --noEmit`, `npx eslint src`,
   `npx vitest run` must all pass.
12. **Verify in a browser-free way:** run `npx next dev -p <your port>` and `curl` each route
   you built (expect 200, and for premium routes check the locked state renders and premium
   API returns 402). Stop the server when done.

## Setup in your worktree
```
cd web && npm ci
```
Use your assigned port. Your worktree has its own `.data/` (PGlite) — that's fine.

## Report back (final message)
- Routes ported, and for each: data sources used, free/premium, what changed vs legacy
- Anything dropped or marked Modeled, and why
- Requests for the lead: deps, cron entries, nav/registry changes, schema tables added
- Exact verification you ran and the results (paste command output summaries)
Commit your work on your branch with a clear message. Do not push.
