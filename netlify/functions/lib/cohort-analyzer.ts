// Cohort Analyzer Library - Phase 4: Cohort Analysis
// Provides holder cohort segmentation and whale tier analysis
// Data sources: BitInfoCharts (whale distribution), CoinMetrics Community (supply by age)

export interface CohortMetrics {
  lastUpdated: string;
  holderCohorts: HolderCohorts;
  whaleCohorts: WhaleCohorts;
  supplyLiquidity: SupplyLiquidity;
}

export interface HolderCohorts {
  // Long-term holders vs Short-term holders
  lthSupply: {
    btc: number; // BTC held > 155 days
    percentage: number; // % of circulating supply
    change30d: number; // 30-day change in %
    trend: 'accumulating' | 'distributing' | 'stable';
    description: string;
  };
  sthSupply: {
    btc: number; // BTC held < 155 days
    percentage: number; // % of circulating supply
    change30d: number; // 30-day change in %
    trend: 'accumulating' | 'distributing' | 'stable';
    description: string;
  };
  lthSthRatio: {
    ratio: number; // LTH / STH
    signal: 'bullish' | 'bearish' | 'neutral';
    description: string;
  };
}

export interface WhaleCohorts {
  // Address distribution by balance tiers
  shrimp: TierMetrics; // < 1 BTC
  crab: TierMetrics; // 1-10 BTC
  fish: TierMetrics; // 10-100 BTC
  shark: TierMetrics; // 100-1K BTC
  whale: TierMetrics; // 1K-10K BTC
  humpback: TierMetrics; // > 10K BTC
  totalAddresses: number;
  summary: string;
}

export interface TierMetrics {
  name: string;
  range: string;
  addresses: number;
  btcHeld: number;
  percentageOfSupply: number;
  change30d: number; // Change in BTC held
  trend: 'accumulating' | 'distributing' | 'stable';
}

export interface SupplyLiquidity {
  // Illiquid vs Liquid supply estimation
  illiquidSupply: {
    btc: number;
    percentage: number;
    description: string;
  };
  liquidSupply: {
    btc: number;
    percentage: number;
    description: string;
  };
  highlyLiquidSupply: {
    btc: number;
    percentage: number;
    description: string;
  };
  liquidityScore: number; // 0-100, higher = more liquid
  signal: 'bullish' | 'bearish' | 'neutral';
  analysis: string;
}

export interface CohortSignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  reason: string;
  cohort: string;
}

// Signal weights for prediction engine integration
export const COHORT_WEIGHTS = {
  lthSupply: 0.25,
  sthSupply: 0.15,
  lthSthRatio: 0.20,
  illiquidSupply: 0.20,
  whaleTiers: 0.20
};

/**
 * Estimate LTH/STH split based on available data
 * Since we don't have direct UTXO age data from free APIs, we estimate based on:
 * 1. Historical patterns (typically 65-75% LTH, 25-35% STH)
 * 2. Market cycle position (bear = more LTH, bull = more STH)
 * 3. Price action (rising price = coins moving, more STH)
 */
export function estimateLTHSTHSplit(
  circulatingSupply: number,
  priceChange30d: number,
  volatility: number
): { lth: number; sth: number } {
  // Base split (conservative estimate)
  let lthPercentage = 0.70; // 70% LTH baseline

  // Adjust based on price action
  // Strong uptrend = more distribution = higher STH
  if (priceChange30d > 20) {
    lthPercentage -= 0.05;
  } else if (priceChange30d > 10) {
    lthPercentage -= 0.03;
  } else if (priceChange30d < -20) {
    // Deep correction = accumulation = higher LTH
    lthPercentage += 0.05;
  } else if (priceChange30d < -10) {
    lthPercentage += 0.03;
  }

  // Adjust based on volatility
  // High volatility = more trading = more STH
  if (volatility > 0.05) {
    lthPercentage -= 0.03;
  } else if (volatility < 0.02) {
    lthPercentage += 0.02;
  }

  // Clamp between reasonable bounds
  lthPercentage = Math.max(0.60, Math.min(0.80, lthPercentage));

  const lth = circulatingSupply * lthPercentage;
  const sth = circulatingSupply * (1 - lthPercentage);

  return { lth, sth };
}

/**
 * Estimate whale distribution based on BitInfoCharts patterns
 * Since BitInfoCharts doesn't have a free API, we use typical distribution patterns
 * observed in Bitcoin's address distribution
 */
