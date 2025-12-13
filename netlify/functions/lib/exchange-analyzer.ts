// Exchange Flow Analyzer - Phase 2: Exchange Intelligence
// Provides real-time exchange flow metrics from mempool data and whale tracking

import type { WhaleAlert } from './tweet-generator';

export interface ExchangeFlowData {
  // Core flow metrics
  netflow24h: number; // Positive = net inflow (bearish), Negative = net outflow (bullish)
  inflow24h: number;
  outflow24h: number;

  // Per-exchange breakdown
  exchanges: {
    name: string;
    inflow24h: number;
    outflow24h: number;
    netflow: number;
    trend: 'accumulation' | 'distribution' | 'neutral';
  }[];

  // Whale metrics
  whaleRatio: number; // Top 10 transactions / total volume
  largestInflow: number;
  largestOutflow: number;

  // Signal
  flowSignal: 'bullish' | 'bearish' | 'neutral';
  flowStrength: number; // 0-100
  analysis: string;
}

export interface ExchangeReserveEstimate {
  exchange: string;
  estimatedBTC: number;
  change24h: number;
  confidence: 'high' | 'medium' | 'low';
}

// Known exchange addresses (extended from whale-tracker)
const EXCHANGE_ADDRESSES: Record<string, string[]> = {
  'Binance': [
    '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
    'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97',
    '3JZq4atUahhuA9rLhXLMhhTo133J9rF97j',
    '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s',
    'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h',
  ],
  'Coinbase': [
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    '3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS',
    '1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g',
    'bc1q4c8n5t00jmj8temxdgcc3t32nkg2wjwz24lywv',
  ],
  'Kraken': [
    'bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6',
    '3AfSvBkWHLZH4XnPPMXEqrvoT4CtDMuWhk',
  ],
  'Bitfinex': [
    'bc1qgxj7pc9npqntgv7w39h72y5lnppyqz05xhgm3e',
    '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r',
  ],
  'OKX': [
    'bc1q2s3rjwvam9dt2ftt4sqxqjf3twav0gdnv0z5jk',
  ],
  'Bybit': [
    'bc1qjasf9z3h7w3jspkhtgatgpyvvzgpa2wwd2lr0eh5tx44reyn2k7sfc27a4',
  ],
  'HTX': [
    '1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ',
    '1AC4fMwgY8j9onSbXEWeH6Zan8QGMSdmtA',
  ],
  'Gemini': [
    '3D8qAoMkZ8F1b3bCcCuWAHqD7ZvXvqoHKq',
  ],
};

// Historical average reserves (for estimation)
const ESTIMATED_RESERVES: Record<string, number> = {
  'Binance': 580000,
  'Coinbase': 420000,
  'Bitfinex': 180000,
  'Kraken': 140000,
  'OKX': 130000,
  'HTX': 80000,
  'Bybit': 70000,
  'Gemini': 50000,
};

/**
 * Analyze exchange flows from whale alert data
 */
