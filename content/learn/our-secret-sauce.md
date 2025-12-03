---
title: "Our Secret Sauce: Math & Data"
description: "A deep dive into the algorithms, calculations, and data sources powering our Bitcoin analysis tools"
date: 2024-12-02
slug: "our-secret-sauce"
tags: ["education", "algorithms", "technical-analysis", "transparency"]
icon: "🧪"
category: "advanced"
priority: 0.9
css: ['learn.scss']
---

## How We Generate Signals

Our analysis combines **technical indicators**, **pattern recognition**, **derivatives data**, and **market sentiment** into a weighted scoring system. Here's exactly how it works.

---

## The Prediction Engine

### Signal Generation Pseudocode

```
FUNCTION generateSignal(priceData, indicators, patterns, derivatives):

    signals = []  // Array of {signal, weight, reason}

    // ===== TECHNICAL INDICATORS =====

    // RSI Analysis (weight: 0.3-0.8)
    IF rsi < 30:
        signals.add("bullish", 0.8, "RSI oversold")
    ELSE IF rsi > 70:
        signals.add("bearish", 0.8, "RSI overbought")
    ELSE IF rsi > 50:
        signals.add("bullish", 0.3, "RSI bullish")
    ELSE:
        signals.add("bearish", 0.3, "RSI bearish")

    // MACD Analysis (weight: 0.7)
    IF macd.line > macd.signal:
        signals.add("bullish", 0.7, "MACD bullish crossover")
    ELSE:
        signals.add("bearish", 0.7, "MACD bearish crossover")

    // Bollinger Bands (weight: 0.7)
    IF price < lowerBand:
        signals.add("bullish", 0.7, "Below lower BB")
    ELSE IF price > upperBand:
        signals.add("bearish", 0.7, "Above upper BB")

    // Trend Analysis (weight: 0.9)
    IF price > EMA20 AND EMA20 > SMA50:
        signals.add("bullish", 0.9, "Strong uptrend")
    ELSE IF price < EMA20 AND EMA20 < SMA50:
        signals.add("bearish", 0.9, "Strong downtrend")

    // ===== PATTERN RECOGNITION =====

    FOR each pattern IN detectedPatterns:
        signals.add(pattern.type, pattern.confidence, pattern.name)

    // ===== DERIVATIVES DATA =====

    // Funding Rate (contrarian indicator)
    IF fundingRate > 0.01%:  // Extreme positive
        signals.add("bearish", 0.6, "Overleveraged longs")
    ELSE IF fundingRate < -0.01%:  // Extreme negative
        signals.add("bullish", 0.6, "Overleveraged shorts")

    // Squeeze Risk
    IF squeezeAlert.type == "long_squeeze" AND probability != "low":
        signals.add("bearish", 0.4-0.7, "Long squeeze risk")
    ELSE IF squeezeAlert.type == "short_squeeze" AND probability != "low":
        signals.add("bullish", 0.4-0.7, "Short squeeze risk")

    // ===== CALCULATE FINAL SCORE =====

    bullishScore = SUM(signals WHERE signal == "bullish")
    bearishScore = SUM(signals WHERE signal == "bearish")
    totalScore = bullishScore + bearishScore

    bullishPercent = bullishScore / totalScore
    bearishPercent = bearishScore / totalScore

    // Determine direction
    IF |bullishPercent - bearishPercent| < 0.15:
        direction = "mixed"
    ELSE IF bullishPercent > bearishPercent:
        direction = "up"
    ELSE:
        direction = "down"

    confidence = MAX(bullishPercent, bearishPercent)

    RETURN {direction, confidence, reasoning}
```

---

## Technical Indicators

### RSI (Relative Strength Index)

```
FUNCTION calculateRSI(prices, period=14):

    gains = []
    losses = []

    FOR i FROM 1 TO length(prices):
        change = prices[i] - prices[i-1]
        IF change >= 0:
            gains.add(change)
            losses.add(0)
        ELSE:
            gains.add(0)
            losses.add(ABS(change))

    avgGain = AVERAGE(gains, period)
    avgLoss = AVERAGE(losses, period)

    IF avgLoss == 0:
        RETURN 100

    RS = avgGain / avgLoss
    RSI = 100 - (100 / (1 + RS))

    RETURN RSI
```

**Interpretation:**
| RSI Value | Meaning |
|-----------|---------|
| < 30 | Oversold (bullish signal) |
| 30-50 | Bearish momentum |
| 50-70 | Bullish momentum |
| > 70 | Overbought (bearish signal) |

### MACD (Moving Average Convergence Divergence)

