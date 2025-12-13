# BTCSignal.ai Competitive Roadmap
## Goal: Close the Gap with CryptoQuant & Glassnode

**Created:** December 13, 2024
**Target:** Bitcoin-only on-chain analytics platform
**Competitors:** CryptoQuant, Glassnode, Santiment

---

## Current State Assessment

### What We Have (Strong)
- [x] 17 technical indicators (RSI, MACD, BB, ATR, ADX, OBV, etc.)
- [x] Pattern detection (Double Top/Bottom, H&S, Breakouts)
- [x] Derivatives data (Funding, OI, Liquidations, Options)
- [x] Fear & Greed Index
- [x] Hashrate & Difficulty tracking
- [x] Paper trading with risk management
- [x] Backtesting engine
- [x] AI-powered analysis (Claude)
- [x] Lightning payments

### What We're Missing (Gaps)
- [x] ~~Real on-chain metrics (MVRV, SOPR, NVT, NUPL)~~ **IMPLEMENTED Dec 13, 2024**
- [ ] Real exchange flow data (not simulated)
- [ ] Cohort analysis (LTH/STH, whale tiers)
- [ ] UTXO-based calculations
- [ ] Entity clustering/labeling
- [x] ~~Stablecoin metrics~~ **IMPLEMENTED Dec 13, 2024 (SSR)**
- [x] ~~Mining economics (Puell, Difficulty Ribbon signals)~~ **IMPLEMENTED Dec 13, 2024**
- [ ] Advanced alert system

---

## Phase 1: Foundation Metrics (Sprint 1-2)
**Timeline:** Week 1-2
**Goal:** Implement core on-chain metrics using free APIs
**Gap Closure:** ~20%

### Sprint 1.1 - Quick Wins (Day 1) ✅ COMPLETE
| Task | Status | Complexity | Data Source |
|------|--------|------------|-------------|
| NVT Ratio | [x] | Low | Blockchain.info tx volume |
| Puell Multiple | [x] | Low | Existing miner revenue data |
| Stock-to-Flow Ratio | [x] | Low | Pure calculation |
| Stock-to-Flow Deflection | [x] | Low | S2F vs price |
| Stablecoin Supply Ratio (SSR) | [x] | Low | CoinGecko USDT/USDC caps |
| Reserve Risk | [x] | Low | Price / HODL Bank |
| NUPL | [x] | Low | Derived from MVRV |

### Sprint 1.2 - CoinMetrics Integration (Day 2-3) ✅ COMPLETE
| Task | Status | Complexity | Data Source |
|------|--------|------------|-------------|
| Real MVRV Ratio | [x] | Medium | CoinMetrics Community API |
| Realized Cap | [x] | Medium | CoinMetrics |
| NUPL (Net Unrealized P/L) | [x] | Low | Derived from real MVRV |
| Market Cap to Thermocap | [ ] | Medium | CoinMetrics |
| Active Addresses (24h) | [x] | Low | Blockchain.info |
| Transaction Count | [x] | Low | Blockchain.info |

### Sprint 1.3 - Dashboard Integration (Day 4-5) ✅ COMPLETE
| Task | Status | Complexity |
|------|--------|------------|
| Add NVT widget to dashboard | [x] | Low |
| Add MVRV widget with zones | [x] | Low |
| Add Puell Multiple chart | [x] | Medium |
| Add S2F model visualization | [x] | Medium |
| Add NUPL gauge | [x] | Low |
| Add SSR widget | [x] | Low |
| Add Reserve Risk widget | [x] | Low |

---

## Phase 2: Exchange Intelligence (Sprint 3-4)
**Timeline:** Week 2-3
**Goal:** Replace simulated exchange data with real flows
**Gap Closure:** ~15%