export function analyzeExchangeFlows(alerts: WhaleAlert[]): ExchangeFlowData {
  // Initialize per-exchange tracking
  const exchangeFlows: Record<string, { inflow: number; outflow: number }> = {};
  Object.keys(EXCHANGE_ADDRESSES).forEach(exchange => {
    exchangeFlows[exchange] = { inflow: 0, outflow: 0 };
  });

  // Track all flows for whale ratio calculation
  const allInflows: number[] = [];
  const allOutflows: number[] = [];

  // Process alerts
  for (const alert of alerts) {
    if (alert.type === 'exchange_deposit') {
      allInflows.push(alert.amount_btc);

      // Map to exchange
      const exchange = alert.to_type;
      if (exchangeFlows[exchange]) {
        exchangeFlows[exchange].inflow += alert.amount_btc;
      }
    } else if (alert.type === 'exchange_withdrawal') {
      allOutflows.push(alert.amount_btc);

      // Map to exchange
      const exchange = alert.from_type;
      if (exchangeFlows[exchange]) {
        exchangeFlows[exchange].outflow += alert.amount_btc;
      }
    }
  }

  // Calculate totals
  const totalInflow = allInflows.reduce((sum, v) => sum + v, 0);
  const totalOutflow = allOutflows.reduce((sum, v) => sum + v, 0);
  const netflow = totalInflow - totalOutflow;

  // Calculate whale ratio (top 10 transactions / total)
  const top10Inflows = allInflows.sort((a, b) => b - a).slice(0, 10);
  const top10Outflows = allOutflows.sort((a, b) => b - a).slice(0, 10);
  const top10Total = top10Inflows.reduce((s, v) => s + v, 0) + top10Outflows.reduce((s, v) => s + v, 0);
  const totalVolume = totalInflow + totalOutflow;
  const whaleRatio = totalVolume > 0 ? top10Total / totalVolume : 0;

  // Build per-exchange data
  const exchanges = Object.entries(exchangeFlows)
    .map(([name, flows]) => ({
      name,
      inflow24h: flows.inflow,
      outflow24h: flows.outflow,
      netflow: flows.inflow - flows.outflow,
      trend: (flows.outflow - flows.inflow > 100 ? 'accumulation' :
              flows.inflow - flows.outflow > 100 ? 'distribution' : 'neutral') as 'accumulation' | 'distribution' | 'neutral',
    }))
    .filter(e => e.inflow24h > 0 || e.outflow24h > 0)
    .sort((a, b) => (b.inflow24h + b.outflow24h) - (a.inflow24h + a.outflow24h));

  // Determine signal
  let flowSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let flowStrength = 50;
  let analysis = '';

  if (netflow < -1000) {
    flowSignal = 'bullish';
    flowStrength = Math.min(100, 50 + Math.abs(netflow) / 100);
    analysis = `Strong net outflows (-${Math.abs(netflow).toFixed(0)} BTC). Coins moving to cold storage signals accumulation.`;
  } else if (netflow < -200) {
    flowSignal = 'bullish';
    flowStrength = 60;
    analysis = `Net outflows (-${Math.abs(netflow).toFixed(0)} BTC). Mild accumulation signal.`;
  } else if (netflow > 1000) {
    flowSignal = 'bearish';
    flowStrength = Math.min(100, 50 + netflow / 100);
    analysis = `Strong net inflows (+${netflow.toFixed(0)} BTC). Large deposits may indicate selling pressure ahead.`;
  } else if (netflow > 200) {
    flowSignal = 'bearish';
    flowStrength = 40;
    analysis = `Net inflows (+${netflow.toFixed(0)} BTC). Mild distribution signal.`;
  } else {
    flowSignal = 'neutral';
    flowStrength = 50;
    analysis = `Balanced exchange flows. No strong directional signal.`;
  }

  // Adjust for whale ratio
  if (whaleRatio > 0.8) {
    analysis += ` High whale dominance (${(whaleRatio * 100).toFixed(0)}%) - large players driving flows.`;
  }

  return {
    netflow24h: netflow,
    inflow24h: totalInflow,
    outflow24h: totalOutflow,
    exchanges,
    whaleRatio,
    largestInflow: allInflows[0] || 0,
    largestOutflow: allOutflows[0] || 0,
    flowSignal,
    flowStrength,
    analysis,
  };
}

/**
 * Estimate exchange reserves based on historical data + flows
 */
export function estimateExchangeReserves(
  flows: ExchangeFlowData,
  previousReserves?: ExchangeReserveEstimate[]
): ExchangeReserveEstimate[] {
  const estimates: ExchangeReserveEstimate[] = [];

  for (const [exchange, baseReserve] of Object.entries(ESTIMATED_RESERVES)) {
    // Find flow data for this exchange
    const exchangeFlow = flows.exchanges.find(e => e.name === exchange);
    const netChange = exchangeFlow ? exchangeFlow.netflow : 0;

    // Get previous reserve if available
    const prevReserve = previousReserves?.find(r => r.exchange === exchange);
    const prevBTC = prevReserve?.estimatedBTC || baseReserve;

    // Estimate new reserve
    const estimatedBTC = prevBTC + netChange;
    const change24h = prevBTC > 0 ? ((estimatedBTC - prevBTC) / prevBTC) * 100 : 0;

    estimates.push({
      exchange,
      estimatedBTC: Math.round(estimatedBTC),
      change24h: Math.round(change24h * 100) / 100,
      confidence: exchangeFlow && (exchangeFlow.inflow24h > 0 || exchangeFlow.outflow24h > 0) ? 'medium' : 'low',
    });
  }

  return estimates.sort((a, b) => b.estimatedBTC - a.estimatedBTC);
}

/**
 * Calculate Fund Flow Ratio
 * Exchange volume / Total on-chain volume
 */
