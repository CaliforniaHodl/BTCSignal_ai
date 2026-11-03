---
title: "Our Secret Sauce: Math & Data"
description: "How the BTC Signals Pro signal engine and paper-trading agent actually work, including what has not been proven yet"
date: 2024-12-02
slug: "our-secret-sauce"
tags: ["education", "algorithms", "technical-analysis", "transparency"]
icon: "🧪"
category: "advanced"
difficulty: "intermediate"
priority: 0.9
css: ['learn.scss']
---

## The Short Version

There is no secret. The signal engine is a small, deterministic set of rules. Given the same market data, it always produces the same output. This page explains what goes into it, what it does with a signal, and, just as important, what it has **not** proven.

**The honest headline:** the current strategy did **not** pass its out-of-sample walk-forward test. Because of that, it runs as a **paper-trading** agent only. No real money is traded. Live paper results are published on the [Agent](/agent) page and every signal is logged on [Signal History](/signal-history), so you can judge the record for yourself.

> An earlier version of this site published daily AI-written "analysis posts" from a different engine. That engine has been retired. Its posts remain as an [archive](/posts), but nothing on this page describes how they were made.

---

## Step 1: Seven Factors

Every hour the engine reads closed candles (never a still-forming one, so a live run and a backtest at the same timestamp see identical data) plus two sentiment inputs. It turns each into a number from **-1 (bearish) to +1 (bullish)**:

| # | Factor | What it looks at | How it reads it |
|---|--------|------------------|-----------------|
| 1 | 4h trend | EMA 20 vs EMA 50 on 4-hour candles | Trend-following |
| 2 | Daily regime | Daily close vs the 200-day EMA | Trend-following |
| 3 | 4h momentum | MACD histogram, scaled by ATR | Momentum |
| 4 | 1h RSI | 14-period RSI on hourly candles | Momentum in the middle, contrarian at extremes |
| 5 | Perp funding | Perpetual futures funding rate | **Contrarian**: crowded longs count as bearish |
| 6 | Fear & Greed | The Crypto Fear & Greed Index | **Contrarian**: greed counts as bearish |
| 7 | 30-day momentum | 30-day rate of change of the daily close | Trend-following |

Want the background on each input? See [EMA & SMA Crossovers](/learn/ema-sma-crossover), [MACD](/learn/macd-trading), [RSI Divergence](/learn/rsi-divergence), [Funding Rates](/learn/funding-rates), and the [Fear & Greed Index](/learn/fear-greed-index).

## Step 2: One Score

The factors are combined into a single weighted score. The engine also measures:

- **Agreement**: how much of the weight points the same way as the score
- **Coverage**: how much of the weight actually had data (a missing input lowers confidence rather than being guessed)

Score, agreement, and coverage together produce a **confidence** value. If the score and confidence don't both clear fixed thresholds, the output is **flat**, meaning no trade. Most hours are flat.

## Step 3: A Proposed Trade

When the engine does produce a long signal, the paper agent proposes an entry with:

- **Long-only spot.** No leverage and no shorts, because the planned venue is spot.
- **1% risk per trade.** Position size is set so that hitting the stop loses about 1% of equity.
- **A trailing stop at 3x daily ATR.** There's no fixed profit target. The stop trails the best close, so winners can run and the stop gives back a volatility-scaled amount.

Hard limits apply before anything else: one position at a time, a cap on entries per day, a daily loss stop, a cooldown after each close, and a drawdown kill switch. The simulation charges trading fees and slippage.

## Step 4: Claude Reviews the Entry

Each proposed entry that passes the hard limits goes to Claude for review. Claude can:

- **Approve** it as proposed
- **Shrink** it to a smaller size
- **Veto** it

Claude **cannot** add size, loosen a stop, override a risk limit, or open a trade the rules didn't propose. If the review fails for any reason, the trade is vetoed. Its written reasoning is published with the trade.

---

## The Part Most Sites Leave Out: Validation

Before any strategy can trade real money, it has to pass a **walk-forward gate**. It is tuned on one stretch of history, then tested on later data it has never seen. The gate checks things like profit factor, maximum drawdown, win rate, risk-adjusted return, and a minimum number of trades.

**The current configuration did not pass.** Its parameters were chosen on in-sample data, and they did not hold up well enough out of sample. That is a real result, not a technicality. It means the backtest is not evidence of an edge.

So the agent trades on paper. Forward paper trading is the actual test, and it's public:

- [Agent](/agent) shows the paper account, open position, and recent decisions
- [Signal History](/signal-history) logs every hourly signal
- [Trading History](/trading-history) and the [Prediction Tracker](/prediction-tracker) cover past results

We don't quote win rates or returns on this page. Any number we gave here would either be in-sample (and so overstated) or out of date. Check the live pages instead.

## What This Means for You

- These signals are **not financial advice** and come with **no track record of profitability**
- A deterministic engine is easy to audit, but that doesn't make it right
- If the paper record never earns its way past the gate, it won't go live

For more on how the pieces fit together, see [How It Works](/how-it-works) and the [FAQ](/faq).
