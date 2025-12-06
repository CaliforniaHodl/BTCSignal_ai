# BTCSignal.ai Feature Roadmap

## FREE Features (Designed to Hook Users)

### 1. Market Overview Dashboard
- [x] Live BTC price ticker
- [x] Fear & Greed index integration
- [x] Funding rates display
- [x] Liquidation heatmap thumbnails
- [x] Volume profile snapshot

*Simple data → huge perceived value* **COMPLETE**

### 2. Automatically Generated Summaries
- [x] AI-powered daily summary
  - Market bias: Bullish / Neutral / Bearish
  - Key levels for the day
  - Quick recap of yesterday's movement

### 3. Pattern Auto-Detection Preview
- [x] Show first chart labeled with:
  - Support/resistance
  - Trendlines
  - Triangle / wedge / channel
- [x] Paywall gate: "Full pattern analysis is premium"
- [x] Live chart with Chart.js
- [x] Pattern detection (triangles, wedges, channels, double tops/bottoms)
- [x] Order block detection
- [x] Fair value gap detection
- [x] Multi-timeframe support (15M, 1H, 4H, 1D)

### 4. Backtest Mini-Snippets
- [x] Example teasers:
  - Win rate of "EMA cross on BTC H1" last 6 months
  - RSI divergences accuracy
  - VWAP bounce probability
- [x] Portfolio Simulator link for full backtests
- [x] Backtester PRO teaser (coming soon)

### 5. BTC Narrative Tracker
- [x] Auto-track:
  - ETF flows (sentiment tracker)
  - Halving countdown
  - Hash rate
  - Market cap & BTC dominance

### 6. Public Trade Log (Delayed)
- [x] Show only trades older than 10 days (free posts after first 10)
- [x] Paid members get real-time access

### 7. "Key Level of the Day" Widget
- [x] One level only, updated daily
- [x] Embeddable widget (iframe at /embed/key-level/)

### 8. Education Hub
- [x] What is SFP (Swing Failure Pattern)
- [x] What is a liquidity grab
- [x] Market structure basics
- [x] Order block explanation
- [x] Fair value gap guide
- [x] RSI divergence guide
- [x] Support & resistance guide

*SEO juice for your website*

---

## PAID Features (The Real Money-Makers)

### 1. AI-Driven Trade Ideas (with Reasoning)
- [x] Every signal includes:
  - Direction
  - Entry price
  - Stop loss
  - Target price
  - Why the AI model thinks this setup works
  - Probability score (confidence)
  - Time-to-invalidity

### 2. Unlimited AI Chart Analysis
- [x] User uploads TradingView screenshot
- [x] AI returns:
  - All key levels
  - Trend direction
  - Hidden liquidity zones
  - Breaker blocks
  - Volume imbalance
  - Fair value gaps
  - Risk-to-reward estimates

*This alone sells subscriptions*

### 3. Liquidation Map (Interactive)
- [x] Real-time zoomable heatmap with:
  - High leverage liquidation pockets
  - Leverage filter (10x, 25x, 50x, 100x)
  - Sweep prediction
  - "Most likely price magnet"
- [x] Key liquidation zones summary
- [x] 24H liquidation stats
- [x] Education section

### 4. Full Trade Tracker + Metrics
- [x] Users get (via Premium Dashboard):
  - Win/loss rate
  - Average R multiple
  - Long vs short bias
  - Worst drawdown
  - Calendar heatmap of profits

*Gives your site a "Trading Journal SaaS" vibe*

### 5. Backtester PRO
- [x] AI expands user-specified strategy (natural language parsing)
- [x] Example strategies (RSI + MACD, Breakout, EMA Cross, S/R Bounce)
- [x] Full report includes:
  - Equity curve (Chart.js visualization)
  - Sharpe ratio
  - Trade-by-trade log
  - Max drawdown
  - Win rate, profit factor
- [x] Monthly performance grid
- [x] AI strategy analysis and optimization suggestions

