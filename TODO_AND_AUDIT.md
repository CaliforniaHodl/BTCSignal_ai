# BTCSignal AI - TODO List & Code Audit

## Feature 2: Automated Paper Trading (Live Price Tracking)

### High Priority
- [ ] **Connect paper trading to live WebSocket price feed**
  - Currently: Manual entry of prices via `BTCSAIPaperTrading.addTrade()`
  - Needed: Real-time price monitoring that auto-updates open positions
  - Use Binance WebSocket: `wss://stream.binance.us:9443/ws/btcusdt@trade`

- [ ] **Auto-calculate unrealized P&L for open positions**
  - Track `currentPrice` vs `entryPrice` in real-time
  - Update UI every tick or on interval (5s recommended)

- [ ] **Implement auto-stop-loss/take-profit execution**
  - Monitor live price against trade's SL/TP levels
  - Auto-close position when levels are hit
  - Log exact exit price and timestamp

- [ ] **Add price alerts system**
  - User sets alert levels
  - Browser notification when price crosses level
  - Sound alert option

### Medium Priority
- [ ] **Paper trading dashboard UI**
  - List open positions with live P&L
  - Trade history table
  - Performance chart (equity curve)
  - Current account stats

- [ ] **Position management controls**
  - Modify SL/TP on open positions
  - Partial close functionality
  - Add to position (averaging)

- [ ] **Trade journaling enhancements**
  - Screenshot attachment for chart at entry
  - Tags/categories for trades
  - Search/filter trade history

### Low Priority
- [ ] **Multi-asset paper trading** (ETH, etc.)
- [ ] **Paper trading leaderboard** (local only)
- [ ] **Import/export trade history**

---

## Feature 3: Strategy Parser Improvements

### High Priority
- [ ] **Add Bollinger Band conditions**
  - Parse: "price touches lower band", "BB squeeze", "price above upper band"
  - Entry: price < lower band (oversold), price > upper band (overbought)
  - Exit: price returns to middle band

- [ ] **Add Volume conditions**
  - Parse: "volume spike", "volume > 2x average", "low volume"
  - Calculate volume SMA and compare current
  - Volume confirmation for entries

- [ ] **Add ATR-based stops**
  - Parse: "2 ATR stop loss", "trailing 1.5 ATR"
  - Calculate ATR(14) and use for dynamic stops
  - More realistic than fixed percentage stops

- [ ] **Improve RSI parsing**
  - Add RSI divergence detection: "RSI bullish divergence"
  - Add RSI centerline cross: "RSI crosses above 50"
  - Fix: RSI cross detection during warmup (line 277-278)

### Medium Priority
- [ ] **Add support/resistance conditions**
  - Parse: "price at support", "breakout above resistance"
  - Integrate with pattern-detector.js level detection

- [ ] **Add time-based conditions**
  - Parse: "only trade during US session", "avoid weekends"
  - Market hours filtering

- [ ] **Add candlestick pattern conditions**
  - Parse: "bullish engulfing", "doji at support", "hammer"
  - Integrate candlestick detection logic

- [ ] **Compound condition parsing**
  - Parse: "RSI < 30 AND MACD cross above AND volume > average"
  - Currently conditions are parsed but not AND/OR combined explicitly

### Low Priority
- [ ] **Natural language improvements**
  - Handle typos/variations: "rsi", "RSI", "relative strength"
  - Synonym support: "buy" = "long" = "enter"
  - Better error messages for unparseable strategies

- [ ] **Strategy templates/presets**
  - Common strategies as one-click buttons
  - "Mean Reversion", "Trend Following", "Breakout"

---

## Feature 4: More Indicators & Strategies

### High Priority
- [ ] **Implement Bollinger Bands**
  ```javascript
  function calculateBollingerBands(data, period = 20, stdDev = 2) {
    // SMA + upper/lower bands at stdDev * standard deviation
  }
  ```

