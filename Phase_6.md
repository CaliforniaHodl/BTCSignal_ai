# Phase 6: Competitive Feature Parity

**Goal:** Close the gap with Coinglass free tier while leveraging unique advantages
**Timeline:** 4-6 weeks
**Success Metric:** Justify $25/week pricing with demonstrable value over free alternatives

---

## Sprint 1: Quick Wins (Week 1) - COMPLETE

### 1.1 Long/Short Ratio Display - DONE
- [x] Add Bybit L/S ratio API call (`/v5/market/account-ratio`)
- [x] Create ratio display component for dashboard
- [x] Add visual indicator (bar chart showing long % vs short %)
- [x] Add tooltip explaining what L/S ratio means
- [x] Display on: Dashboard

**API Endpoint:**
```
https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h
```

### 1.2 Multi-Exchange Funding Rate Comparison - DONE
- [x] Add dYdX funding rate API
- [x] Add Bitget funding rate API
- [x] Add Binance funding rate API (may fail in US)
- [x] Create comparison table component
- [x] Show: Exchange | Current Rate | 8hr Trend | Annualized
- [x] Highlight arbitrage opportunities (>0.02% spread)

**API Endpoints:**
```
dYdX:   https://indexer.dydx.trade/v4/perpetualMarkets?ticker=BTC-USD
Bitget: https://api.bitget.com/api/v2/mix/market/current-fund-rate
Binance: https://fapi.binance.us/fapi/v1/premiumIndex
OKX:    (existing)
Bybit:  (existing)
```

### 1.3 Funding Rate History Chart - DONE
- [x] Enhanced Netlify scheduled function to snapshot funding from all exchanges
- [x] Store in `/data/market-snapshot.json` as `funding.history` (rolling 30 days)
- [x] Build Chart.js line chart component
- [x] Add "Funding positive for X consecutive days" indicator
- [x] Display historical average vs current

---

## Sprint 2: Data Infrastructure (Week 2) - COMPLETE

### 2.1 Historical Open Interest Tracking - DONE
- [x] Integrated OI snapshots into existing fetch-market-data function (every 4 hours)
- [x] Store in `market-snapshot.json` as `openInterest.history` (rolling 30 days)
- [x] Build OI chart with price overlay (dual Y-axis Chart.js)
- [x] Add OI change indicators (+/- from 24h ago)
- [x] Calculate OI/Market Cap ratio

### 2.2 Signal Accuracy Tracking System - DONE
- [x] Created `/data/signal-history.json` schema
- [x] Log each signal: `{timestamp, price, direction, confidence, target}`
- [x] Created `check-signal-outcomes.ts` scheduled function (daily at 6pm UTC)
- [x] Calculate rolling accuracy stats (7d, 30d, all-time)
- [x] Build public accuracy dashboard component
- [x] Display: Overall accuracy, streaks, confidence

**Files Created:**
- `data/signal-history.json` - Signal tracking data
- `netlify/functions/check-signal-outcomes.ts` - Daily outcome checker
- Updated `btctradingbot-tweets.ts` - Logs signals when posting

### 2.3 Data Caching Layer - DONE
- [x] Implemented JSON file caching via market-snapshot.json (updated every 4 hours)
- [x] All data cached in single snapshot file (funding, OI, L/S ratio)
- [x] Added cache status indicator in UI (fresh/stale/old status)
- [x] Shows time since last update with color-coded indicator

---

## Sprint 3: Differentiators (Week 3-4) - COMPLETE

### 3.1 Telegram Alert Integration - DONE
- [x] Created `telegram-webhook.ts` - handles bot commands (/start, /stop, /status, /alerts, /help)
- [x] Created `send-telegram-alert.ts` - sends alerts to all subscribers
- [x] Store subscriber chat IDs in GitHub (`data/telegram-subscribers.json`)
- [x] Implement alert types:
  - [x] Signal alerts (formatSignalAlert helper)
  - [x] Funding rate spike (formatFundingAlert helper)
  - [x] Squeeze risk alerts (formatSqueezeAlert helper)
- [x] Add Telegram connect button to Alerts page
- [x] Graceful skip if TELEGRAM_BOT_TOKEN not configured

**Files Created:**
- `netlify/functions/telegram-webhook.ts` - Bot command handler
- `netlify/functions/send-telegram-alert.ts` - Alert sender
- `data/telegram-subscribers.json` - Subscriber storage

### 3.2 Discord Webhook Integration - DONE
- [x] Created Discord webhook input field on Alerts page
- [x] Validate webhook URL format (discord.com/api/webhooks or discordapp.com/api/webhooks)
- [x] Send test message on save with rich embed
- [x] Mirror Telegram alert types to Discord
- [x] Store webhook URLs in localStorage (client-side)

**Files Created:**
- `netlify/functions/discord-webhook.ts` - Webhook handler with test and send actions

### 3.3 Funding Rate Arbitrage Calculator - DONE
- [x] Calculate spread between exchanges using live funding rate data
- [x] Show potential profit with configurable position size ($100-unlimited)
- [x] Factor in trading fees (0.05% maker fee * 4 trades)
- [x] Auto-select best exchanges or manual selection
- [x] Display gross profit, net profit, annualized return
- [x] Add risk warning and calculator assumptions

**Features:**
- Position size input (default $10,000)
- Holding period selection (1 day, 1 week, 30 days)
- Long/Short exchange dropdowns with auto option
- Live rate display from multi-exchange funding data

---

## Sprint 4: On-Chain Basics (Week 4-5) - COMPLETE