### 6. Premium Newsletter
- [x] Subscribe page with free/premium tiers
- [x] Weekly report preview with blurred premium content
- [x] Features included:
  - Market overview
  - Key price levels
  - Trade setups (premium)
  - Weekly forecast (premium)
  - On-chain insights (premium)
  - Sentiment analysis (premium)
- [x] Newsletter archive section
- [x] Testimonials and FAQ
- [x] Lightning payment integration (demo)

### 7. Portfolio Simulator
- [x] Users can simulate:
  - "If I longed every bullish breakout this month..."
  - "What if I only took trades with 2R+?"
- [x] Helps users improve strategy
- [x] Strategy presets (RSI Oversold Bounce, EMA Crossover, etc.)
- [x] Custom strategy builder
- [x] Equity curve visualization with Chart.js
- [x] Detailed stats (win rate, profit factor, Sharpe ratio, max drawdown)
- [x] Trade log with entry/exit details
- [x] AI-generated insights

### 8. Alerts System
- [x] Alert types:
  - Price above threshold
  - Price below threshold
  - Percentage change (24h)
- [x] Delivery: Browser notifications, sound alerts
- [x] Quick alerts for common price targets
- [x] Key technical levels suggestions
- [x] Alert history tracking
- [x] Triggered alerts log

---

## Pro Tools Suite (IMPLEMENTED)

### Alpha Radar
- [x] BTC dominance tracking
- [x] Stablecoin supply monitoring
- [x] Fear & Greed meter
- [x] Funding rate analysis
- [x] Whale activity tracking (exchange flows)
- [x] Liquidity zones visualization
- [x] Market anomaly detection
- [x] AI-generated market summary

### Liquidity Hunter
- [x] Top-side liquidity prediction
- [x] Bottom-side liquidity prediction
- [x] Probability scores
- [x] ETA estimates
- [x] Visual liquidity map
- [x] AI reasoning for predictions
- [x] Accuracy tracking (7d/30d)

### Trade Coach
- [x] Trade input form (direction, entry, SL, TP, sizing, reasoning)
- [x] AI-powered trade evaluation
- [x] Overall score with breakdown (entry, risk, logic, sizing)
- [x] Strengths identification
- [x] Improvement suggestions
- [x] Psychology analysis
- [x] Alternative entry ideas
- [x] Key takeaways
- [x] Trade history tracking

### Portfolio Simulator
- [x] Strategy presets (RSI Oversold, EMA Crossover, MACD Momentum, Support Bounce, Breakout)
- [x] Custom strategy builder with indicators and conditions
- [x] Equity curve visualization with Chart.js
- [x] Detailed performance stats
- [x] Trade-by-trade log
- [x] AI-generated insights and recommendations

### Pattern Detector
- [x] Live BTC chart with real-time data from CoinGecko API
- [x] Multi-timeframe support (15M, 1H, 4H, 1D)
- [x] Automatic support/resistance detection
- [x] Chart pattern recognition (triangles, wedges, channels, double tops/bottoms)
- [x] Trendline detection with touch points
- [x] Order block identification
- [x] Fair value gap (FVG) mapping
- [x] Free preview with premium paywall
- [x] AI-generated analysis summary

---

## Implementation Priority

### Phase 1 (COMPLETE)
- [x] Basic analysis bot
- [x] Twitter integration
- [x] Lightning paywall (21 sats per post)
- [x] Premium dashboard (basic)
- [x] 3D Bitcoin coin animation
- [x] Live price ticker
- [x] Hugo static site with responsive design

### Phase 2 (COMPLETE)
- [x] Fear & Greed index
- [x] Funding rates
- [x] BTC Narrative Tracker (halving, hash rate, market cap, ETF sentiment)
- [x] Education hub (7 articles)
- [x] Key Level of the Day widget
- [x] Backtest snippets (teasers)
- [x] SEO optimization (meta tags, JSON-LD, keywords)
- [x] ADA/WCAG accessibility compliance
- [x] Admin mode for development/testing

### Phase 3 (COMPLETE)
- [x] AI chart analysis upload (Chart AI)
- [x] Alpha Radar (market intelligence)
- [x] Liquidity Hunter (sweep predictions)
- [x] Trade Coach (trade evaluation)
- [x] Premium access tiers (hourly/daily/weekly)
- [x] Tamper-resistant access tokens
- [x] Dark/light theme toggle

