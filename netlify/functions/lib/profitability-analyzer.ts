// Profitability Analyzer Library - Phase 3: Profitability Metrics
// SOPR (Spent Output Profit Ratio) family and Realized Price calculations
// Used by: prediction-engine.ts, btctradingbot-tweets.ts, profitability-metrics.ts

export interface ProfitabilityMetrics {
  lastUpdated: string;
  sopr: SOPRMetric;
  asopr: AdjustedSOPRMetric;
  sthSopr: CohortSOPRMetric;
  lthSopr: CohortSOPRMetric;
  realizedPrice: RealizedPriceMetric;
  sthRealizedPrice: number;
  lthRealizedPrice: number;
}

export interface SOPRMetric {
  value: number;
  signal: 'profit_taking' | 'capitulation' | 'neutral' | 'equilibrium';
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
}

export interface AdjustedSOPRMetric {
  value: number;
  signal: 'profit_taking' | 'capitulation' | 'neutral' | 'equilibrium';
  trend: 'increasing' | 'decreasing' | 'stable';
  description: string;
}

export interface CohortSOPRMetric {
  value: number;
  signal: 'profit_taking' | 'capitulation' | 'neutral' | 'equilibrium';
  description: string;
  cohort: 'short_term' | 'long_term';
}

export interface RealizedPriceMetric {
  price: number;
  vsCurrentPrice: number; // Percentage difference from current price
  signal: 'above' | 'below' | 'near';
  description: string;
}

export interface ProfitabilitySignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  reason: string;
  metric: string;
}

// Signal weights for prediction engine integration
export const PROFITABILITY_WEIGHTS = {
  sopr: 0.20,
  asopr: 0.15,
  sthSopr: 0.25,
  lthSopr: 0.20,
  realizedPrice: 0.20
};

/**
 * Calculate SOPR (Spent Output Profit Ratio)
 * SOPR = Spent Output Value / Creation Value
 * > 1 = profits being realized
 * < 1 = losses being realized
 * = 1 = equilibrium
 *
 * Since we don't have UTXO data, we create a proxy using:
 * - Price momentum (short vs long term averages)
 * - MVRV ratio (market value vs realized value)
 * - Volume-weighted price changes
 */
export function calculateSOPR(
  currentPrice: number,
  priceHistory: { price: number; timestamp: string; volume: number }[],
  mvrv?: number
): SOPRMetric {
  if (priceHistory.length < 30) {
    return {
      value: 1.0,
      signal: 'neutral',
      trend: 'stable',
      description: 'Insufficient data for SOPR calculation'
    };
  }

  // Proxy SOPR calculation using volume-weighted cost basis
  // This estimates the average profit/loss of coins being moved

  // Calculate 30-day volume-weighted average price (proxy for "creation value")
  const last30Days = priceHistory.slice(-30);
  let totalVolumeWeightedPrice = 0;
  let totalVolume = 0;

  for (const day of last30Days) {
    const volume = day.volume || 1;
    totalVolumeWeightedPrice += day.price * volume;
    totalVolume += volume;
  }

  const avgCostBasis = totalVolume > 0 ? totalVolumeWeightedPrice / totalVolume : currentPrice;

  // SOPR proxy = current price / avg cost basis
  let soprValue = avgCostBasis > 0 ? currentPrice / avgCostBasis : 1.0;

  // Adjust using MVRV if available (provides realized cap context)
  if (mvrv && mvrv > 0) {
    // MVRV > 2.4 means significant profits, MVRV < 1 means losses
    // Blend our proxy with MVRV signal
    const mvrvInfluence = 0.3;
    const mvrvAdjustment = (mvrv - 1.0) * mvrvInfluence;
    soprValue = soprValue * (1 + mvrvAdjustment);
  }

  // Clamp to reasonable range
  soprValue = Math.max(0.5, Math.min(1.5, soprValue));

  // Determine signal
  let signal: SOPRMetric['signal'];
  let description: string;

  if (soprValue > 1.05) {
    signal = 'profit_taking';
    description = 'Coins being spent at profit. Strong holders distributing.';
  } else if (soprValue > 0.98 && soprValue <= 1.02) {
    signal = 'equilibrium';
    description = 'Breakeven zone. Holders neither gaining nor losing significantly.';
  } else if (soprValue < 0.95) {
    signal = 'capitulation';
    description = 'Coins being spent at loss. Weak hands selling in panic.';
  } else {
    signal = 'neutral';
    description = 'Normal market conditions. Mixed profit/loss realization.';
  }

  // Calculate trend (compare to 7-day average)
  let trend: SOPRMetric['trend'] = 'stable';
  if (priceHistory.length >= 7) {
    const last7Days = priceHistory.slice(-7);
    let avg7dCost = 0;
    let vol7d = 0;
    for (const day of last7Days) {
      const vol = day.volume || 1;
      avg7dCost += day.price * vol;
      vol7d += vol;
    }
    const sopr7d = vol7d > 0 ? (avg7dCost / vol7d) : avgCostBasis;
    const currentVsAvg = currentPrice / sopr7d;

    if (currentVsAvg > soprValue * 1.02) {
      trend = 'increasing';
    } else if (currentVsAvg < soprValue * 0.98) {
      trend = 'decreasing';
    }
  }

  return {
    value: Math.round(soprValue * 1000) / 1000,
    signal,
    trend,
    description
  };
}