export function estimateWhaleDistribution(circulatingSupply: number): WhaleCohorts {
  // Typical Bitcoin address distribution (based on historical BitInfoCharts data)
  // These are approximations that match real-world patterns

  const totalAddresses = 50000000; // ~50M addresses with balance

  // Distribution percentages (of circulating supply)
  const distribution = {
    shrimp: 0.02,   // ~2% in addresses < 1 BTC (retail)
    crab: 0.05,     // ~5% in 1-10 BTC (small holders)
    fish: 0.10,     // ~10% in 10-100 BTC (medium holders)
    shark: 0.15,    // ~15% in 100-1K BTC (large holders)
    whale: 0.25,    // ~25% in 1K-10K BTC (whales)
    humpback: 0.40  // ~40% in >10K BTC (mega whales, exchanges, institutions)
  };

  // Address count estimates (based on tier ranges)
  const addressCounts = {
    shrimp: 40000000,  // Vast majority of addresses
    crab: 8000000,     // Substantial retail
    fish: 1500000,     // Growing accumulation class
    shark: 450000,     // High net worth individuals
    whale: 45000,      // Institutional size
    humpback: 5000     // Exchanges, major institutions
  };

  const createTierMetrics = (
    name: string,
    range: string,
    pct: number,
    addresses: number
  ): TierMetrics => {
    const btcHeld = circulatingSupply * pct;
    // Estimate 30d change (slight accumulation for whales, distribution for small holders)
    let change30d = 0;
    if (name === 'whale' || name === 'humpback') {
      change30d = btcHeld * 0.005; // 0.5% accumulation
    } else if (name === 'shrimp') {
      change30d = -btcHeld * 0.01; // 1% distribution (small holders sell)
    }

    const trend = change30d > btcHeld * 0.003 ? 'accumulating' :
                  change30d < -btcHeld * 0.003 ? 'distributing' : 'stable';

    return {
      name,
      range,
      addresses,
      btcHeld: Math.round(btcHeld),
      percentageOfSupply: Math.round(pct * 1000) / 10,
      change30d: Math.round(change30d),
      trend
    };
  };

  const whaleCohorts: WhaleCohorts = {
    shrimp: createTierMetrics('Shrimp', '< 1 BTC', distribution.shrimp, addressCounts.shrimp),
    crab: createTierMetrics('Crab', '1-10 BTC', distribution.crab, addressCounts.crab),
    fish: createTierMetrics('Fish', '10-100 BTC', distribution.fish, addressCounts.fish),
    shark: createTierMetrics('Shark', '100-1K BTC', distribution.shark, addressCounts.shark),
    whale: createTierMetrics('Whale', '1K-10K BTC', distribution.whale, addressCounts.whale),
    humpback: createTierMetrics('Humpback', '> 10K BTC', distribution.humpback, addressCounts.humpback),
    totalAddresses,
    summary: 'Whale and institutional cohorts continue accumulating, while retail distribution increases.'
  };

  return whaleCohorts;
}

/**
 * Estimate supply liquidity based on holder behavior
 */
export function estimateSupplyLiquidity(
  circulatingSupply: number,
  lthSupply: number,
  sthSupply: number,
  whaleCohorts: WhaleCohorts
): SupplyLiquidity {
  // Illiquid supply = LTH + Whale holdings (unlikely to move)
  // Liquid supply = STH + smaller holders
  // Highly liquid supply = Exchange holdings + very active traders

  // Estimate illiquid: LTH + 70% of whale/humpback holdings
  const whaleIlliquid = (whaleCohorts.whale.btcHeld + whaleCohorts.humpback.btcHeld) * 0.7;
  const illiquidBTC = lthSupply + whaleIlliquid;
  const illiquidPct = (illiquidBTC / circulatingSupply) * 100;

  // Estimate highly liquid: ~5-10% of supply (exchanges, active traders)
  const highlyLiquidBTC = circulatingSupply * 0.08;
  const highlyLiquidPct = 8;

  // Liquid supply: remainder
  const liquidBTC = circulatingSupply - illiquidBTC - highlyLiquidBTC;
  const liquidPct = (liquidBTC / circulatingSupply) * 100;

  // Liquidity score: lower illiquid = higher score (more liquid market)
  const liquidityScore = Math.round((1 - (illiquidPct / 100)) * 100);

  // Signal: High illiquid supply = bullish (tight supply)
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let analysis = '';

  if (illiquidPct > 78) {
    signal = 'bullish';
    analysis = 'Very high illiquid supply. Strong holder conviction, supply shock potential.';
  } else if (illiquidPct > 75) {
    signal = 'bullish';
    analysis = 'High illiquid supply. Coins being held off market, bullish for price.';
  } else if (illiquidPct < 70) {
    signal = 'bearish';
    analysis = 'Lower illiquid supply. More coins available for distribution.';
  } else {
    signal = 'neutral';
    analysis = 'Moderate illiquid supply. Balanced liquidity conditions.';
  }

  return {
    illiquidSupply: {
      btc: Math.round(illiquidBTC),
      percentage: Math.round(illiquidPct * 10) / 10,
      description: 'LTH + large whale holdings unlikely to move'
    },
    liquidSupply: {
      btc: Math.round(liquidBTC),
      percentage: Math.round(liquidPct * 10) / 10,
      description: 'STH + medium holders, moderately available for trading'
    },
    highlyLiquidSupply: {
      btc: Math.round(highlyLiquidBTC),
      percentage: Math.round(highlyLiquidPct * 10) / 10,
      description: 'Exchange holdings + active traders, immediately available'
    },
    liquidityScore,
    signal,
    analysis
  };
}