### 4.1 Exchange Reserve Tracking - DONE
- [x] Created `fetch-onchain-data.ts` scheduled function (every 4 hours)
- [x] Track BTC balance on top 5 exchanges (Binance, Coinbase, Bitfinex, Kraken, OKX)
- [x] Calculate 24h/7d change with trend indicators
- [x] Display accumulation/distribution signals
- [x] Add "Coins leaving exchanges" bullish indicator

**Files Created:**
- `netlify/functions/fetch-onchain-data.ts` - On-chain data aggregator
- `data/onchain-data.json` - Cached on-chain metrics

### 4.2 Whale Transaction Alerts - DONE
- [x] Uses existing `whale-tracker.ts` (monitors mempool.space API)
- [x] Tracks large transactions (>500 BTC)
- [x] Identifies exchange wallets vs unknown
- [x] Displays whale inflow/outflow in dashboard
- [x] Classifies: Exchange deposit (bearish) vs withdrawal (bullish)
- [x] Calculates net flow with bullish/bearish signal

**Integration:**
- Whale data from `static/data/whale-alerts.json` feeds into on-chain dashboard
- 24h inflow/outflow stats with net flow calculation

### 4.3 Basic MVRV Indicator - DONE
- [x] Calculate MVRV ratio from market cap / realized cap
- [x] Display with visual meter and marker
- [x] Add zones: Undervalued (<1) | Fair (1-2.4) | Overvalued (2.4-3.5) | Extreme (>3.5)
- [x] Include signal text explaining current valuation
- [x] Show market cap and realized cap values

**UI Components Added:**
- Exchange Reserves card with breakdown table
- Whale Flows card with inflow/outflow and signal
- MVRV Indicator card with visual meter and zones

---

## Sprint 5: Polish & Positioning (Week 5-6) - COMPLETE

### 5.1 Educational Tooltips - DONE
- [x] Add info icons to every metric
- [x] Write tooltip content for:
  - [x] Fear & Greed Index
  - [x] Funding Rate
  - [x] Open Interest
  - [x] Buy/Sell Ratio
  - [x] Long/Short Ratio
  - [x] Liquidations
  - [x] RSI
  - [x] Volatility Index
  - [x] BTC Dominance
  - [x] MVRV
  - [x] Exchange reserves
  - [x] Whale flows
- [x] Tooltips with title attribute on all widgets

### 5.2 Pricing Tier Update - DONE
- [x] Add Monthly pass: 50,000 sats (~$50)
- [x] Update pricing page layout (5 columns)
- [x] Add "Best Value" badge for monthly tier
- [x] Add 83% OFF discount badge
- [x] Green styling for monthly card
- [ ] Consider annual tier: 400,000 sats (~$400, 33% off) - future

### 5.3 Marketing Site Updates - DONE
- [x] Add comparison table vs Coinglass on home page
- [x] Tagline: "Understand the data, not just see it"
- [x] Highlight unique features in comparison table
- [x] Show what's included vs paid on Coinglass
- [ ] Add testimonials section (collect from early users) - future

---

## API Reference

### Required New Endpoints

| Endpoint | Source | Auth | Rate Limit |
|----------|--------|------|------------|
| L/S Ratio | Bybit | None | 120/min |
| Funding (dYdX) | dYdX | None | 100/min |
| Funding (Bitget) | Bitget | None | 100/min |
| Whale Txns | blockchain.info | None | 100/min |
| Exchange Reserves | CryptoQuant | API Key (free tier) | 100/day |
| MVRV Data | CoinMetrics | None | 1000/day |

### Scheduled Functions Needed

| Function | Frequency | Data Stored |
|----------|-----------|-------------|
| `snapshot-funding.ts` | Every 8 hours | `/data/funding-history.json` |
| `snapshot-oi.ts` | Every 4 hours | `/data/oi-history.json` |
| `check-signal-outcomes.ts` | Every 24 hours | `/data/signal-history.json` |
| `snapshot-reserves.ts` | Every 6 hours | `/data/reserves-history.json` |

---

## Success Criteria

### Phase 6 Complete When:

- [x] L/S ratio visible on dashboard
- [x] 4+ exchange funding rate comparison live (Bybit, OKX, dYdX, Bitget, Binance)
- [x] Funding rate history chart (30 days)
- [x] OI historical chart working
- [x] Signal accuracy publicly displayed
- [x] Telegram alerts functional (code ready, skips if not configured)
- [x] At least 2 on-chain metrics added (MVRV, Exchange Reserves, Whale Flows)
- [x] All metrics have educational tooltips
- [x] Monthly pricing tier available (50,000 sats)

### KPIs to Track:

| Metric | Target |
|--------|--------|
| Signal accuracy (30d) | >55% |
| Telegram subscribers | 100+ |
| Week pass conversions | +25% |
| Bounce rate | -15% |
| Time on site | +20% |

---

## Competitive Positioning

**Before Phase 6:**
> "We have some Bitcoin data and AI analysis"

**After Phase 6:**
> "The only Bitcoin signal platform that proves its accuracy, explains what the data means, and alerts you via Telegram - all payable in sats"

### Your Moat (Double Down):
1. **Transparency** - Public signal accuracy tracking
2. **Education** - Every metric explained
3. **AI Analysis** - Chart analysis + Trade Coach
4. **Bitcoin Native** - Lightning payments, no KYC
5. **Alerts Included** - Coinglass charges $20/mo extra

---

## Notes

- Prioritize signal accuracy tracking - this is your biggest differentiator
- Don't chase feature parity on everything - be best at education + transparency
- Telegram alerts are high value, low effort - do this early
- On-chain data is nice-to-have, not must-have for v1
