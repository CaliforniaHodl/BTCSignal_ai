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
Binance: https://fapi.binance.com/fapi/v1/premiumIndex
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

## Sprint 2: Data Infrastructure (Week 2)

### 2.1 Historical Open Interest Tracking
- [ ] Create Netlify scheduled function for OI snapshots (every 4 hours)
- [ ] Store in `/data/oi-history.json` (rolling 30 days)
- [ ] Build OI chart with price overlay
- [ ] Add OI change indicators (+/- from 24h ago)
- [ ] Calculate OI/Market Cap ratio

### 2.2 Signal Accuracy Tracking System
- [ ] Create `/data/signal-history.json` schema
- [ ] Log each signal: `{timestamp, price, direction, confidence, target}`
- [ ] Create scheduled function to check outcomes after 24h
- [ ] Calculate rolling accuracy stats (7d, 30d, all-time)
- [ ] Build public accuracy dashboard component
- [ ] Display: "Last 30 signals: X% correct direction"

**Schema:**
```json
{
  "signals": [
    {
      "id": "2024-12-05-1700",
      "timestamp": 1733421600000,
      "priceAtSignal": 97500,
      "direction": "up",
      "confidence": 72,
      "target": 99000,
      "priceAfter24h": 98200,
      "correct": true
    }
  ],
  "stats": {
    "total": 150,
    "correct": 94,
    "accuracy7d": 68,
    "accuracy30d": 63,
    "accuracyAll": 62.7
  }
}
```

### 2.3 Data Caching Layer
- [ ] Implement Redis or JSON file caching for API responses
- [ ] Cache funding rates (5 min TTL)
- [ ] Cache OI data (15 min TTL)
- [ ] Cache L/S ratio (5 min TTL)
- [ ] Add cache status indicator in UI

---

## Sprint 3: Differentiators (Week 3-4)

### 3.1 Telegram Alert Integration
- [ ] Create Telegram bot via BotFather
- [ ] Build `/api/telegram-subscribe` endpoint
- [ ] Store subscriber chat IDs (encrypted)
- [ ] Implement alert types:
  - [ ] New signal alerts
  - [ ] Funding rate spike (>0.05%)
  - [ ] Squeeze risk alerts
  - [ ] Price target hit alerts
- [ ] Add Telegram connect button to Alerts page
- [ ] Rate limit: max 10 alerts/day per user

### 3.2 Discord Webhook Integration
- [ ] Create Discord webhook input field
- [ ] Validate webhook URL format
- [ ] Send test message on save
- [ ] Mirror Telegram alert types to Discord
- [ ] Store webhook URLs (encrypted)

### 3.3 Funding Rate Arbitrage Calculator
- [ ] Calculate spread between exchanges
- [ ] Show potential profit per $1000 position
- [ ] Factor in trading fees
- [ ] Display: "Long on dYdX, Short on Bybit = X% profit"
- [ ] Add risk disclaimer

---

## Sprint 4: On-Chain Basics (Week 4-5)

### 4.1 Exchange Reserve Tracking
- [ ] Integrate CryptoQuant free API (or alternative)
- [ ] Track BTC balance on top 5 exchanges
- [ ] Calculate 24h/7d change
- [ ] Build reserve trend chart
- [ ] Add "Coins leaving exchanges" bullish indicator

**Data Sources (choose one):**
```
CryptoQuant: Limited free tier
Glassnode:   Limited free tier
blockchain.info: Basic data, fully free
```

### 4.2 Whale Transaction Alerts
- [ ] Monitor blockchain.info for large transactions (>500 BTC)
- [ ] Identify exchange wallets vs unknown
- [ ] Display recent whale movements
- [ ] Classify: Exchange deposit (bearish) vs withdrawal (bullish)
- [ ] Add to Alpha Radar dashboard

### 4.3 Basic MVRV Indicator
- [ ] Source realized cap data (CoinMetrics free API)
- [ ] Calculate MVRV ratio
- [ ] Display with historical context
- [ ] Add zones: Undervalued (<1) | Fair (1-3) | Overvalued (>3)
- [ ] Include in market sentiment section

---

## Sprint 5: Polish & Positioning (Week 5-6)

### 5.1 Educational Tooltips
- [ ] Add info icons to every metric
- [ ] Write tooltip content for:
  - [ ] Funding Rate
  - [ ] Open Interest
  - [ ] Long/Short Ratio
  - [ ] Liquidation levels
  - [ ] MVRV
  - [ ] Exchange reserves
- [ ] Make tooltips accessible (keyboard navigable)

### 5.2 Pricing Tier Update
- [ ] Add Monthly pass: 50,000 sats (~$50)
- [ ] Update pricing page copy
- [ ] Add savings badge ("Save 50% vs weekly")
- [ ] Consider annual tier: 400,000 sats (~$400, 33% off)

### 5.3 Marketing Site Updates
- [ ] Update hero messaging: "Understand the data, not just see it"
- [ ] Add accuracy stats to homepage (once tracking)
- [ ] Add comparison table vs Coinglass
- [ ] Highlight unique features: AI Chart Analysis, Trade Coach
- [ ] Add testimonials section (collect from early users)

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

- [ ] L/S ratio visible on dashboard
- [ ] 4+ exchange funding rate comparison live
- [ ] Funding rate history chart (30 days)
- [ ] OI historical chart working
- [ ] Signal accuracy publicly displayed
- [ ] Telegram alerts functional
- [ ] At least 2 on-chain metrics added
- [ ] All metrics have educational tooltips
- [ ] Monthly pricing tier available

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
