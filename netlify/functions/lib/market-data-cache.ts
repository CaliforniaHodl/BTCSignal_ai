// Market Data Cache
// Loads hourly market data from Blob storage and provides trend analysis

import { loadFromBlob } from './shared';
import {
  TrendMetrics,
  MomentumMetrics,
  MultiTimeframeSignal,
  DivergenceSignal,
  getTrendDirection,
  analyzeMomentum,
  analyzeMultiTimeframe,
  detectDivergence,
  calculateVelocity,
  getMovingAverage,
  getWeightedMovingAverage,
  calculateStandardDeviation
} from './hourly-trend-analyzer';

// Market snapshot structure (from fetch-market-data.ts)
export interface MarketSnapshot {
  timestamp: string;
  btc: {
    price: number;
    price24hAgo: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number;
  };
  fearGreed: {
    value: number;
    label: string;
  };
  funding: {
    rate: number;
    ratePercent: number;
    binance?: number;
    bybit?: number;
    exchanges: {
      bybit: { rate: number; ratePercent: number; nextFundingTime: number };
      okx: { rate: number; ratePercent: number; nextFundingTime: number };
      binance: { rate: number; ratePercent: number; nextFundingTime: number };
      dydx: { rate: number; ratePercent: number; nextFundingTime: number };
      bitget: { rate: number; ratePercent: number; nextFundingTime: number };
    };
    history: Array<{ timestamp: number; rate: number }>;
  };
  openInterest: {
    btc: number;
    usd: number;
    change24h: number;
    change24hPercent: number;
    oiMarketCapRatio: number;
    binance?: { btc: number; usd: number };
    bybit?: { btc: number; usd: number };
    history: Array<{ timestamp: number; btc: number; usd: number; price: number }>;
  };
  longShortRatio: {
    ratio: number;
    longPercent: number;
    shortPercent: number;
    source: string;
  };
  dominance: {
    btc: number;
  };
  hashrate: {
    current: number;
    unit: string;
    history: number[][];
  };
  network: {
    blockHeight: number;
    difficulty: number;
    mempool: {
      size: number;
      bytes: number;
      feesBTC: number;
      congestion: 'low' | 'medium' | 'high' | 'extreme';
    };
  };
  liquidation: {
    levels: Array<{
      price: number;
      type: 'long' | 'short';
      leverage: number;
      intensity: number;
      estimatedValue: number;
      exchange: string;
    }>;
    stats24h: {
      total: number;
      long: number;
      short: number;
      ratio: number;
    };
  };
}

// Hourly trend factors for prediction engine
export interface HourlyTrendFactors {
  fundingVelocity6h: number;
  fundingVelocity24h: number;
  fundingTrend: 'rising' | 'falling' | 'stable';
  fundingExtreme: 'overleveraged_long' | 'overleveraged_short' | 'neutral';
  oiMomentum24h: number;
  oiTrend: 'rising' | 'falling' | 'stable';
  priceOIDivergence: DivergenceSignal;
  priceFundingDivergence: DivergenceSignal;
  fearGreedVelocity: number;
  fearGreedTrend: 'rising' | 'falling' | 'stable';
  multiTimeframeBias: 'strong_bullish' | 'bullish' | 'mixed' | 'bearish' | 'strong_bearish';
  multiTimeframeConfidence: number;
  avgFunding6h: number;
  avgFunding24h: number;
  fundingStdDev: number;
  oiChange6h: number;
  oiChange24h: number;
  dataAge: number; // minutes since last update
  signals: Array<{ signal: 'bullish' | 'bearish' | 'neutral'; weight: number; reason: string }>;
}

export class MarketDataCache {
  private snapshot: MarketSnapshot | null = null;
  private loadedAt: number = 0;