export function calculateFundFlowRatio(
  exchangeVolume: number,
  totalOnChainVolume: number
): { ratio: number; interpretation: string } {
  if (totalOnChainVolume <= 0) {
    return { ratio: 0, interpretation: 'Insufficient data' };
  }

  const ratio = exchangeVolume / totalOnChainVolume;

  let interpretation = '';
  if (ratio > 0.3) {
    interpretation = 'High exchange activity relative to on-chain transfers. Speculative trading dominant.';
  } else if (ratio > 0.15) {
    interpretation = 'Normal exchange activity. Balanced market conditions.';
  } else {
    interpretation = 'Low exchange activity. HODLing behavior dominant.';
  }

  return { ratio: Math.round(ratio * 1000) / 1000, interpretation };
}

/**
 * Generate exchange flow signals for prediction engine
 */
export function generateExchangeFlowSignals(flows: ExchangeFlowData): {
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 0;

  // Netflow analysis
  if (flows.netflow24h < -1000) {
    score += 2;
    factors.push('Strong exchange outflows');
  } else if (flows.netflow24h < -200) {
    score += 1;
    factors.push('Moderate exchange outflows');
  } else if (flows.netflow24h > 1000) {
    score -= 2;
    factors.push('Strong exchange inflows');
  } else if (flows.netflow24h > 200) {
    score -= 1;
    factors.push('Moderate exchange inflows');
  }

  // Whale ratio analysis
  if (flows.whaleRatio > 0.8) {
    // High whale dominance amplifies the signal
    if (score > 0) {
      score += 0.5;
      factors.push('Whale-driven outflows');
    } else if (score < 0) {
      score -= 0.5;
      factors.push('Whale-driven inflows');
    }
  }

  // Per-exchange analysis
  const accumulatingExchanges = flows.exchanges.filter(e => e.trend === 'accumulation');
  const distributingExchanges = flows.exchanges.filter(e => e.trend === 'distribution');

  if (accumulatingExchanges.length >= 3) {
    score += 1;
    factors.push(`Multiple exchanges seeing outflows (${accumulatingExchanges.map(e => e.name).join(', ')})`);
  } else if (distributingExchanges.length >= 3) {
    score -= 1;
    factors.push(`Multiple exchanges seeing inflows (${distributingExchanges.map(e => e.name).join(', ')})`);
  }

  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (score >= 2) {
    signal = 'bullish';
  } else if (score >= 1) {
    signal = 'bullish';
  } else if (score <= -2) {
    signal = 'bearish';
  } else if (score <= -1) {
    signal = 'bearish';
  }

  // Weight based on data quality (more flows = higher confidence)
  const totalFlows = flows.inflow24h + flows.outflow24h;
  let weight = 0.5; // Base weight
  if (totalFlows > 5000) {
    weight = 0.8;
  } else if (totalFlows > 2000) {
    weight = 0.7;
  } else if (totalFlows > 500) {
    weight = 0.6;
  }

  return { signal, weight, factors };
}

/**
 * Format exchange flows for tweet display
 */
export function formatExchangeFlowsForTweet(flows: ExchangeFlowData): string[] {
  const lines: string[] = [];

  // Flow direction emoji
  const emoji = flows.flowSignal === 'bullish' ? '🟢' :
                flows.flowSignal === 'bearish' ? '🔴' : '🟡';

  // Main metrics
  lines.push(`${emoji} Netflow: ${flows.netflow24h >= 0 ? '+' : ''}${flows.netflow24h.toFixed(0)} BTC`);
  lines.push(`📥 Inflows: ${flows.inflow24h.toFixed(0)} BTC`);
  lines.push(`📤 Outflows: ${flows.outflow24h.toFixed(0)} BTC`);

  // Top exchange if significant
  if (flows.exchanges.length > 0) {
    const top = flows.exchanges[0];
    const topEmoji = top.trend === 'accumulation' ? '🟢' : top.trend === 'distribution' ? '🔴' : '🟡';
    lines.push(`${topEmoji} ${top.name}: ${top.netflow >= 0 ? '+' : ''}${top.netflow.toFixed(0)} BTC`);
  }

  return lines;
}

/**
 * Generate exchange flow summary for AI analysis
 */
export function generateExchangeFlowSummary(flows: ExchangeFlowData): {
  headline: string;
  bias: 'bullish' | 'bearish' | 'neutral';
  details: string;
} {
  const bias = flows.flowSignal;

  let headline = '';
  if (bias === 'bullish') {
    headline = `Accumulation: ${Math.abs(flows.netflow24h).toFixed(0)} BTC net outflow`;
  } else if (bias === 'bearish') {
    headline = `Distribution: ${flows.netflow24h.toFixed(0)} BTC net inflow`;
  } else {
    headline = 'Exchange flows balanced';
  }

  return {
    headline,
    bias,
    details: flows.analysis,
  };
}
