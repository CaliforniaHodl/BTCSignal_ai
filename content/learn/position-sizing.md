---
title: "Position Sizing Guide"
description: "Learn proper position sizing to survive and thrive in volatile markets"
date: 2024-12-01
slug: "position-sizing"
tags: ["education", "position-sizing", "risk-management", "trading", "strategy"]
icon: "📐"
category: "risk-management"
difficulty: "beginner"
priority: 0.6
css: ['learn.scss']
---

## What Is Position Sizing?

Position sizing determines how much capital to allocate to each trade. It's the most important factor in long-term trading success—more important than entry timing or strategy selection.

**Key Concept:** Good position sizing means you survive the inevitable losses and stay in the game long enough to capture gains.

## Why Position Sizing Matters

### The Math of Ruin

| Loss | Gain Needed to Recover |
|------|------------------------|
| 10% | 11% |
| 20% | 25% |
| 30% | 43% |
| 50% | 100% |
| 70% | 233% |
| 90% | 900% |

**Key Insight:** A 50% loss requires a 100% gain to recover. Protecting capital is paramount.

### Consecutive Losses Impact

With 5% risk per trade:

| Consecutive Losses | Account Remaining |
|-------------------|-------------------|
| 1 | 95% |
| 3 | 86% |
| 5 | 77% |
| 10 | 60% |

With 2% risk per trade:

| Consecutive Losses | Account Remaining |
|-------------------|-------------------|
| 1 | 98% |
| 3 | 94% |
| 5 | 90% |
| 10 | 82% |

**Conclusion:** Smaller risk per trade dramatically improves survival odds.

## Position Sizing Methods

### Method 1: Fixed Percentage Risk

The most common professional approach.

```
Position Size = (Account × Risk %) / (Entry - Stop Loss)

Example:
Account: $10,000
Risk per trade: 2% ($200)
Entry: $100,000
Stop loss: $95,000 (5% below)
Risk per BTC: $5,000

Position Size = $200 / $5,000 = 0.04 BTC ($4,000)
```

### Method 2: Fixed Dollar Amount

Simple but not optimal.

```
Every trade: Risk $200 regardless of setup

Problem: Doesn't account for volatility or stop distance
```

### Method 3: Volatility-Based (ATR Method)

Adjust for market conditions.

```
Position Size = (Account × Risk %) / (ATR × Multiplier)

Example:
Account: $10,000
Risk: 2% ($200)
14-day ATR: $3,000
Multiplier: 2

Position Size = $200 / ($3,000 × 2) = $200 / $6,000 = 0.033 BTC
```

**Benefit:** Automatically sizes smaller in volatile markets.

### Method 4: Kelly Criterion

Mathematically optimal but aggressive.

```
Kelly % = Win Rate - (Loss Rate / Win:Loss Ratio)

Example:
Win rate: 55%
Average win: $300
Average loss: $200
Win:Loss ratio: 1.5

Kelly = 0.55 - (0.45 / 1.5) = 0.55 - 0.30 = 25%
```

**Warning:** Full Kelly is too aggressive. Most traders use 25-50% Kelly (fractional Kelly).

## Risk Per Trade Guidelines

### By Experience Level

| Experience | Max Risk Per Trade | Reasoning |
|------------|-------------------|-----------|
| Beginner | 0.5-1% | Learning, expect losses |
| Intermediate | 1-2% | Building consistency |
| Advanced | 2-3% | Proven edge |
| Professional | Varies | Depends on strategy |

### By Strategy Type

| Strategy | Recommended Risk | Notes |
|----------|------------------|-------|
| Scalping | 0.25-0.5% | Many trades, tight stops |
| Day trading | 0.5-1% | Multiple daily opportunities |
| Swing trading | 1-2% | Fewer, higher-conviction trades |
| Position trading | 2-3% | Long-term, wider stops |

### By Market Conditions

| Volatility | Risk Adjustment |
|------------|-----------------|
| Low (ATR < average) | Can increase slightly |
| Normal | Standard risk |
| High (ATR > 1.5x average) | Reduce by 25-50% |
| Extreme (ATR > 2x average) | Reduce by 50-75% |

## Calculating Position Size

### Step-by-Step Process

**Step 1: Determine Account Risk**
```
Account: $10,000
Risk percentage: 2%
Dollar risk: $200
```

**Step 2: Define Stop Loss**
```
Entry price: $100,000
Stop loss: $96,000 (4% below)
Risk per unit: $4,000
```

**Step 3: Calculate Position Size**
```
Position = Dollar Risk / Risk per Unit
Position = $200 / $4,000 = 0.05 BTC
Position value = 0.05 × $100,000 = $5,000
```

**Step 4: Check Leverage (if applicable)**
```
Position: $5,000
Account: $10,000
Effective leverage: 0.5x (conservative)
```