/**
 * Calculate Adjusted SOPR (aSOPR)
 * Filters out very young outputs (<1 hour) to reduce noise from exchange transfers
 * In our proxy model, we exclude same-day price movements
 */
export function calculateAdjustedSOPR(
  currentPrice: number,
  priceHistory: { price: number; timestamp: string; volume: number }[],
  mvrv?: number
): AdjustedSOPRMetric {
  if (priceHistory.length < 30) {
    return {
      value: 1.0,
      signal: 'neutral',
      trend: 'stable',
      description: 'Insufficient data for aSOPR calculation'
    };
  }

  // Similar to SOPR but with longer window to filter noise
  // Use 30-60 day range to exclude very recent transactions
  const historicalData = priceHistory.slice(-60, -1); // Exclude today

  if (historicalData.length < 30) {
    // Fallback to regular SOPR if not enough data
    return calculateSOPR(currentPrice, priceHistory, mvrv) as AdjustedSOPRMetric;
  }

  let totalVolumeWeightedPrice = 0;
  let totalVolume = 0;

  for (const day of historicalData) {
    const volume = day.volume || 1;
    totalVolumeWeightedPrice += day.price * volume;
    totalVolume += volume;
  }

  const avgCostBasis = totalVolume > 0 ? totalVolumeWeightedPrice / totalVolume : currentPrice;
  let asoprValue = avgCostBasis > 0 ? currentPrice / avgCostBasis : 1.0;

  // Adjust using MVRV
  if (mvrv && mvrv > 0) {
    const mvrvInfluence = 0.25;
    const mvrvAdjustment = (mvrv - 1.0) * mvrvInfluence;
    asoprValue = asoprValue * (1 + mvrvAdjustment);
  }

  asoprValue = Math.max(0.5, Math.min(1.5, asoprValue));

  // Determine signal (same logic as SOPR)
  let signal: AdjustedSOPRMetric['signal'];
  let description: string;

  if (asoprValue > 1.05) {
    signal = 'profit_taking';
    description = 'Sustained profit realization. Long-term holders distributing.';
  } else if (asoprValue > 0.98 && asoprValue <= 1.02) {
    signal = 'equilibrium';
    description = 'Market at breakeven. Minimal profit/loss pressure.';
  } else if (asoprValue < 0.95) {
    signal = 'capitulation';
    description = 'Sustained loss realization. Capitulation phase.';
  } else {
    signal = 'neutral';
    description = 'Normal market activity.';
  }

  // Calculate trend
  let trend: AdjustedSOPRMetric['trend'] = 'stable';
  if (priceHistory.length >= 14) {
    const last14Days = priceHistory.slice(-14, -1);
    let avg14dCost = 0;
    let vol14d = 0;
    for (const day of last14Days) {
      const vol = day.volume || 1;
      avg14dCost += day.price * vol;
      vol14d += vol;
    }
    const asopr14d = vol14d > 0 ? (avg14dCost / vol14d) : avgCostBasis;
    const currentVsAvg = currentPrice / asopr14d;

    if (currentVsAvg > asoprValue * 1.02) {
      trend = 'increasing';
    } else if (currentVsAvg < asoprValue * 0.98) {
      trend = 'decreasing';
    }
  }

  return {
    value: Math.round(asoprValue * 1000) / 1000,
    signal,
    trend,
    description
  };
}

