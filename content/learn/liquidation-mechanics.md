---
title: "Liquidation Mechanics"
description: "Understand how liquidations work and how to avoid becoming exit liquidity"
date: 2024-12-01
slug: "liquidation-mechanics"
tags: ["education", "liquidations", "leverage", "risk-management", "futures"]
icon: "💥"
category: "derivatives"
priority: 0.6
css: ['learn.scss']
---

## What Is Liquidation?

Liquidation occurs when your margin balance falls below the maintenance margin required to keep a leveraged position open. The exchange forcefully closes your position to prevent further losses.

**Key Concept:** When you're liquidated, you lose your entire margin (collateral) for that position. Understanding liquidation mechanics can save you from catastrophic losses.

## How Liquidations Work

### The Math Behind Liquidation

For a **long position**:
```
Liquidation Price = Entry Price × (1 - 1/Leverage + Maintenance Margin)

Example (10x long at $100,000):
Liquidation ≈ $100,000 × (1 - 0.1 + 0.005)
Liquidation ≈ $90,500 (roughly 9.5% below entry)
```

For a **short position**:
```
Liquidation Price = Entry Price × (1 + 1/Leverage - Maintenance Margin)

Example (10x short at $100,000):
Liquidation ≈ $100,000 × (1 + 0.1 - 0.005)
Liquidation ≈ $109,500 (roughly 9.5% above entry)
```

### Leverage and Liquidation Distance

| Leverage | Approx. Distance to Liquidation |
|----------|--------------------------------|
| 2x | ~50% |
| 5x | ~20% |
| 10x | ~10% |
| 20x | ~5% |
| 50x | ~2% |
| 100x | ~1% |

**Reality Check:** Bitcoin regularly moves 5-10% in a day. High leverage = high liquidation risk.

## The Liquidation Process

### Step 1: Position Opens
- You deposit margin (collateral)
- Exchange calculates liquidation price
- Position is active

### Step 2: Price Moves Against You
- Unrealized PnL becomes negative
- Margin ratio decreases
- Warning alerts (if set)

### Step 3: Margin Warning
- Most exchanges warn at 80% margin usage
- Add margin or reduce position
- Last chance to act

### Step 4: Liquidation Triggered
- Price hits liquidation level
- Exchange's liquidation engine takes over
- Position is forcefully closed

### Step 5: Settlement
- Remaining margin used to close position
- Any leftover returned (rare on full liquidation)
- Position gone, lesson learned

## Types of Liquidation

### Partial Liquidation
Some exchanges partially liquidate to reduce position size:
- Position reduced by 25-50%
- Liquidation price moves further
- Chance to recover

### Full Liquidation
Position completely closed:
- All margin lost
- Common on smaller positions
- More common in volatile markets

### ADL (Auto-Deleveraging)
When liquidation engine can't fill at liquidation price:
- Profitable traders on opposite side are reduced
- Rarely happens in liquid markets
- Sign of extreme market stress

## Liquidation Cascades

The most dangerous market phenomenon:

```
Initial Move → First Liquidations → More Selling
      ↓
Price Drops Further → More Liquidations
      ↓
Cascade Effect → Massive Price Move
      ↓
Finally Stops When:
- Buyers step in
- Liquidations exhaust
- Price hits major support
```

### Cascade Characteristics

| Phase | Price Action | Volume | OI Change |
|-------|--------------|--------|-----------|
| Start | Break of level | Normal | Stable |
| Acceleration | Sharp move | Spiking | Dropping |
| Peak | Wick formation | Extreme | Massive drop |
| Recovery | Bounce | Declining | Stabilizing |

## Reading Liquidation Data

### Liquidation Heatmaps

Heatmaps show where liquidations are clustered:

```
Price Level    Liquidation Density
$105,000       ████████████  (Heavy short liquidations)
$103,000       ████████
$101,000       ████
$100,000       ██  ← Current Price
$98,000        ████
$96,000        ████████
$95,000        ████████████  (Heavy long liquidations)
```

**Trading Insight:** Price often "hunts" these liquidation zones for liquidity.

### Liquidation Volume

| Daily Liquidation | Market Condition |
|-------------------|------------------|
| <$100M | Low volatility, calm |
| $100M-$500M | Normal volatility |
| $500M-$1B | High volatility |
| >$1B | Extreme event |

## Why Liquidations Create Opportunities

### For Contrarian Traders

After major liquidations:
1. Overleveraged traders are gone
2. Market is deleveraged
3. Less fuel for further moves
4. Often marks local tops/bottoms