- [ ] **Implement ATR (Average True Range)**
  ```javascript
  function calculateATR(data, period = 14) {
    // TR = max(high-low, abs(high-prevClose), abs(low-prevClose))
    // ATR = SMA of TR
  }
  ```

- [ ] **Implement Stochastic Oscillator**
  ```javascript
  function calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
    // %K = (close - lowest low) / (highest high - lowest low) * 100
    // %D = SMA of %K
  }
  ```

- [ ] **Implement ADX (Average Directional Index)**
  - Trend strength indicator
  - ADX > 25 = trending, ADX < 20 = ranging

### Medium Priority
- [ ] **Implement VWAP**
  - Volume-weighted average price
  - Intraday support/resistance

- [ ] **Implement Ichimoku Cloud**
  - Tenkan, Kijun, Senkou A/B, Chikou
  - Cloud as support/resistance zones

- [ ] **Implement Fibonacci Retracements**
  - Auto-detect swing high/low
  - Draw 23.6%, 38.2%, 50%, 61.8% levels

- [ ] **Implement OBV (On-Balance Volume)**
  - Volume flow indicator
  - Divergence detection

### Low Priority
- [ ] **Implement Pivot Points**
- [ ] **Implement Keltner Channels**
- [ ] **Implement Williams %R**
- [ ] **Implement CCI (Commodity Channel Index)**

### Strategy Implementations
- [ ] **Mean Reversion Strategy**
  - RSI < 30 + price at lower BB + volume spike
  - Target: middle BB, Stop: below recent low

- [ ] **Trend Following Strategy**
  - Price > EMA 50 > EMA 200 + ADX > 25
  - Trail stop with ATR

- [ ] **Breakout Strategy**
  - Price breaks 20-day high with volume confirmation
  - ATR-based stop loss

- [ ] **Scalping Strategy** (shorter timeframes)
  - EMA 9/21 cross + RSI confirmation
  - Tight stops, quick targets

---

## Feature 5: Bug Fixes & Logic Improvements

### CRITICAL - Backtester Bias Issues

- [ ] **BUG: Survivorship bias in Monte Carlo**
  - Location: `backtester-pro.js:603-626`
  - Issue: MC simulation only randomizes starting point and adds noise, but uses same underlying data
  - Fix: Should also randomize trade sequence or use bootstrapping

- [ ] **BUG: Look-ahead bias in breakout entry price**
  - Location: `backtester-pro.js:304-305`
  - Current: `breakoutPrice = data[i].high20 * 1.001`
  - Issue: Uses exact breakout level which may not be executable in real trading
  - Fix: Add slippage to breakout entries (already has slippage, but applied after)

- [ ] **BUG: Position sizing doesn't account for fees**
  - Location: `backtester-pro.js:489-518`
  - Issue: Entry fee deducted after position size calculated
  - Fix: Calculate position size accounting for round-trip fees

- [ ] **BUG: Random entry uses Math.random() > 0.05**
  - Location: `backtester-pro.js:309`
  - Issue: 5% random entry rate is arbitrary and inflates trade count
  - Fix: Should be configurable or use more realistic fallback

### HIGH - Logic Flaws

- [ ] **FLAW: RSI calculation returns 50 during warmup**
  - Location: `backtester-pro.js:204`
  - Issue: Returns exactly 50 which could trigger false "cross above 50" signals
  - Fix: Return null/undefined during warmup, check for valid RSI before using

- [ ] **FLAW: EMA starts at first close price**
  - Location: `backtester-pro.js:222-228`
  - Issue: EMA should use SMA for first N periods, not start at candle[0]
  - Fix: Calculate SMA for first `period` candles, then switch to EMA

- [ ] **FLAW: MACD signal line uses wrong initialization**
  - Location: `backtester-pro.js:233-243`
  - Issue: Signal starts at 0, not SMA of first 9 MACD values
  - Fix: Initialize signal with SMA of first 9 MACD values

- [ ] **FLAW: Sharpe ratio calculation assumes 252 trading days**
  - Location: `backtester-pro.js:567`
  - Issue: Bitcoin trades 365 days/year, 24/7
  - Fix: Annualize based on actual timeframe (365 for daily, etc.)