### Position Size Calculator

```
Inputs:
- Account size: $________
- Risk %: ________%
- Entry price: $________
- Stop loss: $________

Calculations:
- Dollar risk = Account × Risk %
- Stop distance = Entry - Stop Loss
- Stop % = Stop distance / Entry
- Position = Dollar risk / Stop distance
- Position value = Position × Entry
- Leverage = Position value / Account
```

## Portfolio Position Sizing

### Single Asset Allocation

| Risk Profile | Max BTC Allocation |
|--------------|-------------------|
| Conservative | 5-10% of portfolio |
| Moderate | 10-20% of portfolio |
| Aggressive | 20-40% of portfolio |
| Bitcoin Maximalist | 50%+ |

### Multi-Position Management

When holding multiple positions:

```
Maximum total risk = 6-10% of account

Example with 2% risk per trade:
- Can have 3-5 concurrent positions
- If correlated (all crypto), treat as single position
- Reduce individual size when adding positions
```

### Correlation Considerations

| Assets | Correlation | Size Adjustment |
|--------|-------------|-----------------|
| BTC + ETH | High | Reduce both by 30% |
| BTC + Stocks | Medium | Reduce both by 15% |
| BTC + Gold | Low | Full size both |
| BTC + USD | Negative | Can overweight |

## Scaling In and Out

### Scaling Into Positions

```
Total target: 0.1 BTC
Entry 1: 0.033 BTC at $100,000
Entry 2: 0.033 BTC at $97,000 (if reached)
Entry 3: 0.034 BTC at $94,000 (if reached)

Average entry: $97,000 if all filled
```

**Benefit:** Better average price, managed risk

### Scaling Out of Positions

```
Total position: 0.1 BTC
Exit 1: 0.033 BTC at $110,000 (lock in profits)
Exit 2: 0.033 BTC at $120,000 (target hit)
Exit 3: 0.034 BTC (trailing stop)

Ensures some profit while letting winners run
```

## Position Sizing Mistakes

### 1. Oversizing on "Sure Things"

**Mistake:** "This trade can't lose, I'll go big"
**Reality:** Every trade can lose. Size consistently.

### 2. Increasing Size After Wins

**Mistake:** "I'm hot, let me size up"
**Reality:** Overconfidence leads to giving back gains.

### 3. Decreasing Size After Losses

**Mistake:** "I'm scared, let me size down"
**Reality:** Missing the recovery trades.

### 4. Ignoring Correlation

**Mistake:** Full-size positions in BTC, ETH, and SOL
**Reality:** These often move together. You're 3x exposed.

### 5. Not Adjusting for Volatility

**Mistake:** Same size in 50% drawdown vs. calm markets
**Reality:** Higher volatility = smaller positions.

## Advanced Concepts

### Risk-Adjusted Returns

Don't just measure returns—measure risk-adjusted returns.

```
Sharpe Ratio = (Return - Risk-Free Rate) / Standard Deviation

Good Sharpe: > 1.0
Great Sharpe: > 2.0
```

### Maximum Drawdown Planning

Plan for worst case:

```
Maximum acceptable drawdown: 20%
Risk per trade: 2%
Assuming 50% win rate, consecutive losses possible

10 straight losses = 18% drawdown
This is survivable with 2% risk
```

### Anti-Martingale Approach

Increase size when winning, decrease when losing:

```
Base risk: 2%
After 3 wins: Increase to 2.5%
After 3 losses: Decrease to 1.5%
Reset after hitting targets or stops
```

## Building Your Position Sizing Plan

### Template

```
POSITION SIZING RULES:

1. Maximum risk per trade: ___% ($_____)
2. Maximum concurrent positions: _____
3. Maximum total portfolio risk: ___%
4. Volatility adjustment:
   - High volatility: Reduce by ___%
   - Low volatility: Increase by ___%
5. Scaling rules:
   - Entry scale: ___% per level
   - Exit scale: ___% per target
6. Review frequency: Weekly/Monthly
```

### Sample Conservative Plan

```
Account: $10,000

Risk per trade: 1% ($100)
Max concurrent positions: 3
Max total risk: 3%
Stop loss: Always set before entry
Position review: Weekly

Volatility adjustment:
- BTC ATR > $5,000: Reduce size 50%
- BTC ATR < $2,000: Normal size
```

## Summary

Position sizing is survival:

- **Risk small** — 1-2% per trade maximum
- **Stay consistent** — Same rules every trade
- **Adjust for volatility** — Smaller in chaos
- **Manage correlation** — Don't over-expose
- **Review regularly** — Optimize over time

The goal is not to maximize gains—it's to survive long enough to let compounding work.

---

*Proper position sizing is the foundation of professional trading.*
