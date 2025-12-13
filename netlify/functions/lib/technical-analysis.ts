import { RSI, MACD, BollingerBands, EMA, SMA, ATR } from 'technicalindicators';
import { OHLCV } from './data-provider';

export interface TechnicalIndicators {
  rsi: number | null;
  macd: { MACD: number; signal: number; histogram: number } | null;
  // BUG FIX: Add previous MACD histogram for proper crossover detection
  prevMacdHistogram: number | null;
  bollingerBands: { upper: number; middle: number; lower: number } | null;
  ema20: number | null;
  sma50: number | null;
  atr: number | null;
  // NEW: Volume analysis
  volumeAvg20: number | null;
  volumeRatio: number | null; // Current volume / 20-period avg
  volumeTrend: 'increasing' | 'decreasing' | 'stable' | null;
  // NEW: RSI divergence
  rsiDivergence: 'bullish' | 'bearish' | null;
  prevRsi: number | null;
}

export interface Pattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
}

export class TechnicalAnalyzer {
  /**
   * Calculate technical indicators
   */
  calculateIndicators(data: OHLCV[]): TechnicalIndicators {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // RSI (14 period)
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;

    // MACD (12, 26, 9)
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const lastMacd = macdValues.length > 0 ? macdValues[macdValues.length - 1] : null;
    const macd = lastMacd && lastMacd.MACD !== undefined && lastMacd.signal !== undefined && lastMacd.histogram !== undefined
      ? { MACD: lastMacd.MACD, signal: lastMacd.signal, histogram: lastMacd.histogram }
      : null;

    // BUG FIX: Get previous MACD histogram for crossover detection
    // A real crossover requires comparing current vs previous histogram sign
    const prevMacd = macdValues.length > 1 ? macdValues[macdValues.length - 2] : null;
    const prevMacdHistogram = prevMacd && prevMacd.histogram !== undefined ? prevMacd.histogram : null;

    // Bollinger Bands (20, 2)
    const bbValues = BollingerBands.calculate({
      values: closes,
      period: 20,
      stdDev: 2,
    });
    const bollingerBands = bbValues.length > 0 ? bbValues[bbValues.length - 1] : null;

    // EMA 20
    const emaValues = EMA.calculate({ values: closes, period: 20 });
    const ema20 = emaValues.length > 0 ? emaValues[emaValues.length - 1] : null;

    // SMA 50
    const smaValues = SMA.calculate({ values: closes, period: 50 });
    const sma50 = smaValues.length > 0 ? smaValues[smaValues.length - 1] : null;

    // ATR (14 period)
    const atrValues = ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
    });
    const atr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : null;

    // Volume analysis (20-period)
    const volumes = data.map(d => d.volume);
    const last20Volumes = volumes.slice(-20);
    const volumeAvg20 = last20Volumes.length >= 20
      ? last20Volumes.reduce((a, b) => a + b, 0) / 20
      : null;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = volumeAvg20 ? currentVolume / volumeAvg20 : null;

    // Volume trend (compare recent 5 avg to previous 5 avg)
    let volumeTrend: 'increasing' | 'decreasing' | 'stable' | null = null;
    if (volumes.length >= 10) {
      const recent5Avg = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const prev5Avg = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
      if (recent5Avg > prev5Avg * 1.2) volumeTrend = 'increasing';
      else if (recent5Avg < prev5Avg * 0.8) volumeTrend = 'decreasing';
      else volumeTrend = 'stable';
    }

    // RSI divergence detection
    const prevRsi = rsiValues.length > 1 ? rsiValues[rsiValues.length - 2] : null;
    let rsiDivergence: 'bullish' | 'bearish' | null = null;

    if (rsi !== null && prevRsi !== null && closes.length >= 10) {
      const recentLow = Math.min(...closes.slice(-10));
      const prevLow = Math.min(...closes.slice(-20, -10));
      const recentHigh = Math.max(...closes.slice(-10));
      const prevHigh = Math.max(...closes.slice(-20, -10));

      // Bullish divergence: price makes lower low, RSI makes higher low
      if (recentLow < prevLow * 0.99 && rsi > prevRsi) {
        rsiDivergence = 'bullish';
      }
      // Bearish divergence: price makes higher high, RSI makes lower high
      if (recentHigh > prevHigh * 1.01 && rsi < prevRsi) {
        rsiDivergence = 'bearish';
      }
    }

    return {
      rsi, macd, prevMacdHistogram, bollingerBands, ema20, sma50, atr,
      volumeAvg20, volumeRatio, volumeTrend, rsiDivergence, prevRsi
    };
  }

  /**
   * Identify chart patterns
   */
  identifyPatterns(data: OHLCV[], indicators: TechnicalIndicators): Pattern[] {
    const patterns: Pattern[] = [];

    const doublePattern = this.detectDoublePattern(data);
    if (doublePattern) patterns.push(doublePattern);

    const hsPattern = this.detectHeadAndShoulders(data);
    if (hsPattern) patterns.push(hsPattern);

    const breakoutPattern = this.detectBreakout(data);
    if (breakoutPattern) patterns.push(breakoutPattern);

    const trendPattern = this.detectTrend(data, indicators);
    if (trendPattern) patterns.push(trendPattern);

    return patterns;
  }

  private detectDoublePattern(data: OHLCV[]): Pattern | null {
    if (data.length < 50) return null;

    const recent = data.slice(-50);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);

    const peaks = this.findPeaks(highs);
    const troughs = this.findPeaks(lows.map(l => -l));

    if (peaks.length >= 2) {
      const lastTwo = peaks.slice(-2);
      const diff = Math.abs(highs[lastTwo[0]] - highs[lastTwo[1]]) / highs[lastTwo[0]];
      if (diff < 0.02) {
        return {
          name: 'Double Top',
          type: 'bearish',
          confidence: 0.70,
          description: 'Two peaks at similar resistance level',
        };
      }
    }

    if (troughs.length >= 2) {
      const lastTwo = troughs.slice(-2);
      const diff = Math.abs(lows[lastTwo[0]] - lows[lastTwo[1]]) / lows[lastTwo[0]];
      if (diff < 0.02) {
        return {
          name: 'Double Bottom',
          type: 'bullish',
          confidence: 0.70,
          description: 'Two troughs at similar support level',
        };
      }
    }

    return null;
  }

  private detectHeadAndShoulders(data: OHLCV[]): Pattern | null {
    if (data.length < 60) return null;

    const recent = data.slice(-60);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    const peaks = this.findPeaks(highs);
    const troughs = this.findPeaks(lows.map(l => -l)); // Invert for trough finding

    // Regular Head and Shoulders (bearish)
    if (peaks.length >= 3) {
      const lastThree = peaks.slice(-3);
      const [left, head, right] = lastThree.map(i => highs[i]);

      if (head > left && head > right && Math.abs(left - right) / left < 0.03) {
        return {
          name: 'Head and Shoulders',
          type: 'bearish',
          confidence: 0.75,
          description: 'Classic reversal pattern',
        };
      }
    }

    // Inverse Head and Shoulders (bullish) - NEW
    if (troughs.length >= 3) {
      const lastThree = troughs.slice(-3);
      const [leftIdx, headIdx, rightIdx] = lastThree;
      const left = lows[leftIdx];
      const head = lows[headIdx];
      const right = lows[rightIdx];

      // Head should be lowest, shoulders roughly equal
      if (head < left && head < right && Math.abs(left - right) / left < 0.03) {
        return {
          name: 'Inverse Head and Shoulders',
          type: 'bullish',
          confidence: 0.75,
          description: 'Bullish reversal pattern',
        };
      }
    }

    return null;
  }

  private detectBreakout(data: OHLCV[]): Pattern | null {
    if (data.length < 30) return null;

    const recent = data.slice(-30);
    const closes = recent.map(d => d.close);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);

    const resistance = Math.max(...highs.slice(0, -1));
    const support = Math.min(...lows.slice(0, -1));
    const currentClose = closes[closes.length - 1];

    if (currentClose > resistance * 1.01) {
      return {
        name: 'Resistance Breakout',
        type: 'bullish',
        confidence: 0.65,
        description: `Broke above $${resistance.toFixed(0)}`,
      };
    }

    if (currentClose < support * 0.99) {
      return {
        name: 'Support Breakdown',
        type: 'bearish',
        confidence: 0.65,
        description: `Broke below $${support.toFixed(0)}`,
      };
    }

    return null;
  }

  private detectTrend(data: OHLCV[], indicators: TechnicalIndicators): Pattern | null {
    if (data.length < 20) return null;

    const closes = data.map(d => d.close);
    const currentPrice = closes[closes.length - 1];

    if (indicators.ema20 && indicators.sma50) {
      if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.sma50) {
        return {
          name: 'Strong Uptrend',
          type: 'bullish',
          confidence: 0.80,
          description: 'Price > EMA20 > SMA50',
        };
      }

      if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.sma50) {
        return {
          name: 'Strong Downtrend',
          type: 'bearish',
          confidence: 0.80,
          description: 'Price < EMA20 < SMA50',
        };
      }
    }

    return null;
  }

  // IMPROVEMENT: Added minimum spacing to filter out noise (single candle spikes)
  private findPeaks(values: number[], minSpacing: number = 5): number[] {
    const peaks: number[] = [];
    for (let i = 2; i < values.length - 2; i++) {
      // Require peak to be higher than 2 candles on each side (reduces noise)
      if (values[i] > values[i - 1] &&
          values[i] > values[i - 2] &&
          values[i] > values[i + 1] &&
          values[i] > values[i + 2]) {
        // Enforce minimum spacing between peaks to avoid over-detection
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minSpacing) {
          peaks.push(i);
        }
      }
    }
    return peaks;
  }
}
