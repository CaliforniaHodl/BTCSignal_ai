# Reddit Refactor Plans - Static Data Approach

**Target Date:** Friday (End of Day)
**Goal:** Reduce API calls by ~70% by pre-fetching data and serving from static JSON

---

## Overview

Instead of every user hitting external APIs directly from their browser, we:
1. Fetch all data once via scheduled Netlify function
2. Save to `/data/market-snapshot.json` in GitHub
3. GitHub commit triggers Netlify rebuild
4. Frontend reads from static JSON instead of external APIs

---

## Build Schedule (Free Tier - 5 builds/day)

| Build | UTC | PST | Note |
|-------|-----|-----|------|
| 1 | 5:00 PM | 9:00 AM | Tweet time |
| 2 | 10:00 PM | 2:00 PM | Afternoon |
| 3 | 3:00 AM | 7:00 PM | Evening |
| 4 | 8:00 AM | 12:00 AM | Midnight |
| 5 | 1:00 PM | 5:00 AM | Early morning |

Cron: `0 17,22,3,8,13 * * *`

---

## Completed

- [x] Created `netlify/functions/fetch-market-data.ts` - Scheduled function that fetches all API data and saves to GitHub

---

## TODO Friday

### 1. Update netlify.toml
Add the scheduled function config (already in the .ts file, but verify):
```toml
[functions."fetch-market-data"]
  schedule = "0 17,22,3,8,13 * * *"
```

### 2. Create data directory
```bash
mkdir -p data
echo '{}' > data/market-snapshot.json
```

### 3. Update Frontend Files (6-8 files)

#### dashboard-widgets.js (~10 min)
Change from direct API calls to:
```javascript
// Load static snapshot once
let marketData = null;
async function loadMarketSnapshot() {
  const res = await fetch('/data/market-snapshot.json');
  marketData = await res.json();
}

// Then use marketData.fearGreed.value instead of fetching
```

**Functions to update:**
- `fetchFearGreed()` → use `marketData.fearGreed`
- `fetchFundingRate()` → use `marketData.funding`
- `fetchOpenInterest()` → use `marketData.openInterest`
- `fetchLongShortRatio()` → use `marketData.longShortRatio`
- `fetchLiquidations()` → calculate from `marketData.btc`
- `fetchRSI()` → calculate from `marketData.ohlc.days30`
- `fetchVolatility()` → use `marketData.btc`
- `fetchDominance()` → use `marketData.dominance`
- `fetchHashrateData()` → use `marketData.hashrate`
- `fetchCorrelationData()` → use `marketData.ohlc.days30`

#### dashboard.js (~5 min)
- `loadFearGreedIndex()` → use `marketData.fearGreed`
- `loadFundingRates()` → use `marketData.funding`
- OHLC data for win/loss tracking → use `marketData.ohlc.days30`

#### bart-detector.js (~5 min)
- BTC price data → use `marketData.btc`
- Funding rate → use `marketData.funding`
- Open interest → use `marketData.openInterest`
- OHLC for volatility → use `marketData.ohlc.days7`

#### market-sentiment.js (~5 min)
- BTC data → use `marketData.btc`
- Fear & Greed → use `marketData.fearGreed`
- Funding → use `marketData.funding`

#### narrative-tracker.js (~5 min)
- Hashrate → use `marketData.hashrate`
- Market cap → use `marketData.btc.marketCap`
- Dominance → use `marketData.dominance`

#### alpha-radar.js (~5 min)
- Global data → use `marketData.global`
- Fear & Greed → use `marketData.fearGreed`
- BTC data → use `marketData.btc`

### 4. Keep Real-Time (NO changes needed)
These should still fetch live for user experience:
- **Current BTC price ticker** (homepage, updates every 30s)
- Located in: `layouts/index.html` inline script

### 5. Test Locally
```bash
# Run the function locally to generate snapshot
netlify functions:invoke fetch-market-data

# Build site
hugo server

# Verify /data/market-snapshot.json is accessible
# Verify dashboard loads data correctly
```

---

## Data Structure Reference

The `market-snapshot.json` contains:

```json
{
  "timestamp": "2024-12-02T17:00:00.000Z",
  "btc": {
    "price": 97000,
    "price24hAgo": 95000,
    "priceChange24h": 2.1,
    "high24h": 98000,
    "low24h": 94500,
    "volume24h": 45000000000,
    "marketCap": 1900000000000
  },
  "fearGreed": {
    "value": 75,
    "label": "Greed"
  },
  "funding": {
    "rate": 0.0001,
    "ratePercent": 0.01
  },
  "openInterest": {
    "btc": 45000,
    "usd": 4365000000
  },
  "longShortRatio": {
    "ratio": 1.2,
    "longPercent": 54.5,
    "shortPercent": 45.5
  },
  "dominance": {
    "btc": 57.2
  },
  "hashrate": {
    "current": 750.5,
    "unit": "EH/s"
  },
  "ohlc": {
    "days7": [[timestamp, open, high, low, close], ...],
    "days30": [[timestamp, open, high, low, close], ...]
  },
  "global": {
    "totalMarketCap": 3500000000000,
    "total24hVolume": 150000000000
  }
}
```

---

## API Calls Comparison

### Before (per user, per page load)
- CoinGecko: ~8 calls
- OKX: ~4 calls
- alternative.me: ~2 calls
- mempool.space: ~1 call
- Kraken: ~1 call
- **Total: ~16 API calls per user**

### After
- Static JSON: 1 fetch (local, fast)
- Real-time price: 1 API call (Coinbase)
- **Total: ~2 calls per user**

**Reduction: ~87%**

---

## Rollback Plan

If issues arise, simply revert the frontend JS changes. The static JSON approach is additive - the old API fetch code can be restored quickly.

---

## Future Improvements (Post-Friday)

1. **Netlify Pro upgrade** → More builds = fresher data (every hour)
2. **Add Kraken buy/sell ratio** to snapshot
3. **Add options data** from Deribit
4. **Cache layer** with Netlify Edge Functions for even faster delivery