/**
 * Calculate Short-Term Holder SOPR (STH-SOPR)
 * Tracks coins held < 155 days
 * Proxy: Use 90-day window as representative of STH behavior
 */
export function calculateSTHSOPR(
  currentPrice: number,
  priceHistory: { price: number; timestamp: string; volume: number }[],
  mvrv?: number
): CohortSOPRMetric {
  if (priceHistory.length < 90) {
    return {
      value: 1.0,
      signal: 'neutral',
      description: 'Insufficient data for STH-SOPR calculation',
      cohort: 'short_term'
    };
  }

  // Use last 90 days as STH window
  const sthWindow = priceHistory.slice(-90);

  let totalVolumeWeightedPrice = 0;
  let totalVolume = 0;

  // Weight recent days more heavily (STH more influenced by recent prices)
  for (let i = 0; i < sthWindow.length; i++) {
    const day = sthWindow[i];
    const recencyWeight = 1 + (i / sthWindow.length) * 0.5; // 1.0 to 1.5x
    const volume = (day.volume || 1) * recencyWeight;
    totalVolumeWeightedPrice += day.price * volume;
    totalVolume += volume;
  }

  const sthCostBasis = totalVolume > 0 ? totalVolumeWeightedPrice / totalVolume : currentPrice;
  let sthSoprValue = sthCostBasis > 0 ? currentPrice / sthCostBasis : 1.0;

  // STH are more reactive, so amplify MVRV influence slightly
  if (mvrv && mvrv > 0) {
    const mvrvInfluence = 0.35;
    const mvrvAdjustment = (mvrv - 1.0) * mvrvInfluence;
    sthSoprValue = sthSoprValue * (1 + mvrvAdjustment);
  }

  sthSoprValue = Math.max(0.4, Math.min(1.8, sthSoprValue));

  // Determine signal
  let signal: CohortSOPRMetric['signal'];
  let description: string;

  if (sthSoprValue > 1.1) {
    signal = 'profit_taking';
    description = 'Short-term holders taking profits. Potential local top.';
  } else if (sthSoprValue > 0.95 && sthSoprValue <= 1.05) {
    signal = 'equilibrium';
    description = 'Short-term holders at breakeven. Indecision phase.';
  } else if (sthSoprValue < 0.9) {
    signal = 'capitulation';
    description = 'Short-term holders capitulating at loss. Local bottom signal.';
  } else {
    signal = 'neutral';
    description = 'Short-term holders in normal range.';
  }

  return {
    value: Math.round(sthSoprValue * 1000) / 1000,
    signal,
    description,
    cohort: 'short_term'
  };
}

/**
 * Calculate Long-Term Holder SOPR (LTH-SOPR)
 * Tracks coins held > 155 days
 * Proxy: Use 180-365 day window as representative of LTH behavior
 */