  /**
   * Load the latest market snapshot from Blob storage
   */
  async loadSnapshot(): Promise<MarketSnapshot | null> {
    // Cache for 5 minutes to avoid repeated loads
    if (this.snapshot && Date.now() - this.loadedAt < 5 * 60 * 1000) {
      return this.snapshot;
    }

    this.snapshot = await loadFromBlob<MarketSnapshot>('market-snapshot');
    this.loadedAt = Date.now();

    if (this.snapshot) {
      console.log(`[MarketCache] Loaded snapshot from ${this.snapshot.timestamp}`);
    } else {
      console.log('[MarketCache] No snapshot found in Blob storage');
    }

    return this.snapshot;
  }

  /**
   * Check if the cached data is fresh (less than 2 hours old)
   */
  isDataFresh(): boolean {
    if (!this.snapshot) return false;

    const snapshotTime = new Date(this.snapshot.timestamp).getTime();
    const age = Date.now() - snapshotTime;

    return age < 2 * 60 * 60 * 1000; // 2 hours
  }

  /**
   * Get data age in minutes
   */
  getDataAge(): number {
    if (!this.snapshot) return Infinity;

    const snapshotTime = new Date(this.snapshot.timestamp).getTime();
    return (Date.now() - snapshotTime) / (1000 * 60);
  }

  /**
   * Analyze funding rate trends from history
   */
  getFundingRateTrends(): {
    velocity6h: number;
    velocity24h: number;
    avg6h: number;
    avg24h: number;
    stdDev: number;
    trend: 'rising' | 'falling' | 'stable';
    extreme: 'overleveraged_long' | 'overleveraged_short' | 'neutral';
  } {
    if (!this.snapshot?.funding?.history?.length) {
      return {
        velocity6h: 0,
        velocity24h: 0,
        avg6h: 0,
        avg24h: 0,
        stdDev: 0,
        trend: 'stable',
        extreme: 'neutral'
      };
    }

    const history = this.snapshot.funding.history;
    const now = Date.now();

    // Filter for 6h and 24h windows
    const h6 = history.filter(h => now - h.timestamp <= 6 * 60 * 60 * 1000);
    const h24 = history.filter(h => now - h.timestamp <= 24 * 60 * 60 * 1000);

    const rates6h = h6.map(h => h.rate);
    const rates24h = h24.map(h => h.rate);
    const timestamps6h = h6.map(h => h.timestamp);
    const timestamps24h = h24.map(h => h.timestamp);

    const velocity6h = calculateVelocity(rates6h, timestamps6h);
    const velocity24h = calculateVelocity(rates24h, timestamps24h);
    const avg6h = getWeightedMovingAverage(rates6h, rates6h.length);
    const avg24h = getMovingAverage(rates24h, rates24h.length);
    const stdDev = calculateStandardDeviation(rates24h);

    // Determine trend
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (velocity6h > 0.01) trend = 'rising';
    else if (velocity6h < -0.01) trend = 'falling';

    // Check for extreme funding
    let extreme: 'overleveraged_long' | 'overleveraged_short' | 'neutral' = 'neutral';
    const currentRate = this.snapshot.funding.ratePercent;
    if (currentRate > 0.03) extreme = 'overleveraged_long';
    else if (currentRate < -0.03) extreme = 'overleveraged_short';

    return { velocity6h, velocity24h, avg6h, avg24h, stdDev, trend, extreme };
  }

  /**
   * Analyze open interest momentum
   */
  getOIMomentum(): {
    change6h: number;
    change24h: number;
    momentum: MomentumMetrics;
    trend: 'rising' | 'falling' | 'stable';
  } {
    if (!this.snapshot?.openInterest?.history?.length) {
      return {
        change6h: 0,
        change24h: 0,
        momentum: { value: 0, trend: 'stable', divergence: 'none' },
        trend: 'stable'
      };
    }

    const history = this.snapshot.openInterest.history;
    const now = Date.now();

    // Get current and historical OI
    const currentOI = history[history.length - 1]?.btc || 0;

    const h6Ago = history.find(h => now - h.timestamp >= 5.5 * 60 * 60 * 1000 && now - h.timestamp <= 6.5 * 60 * 60 * 1000);
    const h24Ago = history.find(h => now - h.timestamp >= 23.5 * 60 * 60 * 1000 && now - h.timestamp <= 24.5 * 60 * 60 * 1000);

    const oi6hAgo = h6Ago?.btc || currentOI;
    const oi24hAgo = h24Ago?.btc || currentOI;

    const change6h = oi6hAgo !== 0 ? ((currentOI - oi6hAgo) / oi6hAgo) * 100 : 0;
    const change24h = oi24hAgo !== 0 ? ((currentOI - oi24hAgo) / oi24hAgo) * 100 : 0;

    // Extract OI and price values for momentum analysis
    const oiValues = history.slice(-24).map(h => h.btc);
    const priceValues = history.slice(-24).map(h => h.price);

    const momentum = analyzeMomentum(oiValues, priceValues);

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (change6h > 2) trend = 'rising';
    else if (change6h < -2) trend = 'falling';

    return { change6h, change24h, momentum, trend };
  }