### Sprint 2.1 - Exchange Flow Data
| Task | Status | Complexity | Data Source |
|------|--------|------------|-------------|
| Integrate WhaleAlert API | [ ] | Medium | WhaleAlert (paid) |
| Real exchange reserve tracking | [ ] | High | Glassnode free tier / CryptoQuant |
| Exchange netflow (inflow - outflow) | [ ] | Medium | Aggregated from WhaleAlert |
| Per-exchange breakdown | [ ] | Medium | Binance, Coinbase, Kraken |
| Exchange Whale Ratio | [ ] | Medium | Top 10 inflows / total |
| Fund Flow Ratio | [ ] | Low | Exchange volume / total volume |

### Sprint 2.2 - Whale Tracking Enhancement
| Task | Status | Complexity |
|------|--------|------------|
| Expand known whale address list | [ ] | Medium |
| Real-time whale alert notifications | [ ] | Medium |
| Whale accumulation/distribution score | [ ] | High |
| Exchange deposit/withdrawal alerts | [ ] | Medium |
| Large transaction feed | [ ] | Low |

---

## Phase 3: Profitability Metrics (Sprint 5-6)
**Timeline:** Week 3-4
**Goal:** Implement spent output analysis
**Gap Closure:** ~15%

### Sprint 3.1 - SOPR Family
| Task | Status | Complexity | Data Source |
|------|--------|------------|-------------|
| SOPR (Spent Output Profit Ratio) | [ ] | High | CoinMetrics / custom calculation |
| aSOPR (Adjusted SOPR) | [ ] | High | Exclude coins <1hr |
| STH-SOPR (Short-term holder) | [ ] | High | <155 day coins |
| LTH-SOPR (Long-term holder) | [ ] | High | >155 day coins |
| SOPR Ribbon | [ ] | Medium | Multiple MA overlays |

### Sprint 3.2 - Realized Metrics
| Task | Status | Complexity |
|------|--------|------------|
| Realized Price | [ ] | Medium |
| STH Realized Price | [ ] | High |
| LTH Realized Price | [ ] | High |
| Realized P/L Ratio | [ ] | Medium |
| Net Realized P/L | [ ] | Medium |

---

## Phase 4: Cohort Analysis (Sprint 7-8)
**Timeline:** Week 4-5
**Goal:** Segment holders by behavior
**Gap Closure:** ~15%

### Sprint 4.1 - Holder Cohorts
| Task | Status | Complexity |
|------|--------|------------|
| LTH Supply (>155 days) | [ ] | High |
| STH Supply (<155 days) | [ ] | High |
| LTH/STH Supply Ratio | [ ] | Low |
| Illiquid Supply | [ ] | High |
| Liquid/Highly Liquid Supply | [ ] | High |

### Sprint 4.2 - Whale Cohorts
| Task | Status | Complexity |
|------|--------|------------|
| Shrimp (<1 BTC) holdings | [ ] | High |
| Crab (1-10 BTC) holdings | [ ] | High |
| Fish (10-100 BTC) holdings | [ ] | High |
| Shark (100-1K BTC) holdings | [ ] | High |
| Whale (1K-10K BTC) holdings | [ ] | High |
| Humpback (>10K BTC) holdings | [ ] | High |
| Cohort accumulation trends | [ ] | High |

---

## Phase 5: Advanced Indicators (Sprint 9-10)
**Timeline:** Week 5-6
**Goal:** Premium analytics features
**Gap Closure:** ~10%

### Sprint 5.1 - Glassnode Equivalents
| Task | Status | Complexity |
|------|--------|------------|
| Accumulation Trend Score | [ ] | Very High |
| Liveliness | [ ] | High |
| Dormancy Flow | [ ] | High |
| CDD (Coin Days Destroyed) | [ ] | High |
| Binary CDD | [ ] | Medium |
| Supply Last Active bands | [ ] | High |

### Sprint 5.2 - CryptoQuant Equivalents
| Task | Status | Complexity |
|------|--------|------------|
| NVT Golden Cross | [ ] | Medium |
| Taker Buy/Sell Ratio | [ ] | Medium |
| Estimated Leverage Ratio | [ ] | Medium |
| Stablecoin Exchange Netflow | [ ] | Medium |
| All Exchange Reserve | [ ] | Medium |
| Miner to Exchange Flow | [ ] | High |