- [ ] **FLAW: Max 50% position cap is arbitrary**
  - Location: `backtester-pro.js:517`
  - Issue: Hardcoded limit may not match user's risk tolerance
  - Fix: Make configurable in settings

### MEDIUM - Paper Trading Issues

- [ ] **ISSUE: Consecutive loss check is broken**
  - Location: `paper-trading.js:97-99`
  - Issue: Checks if ALL last N trades are losses, should check for streak
  - Fix: Track actual consecutive loss count, not just recent trade results

- [ ] **ISSUE: Daily P&L calculation uses wrong baseline**
  - Location: `paper-trading.js:104-106`
  - Issue: Divides by `startingCapital`, should divide by `currentCapital` at day start
  - Fix: Track daily starting equity

- [ ] **ISSUE: maxDrawdown check uses >= instead of >**
  - Location: `paper-trading.js:113-115` and `risk-manager.js:174-177`
  - Issue: At exactly max drawdown, still allows trades
  - Fix: Use strict greater than, or treat exact match as limit reached

### MEDIUM - Pattern Detector Issues

- [ ] **ISSUE: Swing point detection uses fixed 2-bar lookback**
  - Location: `pattern-detector.js:145-161`
  - Issue: Only looks 2 bars left/right, misses larger swings
  - Fix: Make lookback configurable, or use adaptive detection

- [ ] **ISSUE: Pattern confidence scores are arbitrary**
  - Location: `pattern-detector.js:354-468`
  - Issue: Confidence values (65-75%) are hardcoded, not data-driven
  - Fix: Base confidence on pattern quality metrics (symmetry, volume, etc.)

- [ ] **ISSUE: Trendline slope comparison is simplistic**
  - Location: `pattern-detector.js:348-401`
  - Issue: Just compares first and last swing, not actual trendline fit
  - Fix: Use linear regression for proper trendline calculation

### LOW - Code Quality

- [ ] **Duplicate indicator calculations across files**
  - `backtester-pro.js`, `smart-chart.js`, `shared.js` all have EMA/RSI
  - Fix: Consolidate into `shared.js`, import everywhere

- [ ] **Missing input validation**
  - Various files accept user input without validation
  - Fix: Add proper validation for all numeric inputs

- [ ] **No error boundaries in async functions**
  - API failures can crash entire features
  - Fix: Add try/catch with user-friendly error messages

---

## Test Coverage Analysis

### Current Test Structure (32 files)
```
cypress/
├── api/                    # API function tests (4 files)
│   ├── access-functions.cy.js
│   ├── feature-functions.cy.js
│   ├── market-data-functions.cy.js
│   └── payment-functions.cy.js
├── e2e/                    # End-to-end UI tests (19 files)
│   ├── backtester-pro.cy.js      # BASIC - just UI visibility
│   ├── dashboard.cy.js
│   ├── pattern-detector.cy.js
│   └── ... (16 more)
├── unit/                   # Unit tests (4 files)
│   ├── backtester-logic.cy.js    # GOOD - but tests via UI
│   ├── access-manager.cy.js
│   ├── dom-helpers.cy.js
│   └── utilities.cy.js
└── visual/                 # Visual regression tests (5 files)
```

### Coverage Gaps Identified

| Area | Current Coverage | Gap |
|------|------------------|-----|
| Indicator Calculations | 0% (pure functions) | No direct unit tests for RSI, EMA, MACD |
| Strategy Parsing | ~40% (via UI) | No isolated parser tests |
| Trade Simulation | ~30% (via UI) | No tests with known outcomes |
| Position Sizing | 0% | Not tested at all |
| Risk Management | ~20% | Only basic validation tested |
| Paper Trading | 0% | No tests for BTCSAIPaperTrading |
| Pattern Detection | ~10% | Only UI tests, no algorithm tests |
| Monte Carlo | 0% | Not tested |

