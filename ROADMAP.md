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

### Phase 8: Comprehensive Test Suite with Cypress (COMPLETE)
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

### Phase 9: Raspberry Pi 5 Server (Self-Hosted Backend)
*Goal: Set up a dedicated Pi 5 server for user database, session validation, and analytics*
*Priority: Medium (enables true backend without cloud costs)*
*Teaching focus: Step-by-step for front-end developers learning backend*

**The Why:**
- Currently using GitHub API for access records (limited, rate-limited)
- No real database = no analytics, no session management
- Netlify functions are stateless = can't track users across requests
- Pi 5 (8GB) is powerful enough for SQLite + API server
- Self-hosted = no monthly cloud bills, full control

**Hardware:**
- Raspberry Pi 5 (8GB RAM)
- MicroSD card (64GB+) or NVMe SSD (recommended)
- Power supply (27W USB-C)
- Ethernet cable (recommended for server)

**Sprint 1: Ubuntu 24 LTS Setup** ⏳ PENDING
- [ ] Download Ubuntu 24.04 LTS Desktop for Raspberry Pi
- [ ] Flash to microSD using Raspberry Pi Imager
- [ ] Initial boot and system configuration
- [ ] Update system packages (`apt update && apt upgrade`)
- [ ] Configure static IP address
- [ ] Set up SSH for headless access
- [ ] Create non-root user for services

**Sprint 2: Tailscale VPN Setup** ⏳ PENDING
- [ ] Install Tailscale (`curl -fsSL https://tailscale.com/install.sh | sh`)
- [ ] Authenticate and join your tailnet
- [ ] Enable MagicDNS for easy hostname access
- [ ] Test connection from other devices on tailnet
- [ ] Configure Tailscale to start on boot
- [ ] Set up exit node (optional - route traffic through Pi)

**Sprint 3: Pi-hole DNS Filtering** ⏳ PENDING
- [ ] Install Pi-hole (`curl -sSL https://install.pi-hole.net | bash`)
- [ ] Configure upstream DNS (Cloudflare 1.1.1.1 or Quad9)
- [ ] Add custom blocklists for ad/tracker blocking
- [ ] Set Pi as DNS server for tailnet devices
- [ ] Access Pi-hole admin dashboard
- [ ] Review query logs and blocked domains

**Sprint 4: Caddy Reverse Proxy** ⏳ PENDING
- [ ] Install Caddy (`apt install caddy`)
- [ ] Configure Caddyfile for local services
- [ ] Set up automatic HTTPS with Tailscale certs
- [ ] Create reverse proxy rules for:
  - `/api/*` → Node.js API server
  - `/admin/*` → Pi-hole dashboard
- [ ] Test SSL/TLS configuration
- [ ] Enable access logging

**Sprint 5: SQLite Database Setup** ⏳ PENDING
- [ ] Install SQLite3 (`apt install sqlite3`)
- [ ] Design database schema:
  ```sql
  -- Access records (replaces GitHub JSON)
  CREATE TABLE access_records (
    id INTEGER PRIMARY KEY,
    recovery_code TEXT UNIQUE NOT NULL,
    payment_hash TEXT,
    tier TEXT NOT NULL,
    amount_sats INTEGER,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    recovery_count INTEGER DEFAULT 0,
    last_recovery DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Session tokens
  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    recovery_code TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    ip_hash TEXT,
    user_agent TEXT
  );

  -- Analytics (privacy-respecting)
  CREATE TABLE page_views (
    id INTEGER PRIMARY KEY,
    page_path TEXT NOT NULL,
    visitor_hash TEXT NOT NULL,  -- SHA256(IP + daily_salt)
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    referrer TEXT,
    user_agent TEXT
  );

  -- Daily salt for IP hashing (rotates daily)
  CREATE TABLE daily_salt (
    date TEXT PRIMARY KEY,
    salt TEXT NOT NULL
  );
  ```
- [ ] Create database file with proper permissions
- [ ] Test basic CRUD operations
- [ ] Set up daily backup script

**Sprint 6: Node.js API Server** ⏳ PENDING
- [ ] Install Node.js 20 LTS (`apt install nodejs npm`)
- [ ] Create Express.js API project
- [ ] Implement endpoints:
  - `POST /api/store-access` - Store new access record
  - `POST /api/recover-access` - Validate recovery code
  - `POST /api/validate-session` - Check session validity
  - `POST /api/track-pageview` - Log analytics (hashed IP)
  - `GET /api/analytics/summary` - Return aggregated stats
- [ ] Add rate limiting middleware
- [ ] Add CORS configuration for btcsignal.ai
- [ ] Set up PM2 for process management
- [ ] Configure systemd service for auto-start

**Sprint 7: Cloudflare Tunnel (Optional)** ⏳ PENDING
- [ ] Install cloudflared
- [ ] Create tunnel for public API access
- [ ] Configure DNS records
- [ ] Set up access policies
- [ ] Alternative: Keep API internal (Tailscale-only)

**Sprint 8: Connect to BTCSignals Pro** ⏳ PENDING
- [ ] Update Netlify functions to call Pi API
- [ ] Migrate existing access records from GitHub to SQLite
- [ ] Update client-side code to use new endpoints
- [ ] Test full purchase → recovery flow
- [ ] Set up monitoring and alerts

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────────────────┐
│                    BTCSignals Pro Users                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Netlify (Frontend)                        │
│  - Hugo static site                                          │
│  - Serverless functions (payment, Claude API)               │
└─────────────────────────────────────────────────────────────┘
                              │
                    Tailscale VPN / Cloudflare Tunnel
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Raspberry Pi 5 Server                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Caddy     │  │  Pi-hole    │  │  Node.js    │         │
│  │  (proxy)    │  │   (DNS)     │  │   (API)     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                              │                               │
│                              ▼                               │
│                    ┌─────────────┐                          │
│                    │   SQLite    │                          │
│                    │ (database)  │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