---

## Phase 6: UTXO Deep Dive (Sprint 11-12)
**Timeline:** Week 6-7
**Goal:** Full UTXO-based analysis
**Gap Closure:** ~10%

### Sprint 6.1 - UTXO Metrics
| Task | Status | Complexity |
|------|--------|------------|
| UTXO Count by age band | [ ] | Very High |
| HODL Waves visualization | [ ] | Very High |
| Realized Cap HODL Waves | [ ] | Very High |
| UTXO P/L distribution | [ ] | Very High |
| Cost Basis Distribution | [ ] | Very High |

### Sprint 6.2 - Entity Analysis
| Task | Status | Complexity |
|------|--------|------------|
| Entity-adjusted SOPR | [ ] | Very High |
| Entity-adjusted NVT | [ ] | Very High |
| Entity count tracking | [ ] | Very High |
| New entity momentum | [ ] | Very High |

---

## Phase 7: Mining Economics (Sprint 13-14)
**Timeline:** Week 7-8
**Goal:** Complete miner analysis
**Gap Closure:** ~5%

### Sprint 7.1 - Miner Metrics
| Task | Status | Complexity |
|------|--------|------------|
| Hash Ribbons (buy signals) | [ ] | Medium |
| Difficulty Ribbon compression | [ ] | Medium |
| Miner Revenue / Thermocap | [ ] | Medium |
| Miner Outflow Multiple | [ ] | High |
| Miner Position Index | [ ] | High |
| Hash Rate vs Price divergence | [ ] | Medium |

### Sprint 7.2 - Mining Pool Tracking
| Task | Status | Complexity |
|------|--------|------------|
| Pool distribution pie chart | [ ] | Medium |
| Pool hashrate trends | [ ] | Medium |
| Pool-to-exchange flows | [ ] | Very High |

---

## Phase 8: Alerts & Automation (Sprint 15-16)
**Timeline:** Week 8-9
**Goal:** Professional alert system
**Gap Closure:** ~5%

### Sprint 8.1 - Alert Infrastructure
| Task | Status | Complexity |
|------|--------|------------|
| Custom metric threshold alerts | [ ] | Medium |
| Multi-condition alert rules | [ ] | High |
| Alert history & management UI | [ ] | Medium |
| Email alert delivery | [ ] | Low |
| Telegram bot enhancements | [ ] | Medium |
| Discord webhook improvements | [ ] | Low |

### Sprint 8.2 - Smart Alerts
| Task | Status | Complexity |
|------|--------|------------|
| Whale movement alerts (real-time) | [ ] | High |
| Exchange reserve anomaly detection | [ ] | High |
| MVRV zone change alerts | [ ] | Low |
| Funding rate extreme alerts | [ ] | Low |
| Liquidation cascade warnings | [ ] | Medium |

---

## Phase 9: Trading Bot (Sprint 17-18)
**Timeline:** Week 9-10
**Goal:** Personal automated trading
**Gap Closure:** ~5% (unique differentiator)

### Sprint 9.1 - Bot Infrastructure
| Task | Status | Complexity |
|------|--------|------------|
| Exchange API integration (Binance/Kraken) | [ ] | High |
| Secure credential storage | [ ] | High |
| Order execution engine | [ ] | High |
| Position tracking | [ ] | Medium |
| Auto stop-loss/take-profit | [ ] | High |

### Sprint 9.2 - Strategy Engine
| Task | Status | Complexity |
|------|--------|------------|
| Signal-based auto-entry | [ ] | High |
| On-chain condition triggers | [ ] | High |
| Risk-adjusted position sizing | [ ] | Medium |
| Multi-signal confirmation | [ ] | High |
| Performance tracking | [ ] | Medium |

---

## Gap Closure Summary