```
FUNCTION calculateMACD(prices):

    EMA12 = ExponentialMovingAverage(prices, 12)
    EMA26 = ExponentialMovingAverage(prices, 26)

    MACDLine = EMA12 - EMA26
    SignalLine = EMA(MACDLine, 9)
    Histogram = MACDLine - SignalLine

    RETURN {MACDLine, SignalLine, Histogram}
```

**Signal Logic:**
- MACD crosses above Signal = Bullish
- MACD crosses below Signal = Bearish
- Histogram positive and growing = Strong bullish momentum

### Bollinger Bands

```
FUNCTION calculateBollingerBands(prices, period=20, stdDev=2):

    middleBand = SimpleMovingAverage(prices, period)
    standardDeviation = StdDev(prices, period)

    upperBand = middleBand + (standardDeviation * stdDev)
    lowerBand = middleBand - (standardDeviation * stdDev)

    RETURN {upperBand, middleBand, lowerBand}
```

**Signal Logic:**
- Price touches lower band = Potential bounce (bullish)
- Price touches upper band = Potential rejection (bearish)
- Band squeeze (bands narrow) = Volatility expansion coming

### ATR (Average True Range)

```
FUNCTION calculateATR(high, low, close, period=14):

    trueRanges = []

    FOR i FROM 1 TO length(high):
        TR = MAX(
            high[i] - low[i],           // Current range
            ABS(high[i] - close[i-1]),  // Gap up
            ABS(low[i] - close[i-1])    // Gap down
        )
        trueRanges.add(TR)

    ATR = AVERAGE(trueRanges, period)

    RETURN ATR
```

**Usage:** ATR is used to calculate:
- **Target Price** = Entry + (ATR * 2)
- **Stop Loss** = Entry - ATR

---

## Pattern Recognition

### Double Top/Bottom Detection

```
FUNCTION detectDoublePattern(prices, lookback=50):

    highs = prices.map(candle => candle.high)
    lows = prices.map(candle => candle.low)

    peaks = findLocalPeaks(highs)
    troughs = findLocalPeaks(invert(lows))

    // Check for Double Top
    IF peaks.length >= 2:
        lastTwoPeaks = peaks.slice(-2)
        priceDiff = ABS(highs[peak1] - highs[peak2]) / highs[peak1]

        IF priceDiff < 0.02:  // Within 2% = Double Top
            RETURN {
                name: "Double Top",
                type: "bearish",
                confidence: 0.70
            }

    // Check for Double Bottom
    IF troughs.length >= 2:
        lastTwoTroughs = troughs.slice(-2)
        priceDiff = ABS(lows[trough1] - lows[trough2]) / lows[trough1]

        IF priceDiff < 0.02:  // Within 2% = Double Bottom
            RETURN {
                name: "Double Bottom",
                type: "bullish",
                confidence: 0.70
            }

    RETURN null
```

### Head and Shoulders Detection

```
FUNCTION detectHeadAndShoulders(prices, lookback=60):

    highs = prices.map(candle => candle.high)
    peaks = findLocalPeaks(highs)

    IF peaks.length >= 3:
        [leftShoulder, head, rightShoulder] = peaks.slice(-3)

        // Head must be higher than both shoulders
        // Shoulders should be roughly equal
        IF head > leftShoulder AND head > rightShoulder:
            shoulderDiff = ABS(leftShoulder - rightShoulder) / leftShoulder

            IF shoulderDiff < 0.03:  // Shoulders within 3%
                RETURN {
                    name: "Head and Shoulders",
                    type: "bearish",
                    confidence: 0.75
                }

    RETURN null
```

### Breakout Detection

```
FUNCTION detectBreakout(prices, lookback=30):

    recent = prices.slice(-lookback)
    resistance = MAX(recent.highs[0:-1])  // Excluding current
    support = MIN(recent.lows[0:-1])
    currentClose = recent.closes[-1]

    // Breakout above resistance (with 1% buffer)
    IF currentClose > resistance * 1.01:
        RETURN {
            name: "Resistance Breakout",
            type: "bullish",
            confidence: 0.65
        }

    // Breakdown below support
    IF currentClose < support * 0.99:
        RETURN {
            name: "Support Breakdown",
            type: "bearish",
            confidence: 0.65
        }

    RETURN null
```

---

## BART Risk Calculator

The BART (manipulation pattern) risk score combines 5 weighted factors totaling 100 points:

```
FUNCTION calculateBARTRisk():

    totalScore = 0

    // ===== FACTOR 1: Market Hours (20 points max) =====
    timeRisk = 0
    IF isWeekend():
        timeRisk += 15  // Weekend = thin liquidity
    IF utcHour BETWEEN 0 AND 6:
        timeRisk += 5   // Off-peak hours
    IF isSundayEvening():
        timeRisk += 5   // CME gap risk

    totalScore += MIN(timeRisk, 20)

    // ===== FACTOR 2: Funding Rate (25 points max) =====
    fundingRisk = 0
    absRate = ABS(fundingRate)

    IF absRate >= 0.05%:
        fundingRisk = 25  // Extreme leverage
    ELSE IF absRate >= 0.03%:
        fundingRisk = 18  // High leverage
    ELSE IF absRate >= 0.015%:
        fundingRisk = 10  // Elevated

    totalScore += fundingRisk

    // ===== FACTOR 3: Volatility Compression (20 points max) =====
    volRatio = recentVolatility / averageVolatility

    IF volRatio < 0.3:
        volRisk = 20  // Extreme compression
    ELSE IF volRatio < 0.5:
        volRisk = 15  // Low volatility
    ELSE IF volRatio < 0.7:
        volRisk = 8   // Below average
    ELSE:
        volRisk = 0   // Normal

    totalScore += volRisk

    // ===== FACTOR 4: OI/Volume Ratio (20 points max) =====
    ratio = (openInterest * price) / volume24h

    IF ratio > 8:
        oiRisk = 20  // Liquidation cascade risk
    ELSE IF ratio > 5:
        oiRisk = 15  // High OI vs activity
    ELSE IF ratio > 3:
        oiRisk = 8   // Moderate buildup
    ELSE:
        oiRisk = 0   // Healthy ratio

    totalScore += oiRisk

    // ===== FACTOR 5: Price Stagnation (15 points max) =====
    range24h = ((high24h - low24h) / currentPrice) * 100

    IF range24h < 1.5%:
        stagnationRisk = 15  // Extremely tight
    ELSE IF range24h < 2.5%:
        stagnationRisk = 10  // Tight consolidation
    ELSE IF range24h < 4%:
        stagnationRisk = 5   // Moderate
    ELSE:
        stagnationRisk = 0   // Normal

    totalScore += stagnationRisk

    RETURN totalScore  // 0-100 scale
```

### Risk Level Thresholds

| Score | Level | Recommendation |
|-------|-------|----------------|
| 0-29 | Low | Normal trading |
| 30-49 | Moderate | Stay alert |
| 50-69 | High | Reduce leverage |
| 70+ | Extreme | Avoid new positions |

---

## Win/Loss Tracking (OHLC Method)

We use intraday OHLC (Open-High-Low-Close) candle data to accurately track if a signal hit its target or stop loss:

```
FUNCTION checkPriceTouched(ohlcCandles, signalTimestamp, targetPrice, stopLoss, direction):

    // Filter candles since signal was made
    relevantCandles = ohlcCandles.filter(c => c.time >= signalTimestamp)

    FOR each candle IN relevantCandles:
        high = candle.high
        low = candle.low

        IF direction == "bullish":
            // Check stop loss FIRST (takes priority)
            IF stopLoss AND low <= stopLoss:
                RETURN "loss"  // Price wicked down to stop

            IF targetPrice AND high >= targetPrice:
                RETURN "win"   // Price wicked up to target

        ELSE IF direction == "bearish":
            // Check stop loss FIRST
            IF stopLoss AND high >= stopLoss:
                RETURN "loss"  // Price wicked up to stop

            IF targetPrice AND low <= targetPrice:
                RETURN "win"   // Price wicked down to target

    RETURN "pending"  // Neither hit yet
```

**Why OHLC matters:** A signal might get stopped out at 3 AM and recover by the next analysis - checking only the current price would miss this.

---

## Derivatives Analysis

### Funding Rate Signal

```
FUNCTION analyzeFundingRate(rate):

    // Funding rate is contrarian:
    // High positive = longs paying shorts = crowded long = bearish
    // High negative = shorts paying longs = crowded short = bullish

    ratePercent = rate * 100

    IF rate > 0.01%:  // Very high positive
        signal = "bearish"
        weight = 0.6
        reason = "Extreme funding - overleveraged longs"

    ELSE IF rate > 0.005%:
        signal = "bearish"
        weight = 0.3
        reason = "High funding - crowded long"

    ELSE IF rate < -0.01%:  // Very negative
        signal = "bullish"
        weight = 0.6
        reason = "Negative funding - overleveraged shorts"

    ELSE IF rate < -0.005%:
        signal = "bullish"
        weight = 0.3
        reason = "Low funding - crowded short"

    ELSE:
        signal = "neutral"
        weight = 0

    RETURN {signal, weight, reason}
```

