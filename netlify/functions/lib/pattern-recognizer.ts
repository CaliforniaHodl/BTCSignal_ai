// Pattern Recognizer
// Identifies known market patterns and their historical implications
// "A violent flush followed by a V-recovery is historically bullish..."

export interface PricePoint {
  timestamp: number;
  price: number;
  oi?: number;
  funding?: number;
  volume?: number;
}

export interface PatternMatch {
  pattern: string;
  confidence: number; // 0-1
  bias: 'bullish' | 'bearish' | 'neutral';
  timeframe: '24h' | '48h' | '72h';
  description: string;
  reasoning: string;
  historicalAccuracy?: number; // From past outcomes
}

export interface MarketContext {
  priceHistory: PricePoint[]; // Hourly data points
  currentPrice: number;
  funding: {
    current: number;
    avg24h: number;
    velocity: number;
  };
  oi: {
    current: number;
    change24h: number;
    change6h: number;
  };
  volume?: {
    current: number;
    avg24h: number;
    ratio: number;
  };
}

// Pattern definitions with historical implications
const PATTERN_DEFINITIONS = {
  // ===== BULLISH PATTERNS =====
  V_RECOVERY: {
    name: 'V-Recovery After Flush',
    bias: 'bullish' as const,
    timeframe: '72h' as const,
    description: 'Violent flush followed by strong V-shaped recovery',
    reasoning: 'Weak hands liquidated, strong buyers stepped in. Historically bullish for 72h as selling pressure exhausted.',
    historicalWinRate: 0.72,
  },
  CAPITULATION_BOTTOM: {
    name: 'Capitulation Bottom',
    bias: 'bullish' as const,
    timeframe: '72h' as const,
    description: 'High volume selloff with OI flush and funding going negative',
    reasoning: 'Mass liquidations clear overleveraged positions. Recovery typically follows as new buyers enter at discount.',
    historicalWinRate: 0.68,
  },
  SHORT_SQUEEZE_SETUP: {
    name: 'Short Squeeze Setup',
    bias: 'bullish' as const,
    timeframe: '48h' as const,
    description: 'Negative funding + rising price + stable/rising OI',
    reasoning: 'Shorts are paying longs while price rises. Squeeze likely as shorts forced to cover.',
    historicalWinRate: 0.65,
  },
  ACCUMULATION_RANGE: {
    name: 'Accumulation Range',
    bias: 'bullish' as const,
    timeframe: '72h' as const,
    description: 'Tight price range with decreasing volume, then volume spike up',
    reasoning: 'Smart money accumulating before breakout. Compressed spring about to release upward.',
    historicalWinRate: 0.63,
  },
  FUNDING_RESET_BULLISH: {
    name: 'Funding Reset (Bullish)',
    bias: 'bullish' as const,
    timeframe: '48h' as const,
    description: 'Funding went from extreme positive to neutral/negative while price held',
    reasoning: 'Overleveraged longs cleared without price breakdown. Healthier market structure for continuation.',
    historicalWinRate: 0.64,
  },
  HIGHER_LOW_FORMATION: {
    name: 'Higher Low Formation',
    bias: 'bullish' as const,
    timeframe: '72h' as const,
    description: 'Price dipped but held above previous low, now recovering',
    reasoning: 'Buyers defending higher levels. Uptrend structure intact, likely continuation.',
    historicalWinRate: 0.67,
  },

  // ===== BEARISH PATTERNS =====
  DISTRIBUTION_TOP: {
    name: 'Distribution Top',
    bias: 'bearish' as const,
    timeframe: '72h' as const,
    description: 'Price at highs with decreasing volume and rising OI',
    reasoning: 'Smart money distributing to retail. High OI at top = fuel for downside liquidations.',
    historicalWinRate: 0.66,
  },
  LONG_SQUEEZE_SETUP: {
    name: 'Long Squeeze Setup',
    bias: 'bearish' as const,
    timeframe: '48h' as const,
    description: 'High positive funding + falling price + rising OI',
    reasoning: 'Longs paying premium while price falls. Cascade liquidations likely.',
    historicalWinRate: 0.64,
  },
  EXHAUSTION_TOP: {
    name: 'Exhaustion Top',
    bias: 'bearish' as const,
    timeframe: '48h' as const,
    description: 'Parabolic rise with extreme funding, then stall',
    reasoning: 'Buying exhaustion after euphoric run. No more buyers at these levels.',
    historicalWinRate: 0.70,
  },
  LOWER_HIGH_FORMATION: {
    name: 'Lower High Formation',
    bias: 'bearish' as const,
    timeframe: '72h' as const,
    description: 'Price bounced but failed to reach previous high',
    reasoning: 'Sellers defending lower levels. Downtrend structure forming.',
    historicalWinRate: 0.65,
  },
  DEAD_CAT_BOUNCE: {
    name: 'Dead Cat Bounce',
    bias: 'bearish' as const,
    timeframe: '48h' as const,
    description: 'Sharp drop followed by weak recovery on low volume',
    reasoning: 'Relief rally without conviction. Likely to retest lows or make new lows.',
    historicalWinRate: 0.62,
  },
  FUNDING_EXTREME_TOP: {
    name: 'Funding Extreme at Top',
    bias: 'bearish' as const,
    timeframe: '48h' as const,
    description: 'Funding rate >0.05% at local price high',
    reasoning: 'Extreme greed and leverage. Market usually punishes overleveraged longs.',
    historicalWinRate: 0.71,
  },

  // ===== NEUTRAL/CONSOLIDATION PATTERNS =====
  RANGE_COMPRESSION: {
    name: 'Range Compression',
    bias: 'neutral' as const,
    timeframe: '24h' as const,
    description: 'Decreasing volatility, price in tight range',
    reasoning: 'Big move coming but direction unclear. Wait for breakout confirmation.',
    historicalWinRate: 0.50,
  },
  MIXED_SIGNALS: {
    name: 'Mixed Signals',
    bias: 'neutral' as const,
    timeframe: '24h' as const,
    description: 'Conflicting indicators across timeframes',
    reasoning: 'Market indecision. No clear edge, reduce position size.',
    historicalWinRate: 0.50,
  },
};