### Problem: Testing Through UI
Your `backtester-logic.cy.js` is comprehensive but:
1. Tests via UI = slow (network requests, rendering)
2. Can't test edge cases easily
3. Can't verify exact calculations
4. Hard to debug failures

### Recommended: Extract Pure Functions for Testing

```javascript
// Current: Functions trapped in IIFE
(function() {
  function calculateRSI() { ... }  // Can't test directly!
})();

// Better: Export for testing
const BacktesterCore = {
  calculateRSI,
  calculateEMA,
  parseStrategy,
  runBacktest
};
window.BacktesterCore = BacktesterCore; // Expose for tests
```

---

## Test Coverage Gaps (TDD Plan)

### Unit Tests Needed (Pure Functions)

```javascript
// tests/unit/indicators.test.js
describe('calculateRSI', () => {
  it('returns 50 for flat prices')
  it('returns > 70 for strong uptrend')
  it('returns < 30 for strong downtrend')
  it('handles insufficient data gracefully')
  it('matches known RSI values from TradingView')
})

describe('calculateEMA', () => {
  it('equals SMA for period-length data')
  it('weights recent prices more heavily')
  it('handles single data point')
  it('matches known EMA values')
})

describe('calculateMACD', () => {
  it('crosses above zero in uptrend')
  it('histogram matches MACD - signal')
  it('handles insufficient data')
})
```

### Integration Tests Needed

```javascript
// tests/integration/backtester.test.js
describe('Backtest Simulation', () => {
  it('does not trade during warmup period')
  it('applies slippage to entry and exit')
  it('deducts fees from P&L')
  it('respects position size limits')
  it('exits on stop loss before take profit if both hit same candle')
  it('trailing stop only activates after profit threshold')
})

describe('Strategy Parsing', () => {
  it('parses RSI conditions correctly')
  it('parses multiple conditions')
  it('handles malformed input gracefully')
  it('returns default strategy for gibberish')
})
```

### Known Data Tests (Gold Standard)

```javascript
// tests/golden/known-outcomes.test.js
describe('Known Price Data Outcomes', () => {
  // Use historical data with known results
  it('2021 bull run produces positive returns for trend following')
  it('2022 bear market produces negative returns for long-only')
  it('matches TradingView backtest results within 5%')
})
```

### Property-Based Tests

```javascript
// tests/property/invariants.test.js
describe('Backtest Invariants', () => {
  it('equity never goes negative')
  it('win rate + loss rate = 100%')
  it('total trades = winning + losing trades')
  it('final equity = starting + sum(trade P&L)')
  it('max drawdown <= 100%')
})
```

---

## Feature 6: On-Chain Analytics (Glassnode/CryptoQuant Gap)

### FREE DATA SOURCES (No API Key Required)

#### Blockchain.info / Blockchain.com API
- [ ] **Hash Rate** - `https://api.blockchain.info/charts/hash-rate?format=json`
- [ ] **Difficulty** - `https://api.blockchain.info/charts/difficulty?format=json`
- [ ] **Transaction Count** - `https://api.blockchain.info/charts/n-transactions?format=json`
- [ ] **Mempool Size** - `https://api.blockchain.info/charts/mempool-size?format=json`
- [ ] **Average Block Size** - `https://api.blockchain.info/charts/avg-block-size?format=json`
- [ ] **Miners Revenue** - `https://api.blockchain.info/charts/miners-revenue?format=json`
- [ ] **Total BTC in Circulation** - `https://api.blockchain.info/charts/total-bitcoins?format=json`

#### Mempool.space API (Real-time)
- [ ] **Mempool Stats** - `https://mempool.space/api/mempool`
- [ ] **Recommended Fees** - `https://mempool.space/api/v1/fees/recommended`
- [ ] **Block Tip** - `https://mempool.space/api/blocks/tip/height`
- [ ] **Recent Blocks** - `https://mempool.space/api/v1/blocks`
- [ ] **Lightning Network Stats** - `https://mempool.space/api/v1/lightning/statistics/latest`