export function calculateLTHSOPR(
  currentPrice: number,
  priceHistory: { price: number; timestamp: string; volume: number }[],
  mvrv?: number
): CohortSOPRMetric {
  if (priceHistory.length < 180) {
    return {
      value: 1.0,
      signal: 'neutral',
      description: 'Insufficient data for LTH-SOPR calculation',
      cohort: 'long_term'
    };
  }

  // Use 180-365 day window for LTH
  const startIdx = Math.max(0, priceHistory.length - 365);
  const endIdx = priceHistory.length - 180;
  const lthWindow = priceHistory.slice(startIdx, endIdx);

  let totalVolumeWeightedPrice = 0;
  let totalVolume = 0;

  for (const day of lthWindow) {
    const volume = day.volume || 1;
    totalVolumeWeightedPrice += day.price * volume;
    totalVolume += volume;
  }

  const lthCostBasis = totalVolume > 0 ? totalVolumeWeightedPrice / totalVolume : currentPrice;
  let lthSoprValue = lthCostBasis > 0 ? currentPrice / lthCostBasis : 1.0;

  // LTH less reactive to MVRV, use smaller influence
  if (mvrv && mvrv > 0) {
    const mvrvInfluence = 0.20;
    const mvrvAdjustment = (mvrv - 1.0) * mvrvInfluence;
    lthSoprValue = lthSoprValue * (1 + mvrvAdjustment);
  }

  lthSoprValue = Math.max(0.3, Math.min(2.5, lthSoprValue));

  // Determine signal
  let signal: CohortSOPRMetric['signal'];
  let description: string;

  if (lthSoprValue > 1.2) {
    signal = 'profit_taking';
    description = 'Long-term holders distributing at profit. Cycle top signal.';
  } else if (lthSoprValue > 0.9 && lthSoprValue <= 1.1) {
    signal = 'equilibrium';
    description = 'Long-term holders holding steady. Market consolidation.';
  } else if (lthSoprValue < 0.8) {
    signal = 'capitulation';
    description = 'Long-term holders capitulating. Rare cycle bottom signal.';
  } else {
    signal = 'neutral';
    description = 'Long-term holders in accumulation mode.';
  }

  return {
    value: Math.round(lthSoprValue * 1000) / 1000,
    signal,
    description,
    cohort: 'long_term'
  };
}

/**
 * Calculate Realized Price
 * Realized Price = Realized Cap / Circulating Supply
 * This is the average price at which all coins last moved
 *
 * Proxy: Use volume-weighted average price over long period
 */
export function calculateRealizedPrice(
  priceHistory: { price: number; timestamp: string; volume: number }[],
  realizedCap?: number,
  circulatingSupply?: number
): RealizedPriceMetric {
  // If we have real realized cap data, use it
  if (realizedCap && circulatingSupply && circulatingSupply > 0) {
    const realizedPrice = realizedCap / circulatingSupply;
    const currentPrice = priceHistory[priceHistory.length - 1].price;
    const diff = ((currentPrice - realizedPrice) / realizedPrice) * 100;

    let signal: RealizedPriceMetric['signal'];
    let description: string;

    if (diff > 10) {
      signal = 'above';
      description = `Price ${diff.toFixed(1)}% above realized price. Market in profit.`;
    } else if (diff < -10) {
      signal = 'below';
      description = `Price ${diff.toFixed(1)}% below realized price. Market in loss.`;
    } else {
      signal = 'near';
      description = `Price near realized price (${diff.toFixed(1)}%). Critical support/resistance zone.`;
    }

    return {
      price: Math.round(realizedPrice),
      vsCurrentPrice: Math.round(diff * 10) / 10,
      signal,
      description
    };
  }

  // Proxy calculation using volume-weighted historical average
  if (priceHistory.length < 365) {
    const currentPrice = priceHistory[priceHistory.length - 1].price;
    return {
      price: Math.round(currentPrice * 0.7), // Estimate at 70% of current
      vsCurrentPrice: 30,
      signal: 'above',
      description: 'Estimated realized price (insufficient historical data)'
    };
  }

  // Use full available history with decay weights (older = less weight)
  let totalWeightedPrice = 0;
  let totalWeight = 0;

  for (let i = 0; i < priceHistory.length; i++) {
    const day = priceHistory[i];
    // Exponential decay: recent prices weighted more heavily
    const ageWeight = Math.exp(-i / priceHistory.length);
    const volume = day.volume || 1;
    const weight = volume * ageWeight;

    totalWeightedPrice += day.price * weight;
    totalWeight += weight;
  }

  const realizedPrice = totalWeight > 0 ? totalWeightedPrice / totalWeight : priceHistory[priceHistory.length - 1].price;
  const currentPrice = priceHistory[priceHistory.length - 1].price;
  const diff = ((currentPrice - realizedPrice) / realizedPrice) * 100;

  let signal: RealizedPriceMetric['signal'];
  let description: string;

  if (diff > 10) {
    signal = 'above';
    description = `Price ${diff.toFixed(1)}% above realized price. Market in profit.`;
  } else if (diff < -10) {
    signal = 'below';
    description = `Price ${diff.toFixed(1)}% below realized price. Market in loss.`;
  } else {
    signal = 'near';
    description = `Price near realized price (${diff.toFixed(1)}%). Critical support/resistance zone.`;
  }

  return {
    price: Math.round(realizedPrice),
    vsCurrentPrice: Math.round(diff * 10) / 10,
    signal,
    description
  };
}