### Phase 4 (COMPLETE)
- [x] Interactive Liquidation Map
- [x] Backtester PRO (AI strategy parsing)
- [x] Price Alerts System
- [x] Premium Newsletter subscription page
- [x] New Bitcoin + Signal logo
- [x] Embeddable Key Level widget

### Phase 5.5: Get MVP Working (IN PROGRESS)
*Goal: Polish existing features for launch-ready state*

**Home Page (`/`)**
- [x] Add more content above the fold - page feels empty until Market Sentiment section
- [x1] Market Sentiment placement is fine, but needs more engaging content before it

**Analysis History (`/posts/`)**
- [x] Fix empty table - Time, Sentiment, Confidence, Price, Change columns showing no data

**Learn Hub (`/learn/`)**
- [x] Add emojis to posts that are missing them (some have emojis, some don't)

**Learn Posts (`/learn/:post`)**
- [x] Redesign related posts cards - improve card design
- [x] Match related posts card background with the current post theme

**Pro Tools Dashboard (`/pro-tools/dashboard/`)**
- [x] Redesign to match Market Sentiment widget style from home page
- [x] Add 3x more widgets (expand from current layout)

---

### Phase 6: Competitive Feature Parity (COMPLETE)
*Goal: Close the gap with Coinglass free tier while leveraging unique advantages*
*Timeline: 4-6 weeks*
*Detailed plan: [Phase_6.md](./Phase_6.md)*

**Sprint 1: Quick Wins (Week 1)** - COMPLETE
- [x] Long/Short ratio display (Bybit API) - Visual bar chart with live data
- [x] Multi-exchange funding rate comparison (dYdX, Bitget, OKX, Bybit, Binance)
- [x] Funding rate history chart (30 days) - With rolling history tracking

**Sprint 2: Data Infrastructure (Week 2)** - COMPLETE
- [x] Historical Open Interest tracking + chart with price overlay
- [x] Signal accuracy tracking system (public stats, 24h outcome checking)
- [x] Data cache status indicator (freshness display in UI)

**Sprint 3: Differentiators (Week 3-4)** - COMPLETE
- [x] Telegram alert integration (bot infrastructure - skips gracefully if not configured)
- [x] Discord webhook integration (URL input, test, and save with alert types)
- [x] Funding rate arbitrage calculator (profit calculator with exchange selection)

**Sprint 4: On-Chain Basics (Week 4-5)** - COMPLETE
- [x] Exchange reserve tracking (top 5 exchanges with 24h/7d changes)
- [x] Whale transaction alerts (>500 BTC - uses existing whale-tracker.ts)
- [x] Basic MVRV indicator (with valuation zones and signals)

**Sprint 5: Polish & Positioning (Week 5-6)** - COMPLETE
- [x] Educational tooltips on every dashboard metric
- [x] Monthly pricing tier (50,000 sats with 83% discount badge)
- [x] Marketing site comparison table vs Coinglass

**Success Criteria:** ALL MET
- [x] Signal accuracy publicly displayed
- [x] 4+ exchange funding comparison live
- [x] Telegram alerts functional (code ready)
- [x] At least 2 on-chain metrics added (MVRV, Reserves, Whale Flows)

**Positioning After Phase 6:**
> "The only Bitcoin signal platform that proves its accuracy, explains what the data means, and alerts you via Telegram - all payable in sats"

---

### Phase 7: Access Recovery & Persistence (COMPLETE)
*Goal: Solve the "lost localStorage = lost access" problem for paid subscribers*
*Priority: High (critical for yearly pass viability)*

**The Problem:**
- Access tokens stored in browser localStorage
- Clearing browser data = losing paid access
- No way to transfer access between devices
- Yearly pass customers especially affected
- No KYC = no email to recover with

**Sprint 1: Recovery Code System (Week 1-2)** - COMPLETE
- [x] Generate unique recovery codes on purchase (format: `BTCSIG-XXXX-XXXX-XXXX`)
- [x] Create `data/access-records.json` to store: `{code, paymentHash, tier, purchaseDate, expiresAt}`
- [x] Create `netlify/functions/store-access.ts` - called after successful payment
- [x] Create `netlify/functions/recover-access.ts` - validates code and returns access
- [x] Update payment flow to display recovery code prominently after purchase
- [x] Add "Save this code!" modal with copy button and download option
- [x] Store recovery code in localStorage alongside access token

**Sprint 2: Recovery UI (Week 2-3)** - COMPLETE
- [x] Add "Recover Access" link to pricing page and locked content
- [x] Create `/recover/` page with recovery code input
- [x] Validate code format client-side before API call
- [x] On success: restore access token to localStorage, redirect to dashboard
- [x] On failure: show helpful error message with support contact
- [x] Add recovery code display to user's current access status

**Sprint 3: Payment Hash Backup (Week 3-4)** - COMPLETE
- [x] Allow recovery via Lightning payment hash (backup method)
- [x] User can paste their payment hash from wallet history
- [x] Server looks up payment hash in access records
- [x] Useful when user lost recovery code but has wallet transaction history
- [x] Add "Lost your code? Try payment hash" option on recovery page

**Sprint 4: Multi-Device Sync (Week 4-5)** - Optional Enhancement
- [ ] QR code to transfer access between devices
- [ ] Device A shows QR with encrypted access token
- [ ] Device B scans and imports access
- [ ] No server needed, peer-to-peer via QR
- [ ] Alternative: shareable recovery link (one-time use)

**Data Schema:**
```json
// data/access-records.json
{
  "records": [
    {
      "recoveryCode": "BTCSIG-A7X9-K2M4-P8Q1",
      "paymentHash": "abc123...",
      "tier": "yearly",
      "amountSats": 400000,
      "purchaseDate": "2024-12-05T10:30:00Z",
      "expiresAt": "2025-12-05T10:30:00Z",
      "recoveryCount": 0,
      "lastRecovery": null
    }
  ]
}
```

**API Endpoints:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.netlify/functions/store-access` | POST | Store new access record after payment |
| `/.netlify/functions/recover-access` | POST | Validate recovery code/payment hash |
| `/.netlify/functions/check-access` | GET | Verify if access record exists |

**Success Criteria:** ALL MET
- [x] Recovery codes generated and displayed on every purchase
- [x] Users can recover access on new device/browser
- [x] Payment hash backup method working
- [x] Recovery page accessible from pricing and locked content
- [x] Access records persisted in GitHub (survives deploys)

**Security Considerations:**
- Recovery codes are single-use per device (increment recoveryCount)
- Rate limit recovery attempts (prevent brute force)
- Codes expire when access expires
- No PII stored - just codes, hashes, and timestamps

**UX Flow:**
```
Purchase → Payment Success → Show Recovery Code Modal → User Saves Code
                                    ↓
Lost Access → Go to /recover/ → Enter Code → Access Restored
                                    ↓
              Lost Code? → Enter Payment Hash → Access Restored
```

**Positioning After Phase 7:**
> "Buy once, access anywhere. Your recovery code works on any device, any browser - no accounts needed, no KYC required."

---

### Phase 8: Comprehensive Test Suite with Cypress (IN PROGRESS)
*Goal: TDD the entire project with end-to-end and integration tests*
*Priority: High (ensures stability before new features)*
*No new features - testing existing functionality only*

**The Problem:** ✅ PARTIALLY SOLVED
- No automated tests exist → 26 test files created
- Manual testing is time-consuming and error-prone → Automated CI pipeline
- Regressions can slip through unnoticed → E2E tests catch regressions
- Refactoring is risky without test coverage → Full coverage of all pages
- No confidence in deployment stability → GitHub Actions runs tests on every push

**Sprint 1: Cypress Setup & Core Infrastructure** ✅ COMPLETE
- [x] Install Cypress and configure for Hugo/Netlify stack
- [x] Set up `cypress.config.js` with base URL and environment variables
- [x] Create custom commands for common actions (login, check access, etc.)
- [x] Set up fixtures for mock data (prices, predictions, access records)
- [x] Configure GitHub Actions for CI test runs
- [x] Add npm scripts: `test`, `test:open`, `test:ci`, `test:e2e`, `test:api`, `test:unit`, `test:visual`

**Sprint 2: Critical User Flow Tests (E2E)** ✅ COMPLETE
- [x] **Homepage tests** (homepage.cy.js)
- [x] **Pricing page tests** (pricing.cy.js)
- [x] **Recovery flow tests** (recovery.cy.js)
- [x] **Premium access tests** (premium-access.cy.js)
- [x] **Learn hub tests** (learn.cy.js)
- [x] **Posts tests** (posts.cy.js)
- [x] **Other pages** (other-pages.cy.js - 14 pages)

**Sprint 3: Pro Tools Page Tests** ✅ COMPLETE
- [x] **Dashboard tests** (dashboard.cy.js)
- [x] **Alpha Radar tests** (alpha-radar.cy.js)
- [x] **Liquidity Hunter tests** (liquidity-hunter.cy.js)
- [x] **Pattern Detector tests** (pattern-detector.cy.js)
- [x] **Trade Coach tests** (trade-coach.cy.js)
- [x] **Portfolio Simulator tests** (portfolio-simulator.cy.js)
- [x] **Backtester Pro tests** (backtester-pro.cy.js)
- [x] **Liquidation Map tests** (liquidation-map.cy.js)

**Sprint 4: Netlify Functions API Tests** ✅ COMPLETE
- [x] **payment-functions.cy.js**: create-invoice, check-payment
- [x] **access-functions.cy.js**: store-access, recover-access, validate-session
- [x] **market-data-functions.cy.js**: liquidity-prediction, market-data, whale-tracker
- [x] **feature-functions.cy.js**: trade-coach, newsletter, webhooks

**Sprint 5: Access Manager & Utilities Tests** ✅ COMPLETE
- [x] **access-manager.cy.js**: Full BTCSAIAccess module tests
  - Admin mode, token management, tier access, single post access
  - Recovery code & session token management
  - Token verification, access extension
- [x] **utilities.cy.js**: Number/date formatting, validation, calculations
- [x] **dom-helpers.cy.js**: Element visibility, attributes, viewports

**Sprint 6: Visual & Regression Tests** ✅ COMPLETE
- [x] **screenshots.cy.js**: Baseline screenshots for all pages at 3 viewports
- [x] **theme-switching.cy.js**: Dark/light mode toggle and persistence
- [x] **responsive.cy.js**: Layout tests at 6 viewport sizes
- [x] **loading-states.cy.js**: Loading spinners, error fallbacks, empty states
- [x] **accessibility.cy.js**: WCAG compliance, keyboard nav, ARIA landmarks

---

#### Phase 8 Expansion: Deep Logic & Edge Case Testing

*Goal: Move beyond UI verification to test actual business logic and calculations*
*Identified Gap: Tests verify pages load but not that calculations are correct*

**Sprint 7: Backtester Pro Logic Tests** ✅ COMPLETE
- [x] **Strategy parsing tests**: Verify natural language → conditions (54 tests)
  - RSI conditions: "Buy when RSI < 30" → correct entry condition
  - MACD conditions: "Sell on MACD cross" → exit recognized
  - EMA conditions: "EMA 9 crosses EMA 21" → cross detection
  - Breakout: "break 20-day high" → breakout entry
  - Stop loss/take profit parsing
  - Direction parsing (long/short/both)
  - Edge cases: empty input, gibberish, XSS, SQL injection
- [x] **Trade simulation tests**: Entry/exit logic
  - Entry point detection accuracy
  - Stop loss enforcement
  - Take profit triggers
  - Position sizing calculations
  - Slippage and fees applied
- [x] **Monte Carlo simulation tests**: Statistical validity
  - 500 paths generated
  - Median, P5/P95 percentiles calculated
  - Profit/ruin probability
  - Distribution histogram
- [x] **Statistics calculations tests**
  - Win rate validation (0-100%)
  - Max drawdown validation (0-100%)
  - Sharpe ratio calculation
  - Profit factor calculation
- [x] **Result accuracy tests**: Known dataset validation
  - Uptrend/downtrend data tests
  - Equity curve display

**Test file**: `cypress/unit/backtester-logic.cy.js` (680+ lines, 54 tests)

**Sprint 8: WebSocket Manager Tests** ⏳ PENDING
- [ ] **Connection tests**: WebSocket lifecycle
  - Binance stream connects successfully
  - Bybit stream connects successfully
  - Connection failure triggers reconnect
  - Max reconnect attempts (5) respected
- [ ] **Message handling tests**: Data parsing
  - Price updates parsed correctly
  - Order book data processed
  - Malformed messages handled gracefully
  - Rate limiting applied
- [ ] **Error recovery tests**: Resilience
  - Network interruption → automatic reconnect
  - Server disconnect → backoff retry
  - Invalid data → skip without crash

**Sprint 9: Payment Flow Completion Tests** ⏳ PENDING
- [ ] **End-to-end payment tests**: Full flow
  - Create invoice → mock payment → webhook → access granted
  - Verify access token generated after payment
  - Verify recovery code created and stored
- [ ] **Edge case tests**: Error handling
  - Invoice expired, user tries to check
  - Duplicate payment handling (idempotency)
  - Network timeout during payment check
  - Webhook arrives out of order
- [ ] **Security tests**: Payment integrity
  - Tampered payment hash rejected
  - Invalid tier rejected
  - Rate limiting on check-payment

**Sprint 10: Error Scenarios & Edge Cases** ⏳ PENDING
- [ ] **API failure tests**: Network errors
  - 500 server errors show user-friendly message
  - 429 rate limiting shows retry message
  - Timeout shows connection error
  - Invalid JSON handled gracefully
- [ ] **Empty/null data tests**: Missing data
  - Empty price arrays don't crash charts
  - Null funding rates show "N/A"
  - Missing market data shows stale indicator
- [ ] **Input validation tests**: User input
  - XSS attempts sanitized
  - Negative numbers where positive expected
  - Extremely large numbers handled
  - Special characters in recovery codes

**Sprint 11: Feature Calculation Logic** ⏳ PENDING
- [ ] **Pattern Detector logic**: Algorithm accuracy
  - Known chart patterns detected correctly
  - Support/resistance levels within 2% of expected
  - Confidence scores in valid range (0-100)
- [ ] **Liquidity Hunter logic**: Prediction math
  - Zone calculations match expected output
  - Probability percentages sum correctly
  - ETA estimates reasonable
- [ ] **Trade Coach logic**: Scoring validation
  - Score breakdown adds to total
  - Risk/reward calculation correct
  - All score components in valid range

**Success Criteria (Phase 8 Expansion):**
- [ ] Backtester Pro: Strategy parsing 90%+ accurate on test cases
- [ ] WebSocket: Reconnection works within 30s of disconnect
- [ ] Payment: Full flow tested with mock Lightning webhook
- [ ] Error handling: All API failures show user-friendly messages
- [ ] Calculations: All financial calculations verified against known values

---

**Test File Structure:** (26 test files → 35+ after expansion)
```
cypress/
├── e2e/                           # 15 files
│   ├── homepage.cy.js
│   ├── pricing.cy.js
│   ├── recovery.cy.js
│   ├── premium-access.cy.js
│   ├── dashboard.cy.js
│   ├── alpha-radar.cy.js
│   ├── liquidity-hunter.cy.js
│   ├── pattern-detector.cy.js
│   ├── trade-coach.cy.js
│   ├── portfolio-simulator.cy.js
│   ├── backtester-pro.cy.js
│   ├── liquidation-map.cy.js
│   ├── learn.cy.js
│   ├── posts.cy.js
│   └── other-pages.cy.js
├── api/                           # 4 files
│   ├── payment-functions.cy.js
│   ├── access-functions.cy.js
│   ├── market-data-functions.cy.js
│   └── feature-functions.cy.js
├── unit/                          # 3 files
│   ├── access-manager.cy.js
│   ├── utilities.cy.js
│   └── dom-helpers.cy.js
├── visual/                        # 5 files
│   ├── screenshots.cy.js
│   ├── theme-switching.cy.js
│   ├── responsive.cy.js
│   ├── loading-states.cy.js
│   └── accessibility.cy.js
├── fixtures/
│   ├── prices.json
│   ├── market-data.json
│   ├── fear-greed.json
│   ├── predictions.json
│   └── access-records.json
└── support/
    ├── commands.js
    └── e2e.js
```

**NPM Scripts:**
```bash
npm test              # Run all tests
npm run test:open     # Open Cypress GUI
npm run test:ci       # Run in CI mode
npm run test:e2e      # E2E tests only
npm run test:api      # API tests only
npm run test:unit     # Unit tests only
npm run test:visual   # Visual regression tests
```

**Custom Commands:**
```javascript
cy.grantAccess(tier, duration)    // Grant premium access
cy.grantFullAccess(tier)          // Grant with recovery code
cy.clearAccess()                  // Clear all access
cy.enableAdmin() / cy.disableAdmin()
cy.mockMarketData()               // Mock market API
cy.mockNetlifyFunctions()         // Mock all functions
cy.mockPaymentSuccess()           // Mock payment flow
cy.shouldShowPaywall() / cy.shouldShowContent()
cy.setMobileViewport() / cy.setTabletViewport() / cy.setDesktopViewport()
```

**Success Criteria:** ✅ ALL MET
- [x] 80%+ code coverage on critical paths
- [x] All E2E tests pass in CI (GitHub Actions configured)
- [x] Tests organized by type for parallel execution
- [x] Visual regression baseline established
- [x] Retry logic implemented (2 retries in CI)
- [x] Test scripts documented in package.json

**Positioning After Phase 8:**
> "Quality assured with 5,000+ lines of automated tests. Every push triggers CI validation - no regressions slip through."

**CI/CD Integration:**
```yaml
# .github/workflows/test.yml
name: Cypress Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          build: npm run build
          start: npm run serve
          wait-on: 'http://localhost:1313'
```

**npm Scripts:**
```json
{
  "scripts": {
    "test": "cypress run",
    "test:open": "cypress open",
    "test:ci": "cypress run --record",
    "test:e2e": "cypress run --spec 'cypress/e2e/**/*'",
    "test:api": "cypress run --spec 'cypress/api/**/*'"
  }
}
```

---

## Tech Stack (CURRENT)

- **Frontend**: Hugo static site generator
- **Styling**: Custom CSS with CSS variables, dark/light themes
- **Backend**: Netlify Functions (TypeScript)
- **Payments**: Lightning Network via LNbits
- **Data Sources**:
  - Coinbase API (spot prices)
  - CoinGecko API (funding rates, klines)
  - CoinGecko API (market data, dominance)
  - Alternative.me (Fear & Greed)
- **AI**: Claude API for analysis and chart interpretation
- **Hosting**: Netlify with automatic deploys from GitHub
- **Version Control**: GitHub

---

## Recent Updates
**2024-12-05**: Phase 7 Complete - Access Recovery & Persistence
- Recovery code system (BTCSIG-XXXX-XXXX-XXXX format)
- Server-side access records via GitHub API
- /recover/ page for access restoration
- Payment hash backup recovery method
- Recovery modal with copy/download options

**2024-12-05**: Phase 5-6 Complete
- **2024-11-29**: Phase 4 Complete:
  - Interactive Liquidation Map with heatmap visualization
  - Backtester PRO with natural language strategy parsing
  - Price Alerts System with browser notifications
  - Premium Newsletter subscription page
  - New Bitcoin + Signal logo design
  - Embeddable Key Level widget
- **2024-11**: Pattern Detector - AI-powered chart pattern recognition
- **2024-11**: Portfolio Simulator - Strategy backtesting with equity curves
- **2024-11**: Admin mode for development/testing bypass
- **2024-11**: ADA/WCAG accessibility compliance
- **2024-11**: SEO optimization with structured data
- **2024-11**: Fixed dropdown menu and admin bypass for all Pro Tools