| Phase | Gap Closure | Cumulative | Status |
|-------|-------------|------------|--------|
| Phase 1: Foundation Metrics | 20% | 20% | ✅ DONE |
| Phase 1.2: CoinMetrics Integration | 5% | 25% | ✅ DONE |
| Phase 2: Exchange Intelligence | 15% | 40% | 🔄 Next |
| Phase 3: Profitability Metrics | 15% | 55% | Pending |
| Phase 4: Cohort Analysis | 15% | 70% | Pending |
| Phase 5: Advanced Indicators | 10% | 80% | Pending |
| Phase 6: UTXO Deep Dive | 10% | 90% | Pending |
| Phase 7: Mining Economics | 5% | 95% | Pending |
| Phase 8: Alerts & Automation | 5% | 100% | Pending |

---

## Data Source Matrix

| Source | Cost | Metrics Available |
|--------|------|-------------------|
| **CoinMetrics Community** | Free | MVRV, NVT, Active Addr, Realized Cap |
| **Blockchain.info** | Free | Hashrate, Difficulty, Tx Volume, Miner Revenue |
| **Mempool.space** | Free | Fees, Blocks, Difficulty Adjustment |
| **CoinGecko** | Free | Prices, Market Caps, Stablecoin data |
| **CoinGlass** | Free | Liquidations, Funding, OI |
| **WhaleAlert** | $30/mo | Large transactions, Exchange flows |
| **Santiment** | Free tier | Social, Dev Activity, Some on-chain |
| **Glassnode** | $29/mo | Limited free; full suite paid |
| **CryptoQuant** | $39/mo | Exchange flows, Miner data |

---

## Today's Progress: ~25% Gap Closure ✅

### Sprint 1.1 Completed (Dec 13, 2024):
1. [x] NVT Ratio - Network Value to Transactions
2. [x] Puell Multiple - Miner revenue vs 365d average
3. [x] Stock-to-Flow Ratio - Scarcity model
4. [x] Stock-to-Flow Deflection - Price vs model
5. [x] Stablecoin Supply Ratio (SSR) - Buying power indicator
6. [x] Reserve Risk - Risk/reward based on HODL behavior
7. [x] NUPL - Net Unrealized Profit/Loss
8. [x] Dashboard widgets for all above
9. [x] CSS styling for new metrics section

### Sprint 1.2 Completed (Dec 13, 2024):
10. [x] Real MVRV Ratio - CoinMetrics Community API integration
11. [x] Realized Cap - Real data from CoinMetrics
12. [x] Active Addresses (24h) - Blockchain.info integration
13. [x] Transaction Count (24h) - With 7d change tracking
14. [x] On-Chain Analyzer Library - Shared signal generation
15. [x] Prediction Engine Integration - On-chain signals weighted in predictions
16. [x] Tweet Generator Update - On-chain metrics in daily signals
17. [x] Unit Tests - Cypress tests for all calculations

### Files Created:
- `netlify/functions/onchain-metrics.ts` - Backend calculations with CoinMetrics
- `netlify/functions/lib/onchain-analyzer.ts` - Shared analysis library
- `static/src/js/onchain-advanced.js` - Frontend rendering
- `cypress/unit/onchain-metrics.cy.js` - Unit tests

### Files Modified:
- `netlify/functions/btctradingbot-tweets.ts` - Fetches on-chain data
- `netlify/functions/lib/prediction-engine.ts` - Integrates on-chain signals
- `netlify/functions/lib/tweet-generator.ts` - Includes on-chain in tweets
- `layouts/dashboard/single.html` - New widgets section
- `assets/src/scss/dashboard.scss` - Widget styles (~270 lines)
- `content/dashboard/_index.md` - JS includes
- `COMPETITIVE_ROADMAP.md` - This file

### Data Sources Now Used:
- **CoinGecko** - Prices, market caps, stablecoin data (free)
- **Blockchain.info** - Transaction volume, miner revenue, active addresses, tx count (free)
- **CoinMetrics Community API** - Real MVRV, Realized Cap (free tier)

### Next Steps (Sprint 2.1 - Exchange Intelligence):
- Integrate WhaleAlert API for real exchange flows
- Replace simulated exchange reserve data
- Add Exchange Whale Ratio

**Total metrics now: 13 (from 0)**
**Keep building.**