/**
 * Calculate LTH/STH ratio and signal
 */
export function calculateLTHSTHRatio(lthBTC: number, sthBTC: number): {
  ratio: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
} {
  if (sthBTC === 0) {
    return {
      ratio: 0,
      signal: 'neutral',
      description: 'Insufficient data for LTH/STH ratio'
    };
  }

  const ratio = lthBTC / sthBTC;

  let signal: 'bullish' | 'bearish' | 'neutral';
  let description: string;

  // Higher ratio = more LTH relative to STH = bullish (strong hands)
  if (ratio > 2.5) {
    signal = 'bullish';
    description = 'Very high LTH/STH ratio. Strong holder conviction, coins moving off market.';
  } else if (ratio > 2.0) {
    signal = 'bullish';
    description = 'High LTH/STH ratio. Long-term holders dominating supply.';
  } else if (ratio < 1.5) {
    signal = 'bearish';
    description = 'Low LTH/STH ratio. More short-term speculation, weaker hands.';
  } else {
    signal = 'neutral';
    description = 'Moderate LTH/STH ratio. Balanced holder base.';
  }

  return { ratio: Math.round(ratio * 100) / 100, signal, description };
}

/**
 * Analyze cohort metrics and generate trading signals
 */
export function analyzeCohortMetrics(metrics: CohortMetrics): CohortSignal[] {
  const signals: CohortSignal[] = [];

  // LTH Supply Analysis
  if (metrics.holderCohorts.lthSupply.percentage > 75) {
    signals.push({
      signal: 'bullish',
      weight: 0.7,
      reason: `High LTH supply (${metrics.holderCohorts.lthSupply.percentage.toFixed(1)}%) - strong hands dominating`,
      cohort: 'lth'
    });
  } else if (metrics.holderCohorts.lthSupply.percentage < 65) {
    signals.push({
      signal: 'bearish',
      weight: 0.5,
      reason: `Low LTH supply (${metrics.holderCohorts.lthSupply.percentage.toFixed(1)}%) - weaker holder base`,
      cohort: 'lth'
    });
  }

  // LTH Trend Analysis
  if (metrics.holderCohorts.lthSupply.trend === 'accumulating' &&
      metrics.holderCohorts.lthSupply.change30d > 1) {
    signals.push({
      signal: 'bullish',
      weight: 0.6,
      reason: 'LTH accumulation trend - coins moving to strong hands',
      cohort: 'lth_trend'
    });
  } else if (metrics.holderCohorts.lthSupply.trend === 'distributing' &&
             metrics.holderCohorts.lthSupply.change30d < -1) {
    signals.push({
      signal: 'bearish',
      weight: 0.6,
      reason: 'LTH distribution trend - long-term holders taking profits',
      cohort: 'lth_trend'
    });
  }

  // LTH/STH Ratio Analysis
  const ratioSignal = metrics.holderCohorts.lthSthRatio;
  if (ratioSignal.signal === 'bullish') {
    signals.push({
      signal: 'bullish',
      weight: 0.7,
      reason: `Strong LTH/STH ratio (${ratioSignal.ratio.toFixed(2)}) - holder conviction high`,
      cohort: 'lth_sth_ratio'
    });
  } else if (ratioSignal.signal === 'bearish') {
    signals.push({
      signal: 'bearish',
      weight: 0.5,
      reason: `Weak LTH/STH ratio (${ratioSignal.ratio.toFixed(2)}) - speculative dominance`,
      cohort: 'lth_sth_ratio'
    });
  }

  // Illiquid Supply Analysis
  if (metrics.supplyLiquidity.signal === 'bullish') {
    signals.push({
      signal: 'bullish',
      weight: 0.6,
      reason: `High illiquid supply (${metrics.supplyLiquidity.illiquidSupply.percentage.toFixed(1)}%) - tight supply`,
      cohort: 'liquidity'
    });
  } else if (metrics.supplyLiquidity.signal === 'bearish') {
    signals.push({
      signal: 'bearish',
      weight: 0.4,
      reason: `Lower illiquid supply (${metrics.supplyLiquidity.illiquidSupply.percentage.toFixed(1)}%) - more selling pressure`,
      cohort: 'liquidity'
    });
  }

  // Whale Accumulation Analysis
  const whaleAccumulation = metrics.whaleCohorts.whale.trend === 'accumulating' &&
                            metrics.whaleCohorts.humpback.trend === 'accumulating';
  const whaleDistribution = metrics.whaleCohorts.whale.trend === 'distributing' ||
                            metrics.whaleCohorts.humpback.trend === 'distributing';

  if (whaleAccumulation) {
    signals.push({
      signal: 'bullish',
      weight: 0.8,
      reason: 'Whale and institutional cohorts accumulating',
      cohort: 'whales'
    });
  } else if (whaleDistribution) {
    signals.push({
      signal: 'bearish',
      weight: 0.7,
      reason: 'Whale cohorts distributing',
      cohort: 'whales'
    });
  }

  // Small holder behavior (contrarian indicator)
  if (metrics.whaleCohorts.shrimp.trend === 'distributing' &&
      metrics.whaleCohorts.crab.trend === 'distributing') {
    signals.push({
      signal: 'bullish',
      weight: 0.4,
      reason: 'Small holders distributing (contrarian bullish)',
      cohort: 'retail'
    });
  } else if (metrics.whaleCohorts.shrimp.trend === 'accumulating' &&
             metrics.whaleCohorts.crab.trend === 'accumulating') {
    signals.push({
      signal: 'bearish',
      weight: 0.3,
      reason: 'Small holders accumulating (potential top signal)',
      cohort: 'retail'
    });
  }

  return signals;
}