/**
 * Calculate STH Realized Price (average cost basis of short-term holders)
 */
export function calculateSTHRealizedPrice(
  priceHistory: { price: number; timestamp: string; volume: number }[]
): number {
  if (priceHistory.length < 90) {
    return priceHistory[priceHistory.length - 1].price;
  }

  const sthWindow = priceHistory.slice(-155); // 155 days for STH cutoff
  let totalWeightedPrice = 0;
  let totalVolume = 0;

  for (const day of sthWindow) {
    const volume = day.volume || 1;
    totalWeightedPrice += day.price * volume;
    totalVolume += volume;
  }

  return totalVolume > 0 ? Math.round(totalWeightedPrice / totalVolume) : priceHistory[priceHistory.length - 1].price;
}

/**
 * Calculate LTH Realized Price (average cost basis of long-term holders)
 */
export function calculateLTHRealizedPrice(
  priceHistory: { price: number; timestamp: string; volume: number }[]
): number {
  if (priceHistory.length < 180) {
    return priceHistory[priceHistory.length - 1].price * 0.6; // Estimate
  }

  // LTH: coins older than 155 days
  const startIdx = Math.max(0, priceHistory.length - 730); // Up to 2 years
  const endIdx = priceHistory.length - 155;
  const lthWindow = priceHistory.slice(startIdx, endIdx);

  let totalWeightedPrice = 0;
  let totalVolume = 0;

  for (const day of lthWindow) {
    const volume = day.volume || 1;
    totalWeightedPrice += day.price * volume;
    totalVolume += volume;
  }

  return totalVolume > 0 ? Math.round(totalWeightedPrice / totalVolume) : priceHistory[priceHistory.length - 1].price * 0.6;
}

/**
 * Analyze profitability metrics and generate trading signals
 */