### Squeeze Detection

```
FUNCTION analyzeSqueezeRisk(fundingRate, openInterest, priceChange24h):

    longSqueezeScore = 0
    shortSqueezeScore = 0
    reasons = []

    // High positive funding = long squeeze potential
    IF fundingRate > 0.001:
        longSqueezeScore += 2
        reasons.add("High funding - longs overleveraged")

    // High negative funding = short squeeze potential
    IF fundingRate < -0.001:
        shortSqueezeScore += 2
        reasons.add("Negative funding - shorts overleveraged")

    // Strong rally = shorts in trouble
    IF priceChange24h > 5%:
        shortSqueezeScore += 1
        reasons.add("Strong rally may trigger liquidations")

    // Strong dump = longs in trouble
    IF priceChange24h < -5%:
        longSqueezeScore += 1
        reasons.add("Sharp drop may trigger liquidations")

    // High OI = more squeeze fuel
    IF openInterestValue > $20B:
        IF longSqueezeScore > shortSqueezeScore:
            longSqueezeScore += 1
        ELSE:
            shortSqueezeScore += 1
        reasons.add("High OI increases squeeze potential")

    // Determine alert
    IF longSqueezeScore >= 3:
        RETURN {type: "long_squeeze", probability: "high"}
    ELSE IF longSqueezeScore >= 2:
        RETURN {type: "long_squeeze", probability: "medium"}
    ELSE IF shortSqueezeScore >= 3:
        RETURN {type: "short_squeeze", probability: "high"}
    ELSE IF shortSqueezeScore >= 2:
        RETURN {type: "short_squeeze", probability: "medium"}

    RETURN {type: "none", probability: "low"}
```

---

## Data Sources

All our data comes from free, publicly available APIs:

| Data | Source | Update Frequency |
|------|--------|------------------|
| BTC Price | CoinGecko, Coinbase | 30 seconds |
| OHLC Candles | CoinGecko | 30 days of daily data |
| Funding Rate | OKX | 1 minute |
| Open Interest | OKX | 1 minute |
| Buy/Sell Ratio | Kraken | 30 seconds |
| Long/Short Ratio | OKX | 1 minute |
| Fear & Greed Index | alternative.me | 5 minutes |
| Hashrate | mempool.space | 10 minutes |
| Options Data | Deribit | On demand |

---

## Confidence Score Calculation

```
FUNCTION calculateConfidence(bullishSignals, bearishSignals):

    totalBullishWeight = SUM(bullishSignals.weights)
    totalBearishWeight = SUM(bearishSignals.weights)
    totalWeight = totalBullishWeight + totalBearishWeight

    IF totalWeight == 0:
        RETURN 0.5  // No signals = 50% (uncertain)

    // Confidence = strength of dominant direction
    IF totalBullishWeight > totalBearishWeight:
        confidence = totalBullishWeight / totalWeight
    ELSE:
        confidence = totalBearishWeight / totalWeight

    // Cap at 85% (never 100% certain)
    confidence = MIN(confidence, 0.85)

    RETURN confidence
```

---

## Target Price & Stop Loss

```
FUNCTION calculateTargetAndStop(currentPrice, direction, atr):

    // ATR = Average True Range (14-period)
    // Default to 2% of price if ATR unavailable
    IF atr == null:
        atr = currentPrice * 0.02

    IF direction == "up":
        targetPrice = currentPrice + (atr * 2)  // 2:1 reward
        stopLoss = currentPrice - atr           // 1 ATR risk

    ELSE IF direction == "down":
        targetPrice = currentPrice - (atr * 2)
        stopLoss = currentPrice + atr

    RETURN {targetPrice, stopLoss}
```

**Risk/Reward Ratio:** We use a **2:1** target ratio, meaning the potential profit is 2x the potential loss.

---

## Summary

Our system combines:

1. **6 Technical Indicators** - RSI, MACD, Bollinger Bands, EMA, SMA, ATR
2. **4 Pattern Types** - Double Top/Bottom, H&S, Breakouts, Trends
3. **3 Derivatives Factors** - Funding Rate, Open Interest, Squeeze Risk
4. **5 BART Risk Factors** - Time, Funding, Volatility, OI/Volume, Range
5. **Weighted Scoring** - Each signal contributes based on historical reliability

The final signal represents a consensus of all these factors, weighted by their predictive power. It's not magic - it's math.