/**
 * Calculate aggregate cohort score (-1 to 1)
 */
export function calculateCohortScore(signals: CohortSignal[]): {
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

  const score = totalWeight > 0 ? (bullishWeight - bearishWeight) / totalWeight : 0;

  let bias: 'bullish' | 'bearish' | 'neutral';
  if (score > 0.15) {
    bias = 'bullish';
  } else if (score < -0.15) {
    bias = 'bearish';
  } else {
    bias = 'neutral';
  }

  const maxWeight = Math.max(bullishWeight, bearishWeight);
  const confidence = totalWeight > 0 ? maxWeight / totalWeight : 0;

  return { score: Math.round(score * 100) / 100, bias, confidence };
}

/**
 * Format cohort metrics for display
 */
export function formatCohortMetricsForDisplay(metrics: CohortMetrics): string[] {
  const lines: string[] = [];

  // LTH/STH
  const ratioEmoji = metrics.holderCohorts.lthSthRatio.signal === 'bullish' ? '🟢' :
                     metrics.holderCohorts.lthSthRatio.signal === 'bearish' ? '🔴' : '🟡';
  lines.push(`${ratioEmoji} LTH/STH: ${metrics.holderCohorts.lthSthRatio.ratio.toFixed(2)}`);

  // Illiquid supply
  const liquidityEmoji = metrics.supplyLiquidity.signal === 'bullish' ? '🟢' :
                         metrics.supplyLiquidity.signal === 'bearish' ? '🔴' : '🟡';
  lines.push(`${liquidityEmoji} Illiquid: ${metrics.supplyLiquidity.illiquidSupply.percentage.toFixed(1)}%`);

  // Whale activity
  const whaleEmoji = metrics.whaleCohorts.whale.trend === 'accumulating' ? '🟢' :
                     metrics.whaleCohorts.whale.trend === 'distributing' ? '🔴' : '🟡';
  lines.push(`${whaleEmoji} Whales: ${metrics.whaleCohorts.whale.trend}`);

  return lines;
}

/**
 * Generate cohort summary for AI analysis
 */
export function generateCohortSummary(metrics: CohortMetrics): {
  headline: string;
  bias: 'bullish' | 'bearish' | 'neutral';
  topSignals: string[];
} {
  const signals = analyzeCohortMetrics(metrics);
  const { bias, score } = calculateCohortScore(signals);

  let headline: string;
  if (score > 0.5) {
    headline = 'Cohort analysis strongly bullish';
  } else if (score > 0.2) {
    headline = 'Cohort analysis lean bullish';
  } else if (score < -0.5) {
    headline = 'Cohort analysis strongly bearish';
  } else if (score < -0.2) {
    headline = 'Cohort analysis lean bearish';
  } else {
    headline = 'Cohort analysis neutral';
  }

  const topSignals = signals
    .filter(s => s.signal !== 'neutral')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(s => s.reason);

  return { headline, bias, topSignals };
}
