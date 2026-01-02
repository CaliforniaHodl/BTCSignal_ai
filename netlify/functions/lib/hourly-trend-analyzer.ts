// Hourly Trend Analyzer
// Analyzes trends from hourly market data snapshots

export interface TrendMetrics {
  direction: 'up' | 'down' | 'sideways';
  strength: number; // 0-1 scale
  velocity: number; // rate of change per hour
  acceleration: number; // change in velocity
}

export interface MomentumMetrics {
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  divergence: 'bullish' | 'bearish' | 'none';
}

export interface MultiTimeframeSignal {
  h6: TrendMetrics;
  h12: TrendMetrics;
  h24: TrendMetrics;
  agreement: 'strong_bullish' | 'bullish' | 'mixed' | 'bearish' | 'strong_bearish';
  confidence: number;
}

export interface DivergenceSignal {
  type: 'bullish' | 'bearish' | 'none';
  strength: number;
  description: string;
}

/**
 * Calculate velocity (rate of change) from a series of values
 * Uses linear regression slope normalized by average value
 */
export function calculateVelocity(values: number[], timestamps: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  // Normalize timestamps to hours from start
  const startTime = timestamps[0];
  const hours = timestamps.map(t => (t - startTime) / (1000 * 60 * 60));

  for (let i = 0; i < n; i++) {
    sumX += hours[i];
    sumY += values[i];
    sumXY += hours[i] * values[i];
    sumX2 += hours[i] * hours[i];
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const avgValue = sumY / n;

  // Normalize slope by average value to get percentage change per hour
  return avgValue !== 0 ? (slope / avgValue) * 100 : 0;
}

/**
 * Calculate acceleration (change in velocity over time)
 */
export function calculateAcceleration(values: number[], timestamps: number[]): number {
  if (values.length < 4) return 0;

  const midPoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midPoint);
  const secondHalf = values.slice(midPoint);
  const firstTimestamps = timestamps.slice(0, midPoint);
  const secondTimestamps = timestamps.slice(midPoint);

  const v1 = calculateVelocity(firstHalf, firstTimestamps);
  const v2 = calculateVelocity(secondHalf, secondTimestamps);

  return v2 - v1;
}

/**
 * Get trend direction and strength from values
 */
export function getTrendDirection(values: number[]): TrendMetrics {
  if (values.length < 2) {
    return { direction: 'sideways', strength: 0, velocity: 0, acceleration: 0 };
  }

  const timestamps = values.map((_, i) => Date.now() - (values.length - 1 - i) * 60 * 60 * 1000);
  const velocity = calculateVelocity(values, timestamps);
  const acceleration = calculateAcceleration(values, timestamps);

  // Calculate strength based on consistency of direction
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }

  const positiveChanges = changes.filter(c => c > 0).length;
  const consistency = Math.abs(positiveChanges / changes.length - 0.5) * 2; // 0-1 scale

  // Combine velocity magnitude with consistency for strength
  const velocityStrength = Math.min(Math.abs(velocity) / 2, 1); // Cap at 2% per hour
  const strength = (velocityStrength + consistency) / 2;

  let direction: 'up' | 'down' | 'sideways';
  if (Math.abs(velocity) < 0.1) {
    direction = 'sideways';
  } else if (velocity > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return { direction, strength, velocity, acceleration };
}

/**
 * Detect divergence between price and an indicator
 * Bullish divergence: price lower lows, indicator higher lows
 * Bearish divergence: price higher highs, indicator lower highs
 */