### The "Liquidity Hunt" Pattern

Market makers and whales know where liquidations sit:

```
1. Price consolidates near resistance
2. Liquidations build above resistance (shorts)
3. Sudden spike takes out stops and liquidations
4. Price reverses back down
5. Those who chased get trapped
```

This is why "stop hunting" exists.

## Protecting Yourself from Liquidation

### Rule 1: Use Appropriate Leverage

| Your Experience | Max Recommended Leverage |
|-----------------|-------------------------|
| Beginner | 1-2x |
| Intermediate | 3-5x |
| Advanced | 5-10x |
| Professional | Varies by setup |

### Rule 2: Position Size Correctly

Never risk more than 1-2% of portfolio per trade:

```
If portfolio = $10,000
Max risk per trade = $100-200
With 10x leverage, position size = $1,000-2,000
```

### Rule 3: Set Stop-Losses Before Liquidation

| Leverage | Stop-Loss Distance | Liquidation Distance |
|----------|-------------------|---------------------|
| 5x | 10% | 20% |
| 10x | 5% | 10% |
| 20x | 2.5% | 5% |

Always set stops **before** the liquidation price.

### Rule 4: Use Isolated Margin

**Cross Margin:**
- Uses entire account as collateral
- One bad trade can wipe everything
- Higher liquidation price buffer
- Dangerous for beginners

**Isolated Margin:**
- Only position margin at risk
- Limits max loss per trade
- Lower liquidation buffer
- Recommended for most traders

### Rule 5: Monitor Funding and OI

Before entering leveraged positions, check:
- Current funding rate (extreme = risky)
- Open interest levels (high = potential cascade)
- Recent liquidation events

## Liquidation Timing

### When Liquidations Are Most Common

| Time | Risk Level | Reason |
|------|------------|--------|
| Weekend opens | High | Low liquidity, gaps |
| US session open | Medium | Volume spike |
| Major news events | Very high | Volatility |
| CME gaps | High | Futures open |
| Low liquidity hours | Medium | Thin order books |

### Seasonal Patterns

- **Q4** typically volatile (year-end positioning)
- **Post-halving years** see massive liquidations
- **Options expiry** (monthly/quarterly) creates volatility

## Exchange Differences

| Exchange | Insurance Fund | Partial Liq | Notes |
|----------|----------------|-------------|-------|
| Binance | Large | Yes | Most liquid |
| Bybit | Medium | Yes | Good for mid-size |
| OKX | Large | Yes | High leverage available |
| dYdX | Decentralized | Varies | On-chain liquidations |
| BitMEX | Medium | Yes | Pioneer of perps |

## Using Liquidation Data in Trading

### Entry Strategy: Post-Cascade

1. Wait for liquidation cascade to end
2. Confirm with volume decline
3. Look for reversal candle
4. Enter with tight stop below wick low
5. Target: 50% retracement of cascade

### Exit Strategy: Anticipate Liquidations

1. Identify nearby liquidation clusters
2. Take profit before these levels
3. Don't be greedy when price approaches clusters
4. Re-enter after the hunt completes

## Common Mistakes

### 1. Not Knowing Your Liquidation Price

Always know exactly where you get liquidated before entering.

### 2. Adding to Losing Positions

"Averaging down" on leveraged positions moves liquidation closer. Dangerous.

### 3. Ignoring Market Conditions

Don't use same leverage in volatile markets as calm markets.

### 4. Holding Through News Events

Major announcements = liquidation events. Reduce exposure beforehand.

### 5. Using Cross Margin Without Understanding

Cross margin can amplify losses across your entire account.

## Quick Reference

| Scenario | Liquidation Risk | Action |
|----------|-----------------|--------|
| High OI + funding extreme | Very high | Reduce leverage |
| Price near support/resistance | High | Tighten stops |
| Major news incoming | Very high | Close or reduce |
| Low volatility period | Lower | Normal trading |
| After major cascade | Lower | Look for entries |

## Summary

Liquidations are a fundamental part of leveraged trading:

- **Understand the math** - Know your exact liquidation price
- **Size appropriately** - Never risk more than you can lose
- **Use stops** - Always set stops before liquidation level
- **Watch the cascade** - Liquidation events create opportunities
- **Stay humble** - The market doesn't care about your position

The best traders use liquidation data as intelligence, not as experience.

---

*View live liquidation data on our [Liquidation Map](/liquidation-map/).*
