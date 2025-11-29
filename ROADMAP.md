# BTCSignal.ai Feature Roadmap

## FREE Features (Designed to Hook Users)

### 1. Market Overview Dashboard
- [ ] Live BTC price ticker
- [ ] Fear & Greed index integration
- [ ] Funding rates display
- [ ] Liquidation heatmap thumbnails
- [ ] Volume profile snapshot

*Simple data → huge perceived value*

### 2. Automatically Generated Summaries
- [ ] AI-powered daily summary
  - Market bias: Bullish / Neutral / Bearish
  - Key levels for the day
  - Quick recap of yesterday's movement

### 3. Pattern Auto-Detection Preview
- [ ] Show first chart labeled with:
  - Support/resistance
  - Trendlines
  - Triangle / wedge / channel
- [ ] Paywall gate: "Full pattern analysis is premium"

### 4. Backtest Mini-Snippets
- [ ] Example teasers:
  - Win rate of "EMA cross on BTC H1" last 6 months
  - RSI divergences accuracy
  - VWAP bounce probability
- [ ] More robust versions behind paywall

### 5. BTC Narrative Tracker
- [ ] Auto-track:
  - ETF flows
  - Halving countdown
  - Hash rate
  - Miner earnings

### 6. Public Trade Log (Delayed)
- [ ] Show only trades older than 10 days
- [ ] Paid members get real-time access

### 7. "Key Level of the Day" Widget
- [ ] One level only, updated daily
- [ ] Embeddable widget

### 8. Education Hub
- [ ] What is SFP (Swing Failure Pattern)
- [ ] What is a liquidity grab
- [ ] Market structure basics
- [ ] Order block explanation
- [ ] Fair value gap guide

*SEO juice for your website*

---

## PAID Features (The Real Money-Makers)

### 1. AI-Driven Trade Ideas (with Reasoning)
- [ ] Every signal includes:
  - Direction
  - Entry price
  - Stop loss
  - Target price
  - Why the AI model thinks this setup works
  - Probability score
  - Time-to-invalidity

### 2. Unlimited AI Chart Analysis
- [ ] User uploads TradingView screenshot
- [ ] AI returns:
  - All key levels
  - Trend direction
  - Hidden liquidity zones
  - Breaker blocks
  - Volume imbalance
  - Fair value gaps
  - Risk-to-reward estimates

*This alone sells subscriptions*

### 3. Liquidation Map (Interactive)
- [ ] Real-time zoomable heatmap with:
  - High leverage liquidation pockets
  - Delta changes
  - Sweep prediction
  - "Most likely price magnet"

### 4. Full Trade Tracker + Metrics
- [ ] Users get:
  - Win/loss rate
  - Average R multiple
  - Long vs short bias
  - Worst drawdown
  - Calendar heatmap of profits

*Gives your site a "Trading Journal SaaS" vibe*

### 5. Backtester PRO
- [ ] AI expands user-specified strategy
- [ ] Example: "Backtest: 1H RSI < 30 + SFP on liquidity"
- [ ] Full report includes:
  - Equity curve
  - Sharpe ratio
  - Trade-by-trade log
  - Max drawdown
  - Win rate by market condition

### 6. Premium Newsletter
- [ ] Sent daily/weekly:
  - What happened
  - Why it matters
  - What levels matter next
- [ ] Optional "summary for busy traders"

### 7. Portfolio Simulator
- [ ] Users can simulate:
  - "If I longed every bullish breakout this month..."
  - "What if I only took trades with 2R+?"
- [ ] Helps users improve strategy

### 8. Alerts System
- [ ] Alert types:
  - Trend shift detected
  - High liquidation concentration
  - AI-predicted sweeps
  - Key level taps
  - Divergences detected
- [ ] Delivery: Push, SMS, email
- [ ] Tiered pricing for alert frequency

---

## Implementation Priority

### Phase 1 (Current)
- [x] Basic analysis bot
- [x] Twitter integration
- [x] Lightning paywall (21 sats)
- [x] Premium dashboard (basic)
- [ ] GitHub auto-commit posts

### Phase 2 (Next)
- [ ] Fear & Greed index
- [ ] Funding rates
- [ ] Enhanced liquidation watchlist
- [ ] Education hub (3-5 articles)

### Phase 3 (Growth)
- [ ] AI chart analysis upload
- [ ] Full trade tracker
- [ ] Backtest snippets
- [ ] Email newsletter

### Phase 4 (Scale)
- [ ] Interactive liquidation map
- [ ] Backtester PRO
- [ ] Alerts system
- [ ] Mobile app consideration

---

## Monetization Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Dashboard, delayed trades, 1 level/day, education |
| Basic | 21 sats/post | Individual analysis posts |
| Pro | ~$10/mo | Real-time trades, full tracker, backtests |
| Elite | ~$30/mo | AI chart analysis, alerts, newsletter |

---

## Tech Stack Considerations

- **Frontend**: Hugo (current), consider React for interactive features
- **Backend**: Netlify Functions (current)
- **Payments**: Lightning (LNbits), consider adding Stripe for subscriptions
- **Data**: Coinbase API, Binance API, Coinglass for derivatives
- **AI**: Claude API for analysis, chart interpretation
- **Charts**: TradingView widgets, Chart.js, D3.js for custom viz