export function analyzeProfitabilityMetrics(metrics: ProfitabilityMetrics): ProfitabilitySignal[] {
  const signals: ProfitabilitySignal[] = [];

  // SOPR Analysis
  if (metrics.sopr && metrics.sopr.value > 0) {
    if (metrics.sopr.signal === 'capitulation') {
      signals.push({
        signal: 'bullish',
        weight: 0.7,
        reason: `SOPR capitulation (${metrics.sopr.value.toFixed(3)}) - coins sold at loss, bottom signal`,
        metric: 'sopr'
      });
    } else if (metrics.sopr.signal === 'profit_taking') {
      signals.push({
        signal: 'bearish',
        weight: 0.6,
        reason: `SOPR profit-taking (${metrics.sopr.value.toFixed(3)}) - distribution pressure`,
        metric: 'sopr'
      });
    } else if (metrics.sopr.signal === 'equilibrium' && metrics.sopr.trend === 'increasing') {
      signals.push({
        signal: 'bullish',
        weight: 0.4,
        reason: `SOPR crossing 1.0 upward - trend reversal signal`,
        metric: 'sopr'
      });
    } else if (metrics.sopr.signal === 'equilibrium' && metrics.sopr.trend === 'decreasing') {
      signals.push({
        signal: 'bearish',
        weight: 0.4,
        reason: `SOPR crossing 1.0 downward - weakening trend`,
        metric: 'sopr'
      });
    }
  }

  // aSOPR Analysis (stronger signal, filters noise)
  if (metrics.asopr && metrics.asopr.value > 0) {
    if (metrics.asopr.signal === 'capitulation') {
      signals.push({
        signal: 'bullish',
        weight: 0.8,
        reason: `aSOPR capitulation (${metrics.asopr.value.toFixed(3)}) - sustained loss realization`,
        metric: 'asopr'
      });
    } else if (metrics.asopr.signal === 'profit_taking') {
      signals.push({
        signal: 'bearish',
        weight: 0.7,
        reason: `aSOPR profit-taking (${metrics.asopr.value.toFixed(3)}) - strong holders distributing`,
        metric: 'asopr'
      });
    }
  }

  // STH-SOPR Analysis (very reactive to sentiment)
  if (metrics.sthSopr && metrics.sthSopr.value > 0) {
    if (metrics.sthSopr.signal === 'capitulation') {
      signals.push({
        signal: 'bullish',
        weight: 0.9,
        reason: `STH-SOPR capitulation (${metrics.sthSopr.value.toFixed(3)}) - weak hands capitulating, local bottom`,
        metric: 'sth_sopr'
      });
    } else if (metrics.sthSopr.signal === 'profit_taking' && metrics.sthSopr.value > 1.15) {
      signals.push({
        signal: 'bearish',
        weight: 0.7,
        reason: `STH-SOPR high profit-taking (${metrics.sthSopr.value.toFixed(3)}) - short-term euphoria`,
        metric: 'sth_sopr'
      });
    }
  }

  // LTH-SOPR Analysis (cycle indicators)
  if (metrics.lthSopr && metrics.lthSopr.value > 0) {
    if (metrics.lthSopr.signal === 'capitulation' && metrics.lthSopr.value < 0.85) {
      signals.push({
        signal: 'bullish',
        weight: 0.95,
        reason: `LTH-SOPR extreme capitulation (${metrics.lthSopr.value.toFixed(3)}) - cycle bottom signal`,
        metric: 'lth_sopr'
      });
    } else if (metrics.lthSopr.signal === 'profit_taking' && metrics.lthSopr.value > 1.3) {
      signals.push({
        signal: 'bearish',
        weight: 0.8,
        reason: `LTH-SOPR high distribution (${metrics.lthSopr.value.toFixed(3)}) - cycle top signal`,
        metric: 'lth_sopr'
      });
    }
  }

  // Realized Price Analysis
  if (metrics.realizedPrice) {
    if (metrics.realizedPrice.signal === 'below') {
      signals.push({
        signal: 'bullish',
        weight: 0.7,
        reason: `Price below realized price (${metrics.realizedPrice.vsCurrentPrice.toFixed(1)}%) - deep value zone`,
        metric: 'realized_price'
      });
    } else if (metrics.realizedPrice.signal === 'near') {
      signals.push({
        signal: 'neutral',
        weight: 0.5,
        reason: `Price at realized price - critical support/resistance`,
        metric: 'realized_price'
      });
    }
  }

  // Cross-metric analysis: STH vs LTH behavior
  if (metrics.sthSopr && metrics.lthSopr) {
    const sthVsLth = metrics.sthSopr.value - metrics.lthSopr.value;

    if (sthVsLth < -0.15 && metrics.sthSopr.signal === 'capitulation') {
      // STH capitulating while LTH holding = accumulation opportunity
      signals.push({
        signal: 'bullish',
        weight: 0.8,
        reason: 'STH panic selling while LTH accumulate - smart money accumulation',
        metric: 'sopr_divergence'
      });
    } else if (sthVsLth > 0.15 && metrics.lthSopr.signal === 'profit_taking') {
      // Both cohorts taking profits = distribution
      signals.push({
        signal: 'bearish',
        weight: 0.7,
        reason: 'Both STH and LTH taking profits - broad distribution',
        metric: 'sopr_divergence'
      });
    }
  }

  return signals;
}

/**
 * Calculate aggregate profitability score (-1 to 1)
 * -1 = extremely bearish, 0 = neutral, 1 = extremely bullish
 */