  /**
   * Detect price-OI divergence
   * Bullish: Price down, OI down (capitulation)
   * Bearish: Price up, OI down (rally on low conviction)
   */
  getPriceOIDivergence(): DivergenceSignal {
    if (!this.snapshot?.openInterest?.history?.length) {
      return { type: 'none', strength: 0, description: '' };
    }

    const history = this.snapshot.openInterest.history.slice(-24);
    if (history.length < 6) {
      return { type: 'none', strength: 0, description: '' };
    }

    const prices = history.map(h => h.price);
    const oi = history.map(h => h.btc);

    return detectDivergence(prices, oi);
  }

  /**
   * Multi-timeframe funding analysis
   */
  getMultiTimeframeFunding(): MultiTimeframeSignal {
    if (!this.snapshot?.funding?.history?.length) {
      return {
        h6: { direction: 'sideways', strength: 0, velocity: 0, acceleration: 0 },
        h12: { direction: 'sideways', strength: 0, velocity: 0, acceleration: 0 },
        h24: { direction: 'sideways', strength: 0, velocity: 0, acceleration: 0 },
        agreement: 'mixed',
        confidence: 0
      };
    }

    const history = this.snapshot.funding.history;
    const rates = history.map(h => h.rate);
    const timestamps = history.map(h => h.timestamp);

    return analyzeMultiTimeframe(rates, timestamps);
  }

