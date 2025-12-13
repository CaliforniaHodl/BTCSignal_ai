// On-Chain Analyzer Library
// Shared logic for on-chain metrics analysis
// Used by: prediction-engine.ts, btctradingbot-tweets.ts, onchain-metrics.ts

export interface OnChainMetrics {
  lastUpdated: string;
  nvt: NVTMetric;
  puellMultiple: PuellMetric;
  stockToFlow: S2FMetric;
  ssr: SSRMetric;
  reserveRisk: ReserveRiskMetric;
  nupl: NUPLMetric;
}

export interface NVTMetric {
  ratio: number;
  signal: 'undervalued' | 'fair' | 'overvalued';
  description: string;
}

export interface PuellMetric {
  value: number;
  zone: 'buy' | 'neutral' | 'sell';
  description: string;
}

export interface S2FMetric {
  ratio: number;
  modelPrice: number;
  deflection: number;
  signal: 'undervalued' | 'fair' | 'overvalued';
}

export interface SSRMetric {
  ratio: number;
  trend: 'bullish' | 'neutral' | 'bearish';
  description: string;
}

export interface ReserveRiskMetric {
  value: number;
  zone: 'opportunity' | 'neutral' | 'risk';
  description: string;
}

export interface NUPLMetric {
  value: number;
  zone: 'capitulation' | 'hope' | 'optimism' | 'belief' | 'euphoria';
  description: string;
}

export interface OnChainSignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  reason: string;
  metric: string;
}

// Signal weights for prediction engine integration
export const ONCHAIN_WEIGHTS = {
  nvt: 0.15,
  puellMultiple: 0.15,
  stockToFlow: 0.10,
  ssr: 0.20,
  reserveRisk: 0.15,
  nupl: 0.25
};

/**
 * Analyze on-chain metrics and generate trading signals
 */
export function analyzeOnChainMetrics(metrics: OnChainMetrics): OnChainSignal[] {
  const signals: OnChainSignal[] = [];

  // NVT Analysis
  if (metrics.nvt && metrics.nvt.ratio > 0) {
    if (metrics.nvt.signal === 'undervalued') {
      signals.push({
        signal: 'bullish',
        weight: 0.6,
        reason: `NVT undervalued (${metrics.nvt.ratio.toFixed(1)}) - network utility exceeds valuation`,
        metric: 'nvt'
      });
    } else if (metrics.nvt.signal === 'overvalued') {
      signals.push({
        signal: 'bearish',
        weight: 0.6,
        reason: `NVT overvalued (${metrics.nvt.ratio.toFixed(1)}) - speculative premium`,
        metric: 'nvt'
      });
    } else {
      signals.push({
        signal: 'neutral',
        weight: 0.2,
        reason: `NVT fair (${metrics.nvt.ratio.toFixed(1)})`,
        metric: 'nvt'
      });
    }
  }

  // Puell Multiple Analysis
  if (metrics.puellMultiple && metrics.puellMultiple.value > 0) {
    if (metrics.puellMultiple.zone === 'buy') {
      signals.push({
        signal: 'bullish',
        weight: 0.7,
        reason: `Puell Multiple buy zone (${metrics.puellMultiple.value.toFixed(2)}) - miner capitulation`,
        metric: 'puell'
      });
    } else if (metrics.puellMultiple.zone === 'sell') {
      signals.push({
        signal: 'bearish',
        weight: 0.7,
        reason: `Puell Multiple sell zone (${metrics.puellMultiple.value.toFixed(2)}) - miner distribution`,
        metric: 'puell'
      });
    }
  }

  // Stock-to-Flow Analysis
  if (metrics.stockToFlow && metrics.stockToFlow.ratio > 0) {
    const deflection = metrics.stockToFlow.deflection;
    if (deflection < -30) {
      signals.push({
        signal: 'bullish',
        weight: 0.4,
        reason: `S2F model undervalued (${deflection.toFixed(0)}% below model)`,
        metric: 's2f'
      });
    } else if (deflection > 30) {
      signals.push({
        signal: 'bearish',
        weight: 0.4,
        reason: `S2F model overvalued (${deflection.toFixed(0)}% above model)`,
        metric: 's2f'
      });
    }
  }

  // Stablecoin Supply Ratio Analysis
  if (metrics.ssr && metrics.ssr.ratio > 0) {
    if (metrics.ssr.trend === 'bullish') {
      signals.push({
        signal: 'bullish',
        weight: 0.6,
        reason: `SSR bullish (${metrics.ssr.ratio.toFixed(1)}) - high stablecoin buying power`,
        metric: 'ssr'
      });
    } else if (metrics.ssr.trend === 'bearish') {
      signals.push({
        signal: 'bearish',
        weight: 0.5,
        reason: `SSR bearish (${metrics.ssr.ratio.toFixed(1)}) - limited dry powder`,
        metric: 'ssr'
      });
    }
  }

  // Reserve Risk Analysis
  if (metrics.reserveRisk && metrics.reserveRisk.value > 0) {
    if (metrics.reserveRisk.zone === 'opportunity') {
      signals.push({
        signal: 'bullish',
        weight: 0.7,
        reason: `Reserve Risk opportunity (${metrics.reserveRisk.value.toFixed(4)}) - accumulation zone`,
        metric: 'reserveRisk'
      });
    } else if (metrics.reserveRisk.zone === 'risk') {
      signals.push({
        signal: 'bearish',
        weight: 0.6,
        reason: `Reserve Risk elevated (${metrics.reserveRisk.value.toFixed(4)}) - consider profit-taking`,
        metric: 'reserveRisk'
      });
    }
  }

  // NUPL Analysis - strongest signal
  if (metrics.nupl) {
    const { zone, value } = metrics.nupl;
    switch (zone) {
      case 'capitulation':
        signals.push({
          signal: 'bullish',
          weight: 0.9,
          reason: `NUPL capitulation (${(value * 100).toFixed(0)}%) - historically strong buy`,
          metric: 'nupl'
        });
        break;
      case 'hope':
        signals.push({
          signal: 'bullish',
          weight: 0.5,
          reason: `NUPL hope phase (${(value * 100).toFixed(0)}%) - early recovery`,
          metric: 'nupl'
        });
        break;
      case 'belief':
        signals.push({
          signal: 'bullish',
          weight: 0.3,
          reason: `NUPL belief phase (${(value * 100).toFixed(0)}%) - bull market`,
          metric: 'nupl'
        });
        break;
      case 'euphoria':
        signals.push({
          signal: 'bearish',
          weight: 0.8,
          reason: `NUPL euphoria (${(value * 100).toFixed(0)}%) - historically strong sell`,
          metric: 'nupl'
        });
        break;
    }
  }

  return signals;
}

