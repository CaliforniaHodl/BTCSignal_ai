import { RSI, MACD, BollingerBands, EMA, SMA, ATR } from 'technicalindicators';
import { OHLCV } from './data-provider';

export interface TechnicalIndicators {
  rsi: number | null;
  macd: { MACD: number; signal: number; histogram: number } | null;
  bollingerBands: { upper: number; middle: number; lower: number } | null;
  ema20: number | null;
  sma50: number | null;
  atr: number | null;
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

    return { rsi, macd, bollingerBands, ema20, sma50, atr };
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
    const peaks = this.findPeaks(highs);

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

  private findPeaks(values: number[]): number[] {
    const peaks: number[] = [];
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }
    return peaks;
  }
}
