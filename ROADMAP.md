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

### Phase 8: Comprehensive Test Suite with Cypress
*Goal: TDD the entire project with end-to-end and integration tests*
*Priority: High (ensures stability before new features)*
*No new features - testing existing functionality only*

**The Problem:**
- No automated tests exist
- Manual testing is time-consuming and error-prone
- Regressions can slip through unnoticed
- Refactoring is risky without test coverage
- No confidence in deployment stability

**Sprint 1: Cypress Setup & Core Infrastructure**
- [ ] Install Cypress and configure for Hugo/Netlify stack
- [ ] Set up `cypress.config.js` with base URL and environment variables
- [ ] Create custom commands for common actions (login, check access, etc.)
- [ ] Set up fixtures for mock data (prices, predictions, access records)
- [ ] Configure GitHub Actions for CI test runs
- [ ] Add npm scripts: `test`, `test:open`, `test:ci`

**Sprint 2: Critical User Flow Tests (E2E)**
- [ ] **Homepage tests**
  - [ ] Page loads with all sections visible
  - [ ] BTC price ticker updates
  - [ ] Market sentiment widgets display data
  - [ ] Navigation links work correctly
  - [ ] Mobile responsive layout

- [ ] **Pricing page tests**
  - [ ] All pricing tiers display correctly
  - [ ] Purchase buttons trigger payment modal
  - [ ] Payment modal shows QR code
  - [ ] Copy invoice button works
  - [ ] Access status updates after mock payment

- [ ] **Recovery flow tests**
  - [ ] /recover/ page loads
  - [ ] Valid recovery code restores access
  - [ ] Invalid code shows error message
  - [ ] Payment hash recovery works
  - [ ] Rate limiting works (after 10 attempts)

- [ ] **Premium access tests**
  - [ ] Locked content shows paywall
  - [ ] Unlocked content displays after access granted
  - [ ] Session validation kicks off shared codes
  - [ ] Access expiry handled correctly

**Sprint 3: Pro Tools Page Tests**
- [ ] **Dashboard tests**
  - [ ] All widgets load and display data
  - [ ] Charts render correctly
  - [ ] Tooltips appear on hover
  - [ ] Data refreshes on interval

- [ ] **Alpha Radar tests**
  - [ ] Market overview cards display
  - [ ] Whale activity section works
  - [ ] Fear & Greed meter renders

- [ ] **Liquidity Hunter tests**
  - [ ] Premium gate shows for non-subscribers
  - [ ] Predictions load after access granted
  - [ ] Probability meters animate
  - [ ] Refresh button updates data

- [ ] **Pattern Detector tests**
  - [ ] Chart renders with price data
  - [ ] Timeframe buttons switch views
  - [ ] Patterns are detected and displayed

- [ ] **Trade Coach tests**
  - [ ] Form inputs work correctly
  - [ ] AI evaluation returns results
  - [ ] Score breakdown displays

- [ ] **Portfolio Simulator tests**
  - [ ] Strategy presets load
  - [ ] Custom strategy builder works
  - [ ] Equity curve renders
  - [ ] Stats calculate correctly

- [ ] **Backtester Pro tests**
  - [ ] Strategy input accepts text
  - [ ] Backtest runs and shows results
  - [ ] Trade log displays

**Sprint 4: Netlify Functions API Tests**
- [ ] **create-invoice.ts**
  - [ ] Returns valid invoice for each tier
  - [ ] Rejects invalid tier/amount combinations
  - [ ] Returns QR code URL

- [ ] **check-payment.ts**
  - [ ] Returns paid status correctly
  - [ ] Handles missing payment hash

- [ ] **store-access.ts**
  - [ ] Generates unique recovery codes
  - [ ] Generates session tokens
  - [ ] Stores record in GitHub

- [ ] **recover-access.ts**
  - [ ] Validates recovery codes
  - [ ] Validates payment hashes
  - [ ] Generates new session token (kicks old device)
  - [ ] Rate limits requests

- [ ] **validate-session.ts**
  - [ ] Returns valid for matching session
  - [ ] Returns kicked for mismatched session
  - [ ] Handles expired access

- [ ] **liquidity-prediction.ts**
  - [ ] Returns prediction JSON
  - [ ] Falls back gracefully on API errors

- [ ] **Market data functions**
  - [ ] fetch-market-data.ts returns valid data
  - [ ] fetch-onchain-data.ts returns valid data
  - [ ] whale-tracker.ts processes alerts

**Sprint 5: Access Manager & Utilities Tests**
- [ ] **access-manager.js unit tests**
  - [ ] setAccess/getAccess work correctly
  - [ ] Token verification detects tampering
  - [ ] Tier durations calculate correctly
  - [ ] Recovery code storage works
  - [ ] Session token validation works
  - [ ] Admin mode bypasses checks

- [ ] **shared.js utility tests**
  - [ ] formatPrice formats correctly
  - [ ] fetchBTCPrice returns number
  - [ ] Toast notifications display

- [ ] **pricing.js tests**
  - [ ] Payment flow initiates correctly
  - [ ] Recovery modal displays code
  - [ ] Session token stored after purchase

**Sprint 6: Visual & Regression Tests**
- [ ] Set up Percy or Cypress visual testing
- [ ] Capture baseline screenshots for all pages
- [ ] Test dark/light theme switching
- [ ] Test mobile viewport layouts
- [ ] Test loading/error states

**Test File Structure:**
```
cypress/
├── e2e/
│   ├── homepage.cy.js
│   ├── pricing.cy.js
│   ├── recovery.cy.js
│   ├── dashboard.cy.js
│   ├── alpha-radar.cy.js
│   ├── liquidity-hunter.cy.js
│   ├── pattern-detector.cy.js
│   ├── trade-coach.cy.js
│   ├── portfolio-simulator.cy.js
│   └── backtester-pro.cy.js
├── api/
│   ├── create-invoice.cy.js
│   ├── check-payment.cy.js
│   ├── store-access.cy.js
│   ├── recover-access.cy.js
│   └── validate-session.cy.js
├── unit/
│   ├── access-manager.cy.js
│   └── shared.cy.js
├── fixtures/
│   ├── prices.json
│   ├── predictions.json
│   ├── access-records.json
│   └── market-data.json
├── support/
│   ├── commands.js
│   └── e2e.js
└── cypress.config.js
```

**Custom Commands:**
```javascript
// Grant premium access for testing
cy.grantAccess(tier, duration)

// Clear all access
cy.clearAccess()

// Mock API responses
cy.mockMarketData()
cy.mockPaymentSuccess()

// Check premium content visibility
cy.shouldShowPaywall()
cy.shouldShowContent()
```

**Success Criteria:**
- [ ] 80%+ code coverage on critical paths
- [ ] All E2E tests pass in CI
- [ ] Tests run in under 5 minutes
- [ ] Visual regression baseline established
- [ ] No flaky tests (retry logic implemented)
- [ ] Documentation for running tests locally

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