export function detectDivergence(
  prices: number[],
  indicator: number[]
): DivergenceSignal {
  if (prices.length < 6 || indicator.length < 6) {
    return { type: 'none', strength: 0, description: '' };
  }

  const len = Math.min(prices.length, indicator.length);
  const midPoint = Math.floor(len / 2);

  // Compare first half vs second half
  const priceFirst = Math.min(...prices.slice(0, midPoint));
  const priceLast = Math.min(...prices.slice(midPoint));
  const priceHighFirst = Math.max(...prices.slice(0, midPoint));
  const priceHighLast = Math.max(...prices.slice(midPoint));

  const indFirst = Math.min(...indicator.slice(0, midPoint));
  const indLast = Math.min(...indicator.slice(midPoint));
  const indHighFirst = Math.max(...indicator.slice(0, midPoint));
  const indHighLast = Math.max(...indicator.slice(midPoint));

  // Bullish divergence: price makes lower low, indicator makes higher low
  if (priceLast < priceFirst * 0.99 && indLast > indFirst * 1.01) {
    const strength = Math.min(
      Math.abs((priceFirst - priceLast) / priceFirst),
      Math.abs((indLast - indFirst) / indFirst)
    );
    return {
      type: 'bullish',
      strength: Math.min(strength * 10, 1),
      description: 'Price lower lows, indicator higher lows'
    };
  }

  // Bearish divergence: price makes higher high, indicator makes lower high
  if (priceHighLast > priceHighFirst * 1.01 && indHighLast < indHighFirst * 0.99) {
    const strength = Math.min(
      Math.abs((priceHighLast - priceHighFirst) / priceHighFirst),
      Math.abs((indHighFirst - indHighLast) / indHighFirst)
    );
    return {
      type: 'bearish',
      strength: Math.min(strength * 10, 1),
      description: 'Price higher highs, indicator lower highs'
    };
  }

  return { type: 'none', strength: 0, description: '' };
}

/**
 * Calculate simple moving average
 */
export function getMovingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Calculate weighted moving average (more recent = higher weight)
 */
export function getWeightedMovingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < slice.length; i++) {
    const weight = i + 1; // Linear weights
    weightedSum += slice[i] * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * Calculate standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Analyze momentum from a series of values
 */
export function analyzeMomentum(
  values: number[],
  priceValues?: number[]
): MomentumMetrics {
  if (values.length < 4) {
    return { value: 0, trend: 'stable', divergence: 'none' };
  }

  const recentAvg = getMovingAverage(values, Math.min(6, values.length));
  const olderAvg = getMovingAverage(values.slice(0, -6), Math.min(6, values.length - 6));

  const value = recentAvg;
  let trend: 'increasing' | 'decreasing' | 'stable';

  const changePct = olderAvg !== 0 ? (recentAvg - olderAvg) / Math.abs(olderAvg) : 0;

  if (changePct > 0.05) {
    trend = 'increasing';
  } else if (changePct < -0.05) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  // Check for divergence with price if provided
  let divergence: 'bullish' | 'bearish' | 'none' = 'none';
  if (priceValues && priceValues.length >= 6) {
    const divResult = detectDivergence(priceValues, values);
    divergence = divResult.type;
  }

  return { value, trend, divergence };
}

/**
 * Perform multi-timeframe analysis
 */
export function analyzeMultiTimeframe(
  values: number[],
  timestamps: number[]
): MultiTimeframeSignal {
  const now = Date.now();

  // Filter data for each timeframe
  const h6Data = values.filter((_, i) => now - timestamps[i] <= 6 * 60 * 60 * 1000);
  const h12Data = values.filter((_, i) => now - timestamps[i] <= 12 * 60 * 60 * 1000);
  const h24Data = values.filter((_, i) => now - timestamps[i] <= 24 * 60 * 60 * 1000);

  const h6 = getTrendDirection(h6Data);
  const h12 = getTrendDirection(h12Data);
  const h24 = getTrendDirection(h24Data);

  // Calculate agreement
  const upCount = [h6, h12, h24].filter(t => t.direction === 'up').length;
  const downCount = [h6, h12, h24].filter(t => t.direction === 'down').length;

  let agreement: MultiTimeframeSignal['agreement'];
  let confidence: number;

  if (upCount === 3) {
    agreement = 'strong_bullish';
    confidence = (h6.strength + h12.strength + h24.strength) / 3;
  } else if (upCount === 2) {
    agreement = 'bullish';
    confidence = ((h6.strength + h12.strength + h24.strength) / 3) * 0.7;
  } else if (downCount === 3) {
    agreement = 'strong_bearish';
    confidence = (h6.strength + h12.strength + h24.strength) / 3;
  } else if (downCount === 2) {
    agreement = 'bearish';
    confidence = ((h6.strength + h12.strength + h24.strength) / 3) * 0.7;
  } else {
    agreement = 'mixed';
    confidence = 0.3;
  }

  return { h6, h12, h24, agreement, confidence };
}