**Success Criteria:**
- [ ] Pi 5 running Ubuntu 24 LTS with remote SSH access
- [ ] Tailscale connected and accessible from all devices
- [ ] Pi-hole blocking ads/trackers on the network
- [ ] Caddy serving HTTPS with valid certificates
- [ ] SQLite database storing access records
- [ ] API endpoints responding to BTCSignals Pro requests
- [ ] Analytics showing unique visitor counts (privacy-respecting)
- [ ] Automatic backups running daily

**Positioning After Phase 9:**
> "Self-hosted, privacy-respecting backend. Your data never touches third-party clouds. Zero monthly server costs."

---

### Phase 10: Product Polish & Launch Readiness
*Goal: Address critical issues, improve quality, and prepare for market launch*
*Priority: High (based on December 2025 product assessment)*
*Assessment Score: 6.5/10 → Target: 8.5/10*

**Sprint 1: Critical Blockers** ⏳ PENDING
- [ ] Fix `fetch-market-data.ts` - BTC price showing 0, OHLC empty, volume24h = 0
- [ ] Debug Netlify function logs for market data pipeline
- [ ] Verify API keys (Binance, CoinGecko, Coinbase)
- [ ] Check cron schedule for data refresh
- [ ] Re-enable whale tracker in `netlify.toml` (currently commented out)
- [ ] Add data freshness timestamp to UI ("Last updated: X minutes ago")

**Sprint 2: Accessibility Fixes (WCAG Compliance)** ⏳ PENDING
- [ ] Remove all `outline: none` from SCSS (6 locations in premium-features.scss)
- [ ] Fix newsletter form focus removal (_footer.scss:63)
- [ ] Fix hardcoded `tabindex="9"` - breaks tab order
- [ ] Use existing `focus-visible` mixin consistently
- [ ] Add proper ARIA labels to mobile menu
- [ ] Replace `alert()` and `confirm()` dialogs with accessible modals

**Sprint 3: Code Quality Cleanup** ⏳ PENDING
- [ ] Remove/guard 30 console.log statements (`if (DEBUG) console.log(...)`)
- [ ] Fix `--btc-orange` typo → `--bitcoin-orange` (2 locations)
- [ ] Add h5 to typography (currently missing between h4 and h6)
- [ ] Fix invalid `/pro-tools/dashboard/` link → `/dashboard/`
- [ ] Add proper error messages (replace "Error. Please try again.")
- [ ] Add loading states to all data-fetching components

**Sprint 4: Trust & Transparency Features** ⏳ PENDING
- [ ] Create public signal history page (all past signals with outcomes)
- [ ] Add signal accuracy tracker (public stats dashboard)
- [ ] Publish win/loss transparency metrics
- [ ] Add "Powered by Claude" badge for AI features
- [ ] Reframe "AI-powered" → "AI-assisted" for formula-based features
- [ ] Remove or justify fictional discount percentages

**Sprint 5: Quick Win Features** ⏳ PENDING
- [ ] Add CSV export for data (competitors charge $800 for this)
- [ ] Simple read-only API for power users
- [ ] Webhook alerts for advanced users
- [ ] Historical signal log (public page)
- [ ] Telegram/Discord community links

**Sprint 6: Testing Foundation** ⏳ PENDING
- [ ] Set up Jest for unit tests
- [ ] Unit tests for `technical-analysis.ts` (RSI, MACD, BB calculations)
- [ ] Unit tests for `prediction-engine.ts` (signal generation)
- [ ] Unit tests for `derivatives-analyzer.ts` (funding rate calcs)
- [ ] Integration tests for API fetchers (Binance, Bybit, CoinGecko fallbacks)
- [ ] Integration tests for payment flow (LNbits)
- [ ] Integration tests for access control (premium gating)
- [ ] E2E tests for critical paths (dashboard loads, payment-to-access)
- [ ] Add MSW (Mock Service Worker) for API mocking
- [ ] GitHub Actions CI pipeline on every PR

**Assessment Findings Summary:**
| Category | Current | Target |
|----------|---------|--------|
| Technical Implementation | 7/10 | 8/10 |
| Data Integrity | 4/10 | 9/10 |
| Feature Completeness | 7/10 | 8/10 |
| UI/UX | 6/10 | 8/10 |
| Business Model | 8/10 | 8/10 |
| AI Claims Accuracy | 5/10 | 7/10 |
| Code Quality | 6/10 | 8/10 |
| Market Positioning | 8/10 | 9/10 |

**What's Working (Keep):**
- Real APIs (Binance, Bybit, OKX, CoinGecko, Mempool.space, Coinbase, Kraken)
- Real Technical Analysis (RSI, MACD, Bollinger Bands, EMA/SMA, ATR)
- Real AI Integration (Claude claude-sonnet-4-20250514 + OpenAI GPT-4)
- Real Payments (LNbits Lightning integration)
- Real Auto-Content (11+ posts auto-generated, daily tweets)
- Real Backtester (Monte Carlo simulations, slippage modeling, NLP parsing)

**What Needs Honesty (Fix Marketing):**
- "AI Pattern Detector" = Heuristic geometric rules, not trained ML
- "AI-Powered Signals" = Mostly formula-based calculations
- "AI Liquidity Hunter" = Claude analyzing metrics, not predictive AI

**Success Criteria:**
- [ ] BTC price displays live data (not 0)
- [ ] All accessibility violations fixed
- [ ] Zero console.logs in production build
- [ ] Public signal accuracy page live
- [ ] 80%+ test coverage on critical paths
- [ ] CI pipeline blocks broken builds

**Positioning After Phase 10:**
> "The transparent, Bitcoin-native alternative to institutional tools. Every signal tracked, every claim verifiable, 16x cheaper than Glassnode."

---

### Phase 11: Nostr Authentication & Identity
*Goal: Replace recovery codes with cryptographic identity using Nostr keys*
*Priority: Medium (after core polish complete)*
*Philosophy: No email. No password. No KYC. Just math.*

**Why Nostr:**
- Same cryptographic primitives as Bitcoin (secp256k1)
- Users already have keys if they're Bitcoiners
- Cross-device by default (sign anywhere with nsec)
- No recovery codes needed - npub IS the identity
- Pseudonymous, not anonymous (can verify reputation)
- Native to Bitcoin culture