export function calculateProfitabilityScore(signals: ProfitabilitySignal[]): {
  score: number;
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
} {
  if (signals.length === 0) {
    return { score: 0, bias: 'neutral', confidence: 0 };
  }

  let bullishWeight = 0;
  let bearishWeight = 0;
  let totalWeight = 0;

  signals.forEach(s => {
    totalWeight += s.weight;
    if (s.signal === 'bullish') {
      bullishWeight += s.weight;
    } else if (s.signal === 'bearish') {
      bearishWeight += s.weight;
    }
  });

  // Score: -1 to 1
  const score = totalWeight > 0 ? (bullishWeight - bearishWeight) / totalWeight : 0;

  // Bias determination
  let bias: 'bullish' | 'bearish' | 'neutral';
  if (score > 0.2) {
    bias = 'bullish';
  } else if (score < -0.2) {
    bias = 'bearish';
  } else {
    bias = 'neutral';
  }

  // Confidence based on signal agreement
  const maxWeight = Math.max(bullishWeight, bearishWeight);
  const confidence = totalWeight > 0 ? maxWeight / totalWeight : 0;

  return { score: Math.round(score * 100) / 100, bias, confidence };
}

/**
 * Format profitability metrics for tweet/display
 */
export function formatMetricsForDisplay(metrics: ProfitabilityMetrics): string[] {
  const lines: string[] = [];

  // SOPR
  const soprEmoji = metrics.sopr.signal === 'capitulation' ? '🟢' :
    metrics.sopr.signal === 'profit_taking' ? '🔴' : '🟡';
  lines.push(`${soprEmoji} SOPR: ${metrics.sopr.value.toFixed(3)} (${metrics.sopr.signal})`);

  // STH-SOPR
  const sthEmoji = metrics.sthSopr.signal === 'capitulation' ? '🟢' :
    metrics.sthSopr.signal === 'profit_taking' ? '🔴' : '🟡';
  lines.push(`${sthEmoji} STH-SOPR: ${metrics.sthSopr.value.toFixed(3)}`);

  // LTH-SOPR
  const lthEmoji = metrics.lthSopr.signal === 'capitulation' ? '🟢' :
    metrics.lthSopr.signal === 'profit_taking' ? '🔴' : '🟡';
  lines.push(`${lthEmoji} LTH-SOPR: ${metrics.lthSopr.value.toFixed(3)}`);

  // Realized Price
  const rpEmoji = metrics.realizedPrice.signal === 'below' ? '🟢' :
    metrics.realizedPrice.signal === 'above' ? '🔴' : '🟡';
  lines.push(`${rpEmoji} Realized Price: $${metrics.realizedPrice.price.toLocaleString()} (${metrics.realizedPrice.vsCurrentPrice >= 0 ? '+' : ''}${metrics.realizedPrice.vsCurrentPrice}%)`);

  return lines;
}

/**
 * Generate profitability summary for tweet
 */
export function generateProfitabilitySummary(metrics: ProfitabilityMetrics): {
  headline: string;
  bias: string;
  topSignals: string[];
} {
  const signals = analyzeProfitabilityMetrics(metrics);
  const { bias, score } = calculateProfitabilityScore(signals);

  // Headline based on bias
  let headline: string;
  if (score > 0.5) {
    headline = 'Profitability metrics strongly bullish';
  } else if (score > 0.2) {
    headline = 'Profitability metrics lean bullish';
  } else if (score < -0.5) {
    headline = 'Profitability metrics strongly bearish';
  } else if (score < -0.2) {
    headline = 'Profitability metrics lean bearish';
  } else {
    headline = 'Profitability metrics neutral';
  }

  // Top 3 signals by weight
  const topSignals = signals
    .filter(s => s.signal !== 'neutral')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(s => s.reason);

  return { headline, bias, topSignals };
}

/**
 * Fetch profitability metrics from cached data or serverless function
 */
export async function fetchProfitabilityMetrics(): Promise<ProfitabilityMetrics | null> {
  try {
    // Try to fetch from cached data first
    const cacheRes = await fetch('/data/profitability-metrics.json');
    if (cacheRes.ok) {
      const data = await cacheRes.json();
      // Check if data is fresh (< 6 hours old)
      const lastUpdated = new Date(data.lastUpdated).getTime();
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      if (lastUpdated > sixHoursAgo) {
        return data;
      }
    }

    // Fallback to live function
    const liveRes = await fetch('/.netlify/functions/profitability-metrics');
    if (liveRes.ok) {
      const result = await liveRes.json();
      if (result.success && result.data) {
        return result.data;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch profitability metrics:', error);
    return null;
  }
}
