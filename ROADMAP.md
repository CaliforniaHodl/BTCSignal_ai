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
- [ ] Add more content above the fold - page feels empty until Market Sentiment section
- [ ] Market Sentiment placement is fine, but needs more engaging content before it

**Analysis History (`/posts/`)**
- [ ] Fix empty table - Time, Sentiment, Confidence, Price, Change columns showing no data

**Learn Hub (`/learn/`)**
- [ ] Add emojis to posts that are missing them (some have emojis, some don't)

**Learn Posts (`/learn/:post`)**
- [ ] Redesign related posts cards - improve card design
- [ ] Match related posts card background with the current post theme

**Pro Tools Dashboard (`/pro-tools/dashboard/`)**
- [ ] Redesign to match Market Sentiment widget style from home page
- [ ] Add 3x more widgets (expand from current layout)

---

### Phase 5: Social & Community (PLANNED)
*Goal: Build community engagement and viral growth*

**Free Features:**
- [ ] Public Leaderboard - Top traders ranked by verified P&L
- [ ] Trade Ideas Feed - Community-submitted setups with upvotes
- [ ] Weekly Prediction Contest - Free entry, win sats prizes
- [ ] Comment System - Discuss analysis posts
- [ ] Share Cards - Beautiful social media images for trades

**Paid Features:**
- [ ] Copy Trading Signals - Follow top performers
- [ ] Private Discord/Telegram Integration - Alerts to your server
- [ ] Referral Program - Earn sats for inviting users
- [ ] Verified Trader Badge - Prove your track record

### Phase 6: Multi-Asset Expansion (PLANNED)
*Goal: Capture ETH and altcoin traders*

**Free Features:**
- [ ] ETH Signal AI - Same analysis for Ethereum
- [ ] Top 10 Altcoin Dashboard - Quick overview of majors
- [ ] BTC vs ETH Correlation Tracker
- [ ] Altcoin Season Indicator
- [ ] DeFi Yields Snapshot

**Paid Features:**
- [ ] Full Altcoin Analysis (ETH, SOL, etc.)
- [ ] Cross-Asset Pattern Detection
- [ ] Portfolio Correlation Matrix
- [ ] Multi-Asset Backtester
- [ ] Altcoin Liquidation Maps

### Phase 7: Advanced Analytics (PLANNED)
*Goal: Pro-level institutional features*

**Free Features:**
- [ ] Options Flow Preview - See unusual activity
- [ ] Whale Watch Feed - Large transactions
- [ ] Exchange Reserve Tracker
- [ ] Stablecoin Flow Indicator
- [ ] Mining Profitability Calculator

**Paid Features:**
- [ ] Full Options Flow Dashboard
- [ ] Smart Money Tracker - Follow whale wallets
- [ ] On-Chain Metrics Deep Dive
- [ ] Realized Cap / MVRV Analysis
- [ ] Exchange Netflow Alerts
- [ ] Miner Selling Pressure Index
- [ ] Long-Term Holder vs Short-Term Holder Ratio

### Phase 8: AI Trading Assistant (PLANNED)
*Goal: Conversational AI for trading*

**Free Features:**
- [ ] Ask AI - Simple questions about BTC
- [ ] Daily AI Market Brief (text-to-speech)
- [ ] AI Price Prediction (1 free/day)

**Paid Features:**
- [ ] Full AI Chat Assistant - "What should I do if BTC breaks $100k?"
- [ ] Voice Commands - Hands-free analysis
- [ ] Custom AI Personas - Aggressive vs Conservative advisor
- [ ] AI Trade Journal Analysis - Upload your trades, get feedback
- [ ] AI-Generated Trading Plans
- [ ] Natural Language Alerts - "Alert me when whales are selling"

### Phase 9: Automation & Integration (PLANNED)
*Goal: Connect to trading infrastructure*

**Free Features:**
- [ ] TradingView Webhook Receiver (limited)
- [ ] Public API (rate limited)
- [ ] Zapier Integration (basic triggers)

**Paid Features:**
- [ ] Full API Access - Build your own tools
- [ ] TradingView Strategy Alerts
- [ ] Exchange API Connection (read-only)
- [ ] Auto-Journal from Exchange History
- [ ] Webhook Alerts to Any Endpoint
- [ ] Google Sheets Integration
- [ ] Notion Integration

### Phase 10: Premium Ecosystem (PLANNED)
*Goal: Recurring revenue and retention*

**Subscription Tiers:**
- [ ] Monthly Plan - 50,000 sats/month (best value)
- [ ] Annual Plan - 500,000 sats/year (17% off)
- [ ] Lifetime Access - 2,000,000 sats (one-time)
- [ ] Stripe/Card Payments Option

**Premium Perks:**
- [ ] Early Access to New Features
- [ ] Priority AI Processing
- [ ] Custom Branding on Exports
- [ ] 1-on-1 Strategy Review (quarterly)
- [ ] Premium Discord Role
- [ ] Ad-Free Experience
- [ ] White-Label Embeds

**Enterprise Features:**
- [ ] Team Accounts
- [ ] Custom Data Feeds
- [ ] API SLA Guarantee
- [ ] Dedicated Support

---

## Future Considerations

### Mobile App (Phase 11+)
- [ ] React Native or PWA
- [ ] Push Notifications
- [ ] Widget for Home Screen
- [ ] Apple Watch / Wear OS alerts
- [ ] Offline Mode for saved analysis

### Content & SEO Expansion
- [ ] YouTube Integration - Auto-post analysis videos
- [ ] Podcast Feed - AI-narrated daily updates
- [ ] Guest Analysis - Invite traders to contribute
- [ ] Trading Courses - Monetized education
- [ ] Affiliate Partnerships - Exchange referrals

### Gamification
- [ ] Achievement Badges
- [ ] Streak Rewards - Daily login bonuses
- [ ] XP System - Level up your account
- [ ] Trading Challenges - Weekly competitions
- [ ] NFT Certificates for milestones

---

## Monetization Tiers (IMPLEMENTED)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Dashboard, delayed trades (10+ days old), 1 level/day, education hub |
| Single Post | 21 sats | Individual analysis posts |
| Hourly | 1,000 sats | 1 hour all-access |
| Daily | 10,000 sats | 24 hour all-access |
| Weekly | 25,000 sats | 7 day all-access |

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
