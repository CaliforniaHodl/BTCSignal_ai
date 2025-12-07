---
title: "API Documentation"
description: "Free read-only API for Bitcoin market data"
layout: "api-docs"
css:
  - "learn.scss"
---

## BTC Signal API

Free, read-only access to our Bitcoin market data. No API key required.

### Base URL

```
https://btcsignal.ai/.netlify/functions/api-market-data
```

### Endpoints

#### GET /api-market-data

Returns the latest market snapshot including price, sentiment, and derivatives data.

**Example Request:**
```bash
curl https://btcsignal.ai/.netlify/functions/api-market-data
```

**Example Response:**
```json
{
  "success": true,
  "timestamp": "2025-12-06T12:00:00.000Z",
  "data": {
    "btc": {
      "price": 100000,
      "priceChange24h": 2.5,
      "high24h": 101000,
      "low24h": 98000,
      "volume24h": 45000000000,
      "marketCap": 1950000000000
    },
    "fearGreed": {
      "value": 72,
      "label": "Greed"
    },
    "funding": {
      "ratePercent": 0.01,
      "exchanges": { ... }
    },
    "openInterest": {
      "btc": 550000,
      "usd": 55000000000
    }
  }
}
```

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `fields` | Comma-separated list of fields to return | `?fields=btc,fearGreed` |

**Filtered Request Example:**
```bash
curl "https://btcsignal.ai/.netlify/functions/api-market-data?fields=btc,fearGreed,funding"
```

### Available Data Fields

- `btc` - Price, 24h change, high/low, volume, market cap
- `fearGreed` - Fear & Greed Index value and label
- `funding` - Funding rates across exchanges
- `openInterest` - Open interest in BTC and USD
- `longShortRatio` - Long/short position ratio
- `dominance` - BTC market dominance
- `hashrate` - Network hash rate
- `liquidation` - Liquidation levels and 24h stats

### Rate Limits

- Free tier: Shared Netlify limit (125k requests/month)
- Data updates: Every 4 hours
- Response caching: 1 minute

### CORS

The API supports CORS and can be called from any domain.

### Terms of Use

- Free for personal and commercial use
- Attribution appreciated but not required
- No SLA or uptime guarantee
- Data provided as-is, not financial advice
