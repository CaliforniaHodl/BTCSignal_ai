import { OHLCV } from './data-provider';
import { TechnicalIndicators, Pattern } from './technical-analysis';

export interface Prediction {
  direction: 'up' | 'down' | 'sideways' | 'mixed';
  confidence: number;
  targetPrice: number | null;
  stopLoss: number | null;
  reasoning: string[];
}

export class PredictionEngine {
  /**
   * Predict next market move based on indicators and patterns
   */
  predict(
    data: OHLCV[],
    indicators: TechnicalIndicators,
    patterns: Pattern[]
  ): Prediction {
    const currentPrice = data[data.length - 1].close;
    const signals: Array<{ signal: 'bullish' | 'bearish' | 'neutral'; weight: number; reason: string }> = [];

    // Analyze RSI
    if (indicators.rsi !== null) {
      if (indicators.rsi < 30) {
        signals.push({ signal: 'bullish', weight: 0.8, reason: `RSI oversold (${indicators.rsi.toFixed(0)})` });
      } else if (indicators.rsi > 70) {
        signals.push({ signal: 'bearish', weight: 0.8, reason: `RSI overbought (${indicators.rsi.toFixed(0)})` });
      } else if (indicators.rsi > 50) {
        signals.push({ signal: 'bullish', weight: 0.3, reason: `RSI bullish (${indicators.rsi.toFixed(0)})` });
      } else {
        signals.push({ signal: 'bearish', weight: 0.3, reason: `RSI bearish (${indicators.rsi.toFixed(0)})` });
      }
    }

    // Analyze MACD
    if (indicators.macd !== null) {
      if (indicators.macd.MACD > indicators.macd.signal) {
        signals.push({ signal: 'bullish', weight: 0.7, reason: 'MACD bullish crossover' });
      } else {
        signals.push({ signal: 'bearish', weight: 0.7, reason: 'MACD bearish crossover' });
      }
    }

    // Analyze Bollinger Bands
    if (indicators.bollingerBands !== null) {
      const { upper, lower } = indicators.bollingerBands;
      if (currentPrice < lower) {
        signals.push({ signal: 'bullish', weight: 0.7, reason: 'Below lower BB' });
      } else if (currentPrice > upper) {
        signals.push({ signal: 'bearish', weight: 0.7, reason: 'Above upper BB' });
      }
    }

    // Analyze EMA/SMA trend
    if (indicators.ema20 && indicators.sma50) {
      if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.sma50) {
        signals.push({ signal: 'bullish', weight: 0.9, reason: 'Strong uptrend' });
      } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.sma50) {
        signals.push({ signal: 'bearish', weight: 0.9, reason: 'Strong downtrend' });
      }
    }

    // Analyze patterns
    patterns.forEach(pattern => {
      if (pattern.type === 'bullish') {
        signals.push({ signal: 'bullish', weight: pattern.confidence, reason: pattern.name });
      } else if (pattern.type === 'bearish') {
        signals.push({ signal: 'bearish', weight: pattern.confidence, reason: pattern.name });
      }
    });


    // Detect sideways market (low volatility, price in middle of range)
    const isLowVolatility = indicators.atr !== null && indicators.atr < currentPrice * 0.015;
    const isInMiddleOfBB = indicators.bollingerBands !== null &&
      currentPrice > indicators.bollingerBands.lower * 1.02 &&
      currentPrice < indicators.bollingerBands.upper * 0.98;
    const isSideways = isLowVolatility && isInMiddleOfBB;

    // Calculate weighted score
    let bullishScore = 0;
    let bearishScore = 0;
    const reasoning: string[] = [];

    signals.forEach(s => {
      if (s.signal === 'bullish') {
        bullishScore += s.weight;
        reasoning.push(`+ ${s.reason}`);
      } else if (s.signal === 'bearish') {
        bearishScore += s.weight;
        reasoning.push(`- ${s.reason}`);
      }
    });

    const totalScore = bullishScore + bearishScore;
    const bullishPercent = totalScore > 0 ? bullishScore / totalScore : 0.5;
    const bearishPercent = totalScore > 0 ? bearishScore / totalScore : 0.5;

    let direction: 'up' | 'down' | 'sideways' | 'mixed';
    let confidence: number;

    if (isSideways && Math.abs(bullishPercent - bearishPercent) < 0.2) {
      direction = 'sideways';
      confidence = 0.7 + (0.3 * (1 - Math.abs(bullishPercent - bearishPercent)));
      reasoning.push('= Low volatility, price ranging');
    } else if (Math.abs(bullishPercent - bearishPercent) < 0.15) {
      direction = 'mixed';
      confidence = 1 - Math.abs(bullishPercent - bearishPercent);
    } else if (bullishPercent > bearishPercent) {
      direction = 'up';
      confidence = bullishPercent;
    } else {
      direction = 'down';
      confidence = bearishPercent;
    }

    // Calculate target and stop loss
    let targetPrice: number | null = null;
    let stopLoss: number | null = null;

    if (direction === 'up' || direction === 'down') {
      const atrMultiplier = 2;
      const atr = indicators.atr || currentPrice * 0.02;
      if (direction === 'up') {
        targetPrice = currentPrice + atr * atrMultiplier;
        stopLoss = currentPrice - atr;
      } else {
        targetPrice = currentPrice - atr * atrMultiplier;
        stopLoss = currentPrice + atr;
      }
    }

    return {
      direction,
      confidence: Math.round(confidence * 100) / 100,
      targetPrice,
      stopLoss,
      reasoning,
    };
  }
}