#### CoinGlass API (Derivatives)
- [ ] **Funding Rates** - Track perpetual funding
- [ ] **Open Interest** - Total positions open
- [ ] **Long/Short Ratio** - Market positioning
- [ ] **Liquidation Data** - Liquidation heatmaps

#### Alternative.me
- [ ] **Fear & Greed Index** - `https://api.alternative.me/fng/?limit=30`

### ON-CHAIN METRICS TO IMPLEMENT

#### SOPR (Spent Output Profit Ratio)
```javascript
// SOPR = Value of outputs spent / Value of outputs at creation
// SOPR > 1 = coins moved at profit
// SOPR < 1 = coins moved at loss
// SOPR = 1 = breakeven (often support/resistance)
```
- [ ] Implement SOPR calculation (requires UTXO data - may need paid API)
- [ ] Add SOPR chart with 1.0 reference line
- [ ] Add aSOPR (adjusted SOPR - excludes coins < 1 hour old)

#### MVRV (Market Value to Realized Value)
```javascript
// MVRV = Market Cap / Realized Cap
// Realized Cap = sum of all UTXOs valued at last moved price
// MVRV > 3.5 = historically overbought
// MVRV < 1 = historically oversold
```
- [ ] Fetch realized cap data
- [ ] Calculate MVRV ratio
- [ ] Add MVRV Z-Score chart

#### NVT (Network Value to Transactions)
```javascript
// NVT = Market Cap / Daily Transaction Volume
// High NVT = overvalued relative to usage
// Low NVT = undervalued relative to usage
```
- [ ] Calculate NVT Signal (90-day MA of NVT)
- [ ] Add NVT chart with historical bands

#### Puell Multiple
```javascript
// Puell = Daily Miner Revenue USD / 365-day MA of Revenue
// High Puell = miners selling, bearish
// Low Puell = miners holding, bullish
```
- [ ] Use blockchain.info miners-revenue data
- [ ] Calculate 365-day MA
- [ ] Add Puell Multiple chart

#### Reserve Risk
```javascript
// Reserve Risk = Price / (HODL Bank)
// Low = high conviction + low price = good buy
// High = low conviction + high price = take profit
```
- [ ] Implement HODL Bank calculation
- [ ] Add Reserve Risk chart

### EXCHANGE FLOW METRICS

- [ ] **Exchange Inflows** - BTC moving to exchanges (sell pressure)
- [ ] **Exchange Outflows** - BTC leaving exchanges (accumulation)
- [ ] **Exchange Net Flow** - Inflows - Outflows
- [ ] **Exchange Reserves** - Total BTC on exchanges

*Note: Exchange flow requires paid APIs (Glassnode, CryptoQuant) or running your own node*

### HOLDER DISTRIBUTION

- [ ] **HODL Waves** - Already have this! Enhance with more bands
- [ ] **Supply Held by Long-Term Holders (LTH)** - Coins unmoved > 155 days
- [ ] **Supply Held by Short-Term Holders (STH)** - Coins moved < 155 days
- [ ] **Whale Holdings** - Addresses with > 1000 BTC
- [ ] **Accumulation Trend Score**

### MINING METRICS

- [ ] **Hash Ribbons** - 30/60 day MA of hashrate
  - Death cross = miner capitulation = buy signal historically
- [ ] **Difficulty Ribbon** - Already have this! Enhance with compression detection
- [ ] **Miner Balance** - BTC held by miners
- [ ] **Miner Outflows** - Miners selling

### CHART/GRAPH ENHANCEMENTS

#### New Chart Types
- [ ] **Multi-pane charts** - Price + indicator below (like TradingView)
- [ ] **Heatmaps** - Liquidation levels, order book depth
- [ ] **Correlation matrix** - BTC vs SPX, Gold, DXY
- [ ] **Bubble charts** - UTXO age vs size
- [ ] **Distribution charts** - Holder cohorts over time

