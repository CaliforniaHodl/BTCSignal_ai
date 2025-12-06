# BTCSignals Pro

Bitcoin trading signals and market analysis platform built with Hugo static site generator.

## Overview

BTCSignals Pro provides real-time Bitcoin market analysis, trading signals, and premium tools. The platform uses Lightning Network for micropayments, allowing users to access content starting at just 21 sats.

**Note:** Select premium features (Trade Coach, Chart Analysis) use Claude AI for enhanced analysis. Core signal generation uses traditional technical indicators and on-chain metrics.

**Live Site:** [btcsignal.ai](https://btcsignal.ai) (or your deployed URL)

---

## Tech Stack

- **Static Site Generator:** Hugo v0.91+
- **Styling:** SCSS (compiled to CSS)
- **JavaScript:** Vanilla JS (no frameworks)
- **Charts:** Chart.js
- **Payments:** Lightning Network (Bitcoin)
- **Hosting:** Netlify
- **Serverless Functions:** Netlify Functions (Node.js)
- **APIs:** CoinGecko, CoinGecko, Alternative.me, Blockchain.info

---

## Project Structure

```
bitcoin-twitter-bot/
├── assets/src/scss/          # SCSS source files
│   ├── shared/               # Shared variables, mixins, components
│   │   ├── _variables.scss   # Colors, spacing, typography (WCAG compliant)
│   │   ├── _mixins.scss      # Reusable SCSS mixins
│   │   ├── _common.scss      # Common styles
│   │   ├── _header.scss      # Header/navigation styles
│   │   ├── _footer.scss      # Footer styles
│   │   └── _buttons.scss     # Button styles
│   ├── index.scss            # Homepage styles
│   ├── posts.scss            # Posts list page
│   ├── dashboard.scss        # Premium dashboard
│   ├── pricing.scss          # Pricing page
│   ├── faq.scss              # FAQ page
│   └── ...
├── content/                  # Hugo content (Markdown)
├── layouts/                  # Hugo templates
├── static/src/               # Static assets
│   ├── css/                  # Compiled CSS (from SCSS)
│   └── js/                   # JavaScript files
├── netlify/functions/        # Serverless functions
└── public/                   # Built site output
```

---

## Pages & Features

### 1. Homepage (`/`)
**Layout:** `layouts/index.html`
**CSS:** `index.scss`
**JS:** `market-sentiment.js`

**Features:**
- Hero section with site title and tagline
- Live BTC price ticker (real-time from CoinGecko)
- Quick stat cards:
  - Current BTC price with 24h change
  - Fear & Greed Index
  - BTC Funding Rate
- Latest Analysis section (3 most recent posts as cards)
- Market Sentiment section:
  - Fear & Greed gauge with visual indicator
  - Funding rates display
  - Buy/Sell volume ratio
- Call-to-action buttons

---

### 2. Analysis History (`/posts/`)
**Layout:** `layouts/posts/list.html`
**CSS:** `posts.scss`

**Features:**
- Table listing all analysis posts
- Columns: Date, Time, Sentiment, Confidence, Price, Change, Action
- Sentiment badges (Bullish/Bearish/Neutral with colors)
- Confidence progress bars
- First 10 posts show "Unlock" button (paywalled)
- Older posts show "View" button (free preview)
- Responsive: hides some columns on mobile

---

### 3. Single Analysis Post (`/posts/[slug]/`)
**Layout:** `layouts/posts/single.html`
**CSS:** `posts.scss`, `_analysis-post.scss`
**JS:** `paywall.js`

**Features:**
- Full analysis content
- Price section with current price and change
- Prediction card (direction, confidence, targets)
- Technical indicators (RSI, MACD, Bollinger Bands)
- Pattern detection
- Key signals list
- Paywall overlay for locked content
- Lightning payment integration

**Frontmatter fields:**
```yaml
title: "BTC Analysis - Nov 29, 2024"
date: 2024-11-29T12:00:00Z
direction: "up"           # up, down, sideways
confidence: 75            # 0-100
price: 95234.50
priceChange: "+2.3%"
target: 98000
stopLoss: 93000
```

---

### 4. Premium Dashboard (`/dashboard/`)
**Layout:** `layouts/dashboard/single.html`
**CSS:** `dashboard.scss`
**JS:** `dashboard.js`, `dashboard-widgets.js`, `access-manager.js`

**Features:**
- Paywall gate (requires premium access or admin mode)
- Market Intelligence Grid (9 widgets):
  - Fear & Greed Index
  - BTC Funding Rate
  - Open Interest / 24h Volume
  - Buy/Sell Ratio
  - Long/Short Ratio
  - 24h Liquidations
  - RSI (14)
  - Volatility Index
  - BTC Dominance
- On-Chain & Macro Analysis:
  - Hashrate vs Price (with chart)
  - BTC vs S&P 500 Correlation (with chart)
- Signal Performance stats (wins, losses, win rate, streak)
- Advanced Metrics (R-Multiple, Drawdown, Bias)
- 90-Day Activity Calendar Heatmap
- Charts (Win/Loss History, Confidence vs Outcome)
- Liquidation Watchlist (long/short liquidation levels)
- Recent Calls Table

---

### 5. Pricing (`/pricing/`)
**Layout:** `layouts/pricing/single.html`
**CSS:** `pricing.scss`
**JS:** `pricing.js`

**Features:**
- Access status indicator
- Pricing tiers:
  - Single Post: 21 sats
  - Hourly Pass: 1,000 sats
  - Daily Pass: 10,000 sats
  - Weekly Pass: 25,000 sats
- Featured/popular badges
- Lightning payment modal
- QR code generation
- FAQ section
- Value propositions

---

### 6. FAQ (`/faq/`)
**Layout:** `layouts/faq/single.html`
**CSS:** `faq.scss`

**Features:**
- Important disclaimer banner (we don't trade for users)
- Sections:
  - About Our Service
  - Data & Methodology
  - Payments & Access
  - Risk & Responsibility
  - Technical & Support
- Expandable Q&A cards
- Bottom CTA

---

### 7. Pro Tools (Premium Features)

#### Alpha Radar (`/alpha-radar/`)
- Whale activity monitoring
- Market anomaly detection
- Liquidity zone identification

#### Liquidation Map (`/liquidation-map/`)
- Visual liquidation heatmap
- Long/short liquidation levels
- Price level analysis

#### Pattern Detector (`/pattern-detector/`)
- Chart pattern recognition
- Pattern confidence scores
- Historical pattern performance

#### Trade Coach (`/trade-coach/`)
- Trade analysis input
- Risk/reward calculation
- Position sizing suggestions

#### Portfolio Simulator (`/portfolio-simulator/`)
- Hypothetical portfolio tracking
- Performance simulation
- Strategy testing

#### Backtester Pro (`/backtester-pro/`)
- Historical strategy testing
- Performance metrics
- Drawdown analysis

---

### 8. Learn (`/learn/`)
**Layout:** `layouts/learn/single.html`
**CSS:** `learn.scss`

**Features:**
- Educational content about Bitcoin trading
- Technical analysis tutorials
- Trading terminology glossary

---

## Access Control System

**File:** `static/src/js/access-manager.js`

The `BTCSAIAccess` object manages premium access:

```javascript
// Enable admin mode (bypasses all paywalls)
BTCSAIAccess.enableAdmin()

// Disable admin mode
BTCSAIAccess.disableAdmin()

// Check access status
BTCSAIAccess.hasAllAccess()    // Has any time-based pass
BTCSAIAccess.isPostUnlocked(postId)  // Check single post
BTCSAIAccess.isAdmin()         // Check admin mode
```

**Admin Secret:** `satoshi2024` (stored in localStorage as `btcsai_admin`)

**Access Tiers:**
- `single` - Permanent access to one post
- `hourly` - 1 hour all-access
- `daily` - 24 hours all-access
- `weekly` - 7 days all-access

---

## SCSS Compilation

SCSS files must be compiled to CSS after changes:

```bash
# Compile individual files
sass assets/src/scss/shared/shared.scss static/src/css/shared.css --style=compressed --no-source-map
sass assets/src/scss/index.scss static/src/css/index.css --style=compressed --no-source-map
sass assets/src/scss/posts.scss static/src/css/posts.css --style=compressed --no-source-map
sass assets/src/scss/dashboard.scss static/src/css/dashboard.css --style=compressed --no-source-map
sass assets/src/scss/pricing.scss static/src/css/pricing.css --style=compressed --no-source-map
sass assets/src/scss/faq.scss static/src/css/faq.css --style=compressed --no-source-map

# Then build Hugo
hugo
```

---

## Page CSS/JS Loading

Each page specifies its CSS and JS in frontmatter:

```yaml
---
title: "Page Title"
css: ['pagename.scss']      # Loads from static/src/css/
js: ['pagename.js']         # Loads from static/src/js/
---
```

The base template loads `shared.css` globally plus any page-specific assets.

---

## API Data Sources

| Data | Source | Endpoint |
|------|--------|----------|
| BTC Price | CoinGecko | `api.coingecko.com/api/v3/ticker/24hr` |
| Price History | CoinGecko | `api.coingecko.com/api/v3/klines` |
| Fear & Greed | Alternative.me | `api.alternative.me/fng/` |
| BTC Dominance | CoinGecko | `api.coingecko.com/api/v3/global` |
| Hashrate | Blockchain.info | `api.blockchain.info/charts/hash-rate` |
| Trades | CoinGecko | `api.coingecko.com/api/v3/aggTrades` |

**Note:** CoinGecko Futures API (`fapi.coingecko.com`) has CORS restrictions. Dashboard widgets use regular CoinGecko API with estimates where needed.

---

## Color System (WCAG 2.1 AA Compliant)

**Dark Theme (default):**
- Background: `#0d1117`
- Card: `#161b22`
- Text Primary: `#e6edf3` (13.8:1 contrast)
- Text Secondary: `#8d96a0` (5.5:1 contrast)
- Bitcoin Orange: `#f7931a` (7.3:1 contrast)
- Green: `#3fb950` (6.5:1)
- Red: `#f85149` (5.2:1)

**Light Theme:**
- Background: `#f6f8fa`
- Card: `#ffffff`
- Text Primary: `#1f2328`
- Bitcoin Orange: `#9a6700`

Toggle with `[data-theme="light"]` on root element.

---

## Netlify Functions

Located in `netlify/functions/`:

- `newsletter-signup.js` - Handle email subscriptions
- `create-invoice.js` - Generate Lightning invoices
- `check-payment.js` - Verify Lightning payments
- `tweet-analysis.js` - Post analysis to Twitter

---

## Development Commands

```bash
# Start Hugo dev server
hugo server -D

# Build for production
hugo

# Compile all SCSS
# (run individual sass commands as shown above)
```

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Theme variables | `assets/src/scss/shared/_variables.scss` |
| Global mixins | `assets/src/scss/shared/_mixins.scss` |
| Header styles | `assets/src/scss/shared/_header.scss` |
| Footer styles | `assets/src/scss/shared/_footer.scss` |
| Access control | `static/src/js/access-manager.js` |
| Market data | `static/src/js/market-sentiment.js` |
| Dashboard widgets | `static/src/js/dashboard-widgets.js` |
| Base template | `layouts/_default/baseof.html` |
| Header partial | `layouts/partials/header.html` |
| Footer partial | `layouts/partials/footer.html` |

---

## Important Notes

1. **We do NOT trade for users** - This is an information service only
2. **Not financial advice** - All analysis is for educational purposes
3. **Lightning payments** - No accounts required, pay-per-use model
4. **Browser storage** - Access tracked in localStorage (clearing data resets access)
5. **SCSS must be compiled** - Changes to .scss files require recompilation
6. **Hugo Extended not required** - We use external Sass compiler

---

## License

Proprietary - All rights reserved.

