# Deploy & cutover runbook

The new app lives in `web/` on branch `rewrite`. The legacy Hugo/Netlify site keeps running
until step 6. Nothing here is automatic. Each step is an explicit, owner-approved action.

## 0. Decisions needed first
- [ ] **Production domain** (a `*.netlify.app` name can't point at Vercel).
- [ ] **Legal text reviewed**: entity name + governing law in `/terms-of-use`, refund wording,
      retention periods in `/privacy-policy`, X handle (`@BTCSignal_ai` vs `@BTCSignalAI`).
- [ ] **Coin Metrics Community data** (CC BY-NC 4.0, non-commercial) used on `/hodl-waves`,
      `/dashboard`, `/alpha-radar`: keep, license it, or remove (`src/lib/onchain/holders.ts`
      and the dashboard on-chain module).

## 1. Database
Create a Postgres database (Neon via the Vercel Marketplace is simplest). Copy its pooled
connection string. Migrations in `drizzle/` apply automatically on first connection.

## 2. Vercel project
- Import the GitHub repo, **Root Directory = `web`**, framework Next.js.
- Region: pick a non-US region if you want Binance/Bybit later; current sources all work from US.
- Environment variables (Production). See `.env.example` for the full list:

| Var | Value |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `CRON_SECRET` | `openssl rand -hex 32` (Vercel Cron sends it automatically) |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` |
| `OWNER_EMAILS` | your verified Gatekeep email |
| `GATEKEEP_ISSUER` | `https://id.gatekeepauth.com` |
| `GATEKEEP_CLIENT_ID` | `btcsignal` |
| `LNBITS_URL`, `LNBITS_INVOICE_KEY` | your node; **invoice key, never admin** |
| `ANTHROPIC_API_KEY` | enables Claude review + AI tools (without it they return 503) |
| `ALERTS_IP_SALT` | `openssl rand -hex 16` |
| `COINBASE_KEY_NAME`, `COINBASE_PRIVATE_KEY` | optional, owner dry run only |

**Never set** `LIGHTNING_MOCK` (refused in production anyway) or `LIVE_TRADING` (until the gate passes).

## 3. Gatekeep
On the Gatekeep box add the production callback to `[clients.btcsignal]` in `clients.toml`, then restart:
`redirect_uris = ["https://<domain>/api/auth/callback", "http://localhost:3000/api/auth/callback"]`

## 4. LNbits
Confirm the node is reachable from Vercel over HTTPS. The webhook URL `https://<domain>/api/pay/webhook`
is sent per invoice automatically.

## 5. Verify on the Vercel preview URL
- [ ] `/` live data · `/agent` ticks (owner console → "Run a tick now")
- [ ] Buy the **day pass with real sats**, confirm recovery code, restore in a private window
- [ ] Passkey sign-in → `/owner` shows all green except Live trading
- [ ] Create an alert with a Discord webhook; wait for the 5-min cron
- [ ] Premium page locked in a private window; premium API returns 402

## 6. Cutover
1. Point the domain at Vercel.
2. Legacy: merge PR #12 (if not already), then **disable all GitHub Actions schedules** and delete the
   Netlify functions or the Netlify site, so nothing writes to the public repo anymore.
3. Remove `data/access-records.json` and other legacy data files from the repo (it's public).
4. Watch Vercel logs for a day: cron runs at :05 hourly (agent) and every 5 min (alerts).

## Live trading ($100), later and separately
Only after `npm run research` passes the out-of-sample gate **and** 30+ days of paper results line up.
Then: Coinbase ES256 key with View+Trade, dry run from `/owner`, then a deliberate change wiring the
broker into the tick with `LIVE_TRADING=1` and `LIVE_MAX_USD=100`.
