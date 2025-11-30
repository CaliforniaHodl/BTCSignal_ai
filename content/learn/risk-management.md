---
title: "Risk Management Essentials"
description: "Learn position sizing, stop losses, and risk management for Bitcoin trading"
date: 2024-11-29
slug: "risk-management"
tags: ["education", "risk-management", "position-sizing", "trading-psychology"]
icon: "⚠️"
category: "risk"
priority: 0.5
---

## Why Risk Management Matters

Risk management is more important than your entry strategy. Here's why:

- A 50% loss requires a 100% gain to recover
- A 90% loss requires a 900% gain to recover
- Most traders fail not from bad entries, but from poor risk management

**The Goal:** Stay in the game long enough for your edge to play out.

## The 1-2% Rule

The golden rule of trading:

**Never risk more than 1-2% of your account on a single trade.**

| Account Size | 1% Risk | 2% Risk |
|--------------|---------|---------|
| $1,000 | $10 | $20 |
| $10,000 | $100 | $200 |
| $100,000 | $1,000 | $2,000 |

This allows you to survive a string of losses without blowing up.

## Position Sizing Formula

To calculate proper position size:

```
Position Size = (Account Risk $) / (Stop Loss Distance)
```

### Example

- Account: $10,000
- Risk per trade: 1% ($100)
- Entry: $95,000
- Stop Loss: $94,000
- Stop Distance: $1,000 (1.05%)

Position Size = $100 / $1,000 = 0.1 BTC

## Risk-to-Reward Ratio (R:R)

Always think in terms of R:R:

| R:R | Meaning | Win Rate Needed to Break Even |
|-----|---------|-------------------------------|
| 1:1 | Risk $1 to make $1 | 50% |
| 1:2 | Risk $1 to make $2 | 33% |
| 1:3 | Risk $1 to make $3 | 25% |
| 1:5 | Risk $1 to make $5 | 17% |

**Rule:** Never take a trade with less than 1:2 R:R unless you have a very high win rate strategy.

### Calculating R:R

```
R:R = (Target Price - Entry) / (Entry - Stop Loss)
```

**Example:**
- Entry: $95,000
- Stop Loss: $94,000 (risk: $1,000)
- Target: $98,000 (reward: $3,000)
- R:R = $3,000 / $1,000 = 1:3

## Stop Loss Strategies

### Types of Stop Losses

| Type | Description | Best For |
|------|-------------|----------|
| Fixed % | Always X% below entry | Beginners |
| ATR-based | Based on volatility | Volatile markets |
| Structure-based | Below/above key levels | Technical traders |
| Time-based | Exit after X time | Momentum trades |

### Where to Place Stops

**Good Stop Placement:**
- Below support (for longs)
- Above resistance (for shorts)
- Below/above recent swing low/high
- Outside normal volatility range

**Bad Stop Placement:**
- At round numbers ($90,000)
- Too tight (normal volatility triggers it)
- At obvious levels (will get hunted)

### ATR-Based Stops

ATR (Average True Range) accounts for volatility:

```
Stop Loss = Entry - (ATR x Multiplier)
```

| Market Type | ATR Multiplier |
|-------------|----------------|
| Trending | 1.5 - 2.0 |
| Ranging | 1.0 - 1.5 |
| High volatility | 2.0 - 3.0 |

## Take Profit Strategies

### Scaling Out

Don't exit all at once:

| Exit | Position % | Target |
|------|------------|--------|
| TP1 | 33% | 1:1 R:R |
| TP2 | 33% | 1:2 R:R |
| TP3 | 34% | Trail stop |

Benefits:
- Locks in profit
- Keeps exposure for bigger moves
- Reduces emotional stress

### Trailing Stops

Once in profit, protect gains:

**Methods:**
1. **Fixed trail:** Move stop to entry after 1R profit
2. **ATR trail:** Stop = Price - (1.5 x ATR)
3. **Structure trail:** Stop below each new higher low

## Maximum Daily/Weekly Loss Limits

Set hard limits to protect yourself:

| Limit Type | Recommended | Action |
|------------|-------------|--------|
| Daily loss | 3-5% | Stop trading for day |
| Weekly loss | 10% | Stop trading for week |
| Monthly loss | 20% | Review and reassess |

When you hit these limits, walk away. Trading while tilted leads to bigger losses.

## Portfolio Risk Management

### Correlation Risk

Don't concentrate in correlated assets:

| If You Hold | Avoid Over-Allocating To |
|-------------|--------------------------|
| BTC | ETH, altcoins |
| Long BTC spot | Long BTC perp |
| Crypto-heavy | Tech stocks |

### Maximum Portfolio Risk

Total open risk should be limited:

- Conservative: 5% total risk across all positions
- Moderate: 10% total risk
- Aggressive: 20% total risk

### Position Limits

| Position Type | Max Allocation |
|---------------|----------------|
| Single trade | 5-10% of portfolio |
| Single asset | 20-30% of portfolio |
| Single sector | 40-50% of portfolio |

## Risk Management Checklist

Before every trade, ask:

- [ ] Is my position size correct for 1-2% risk?
- [ ] Does the R:R make sense (minimum 1:2)?
- [ ] Is my stop loss at a logical level?
- [ ] What is my maximum loss if stopped out?
- [ ] Can I afford to lose this amount?
- [ ] Am I within my daily/weekly risk limits?

## Common Risk Management Mistakes

### 1. Moving Stop Losses Down

Never move a stop loss further from entry to "give it room." This invalidates your original analysis.

### 2. Averaging Down

Adding to a losing position increases risk exponentially. If your stop was $94,000, honor it.

### 3. Not Taking the Stop

"It will come back" is how accounts blow up. Take the loss and move on.

### 4. Over-Leveraging

| Leverage | Account Loss if Price Moves Against |
|----------|-------------------------------------|
| 1x | 5% move = 5% loss |
| 10x | 5% move = 50% loss |
| 20x | 5% move = 100% loss (liquidation) |

### 5. Revenge Trading

After a loss, the urge to "make it back" leads to:
- Larger position sizes
- Poor entries
- Skipped analysis

Take a break after significant losses.

## Bitcoin-Specific Risk Tips

1. **Halving volatility** - Reduce position sizes 3 months before/after halvings

2. **Weekend liquidity** - Widen stops on weekends (lower liquidity = bigger wicks)

3. **News events** - Reduce exposure before major announcements (ETF decisions, regulations)

4. **Correlation spikes** - In crashes, BTC correlates with everything. True diversification is cash.

5. **Exchange risk** - Never keep more than you can afford to lose on any single exchange

## The Math of Survival

| Win Rate | Avg Winner | Avg Loser | Profitable? |
|----------|------------|-----------|-------------|
| 40% | 1.5R | 1R | Yes |
| 50% | 1R | 1R | Break even |
| 60% | 0.8R | 1R | No |
| 30% | 3R | 1R | Yes |

A lower win rate with better R:R beats a high win rate with poor R:R.

## Summary

| Principle | Guideline |
|-----------|-----------|
| Risk per trade | 1-2% of account |
| Minimum R:R | 1:2 |
| Stop loss | Below structure/ATR-based |
| Take profit | Scale out at multiple levels |
| Daily loss limit | 3-5% |
| Total portfolio risk | 5-10% |

Risk management isn't exciting, but it's what separates successful traders from blown accounts.

---

*Our [Trade Coach](/trade-coach/) evaluates your trade setup's risk management.*