#### Chart Features
- [ ] **Drawing tools** - Trendlines, horizontals, fibs
- [ ] **Customizable timeframes** - 5m, 15m, 1H, 4H, 1D, 1W, 1M
- [ ] **Multiple chart layouts** - 1x1, 2x2, 1x3
- [ ] **Indicator overlay** - Multiple indicators on same chart
- [ ] **Chart annotations** - Notes, labels
- [ ] **Screenshot/export** - PNG, PDF export
- [ ] **Fullscreen mode**

#### Data Visualization
- [ ] **Gradient coloring** - Heat-based coloring for intensity
- [ ] **Animated transitions** - Smooth data updates
- [ ] **Tooltip enhancements** - More data on hover
- [ ] **Legend customization** - Show/hide series
- [ ] **Y-axis scaling options** - Linear, log, percentage

### API INTEGRATION PRIORITIES

| Data Source | Cost | Metrics Available |
|-------------|------|-------------------|
| Blockchain.info | FREE | Hash rate, difficulty, tx count, fees |
| Mempool.space | FREE | Mempool, fees, blocks, Lightning |
| CoinGecko | FREE (rate limited) | Price, market cap, volume |
| Alternative.me | FREE | Fear & Greed |
| CoinGlass | FREE tier | Funding, OI, liquidations |
| Glassnode | $29-799/mo | SOPR, MVRV, exchange flows |
| CryptoQuant | $49-399/mo | Exchange flows, miner data |

### RECOMMENDED IMPLEMENTATION ORDER

1. **Free APIs first** - Maximize value without cost
2. **Build metric calculators** - Prepare for when you get data
3. **Chart infrastructure** - Multi-pane, drawing tools
4. **Premium data later** - Once you have revenue to fund APIs

---

## Implementation Priority

### Phase 1: Fix Critical Bugs (Week 1)
1. Fix EMA/MACD initialization
2. Fix RSI warmup handling
3. Fix position sizing with fees
4. Add unit tests for indicators

### Phase 2: Core Improvements (Week 2)
5. Add Bollinger Bands
6. Add ATR
7. Add volume conditions to parser
8. Improve Monte Carlo (bootstrapping)

### Phase 3: Paper Trading (Week 3)
9. WebSocket price feed integration
10. Auto SL/TP execution
11. Paper trading UI dashboard
12. Real-time P&L tracking

### Phase 4: Polish & Testing (Week 4)
13. Integration tests
14. Known-data validation
15. Property-based tests
16. Performance optimization

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `static/src/js/backtester-pro.js` | HIGH | Fix indicator calcs, position sizing, MC sim |
| `static/src/js/shared.js` | HIGH | Consolidate indicators, add new ones |
| `static/src/js/paper-trading.js` | MEDIUM | Add WebSocket, auto-execution |
| `static/src/js/risk-manager.js` | MEDIUM | Fix drawdown check, add ATR stops |
| `static/src/js/pattern-detector.js` | LOW | Improve confidence scoring |
| `cypress/unit/` | HIGH | Add comprehensive unit tests |

---

## Audit Summary

### Severity Counts
- **CRITICAL**: 4 issues (bias in backtesting)
- **HIGH**: 5 issues (logic flaws)
- **MEDIUM**: 6 issues (functional bugs)
- **LOW**: 3 issues (code quality)

### Overall Assessment
The codebase is **solid for a passion project** but has several issues that would produce **unrealistic backtest results**:

1. **Indicator initialization is wrong** - EMAs and MACD start incorrectly, inflating early signals
2. **Monte Carlo doesn't truly randomize** - Just adds noise, doesn't test strategy robustness
3. **Position sizing ignores fees** - Overstates returns
4. **Sharpe ratio assumes wrong trading days** - Bitcoin is 24/7/365

These issues would likely make backtests look **better than real trading** would be. Fixing them will probably **reduce reported returns** but give you **more accurate expectations**.

The good news: You already fixed several critical bugs (same-candle entry/exit, warmup period enforcement, look-ahead bias in breakouts). The foundation is there.