**Sprint 1: Core Nostr Auth** ⏳ PENDING
- [ ] Install `nostr-tools` dependency
- [ ] Create NIP-07 signing flow (nos2x, Alby, Flamingo support)
- [ ] Implement challenge-response authentication
- [ ] Create `netlify/functions/nostr-auth.ts` endpoint
- [ ] Verify signatures server-side
- [ ] Store access records by npub (not recovery code)
- [ ] Issue JWT session token after successful auth

**Sprint 2: Purchase Flow Integration** ⏳ PENDING
- [ ] Add "Connect Nostr" button to pricing page
- [ ] Prompt Nostr connection before showing invoice
- [ ] Link payment hash to npub on successful payment
- [ ] Update `/recover/` page to support "Login with Nostr"
- [ ] Migrate existing recovery code users (optional npub linking)

**Sprint 3: User Experience** ⏳ PENDING
- [ ] Add Nostr extension detection (prompt install if missing)
- [ ] Support multiple NIP-07 extensions (nos2x, Alby, Flamingo, Spring)
- [ ] Show connected npub in user status area
- [ ] Add "Disconnect" option
- [ ] Handle extension permission denials gracefully
- [ ] Mobile support via NIP-46 (Nostr Connect) - optional

**Sprint 4: Documentation & Marketing** ⏳ PENDING
- [ ] Update FAQ: "Why do you use Nostr for login?"
- [ ] Update FAQ: "What if I don't have a Nostr account?"
- [ ] Update FAQ: "Is my npub public?"
- [ ] Add Nostr explanation section to pricing page
- [ ] Create `/learn/nostr-auth/` education article
- [ ] Update payment flow copy to explain Nostr benefits

**Sprint 5: Advanced Features** ⏳ PENDING
- [ ] Verify user's Nostr profile (NIP-05 verification)
- [ ] Show subscriber badge on user's Nostr profile (NIP-58)
- [ ] Publish signals to Nostr relay (premium subscribers only)
- [ ] Gate access to private relay for paid users
- [ ] Zap integration (tips via Lightning + Nostr)