/**
 * Calculate aggregate on-chain score (-1 to 1)
 * -1 = extremely bearish, 0 = neutral, 1 = extremely bullish
 */
export function calculateOnChainScore(signals: OnChainSignal[]): {
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
  if (score > 0.15) {
    bias = 'bullish';
  } else if (score < -0.15) {
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
 * Fetch on-chain metrics from cached data or serverless function
 */
export async function fetchOnChainMetrics(): Promise<OnChainMetrics | null> {
  try {
    // Try to fetch from cached data first
    const cacheRes = await fetch('/data/onchain-metrics.json');
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
    const liveRes = await fetch('/.netlify/functions/onchain-metrics');
    if (liveRes.ok) {
      const result = await liveRes.json();
      if (result.success && result.data) {
        return result.data;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch on-chain metrics:', error);
    return null;
  }
}

/**
 * Format on-chain metrics for tweet/display
 */
export function formatMetricsForDisplay(metrics: OnChainMetrics): string[] {
  const lines: string[] = [];

  // NVT
  const nvtEmoji = metrics.nvt.signal === 'undervalued' ? '🟢' :
    metrics.nvt.signal === 'overvalued' ? '🔴' : '🟡';
  lines.push(`${nvtEmoji} NVT: ${metrics.nvt.ratio.toFixed(1)} (${metrics.nvt.signal})`);

  // Puell
  const puellEmoji = metrics.puellMultiple.zone === 'buy' ? '🟢' :
    metrics.puellMultiple.zone === 'sell' ? '🔴' : '🟡';
  lines.push(`${puellEmoji} Puell: ${metrics.puellMultiple.value.toFixed(2)} (${metrics.puellMultiple.zone})`);

  // NUPL
  const nuplEmoji = ['capitulation', 'hope'].includes(metrics.nupl.zone) ? '🟢' :
    metrics.nupl.zone === 'euphoria' ? '🔴' : '🟡';
  lines.push(`${nuplEmoji} NUPL: ${(metrics.nupl.value * 100).toFixed(0)}% (${metrics.nupl.zone})`);

  // SSR
  const ssrEmoji = metrics.ssr.trend === 'bullish' ? '🟢' :
    metrics.ssr.trend === 'bearish' ? '🔴' : '🟡';
  lines.push(`${ssrEmoji} SSR: ${metrics.ssr.ratio.toFixed(1)} (${metrics.ssr.trend})`);

  return lines;
}

/**
 * Generate on-chain summary for tweet
 */
export function generateOnChainSummary(metrics: OnChainMetrics): {
  headline: string;
  bias: string;
  topSignals: string[];
} {
  const signals = analyzeOnChainMetrics(metrics);
  const { bias, score } = calculateOnChainScore(signals);

  // Headline based on bias
  let headline: string;
  if (score > 0.5) {
    headline = 'On-chain metrics strongly bullish';
  } else if (score > 0.2) {
    headline = 'On-chain metrics lean bullish';
  } else if (score < -0.5) {
    headline = 'On-chain metrics strongly bearish';
  } else if (score < -0.2) {
    headline = 'On-chain metrics lean bearish';
  } else {
    headline = 'On-chain metrics neutral';
  }

  // Top 3 signals by weight
  const topSignals = signals
    .filter(s => s.signal !== 'neutral')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(s => s.reason);

  return { headline, bias, topSignals };
}