  /**
   * Get comprehensive hourly trend factors for prediction engine
   */
  async getHourlyTrendFactors(): Promise<HourlyTrendFactors | null> {
    const snapshot = await this.loadSnapshot();
    if (!snapshot) return null;

    const fundingTrends = this.getFundingRateTrends();
    const oiMomentum = this.getOIMomentum();
    const priceOIDivergence = this.getPriceOIDivergence();
    const multiTimeframe = this.getMultiTimeframeFunding();

    // Build signals array
    const signals: HourlyTrendFactors['signals'] = [];

    // Funding velocity signals
    if (fundingTrends.velocity6h > 0.05) {
      signals.push({
        signal: 'bearish',
        weight: 0.6,
        reason: `Funding rising rapidly (${fundingTrends.velocity6h.toFixed(3)}%/h)`
      });
    } else if (fundingTrends.velocity6h < -0.05) {
      signals.push({
        signal: 'bullish',
        weight: 0.6,
        reason: `Funding falling rapidly (${fundingTrends.velocity6h.toFixed(3)}%/h)`
      });
    }

    // Funding extreme signals
    if (fundingTrends.extreme === 'overleveraged_long') {
      signals.push({
        signal: 'bearish',
        weight: 0.7,
        reason: `24h funding trend: overleveraged longs (avg ${fundingTrends.avg24h.toFixed(3)}%)`
      });
    } else if (fundingTrends.extreme === 'overleveraged_short') {
      signals.push({
        signal: 'bullish',
        weight: 0.7,
        reason: `24h funding trend: overleveraged shorts (avg ${fundingTrends.avg24h.toFixed(3)}%)`
      });
    }

    // OI momentum signals
    if (oiMomentum.change6h > 5) {
      signals.push({
        signal: 'neutral',
        weight: 0.4,
        reason: `OI surging +${oiMomentum.change6h.toFixed(1)}% in 6h (elevated leverage)`
      });
    } else if (oiMomentum.change6h < -5) {
      signals.push({
        signal: 'neutral',
        weight: 0.4,
        reason: `OI dropping ${oiMomentum.change6h.toFixed(1)}% in 6h (deleveraging)`
      });
    }

    // Price-OI divergence signals
    if (priceOIDivergence.type === 'bullish') {
      signals.push({
        signal: 'bullish',
        weight: 0.65 * priceOIDivergence.strength,
        reason: `Bullish price-OI divergence: ${priceOIDivergence.description}`
      });
    } else if (priceOIDivergence.type === 'bearish') {
      signals.push({
        signal: 'bearish',
        weight: 0.65 * priceOIDivergence.strength,
        reason: `Bearish price-OI divergence: ${priceOIDivergence.description}`
      });
    }

    // Multi-timeframe agreement signals
    if (multiTimeframe.agreement === 'strong_bullish') {
      signals.push({
        signal: 'bullish',
        weight: 0.8 * multiTimeframe.confidence,
        reason: '6h/12h/24h funding all trending down (shorts paying)'
      });
    } else if (multiTimeframe.agreement === 'strong_bearish') {
      signals.push({
        signal: 'bearish',
        weight: 0.8 * multiTimeframe.confidence,
        reason: '6h/12h/24h funding all trending up (longs crowded)'
      });
    }

    // Fear & greed velocity (if we track it in history - approximate from current)
    const fearGreedVelocity = 0; // Would need historical fear & greed data
    let fearGreedTrend: 'rising' | 'falling' | 'stable' = 'stable';

    return {
      fundingVelocity6h: fundingTrends.velocity6h,
      fundingVelocity24h: fundingTrends.velocity24h,
      fundingTrend: fundingTrends.trend,
      fundingExtreme: fundingTrends.extreme,
      oiMomentum24h: oiMomentum.change24h,
      oiTrend: oiMomentum.trend,
      priceOIDivergence,
      priceFundingDivergence: { type: 'none', strength: 0, description: '' }, // TODO: implement
      fearGreedVelocity,
      fearGreedTrend,
      multiTimeframeBias: multiTimeframe.agreement,
      multiTimeframeConfidence: multiTimeframe.confidence,
      avgFunding6h: fundingTrends.avg6h,
      avgFunding24h: fundingTrends.avg24h,
      fundingStdDev: fundingTrends.stdDev,
      oiChange6h: oiMomentum.change6h,
      oiChange24h: oiMomentum.change24h,
      dataAge: this.getDataAge(),
      signals
    };
  }

  /**
   * Get cached derivatives data (funding, OI, L/S ratio) without API calls
   */
  getCachedDerivatives(): {
    fundingRate: number;
    fundingRatePercent: number;
    openInterestBTC: number;
    openInterestUSD: number;
    longShortRatio: number;
    longPercent: number;
    shortPercent: number;
  } | null {
    if (!this.snapshot) return null;

    return {
      fundingRate: this.snapshot.funding.rate,
      fundingRatePercent: this.snapshot.funding.ratePercent,
      openInterestBTC: this.snapshot.openInterest.btc,
      openInterestUSD: this.snapshot.openInterest.usd,
      longShortRatio: this.snapshot.longShortRatio.ratio,
      longPercent: this.snapshot.longShortRatio.longPercent,
      shortPercent: this.snapshot.longShortRatio.shortPercent
    };
  }

  /**
   * Get cached price data
   */
  getCachedPrice(): {
    price: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  } | null {
    if (!this.snapshot) return null;

    return {
      price: this.snapshot.btc.price,
      priceChange24h: this.snapshot.btc.priceChange24h,
      high24h: this.snapshot.btc.high24h,
      low24h: this.snapshot.btc.low24h,
      volume24h: this.snapshot.btc.volume24h
    };
  }

  /**
   * Get the raw snapshot
   */
  getSnapshot(): MarketSnapshot | null {
    return this.snapshot;
  }
}