**Technical Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   nos2x     │ OR │    Alby     │ OR │  Flamingo   │     │
│  │ (extension) │    │ (extension) │    │ (extension) │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         └──────────────────┼──────────────────┘             │
│                            ▼                                 │
│                    window.nostr.signEvent()                  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     NETLIFY FUNCTION                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  nostr-auth.ts                                       │   │
│  │  1. Generate challenge                               │   │
│  │  2. Receive signed event                             │   │
│  │  3. Verify signature (nostr-tools)                   │   │
│  │  4. Look up access by npub                           │   │
│  │  5. Return JWT session token                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA STORAGE                            │
│  {                                                           │
│    "npub": "npub1abc123...",                                │
│    "tier": "yearly",                                         │
│    "payment_hash": "lnbc...",                               │
│    "purchased_at": "2025-12-05T00:00:00Z",                  │
│    "expires_at": "2026-12-05T00:00:00Z"                     │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

**Auth Flow:**
```
1. User clicks "Login with Nostr"
2. Extension popup: "BTCSignal wants to read your public key"
3. User approves → JS gets npub
4. Server sends challenge string
5. Extension popup: "Sign this message?"
6. User approves → JS gets signed event
7. Server verifies signature
8. Server checks: does this npub have active access?
9. Yes → issue JWT, grant access
   No → redirect to pricing page
```

**Purchase Flow:**
```
1. User clicks "Buy Yearly Pass"
2. Prompt: "Connect with Nostr" (or continue without)
3. User connects → npub captured
4. Lightning invoice displayed
5. User pays invoice
6. Server: store {npub, tier, payment_hash, expiry}
7. User returns later → "Login with Nostr" → instant access
```

**FAQ Content to Add:**

**Q: Why do you use Nostr for login?**
> We're Bitcoin-native, so we use Bitcoin-native auth. Nostr uses the same cryptography as Bitcoin (secp256k1 keys). No email, no password, no KYC - just sign a message with your keys. If you can use a Lightning wallet, you can use Nostr.

**Q: What if I don't have a Nostr account?**
> You can still purchase access and use a recovery code. But we recommend setting up Nostr - it takes 2 minutes with Alby (browser extension) and you'll have a censorship-resistant identity that works across hundreds of apps.

**Q: Is my npub public?**
> Your npub (public key) is like a Bitcoin address - it's meant to be shared. We only store your npub, never your nsec (private key). We can't post as you, access your DMs, or do anything except verify you are who you claim to be.

**Dependencies:**
- `nostr-tools` - Core Nostr library (signing, verification)
- NIP-07 - Browser extension standard
- NIP-42 - Authentication event kind (22242)
- NIP-46 - Nostr Connect (mobile support, optional)

**Success Criteria:**
- [ ] Users can purchase and authenticate with only Nostr keys
- [ ] No email or recovery code required for new users
- [ ] Existing recovery code users can link npub
- [ ] FAQ explains Nostr auth clearly
- [ ] Pricing page explains the "why" of Nostr
- [ ] Works with nos2x, Alby, and Flamingo extensions

**Positioning After Phase 11:**
> "The only Bitcoin signal platform with Nostr-native auth. No email. No password. No KYC. Just your keys."

---

### Phase 12: Production Hardening & Quality Assurance
*Goal: 98%+ test coverage, honest AI branding, flawless accessibility, perfect PageSpeed*
*Priority: High (final polish before public launch)*
*Standard: If it's not tested, it doesn't ship. If it's not accessible, it doesn't ship.*

**Sprint 1: Test Coverage Expansion (60% → 98%)** ⏳ PENDING
*Target: +35% coverage, 98%+ on all critical paths*

**Unit Tests - New:**
- [ ] `technical-analysis.ts` - RSI, MACD, BB, EMA, SMA, ATR calculations
- [ ] `prediction-engine.ts` - Signal generation logic, confidence scoring
- [ ] `derivatives-analyzer.ts` - Funding rate calculations, OI analysis
- [ ] `blog-generator.ts` - Post generation, markdown output
- [ ] `access-manager.ts` - Token validation, tier checking, expiry logic
- [ ] `price-formatter.ts` - Currency formatting, locale handling
- [ ] `date-utils.ts` - Timestamp parsing, relative time, timezone handling

**Integration Tests - New:**
- [ ] API fallback chains (Binance → Coinbase → Kraken)
- [ ] Payment flow end-to-end (invoice → payment → access)
- [ ] Recovery code generation and redemption
- [ ] Nostr auth challenge-response cycle
- [ ] WebSocket reconnection logic
- [ ] Rate limiting enforcement
- [ ] Cache invalidation

**E2E Tests - New:**
- [ ] Full purchase flow (pricing → invoice → payment → dashboard access)
- [ ] Recovery flow (lost access → enter code → restored)
- [ ] Nostr login flow (connect → sign → access)
- [ ] All premium feature paywalls
- [ ] Mobile responsive flows (320px - 768px)
- [ ] Dark/light theme persistence
- [ ] Alert creation and triggering

**Edge Case Tests:**
- [ ] Empty data arrays (don't crash charts)
- [ ] Null/undefined API responses
- [ ] Expired tokens (graceful redirect)
- [ ] Invalid recovery codes (helpful error)
- [ ] Network timeouts (retry with backoff)
- [ ] Malformed WebSocket messages
- [ ] XSS injection attempts (sanitized)
- [ ] SQL injection attempts (rejected)
- [ ] Extremely large numbers (formatted correctly)
- [ ] Negative prices (rejected/flagged)

**Test Infrastructure:**
- [ ] Add code coverage reporting (Istanbul/nyc)
- [ ] Set coverage threshold: 98% lines, 95% branches
- [ ] Add coverage badge to README
- [ ] Block PRs below threshold in CI
- [ ] Add test timing reports
- [ ] Parallelize test execution

---

**Sprint 2: AI Branding Audit & Correction** ⏳ PENDING
*Standard: If Claude/GPT doesn't generate it, don't call it "AI"*

**Rename "AI" → Accurate Labels:**
| Current Name | Actual Tech | New Name |
|--------------|-------------|----------|
| AI Pattern Detector | Geometric heuristics | Pattern Scanner |
| AI-Powered Signals | Formula calculations | Technical Signals |
| AI Liquidity Hunter | Claude analysis | AI-Assisted Liquidity Analysis |
| AI Trade Ideas | Claude generation | AI-Generated Trade Ideas ✓ |
| AI Chart Analysis | Claude vision | AI Chart Analysis ✓ |
| AI Backtester | NLP + simulation | AI-Assisted Backtester |

**Files to Update:**
- [ ] Homepage hero copy
- [ ] Navigation menu labels
- [ ] Pro Tools dashboard headings
- [ ] Individual tool page titles and descriptions
- [ ] Meta descriptions (SEO)
- [ ] Open Graph tags
- [ ] JSON-LD structured data
- [ ] Marketing comparison tables
- [ ] Pricing page feature lists
- [ ] Footer links

**Add Transparency:**
- [ ] Add "How it works" section to each tool
- [ ] Clarify: "Pattern detection uses geometric algorithms"
- [ ] Clarify: "Signals combine RSI, MACD, and volume analysis"
- [ ] Clarify: "AI insights powered by Claude claude-sonnet-4-20250514"
- [ ] Add "Powered by Claude" badge where AI is actually used
- [ ] Remove "AI" from features that are pure formulas

---

**Sprint 3: SEO Overhaul** ⏳ PENDING
*Target: 90+ Lighthouse SEO score, proper indexing*

**Technical SEO:**
- [ ] Audit all meta titles (50-60 chars, keyword-rich)
- [ ] Audit all meta descriptions (150-160 chars, compelling)
- [ ] Fix duplicate title tags
- [ ] Fix missing H1 tags
- [ ] Ensure single H1 per page
- [ ] Fix heading hierarchy (H1 → H2 → H3, no skips)
- [ ] Add alt text to all images
- [ ] Compress all images (WebP where supported)
- [ ] Add width/height to prevent CLS

**Structured Data (JSON-LD):**
- [ ] Organization schema (homepage)
- [ ] WebSite schema with SearchAction
- [ ] Article schema (blog posts, learn articles)
- [ ] FAQPage schema (FAQ sections)
- [ ] Product schema (pricing tiers)
- [ ] BreadcrumbList schema (all pages)
- [ ] Review/Rating schema (testimonials)

**Indexing & Crawling:**
- [ ] Submit sitemap.xml to Google Search Console
- [ ] Submit sitemap.xml to Bing Webmaster Tools
- [ ] Verify robots.txt allows critical paths
- [ ] Block admin/dev pages in robots.txt
- [ ] Add canonical URLs to all pages
- [ ] Fix any orphan pages (no internal links)
- [ ] Add internal linking strategy (related content)

**robots.txt Updates:**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /.netlify/
Disallow: /recover/
Sitemap: https://btcsignal.ai/sitemap.xml
```

**Performance SEO:**
- [ ] Core Web Vitals: LCP < 2.5s
- [ ] Core Web Vitals: FID < 100ms
- [ ] Core Web Vitals: CLS < 0.1
- [ ] Enable text compression (gzip/brotli)
- [ ] Set proper cache headers

---

**Sprint 4: Accessibility Lockdown (WCAG 2.1 AA)** ⏳ PENDING
*Target: Zero violations, 100% keyboard navigable*

**Critical Fixes:**
- [ ] Remove ALL `outline: none` (use focus-visible instead)
- [ ] Fix all color contrast violations (4.5:1 minimum)
- [ ] Add skip-to-content link
- [ ] Ensure all interactive elements are focusable
- [ ] Fix tab order (remove hardcoded tabindex)
- [ ] Add focus trap to modals
- [ ] Ensure modals close on Escape key

**ARIA Improvements:**
- [ ] Add `aria-label` to icon-only buttons
- [ ] Add `aria-expanded` to dropdown toggles
- [ ] Add `aria-live` regions for dynamic content
- [ ] Add `role="alert"` to error messages
- [ ] Add `aria-describedby` for form validation
- [ ] Add landmark roles (main, nav, aside, footer)
- [ ] Add `aria-current="page"` to active nav items

**Form Accessibility:**
- [ ] Associate all labels with inputs (`for`/`id`)
- [ ] Add error messages linked to inputs
- [ ] Mark required fields with `aria-required`
- [ ] Add input validation feedback
- [ ] Ensure form errors are announced

**Replace Browser Dialogs:**
- [ ] Replace `alert()` with accessible toast component
- [ ] Replace `confirm()` with accessible modal
- [ ] Replace `prompt()` with accessible input modal
- [ ] Ensure all custom dialogs trap focus
- [ ] Ensure all custom dialogs have close buttons

**Testing:**
- [ ] Test with VoiceOver (macOS)
- [ ] Test with NVDA (Windows)
- [ ] Test keyboard-only navigation
- [ ] Run axe-core automated tests
- [ ] Run WAVE automated tests
- [ ] Add a11y tests to CI pipeline

---

**Sprint 5: CSS Cleanup & Optimization** ⏳ PENDING
*Target: Zero unused CSS, consistent design tokens*

**Variable Audit:**
- [ ] Fix `--btc-orange` → `--bitcoin-orange` (2 locations)
- [ ] Audit all color variables for consistency
- [ ] Remove duplicate variable definitions
- [ ] Document all design tokens
- [ ] Ensure dark/light mode coverage for all variables

**Typography:**
- [ ] Add missing `h5` styles
- [ ] Audit font-size scale (consistent ratios)
- [ ] Ensure responsive font sizes
- [ ] Check line-height accessibility (1.5+ for body)
- [ ] Audit font-weight usage

**Cleanup:**
- [ ] Remove unused CSS classes (PurgeCSS audit)
- [ ] Remove duplicate selectors
- [ ] Consolidate media queries
- [ ] Remove `!important` where possible
- [ ] Fix specificity issues
- [ ] Remove vendor prefixes handled by autoprefixer

**Organization:**
- [ ] Ensure BEM or consistent naming convention
- [ ] Split large SCSS files (>500 lines)
- [ ] Document component styles
- [ ] Create style guide page (internal)

---

**Sprint 6: PageSpeed Optimization** ⏳ PENDING
*Target: 90+ Lighthouse Performance score (mobile & desktop)*

**JavaScript:**
- [ ] Remove/guard all console.log statements
- [ ] Enable code splitting (lazy load non-critical JS)
- [ ] Defer non-critical scripts
- [ ] Minify all JavaScript
- [ ] Tree-shake unused code
- [ ] Audit bundle size (target: <200KB gzipped)

**CSS:**
- [ ] Inline critical CSS
- [ ] Defer non-critical CSS
- [ ] Minify all CSS
- [ ] Remove unused CSS (PurgeCSS)
- [ ] Audit CSS bundle size

**Images:**
- [ ] Convert to WebP format
- [ ] Add responsive srcset
- [ ] Lazy load below-fold images
- [ ] Add width/height attributes (prevent CLS)
- [ ] Compress all images (85% quality)
- [ ] Use CDN for image delivery

**Fonts:**
- [ ] Subset fonts (only used characters)
- [ ] Use `font-display: swap`
- [ ] Preload critical fonts
- [ ] Self-host fonts (no Google Fonts latency)

**Caching:**
- [ ] Set long cache TTL for static assets
- [ ] Use content hashing for cache busting
- [ ] Configure Netlify edge caching
- [ ] Add service worker for offline support (optional)

**Monitoring:**
- [ ] Set up Lighthouse CI
- [ ] Block deploys below 90 score
- [ ] Add Web Vitals tracking (real user metrics)

---

**Sprint 7: Redirects & URL Hygiene** ⏳ PENDING
*Target: Zero 404s, clean URL structure*

**Redirect Rules (_redirects or netlify.toml):**
- [ ] Audit all existing redirects
- [ ] Add redirects for old/changed URLs
- [ ] Redirect non-www to www (or vice versa)
- [ ] Redirect HTTP to HTTPS
- [ ] Handle trailing slash consistency
- [ ] Add 404 → custom 404 page

**URL Fixes:**
- [ ] Fix `/pro-tools/dashboard/` → `/dashboard/` (or update links)
- [ ] Audit all internal links for broken URLs
- [ ] Fix any orphan pages
- [ ] Ensure consistent URL casing (lowercase)
- [ ] Remove URL parameters from canonical URLs

**404 Page:**
- [ ] Create custom 404 page
- [ ] Add search functionality
- [ ] Add popular links
- [ ] Add "Report broken link" option
- [ ] Track 404 hits for fixing

---

**Sprint 8: Robots.txt & Security Headers** ⏳ PENDING
*Target: Secure, properly crawled, no leaks*

**robots.txt:**
```
User-agent: *
Allow: /
Allow: /learn/
Allow: /posts/
Allow: /pricing/
Allow: /faq/

Disallow: /admin/
Disallow: /api/
Disallow: /.netlify/
Disallow: /recover/
Disallow: /embed/
Disallow: /*?*

# Crawl-delay for polite bots
Crawl-delay: 1

Sitemap: https://btcsignal.ai/sitemap.xml
```

**Security Headers (netlify.toml):**
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.coingecko.com https://api.binance.com"
```

**Additional Security:**
- [ ] Enable HSTS (Strict-Transport-Security)
- [ ] Review CSP for all external resources
- [ ] Add Subresource Integrity (SRI) for CDN scripts
- [ ] Audit for exposed secrets in source
- [ ] Review API key exposure in client-side code

---

**Success Criteria:**

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | ~60% | 98%+ |
| Lighthouse Performance | ~70 | 90+ |
| Lighthouse Accessibility | ~80 | 100 |
| Lighthouse SEO | ~85 | 100 |
| Lighthouse Best Practices | ~85 | 100 |
| WCAG Violations | 3 critical | 0 |
| Console Errors (prod) | 30+ logs | 0 |
| Broken Links | Unknown | 0 |
| 404 Rate | Unknown | <0.1% |

**Quality Gates (CI/CD):**
- [ ] Test coverage ≥98% or build fails
- [ ] Lighthouse Performance ≥90 or build fails
- [ ] Lighthouse Accessibility =100 or build fails
- [ ] Zero axe-core violations or build fails
- [ ] Zero console.log in production bundle
- [ ] Bundle size <200KB gzipped or warning

**Positioning After Phase 12:**
> "Enterprise-grade quality. 98% test coverage. Perfect accessibility. Sub-2-second loads. We don't ship broken software."

---

### Phase 13: Learn Hub Content Expansion (+15%)
*Goal: Expand educational content library by 15%, improve SEO footprint, establish authority*
*Priority: Medium (content marketing for organic growth)*
*Current: 7 articles → Target: 15+ articles*

**Why Content Expansion:**
- SEO long-tail traffic (each article = ranking opportunity)
- Establishes expertise and trust
- Reduces support questions (self-serve education)
- Converts readers to paid users
- Differentiates from competitors (they don't educate)

**Current Learn Articles (7):**
1. What is SFP (Swing Failure Pattern)
2. What is a liquidity grab
3. Market structure basics
4. Order block explanation
5. Fair value gap guide
6. RSI divergence guide
7. Support & resistance guide

---

**Sprint 1: Bitcoin Fundamentals (Fits Brand)** ⏳ PENDING
- [ ] **Lightning Network Explained** - How instant BTC payments work (ties to your payment system)
- [ ] **What is Nostr?** - Decentralized identity for Bitcoiners (ties to Phase 11 auth)
- [ ] **Bitcoin Halving Cycles** - Historical impact on price, next halving prep
- [ ] **On-Chain Metrics 101** - MVRV, SOPR, NVT explained simply

**Sprint 2: Trading Mechanics** ⏳ PENDING
- [ ] **Funding Rates Explained** - What they are, why they matter, how to read them
- [ ] **Liquidation Mechanics** - How leveraged positions get liquidated, cascade effects
- [ ] **Open Interest Analysis** - Reading OI for market sentiment
- [ ] **Long/Short Ratios** - What they tell you (and what they don't)

**Sprint 3: Technical Analysis Depth** ⏳ PENDING
- [ ] **MACD Deep Dive** - Beyond basics, divergences, histogram reading
- [ ] **Bollinger Bands Strategy** - Squeeze setups, mean reversion
- [ ] **Volume Profile Trading** - POC, value areas, volume nodes
- [ ] **EMA vs SMA** - When to use each, crossover strategies

**Sprint 4: Risk & Psychology** ⏳ PENDING
- [ ] **Position Sizing Guide** - Kelly criterion, fixed fractional, risk per trade
- [ ] **Risk/Reward Ratios** - Why 2R+ matters, calculating expectancy
- [ ] **Trading Psychology** - FOMO, revenge trading, discipline
- [ ] **Drawdown Management** - Surviving losing streaks, when to stop

**Sprint 5: Platform Guides** ⏳ PENDING
- [ ] **How to Read the Liquidation Map** - Your tool, explained
- [ ] **Using the Pattern Scanner** - Getting the most from pattern detection
- [ ] **Backtester Pro Tutorial** - Writing strategies in natural language
- [ ] **Trade Coach Best Practices** - How to get useful AI feedback

---

**Content Standards:**

**Structure (every article):**
```markdown
# [Title]

## TL;DR
[3-bullet summary for skimmers]

## What is [Topic]?
[Simple explanation, no jargon]

## Why It Matters for Bitcoin Trading
[Practical application]

## How to Use It
[Step-by-step or examples]

## Common Mistakes
[What to avoid]

## Key Takeaways
[Bullet summary]

## Related Articles
[Internal links to other learn content]
```

**SEO Requirements:**
- [ ] Target keyword in title, H1, first paragraph
- [ ] Meta description with keyword (150-160 chars)
- [ ] Alt text on all images
- [ ] Internal links to related articles (3+ per article)
- [ ] External links to authoritative sources (1-2 per article)
- [ ] FAQ schema for question-based articles
- [ ] 1,500-2,500 words per article

**Quality Requirements:**
- [ ] No AI slop - Claude assists, human reviews
- [ ] Accurate technical information (verify formulas)
- [ ] Bitcoin-only examples (no altcoin references)
- [ ] Consistent voice and tone
- [ ] Mobile-readable (short paragraphs, clear headings)

---

**Content Calendar:**

| Week | Articles | Sprint |
|------|----------|--------|
| 1 | Lightning Network, Nostr | Sprint 1 |
| 2 | Halving Cycles, On-Chain Metrics | Sprint 1 |
| 3 | Funding Rates, Liquidations | Sprint 2 |
| 4 | Open Interest, Long/Short | Sprint 2 |
| 5 | MACD, Bollinger Bands | Sprint 3 |
| 6 | Volume Profile, EMA vs SMA | Sprint 3 |
| 7 | Position Sizing, R/R Ratios | Sprint 4 |
| 8 | Psychology, Drawdowns | Sprint 4 |
| 9 | Platform guides (4 articles) | Sprint 5 |

---

**Keyword Targets:**

| Article | Primary Keyword | Monthly Search |
|---------|-----------------|----------------|
| Lightning Network Explained | "lightning network bitcoin" | 8,100 |
| What is Nostr | "nostr explained" | 2,400 |
| Bitcoin Halving | "bitcoin halving" | 90,500 |
| Funding Rates | "crypto funding rates" | 4,400 |
| Liquidation Mechanics | "crypto liquidation" | 6,600 |
| MACD Trading | "macd trading strategy" | 12,100 |
| Position Sizing | "position sizing trading" | 3,600 |
| Trading Psychology | "trading psychology" | 9,900 |

---

**Internal Linking Strategy:**

```
Homepage
    └── Learn Hub (/learn/)
            ├── Fundamentals
            │   ├── Lightning Network → links to Pricing (pay with LN)
            │   ├── Nostr → links to Login/Auth
            │   ├── Halving → links to Dashboard (halving countdown)
            │   └── On-Chain → links to Alpha Radar
            │
            ├── Trading Mechanics
            │   ├── Funding Rates → links to Dashboard (funding display)
            │   ├── Liquidations → links to Liquidation Map
            │   ├── Open Interest → links to Alpha Radar
            │   └── Long/Short → links to Dashboard
            │
            ├── Technical Analysis
            │   ├── MACD → links to Pattern Scanner
            │   ├── Bollinger → links to Backtester (BB strategy)
            │   ├── Volume Profile → links to Pattern Scanner
            │   └── EMA/SMA → links to Backtester (EMA cross)
            │
            ├── Risk Management
            │   ├── Position Sizing → links to Trade Coach
            │   ├── R/R Ratios → links to Trade Coach
            │   ├── Psychology → links to Trade Coach
            │   └── Drawdowns → links to Backtester (max DD stat)
            │
            └── Platform Guides
                ├── Liquidation Map Guide → links to tool
                ├── Pattern Scanner Guide → links to tool
                ├── Backtester Guide → links to tool
                └── Trade Coach Guide → links to tool
```

---

**Success Criteria:**

| Metric | Current | Target |
|--------|---------|--------|
| Total Articles | 7 | 20+ |
| Organic Traffic | ? | +50% in 90 days |
| Avg Time on Page | ? | >3 minutes |
| Internal Links/Article | ~1 | 5+ |
| Articles Ranking Page 1 | ? | 5+ |

**Content Quality Gates:**
- [ ] Every article reviewed for accuracy
- [ ] Every article has 5+ internal links
- [ ] Every article has proper schema markup
- [ ] Every article scores 90+ on Yoast/RankMath SEO
- [ ] No duplicate content (check with Copyscape)

**Positioning After Phase 13:**
> "The Bitcoin trading education hub. Free guides that actually teach. No upsells, no fluff, just signal."

---

### Phase 14: Scale & Professionalize
*Goal: Invest in professional design, infrastructure, and mobile app*
*Priority: After product-market fit signals (paying users, positive feedback)*
*Prerequisite: Phases 10-13 complete, revenue covering costs*

**Why Wait Until Now:**
- Don't polish a broken product (Phase 10 fixes that)
- Don't pay for infra you don't need yet (free tiers are fine)
- Don't build mobile until web is proven
- Invest when you have traction, not hope

---

**Sprint 1: Professional Design (Figma → Production)** ⏳ PENDING
*Investment: Designer hourly rate*

**Designer Handoff Prep:**
- [ ] Document all existing components (buttons, cards, forms, modals)
- [ ] Export current color palette and typography
- [ ] List all pages/screens needing design
- [ ] Identify highest-impact pages (homepage, pricing, dashboard)
- [ ] Create design brief with brand guidelines

**Figma Deliverables to Request:**
- [ ] Design system (colors, typography, spacing, components)
- [ ] Homepage redesign
- [ ] Pricing page redesign
- [ ] Pro Tools dashboard redesign
- [ ] Mobile responsive variants (320px, 768px, 1024px+)
- [ ] Dark/light mode variants
- [ ] Loading states and micro-interactions
- [ ] Empty states and error states
- [ ] Icon set (consistent style)

**Implementation Workflow:**
- [ ] Designer delivers Figma → Dev inspects with Figma Dev Mode
- [ ] Extract CSS variables (colors, spacing, fonts)
- [ ] Build/update component library
- [ ] Implement page-by-page
- [ ] Designer reviews implementation
- [ ] Iterate until pixel-perfect

---

**Sprint 2: Netlify Pro Upgrade** ⏳ PENDING
*Investment: ~$19/month (Pro) or ~$99/month (Business)*

**Free Tier Limitations Hit:**
- [ ] Build minutes exceeded (300/month free)
- [ ] Bandwidth exceeded (100GB/month free)
- [ ] Serverless function limits (125k/month free)
- [ ] Need team collaboration features
- [ ] Need analytics beyond basic

**Pro Features to Enable:**
- [ ] Increased build minutes (25,000/month)
- [ ] Background functions (up to 15 min runtime)
- [ ] Analytics Pro (real user metrics)
- [ ] Forms Pro (if using Netlify Forms)
- [ ] Password-protected previews
- [ ] Build plugins (cache optimization)

**Business Features (if needed):**
- [ ] SAML SSO (if team grows)
- [ ] Audit logs
- [ ] 99.99% SLA
- [ ] Priority support

**Optimization After Upgrade:**
- [ ] Enable build caching (faster deploys)
- [ ] Set up deploy previews for PRs
- [ ] Configure branch deploys (staging environment)
- [ ] Set up Netlify Analytics dashboard
- [ ] Monitor function usage and optimize

---

**Sprint 3: Twitter/X Premium** ⏳ PENDING
*Investment: ~$8/month (Basic) or ~$16/month (Premium) or ~$1000/month (Verified Org)*

**Why Premium:**
- [ ] Blue checkmark (credibility for financial product)
- [ ] Longer posts (4,000 chars vs 280)
- [ ] Edit tweets (fix typos in signal posts)
- [ ] Bookmark folders (organize research)
- [ ] Higher reply ranking (visibility)
- [ ] Media Studio access (schedule posts)

**Twitter/X Strategy:**
- [ ] Automate daily signal posts (@BTCSignal_ai)
- [ ] Thread breakdowns of market analysis
- [ ] Educational content from Learn Hub
- [ ] Engage with Bitcoin Twitter community
- [ ] Reply to relevant BTC discussions
- [ ] Avoid shilling - provide value first

**API Access (if automating):**
- [ ] Basic API ($100/month) - 10k tweets/month read, 1.5k posts
- [ ] Pro API ($5,000/month) - only if heavy automation needed
- [ ] Use free tier first, upgrade when limited

**Content Calendar:**
- [ ] Daily: Auto-post morning signal + key level
- [ ] 2x/week: Educational thread (from Learn Hub)
- [ ] Weekly: Market recap + accuracy report
- [ ] As needed: Breaking market moves

---

**Sprint 4: Paid API Access** ⏳ PENDING
*Investment: Varies by provider*

**Current Free Tier Limits:**

| API | Free Limit | Paid Tier | When to Upgrade |
|-----|------------|-----------|-----------------|
| CoinGecko | 30 calls/min | $129/mo (Analyst) | When rate limited |
| Binance | 1200/min | VIP tiers | Probably never need |
| Bybit | 120/min | VIP tiers | Probably never need |
| Mempool.space | Unlimited | Donate | Support the project |
| Alternative.me | Unlimited | N/A | Free forever |

**CoinGecko Pro Benefits:**
- [ ] Higher rate limits (500 calls/min)
- [ ] Historical data access
- [ ] DEX data (not needed - BTC only)
- [ ] Priority support
- [ ] No attribution required

**When to Upgrade:**
- [ ] Monitor 429 (rate limit) errors in logs
- [ ] If >10% of requests fail, upgrade
- [ ] Start with CoinGecko (most used)
- [ ] Binance/Bybit free tiers are generous

**Caching Strategy (Delay Upgrade):**
- [ ] Cache responses aggressively (5-15 min TTL)
- [ ] Deduplicate API calls across users
- [ ] Use WebSocket where available (Binance)
- [ ] Stagger refresh times (not all at :00)

---

**Sprint 5: Build Time Optimization** ⏳ PENDING
*Goal: <2 min builds (currently ~5 min?)*

**Hugo Optimizations:**
- [ ] Enable Hugo caching (`--cacheDir`)
- [ ] Use `hugo --gc` to clean unused cache
- [ ] Minimize template complexity
- [ ] Lazy load images (don't process at build)
- [ ] Split large content sections

**Netlify Build Optimizations:**
- [ ] Enable build caching plugin
- [ ] Cache node_modules between builds
- [ ] Cache Hugo resources folder
- [ ] Use `npm ci` instead of `npm install`
- [ ] Skip unnecessary build steps in preview

**CI/CD Optimizations:**
- [ ] Run tests in parallel
- [ ] Only run affected tests on PR
- [ ] Cache test fixtures
- [ ] Skip visual tests on draft PRs
- [ ] Use Turborepo/nx if monorepo grows

**Monitoring:**
- [ ] Track build times over time
- [ ] Alert if build exceeds 5 minutes
- [ ] Review Netlify build logs for bottlenecks

---

**Sprint 6: React Native Migration** ⏳ PENDING
*Investment: Time + Apple Developer ($99/year) + Google Play ($25 one-time)*
*Timeline: 2-3 months for MVP*

**Why React Native:**
- Single codebase for iOS + Android
- Can share logic with web (if refactor web to React)
- Large ecosystem (libraries, talent)
- Expo for faster development
- OTA updates (bypass app store for fixes)

**Migration Strategy:**

**Option A: Full Rewrite (Recommended)**
```
Current: Hugo (static) + Netlify Functions
    ↓
New Web: Next.js + React (SSR/SSG)
    ↓
Mobile: React Native (shared components)
```

**Option B: Mobile-Only Native**
```
Keep: Hugo + Netlify (web)
Add: React Native app (separate codebase)
Share: API layer only
```

**Recommended: Option A** - More work upfront, but unified codebase.

**Phase 1: Web Refactor (Next.js)**
- [ ] Set up Next.js project
- [ ] Migrate static pages (Hugo → Next.js SSG)
- [ ] Migrate dynamic pages (Hugo JS → React components)
- [ ] Keep Netlify Functions (or migrate to Next.js API routes)
- [ ] Ensure parity with Hugo site
- [ ] Redirect old URLs

**Phase 2: Shared Component Library**
- [ ] Extract UI components (buttons, cards, charts)
- [ ] Create shared design tokens (colors, spacing)
- [ ] Build shared hooks (useAuth, useMarketData)
- [ ] Publish as internal package or monorepo

**Phase 3: React Native App**
- [ ] Initialize with Expo
- [ ] Implement auth flow (Nostr signing)
- [ ] Implement core screens:
  - Dashboard (market overview)
  - Liquidation Map
  - Price Alerts (push notifications)
  - Pattern Scanner
  - Trade Coach
- [ ] Platform-specific: Push notifications, biometrics, widgets

**Phase 4: App Store Submission**
- [ ] Apple Developer account ($99/year)
- [ ] Google Play Developer account ($25)
- [ ] App Store screenshots and metadata
- [ ] Privacy policy (required)
- [ ] App review compliance (no "financial advice" claims)
- [ ] TestFlight beta testing
- [ ] Submit and iterate on review feedback

**React Native Tech Stack:**
- [ ] Expo (managed workflow)
- [ ] React Navigation (routing)
- [ ] Zustand or Jotai (state management)
- [ ] React Query (data fetching)
- [ ] NativeWind (Tailwind for RN) or styled-components
- [ ] react-native-svg (charts)
- [ ] expo-notifications (push)
- [ ] expo-secure-store (Nostr keys)

---

**Investment Summary:**

| Item | Monthly Cost | One-Time Cost |
|------|--------------|---------------|
| Designer | $500-2000 (project) | - |
| Netlify Pro | $19 | - |
| Twitter Premium | $16 | - |
| CoinGecko Pro | $129 | - |
| Apple Developer | $8.25 | - |
| Google Play | - | $25 |
| **Total (ongoing)** | **~$172/month** | **$25** |

*Break-even: 4 yearly subscribers at 400k sats ($160) covers infra*

---

**Success Criteria:**

| Metric | Target |
|--------|--------|
| Design system documented | 100% of components |
| Build time | <2 minutes |
| API error rate | <1% (429s) |
| Mobile app | Published on both stores |
| App rating | 4.5+ stars |
| Mobile DAU | 100+ within 30 days of launch |

**Positioning After Phase 14:**
> "Professional-grade Bitcoin intelligence. Web + mobile. Designed for traders, built for scale."

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