export class PatternRecognizer {
  /**
   * Analyze market context and identify matching patterns
   */
  recognizePatterns(context: MarketContext): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Need at least 12 hours of data
    if (context.priceHistory.length < 12) {
      return patterns;
    }

    // Check each pattern
    if (this.isVRecovery(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.V_RECOVERY));
    }

    if (this.isCapitulationBottom(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.CAPITULATION_BOTTOM));
    }

    if (this.isShortSqueezeSetup(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.SHORT_SQUEEZE_SETUP));
    }

    if (this.isLongSqueezeSetup(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.LONG_SQUEEZE_SETUP));
    }

    if (this.isFundingResetBullish(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.FUNDING_RESET_BULLISH));
    }

    if (this.isExhaustionTop(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.EXHAUSTION_TOP));
    }

    if (this.isFundingExtremeTop(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.FUNDING_EXTREME_TOP));
    }

    if (this.isHigherLowFormation(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.HIGHER_LOW_FORMATION));
    }

    if (this.isLowerHighFormation(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.LOWER_HIGH_FORMATION));
    }

    if (this.isDeadCatBounce(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.DEAD_CAT_BOUNCE));
    }

    if (this.isDistributionTop(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.DISTRIBUTION_TOP));
    }

    if (this.isAccumulationRange(context)) {
      patterns.push(this.createMatch(PATTERN_DEFINITIONS.ACCUMULATION_RANGE));
    }

    // If no strong patterns, check for compression/mixed
    if (patterns.length === 0) {
      if (this.isRangeCompression(context)) {
        patterns.push(this.createMatch(PATTERN_DEFINITIONS.RANGE_COMPRESSION));
      } else {
        patterns.push(this.createMatch(PATTERN_DEFINITIONS.MIXED_SIGNALS));
      }
    }

    // Sort by confidence
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private createMatch(def: typeof PATTERN_DEFINITIONS[keyof typeof PATTERN_DEFINITIONS], confidence: number = 0.7): PatternMatch {
    return {
      pattern: def.name,
      confidence,
      bias: def.bias,
      timeframe: def.timeframe,
      description: def.description,
      reasoning: def.reasoning,
      historicalAccuracy: def.historicalWinRate,
    };
  }

  // ===== PATTERN DETECTION METHODS =====

  /**
   * V-Recovery: Price dropped >5% then recovered >80% of the drop within 24h
   */
  private isVRecovery(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);
    if (prices.length < 12) return false;

    // Find the low point in the last 24h
    const lowIndex = prices.indexOf(Math.min(...prices));
    const lowPrice = prices[lowIndex];
    const startPrice = prices[0];
    const currentPrice = ctx.currentPrice;

    // Check for significant drop (>5%)
    const dropPercent = ((startPrice - lowPrice) / startPrice) * 100;
    if (dropPercent < 5) return false;

    // Check for strong recovery (>80% of drop recovered)
    const recoveryPercent = ((currentPrice - lowPrice) / (startPrice - lowPrice)) * 100;
    if (recoveryPercent < 80) return false;

    // Low should be in the first half of the period (V shape)
    if (lowIndex > prices.length * 0.6) return false;

    return true;
  }

  /**
   * Capitulation Bottom: OI dropped significantly + funding went negative + high volume
   */
  private isCapitulationBottom(ctx: MarketContext): boolean {
    // OI dropped more than 10% in 24h
    if (ctx.oi.change24h > -10) return false;

    // Funding is negative or was negative recently
    if (ctx.funding.current > -0.01 && ctx.funding.avg24h > 0) return false;

    // Price is recovering (current > low)
    const prices = ctx.priceHistory.map(p => p.price);
    const lowPrice = Math.min(...prices);
    const recoveryFromLow = ((ctx.currentPrice - lowPrice) / lowPrice) * 100;
    if (recoveryFromLow < 2) return false;

    return true;
  }

  /**
   * Short Squeeze Setup: Negative funding + rising price + stable/rising OI
   */
  private isShortSqueezeSetup(ctx: MarketContext): boolean {
    // Funding is negative
    if (ctx.funding.current > -0.005) return false;

    // Price is rising
    const prices = ctx.priceHistory.map(p => p.price);
    const priceChange = ((ctx.currentPrice - prices[0]) / prices[0]) * 100;
    if (priceChange < 1) return false;

    // OI is stable or rising
    if (ctx.oi.change24h < -5) return false;

    return true;
  }

  /**
   * Long Squeeze Setup: High positive funding + falling price + rising OI
   */
  private isLongSqueezeSetup(ctx: MarketContext): boolean {
    // Funding is high positive
    if (ctx.funding.current < 0.02) return false;

    // Price is falling or stagnant
    const prices = ctx.priceHistory.map(p => p.price);
    const priceChange = ((ctx.currentPrice - prices[0]) / prices[0]) * 100;
    if (priceChange > 0) return false;

    // OI is rising (more positions being opened)
    if (ctx.oi.change24h < 0) return false;

    return true;
  }

  /**
   * Funding Reset Bullish: Funding went from high to neutral while price held
   */
  private isFundingResetBullish(ctx: MarketContext): boolean {
    // Current funding is neutral/low
    if (Math.abs(ctx.funding.current) > 0.02) return false;

    // Funding was higher before (velocity is negative = funding decreased)
    if (ctx.funding.velocity > -0.005) return false;

    // Price held or increased
    const prices = ctx.priceHistory.map(p => p.price);
    const priceChange = ((ctx.currentPrice - prices[0]) / prices[0]) * 100;
    if (priceChange < -3) return false;

    return true;
  }

  /**
   * Exhaustion Top: Parabolic rise followed by stall at high funding
   */
  private isExhaustionTop(ctx: MarketContext): boolean {
    // High positive funding
    if (ctx.funding.current < 0.03) return false;

    // Price rose significantly then stalled
    const prices = ctx.priceHistory.map(p => p.price);
    const midPoint = Math.floor(prices.length / 2);
    const firstHalfGain = ((prices[midPoint] - prices[0]) / prices[0]) * 100;
    const secondHalfGain = ((ctx.currentPrice - prices[midPoint]) / prices[midPoint]) * 100;

    // First half had strong gains, second half stalled or reversed
    if (firstHalfGain < 3) return false;
    if (secondHalfGain > 1) return false;

    return true;
  }

  /**
   * Funding Extreme at Top: Very high funding at price resistance
   */
  private isFundingExtremeTop(ctx: MarketContext): boolean {
    // Extreme funding
    if (ctx.funding.current < 0.05) return false;

    // Price near recent highs
    const prices = ctx.priceHistory.map(p => p.price);
    const recentHigh = Math.max(...prices.slice(-12));
    const distanceFromHigh = ((recentHigh - ctx.currentPrice) / recentHigh) * 100;

    if (distanceFromHigh > 2) return false;

    return true;
  }

  /**
   * Higher Low Formation: Dip held above previous low
   */
  private isHigherLowFormation(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);
    if (prices.length < 18) return false;

    // Split into three sections
    const section1 = prices.slice(0, 6);
    const section2 = prices.slice(6, 12);
    const section3 = prices.slice(12);

    const low1 = Math.min(...section1);
    const low2 = Math.min(...section2);
    const low3 = Math.min(...section3);

    // Each low should be higher than the previous
    if (low2 <= low1) return false;
    if (low3 <= low2) return false;

    // Current price should be above the most recent low
    if (ctx.currentPrice < low3 * 1.01) return false;

    return true;
  }

  /**
   * Lower High Formation: Bounce failed to reach previous high
   */
  private isLowerHighFormation(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);
    if (prices.length < 18) return false;

    // Split into three sections
    const section1 = prices.slice(0, 6);
    const section2 = prices.slice(6, 12);
    const section3 = prices.slice(12);

    const high1 = Math.max(...section1);
    const high2 = Math.max(...section2);
    const high3 = Math.max(...section3);

    // Each high should be lower than the previous
    if (high2 >= high1) return false;
    if (high3 >= high2) return false;

    return true;
  }

  /**
   * Dead Cat Bounce: Sharp drop followed by weak recovery
   */
  private isDeadCatBounce(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);
    if (prices.length < 12) return false;

    // Find the low point
    const lowIndex = prices.indexOf(Math.min(...prices));
    const lowPrice = prices[lowIndex];
    const startPrice = prices[0];

    // Need significant drop (>5%)
    const dropPercent = ((startPrice - lowPrice) / startPrice) * 100;
    if (dropPercent < 5) return false;

    // Recovery should be weak (<50% of drop)
    const recoveryPercent = ((ctx.currentPrice - lowPrice) / (startPrice - lowPrice)) * 100;
    if (recoveryPercent > 50) return false;
    if (recoveryPercent < 10) return false; // Need some bounce

    // OI should be low or falling (no conviction)
    if (ctx.oi.change24h > 5) return false;

    return true;
  }

  /**
   * Distribution Top: Price at highs with concerning derivatives data
   */
  private isDistributionTop(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);

    // Price near 24h highs
    const high24h = Math.max(...prices);
    const distanceFromHigh = ((high24h - ctx.currentPrice) / high24h) * 100;
    if (distanceFromHigh > 3) return false;

    // High OI (lots of positions)
    if (ctx.oi.change24h < 5) return false;

    // Positive funding (longs paying)
    if (ctx.funding.current < 0.01) return false;

    return true;
  }

  /**
   * Accumulation Range: Tight range with volume building
   */
  private isAccumulationRange(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);

    // Calculate range
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const range = ((high - low) / low) * 100;

    // Tight range (<5%)
    if (range > 5) return false;

    // Price in upper half of range (buyers in control)
    const rangePosition = (ctx.currentPrice - low) / (high - low);
    if (rangePosition < 0.5) return false;

    // OI building (positions accumulating)
    if (ctx.oi.change24h < 2) return false;

    return true;
  }

  /**
   * Range Compression: Volatility decreasing, big move coming
   */
  private isRangeCompression(ctx: MarketContext): boolean {
    const prices = ctx.priceHistory.map(p => p.price);
    if (prices.length < 12) return false;

    // Compare range of first half vs second half
    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));

    const range1 = (Math.max(...firstHalf) - Math.min(...firstHalf)) / Math.min(...firstHalf);
    const range2 = (Math.max(...secondHalf) - Math.min(...secondHalf)) / Math.min(...secondHalf);

    // Second half should have smaller range
    if (range2 > range1 * 0.7) return false;

    return true;
  }

  /**
   * Get the strongest pattern signal
   */
  getStrongestSignal(context: MarketContext): PatternMatch | null {
    const patterns = this.recognizePatterns(context);
    if (patterns.length === 0) return null;

    // Filter out neutral patterns if we have directional ones
    const directional = patterns.filter(p => p.bias !== 'neutral');
    if (directional.length > 0) {
      return directional[0];
    }

    return patterns[0];
  }

  /**
   * Calculate aggregate pattern bias
   */
  getAggregateBias(context: MarketContext): {
    bias: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    patterns: PatternMatch[];
    reasoning: string[];
  } {
    const patterns = this.recognizePatterns(context);

    let bullishScore = 0;
    let bearishScore = 0;
    const reasoning: string[] = [];

    patterns.forEach(p => {
      const weight = p.confidence * (p.historicalAccuracy || 0.5);
      if (p.bias === 'bullish') {
        bullishScore += weight;
        reasoning.push(`+ ${p.pattern}: ${p.reasoning}`);
      } else if (p.bias === 'bearish') {
        bearishScore += weight;
        reasoning.push(`- ${p.pattern}: ${p.reasoning}`);
      }
    });

    const totalScore = bullishScore + bearishScore;
    let bias: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;

    if (totalScore === 0) {
      bias = 'neutral';
      confidence = 0.5;
    } else if (bullishScore > bearishScore * 1.3) {
      bias = 'bullish';
      confidence = bullishScore / totalScore;
    } else if (bearishScore > bullishScore * 1.3) {
      bias = 'bearish';
      confidence = bearishScore / totalScore;
    } else {
      bias = 'neutral';
      confidence = 0.5;
    }

    return { bias, confidence, patterns, reasoning };
  }
}
