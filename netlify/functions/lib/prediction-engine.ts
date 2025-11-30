import { OHLCV } from './data-provider';
import { TechnicalIndicators, Pattern } from './technical-analysis';
import { DerivativesData } from './derivatives-analyzer';

export interface Prediction {
  direction: 'up' | 'down' | 'sideways' | 'mixed';
  confidence: number;
  targetPrice: number | null;
  stopLoss: number | null;
  predictedPrice24h: number | null;
  reasoning: string[];
  // Derivatives factors included in signal
  derivativesFactors?: {
    fundingRate: number | null;
    fundingSignal: 'bullish' | 'bearish' | 'neutral';
    openInterest: number | null;
    openInterestChange: 'rising' | 'falling' | 'stable' | null;
    squeezeRisk: 'long' | 'short' | 'none';
    squeezeProbability: 'high' | 'medium' | 'low';
  };
}

export class PredictionEngine {
  /**
   * Predict next market move based on indicators, patterns, and derivatives data
   */
  predict(
    data: OHLCV[],
    indicators: TechnicalIndicators,
    patterns: Pattern[],
    derivativesData?: DerivativesData
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

    // Intraday context analysis (where is price in 24h range + rejection/bounce detection)
    const last24h = data.slice(-24);
    if (last24h.length >= 24) {
      const high24h = Math.max(...last24h.map(d => d.high));
      const low24h = Math.min(...last24h.map(d => d.low));
      const range24h = high24h - low24h;

      if (range24h > 0) {
        const rangePosition = (currentPrice - low24h) / range24h;
        const recentHigh = Math.max(...data.slice(-6).map(d => d.high));
        const recentLow = Math.min(...data.slice(-6).map(d => d.low));

        if (recentHigh > low24h + range24h * 0.8 && rangePosition < 0.4) {
          signals.push({ signal: 'bearish', weight: 0.5, reason: 'Rejected at 24h highs' });
        }
        if (recentLow < low24h + range24h * 0.2 && rangePosition > 0.6) {
          signals.push({ signal: 'bullish', weight: 0.5, reason: 'Bounced from 24h lows' });
        }
        if (rangePosition < 0.25) {
          signals.push({ signal: 'bullish', weight: 0.3, reason: 'Near 24h lows (potential support)' });
        } else if (rangePosition > 0.75) {
          signals.push({ signal: 'bearish', weight: 0.3, reason: 'Near 24h highs (potential resistance)' });
        }
      }
    }

    // Detect sideways market (low volatility, price in middle of range)
    const isLowVolatility = indicators.atr !== null && indicators.atr < currentPrice * 0.015;
    const isInMiddleOfBB = indicators.bollingerBands !== null &&
      currentPrice > indicators.bollingerBands.lower * 1.02 &&
      currentPrice < indicators.bollingerBands.upper * 0.98;
    const isSideways = isLowVolatility && isInMiddleOfBB;

    // ===== DERIVATIVES ANALYSIS =====
    let derivativesFactors: Prediction['derivativesFactors'] = undefined;

    if (derivativesData) {
      const { fundingRate, openInterest, squeezeAlert } = derivativesData;

      // Initialize derivatives factors
      derivativesFactors = {
        fundingRate: fundingRate?.fundingRate ?? null,
        fundingSignal: 'neutral',
        openInterest: openInterest?.openInterestValue ?? null,
        openInterestChange: null,
        squeezeRisk: squeezeAlert.type === 'long_squeeze' ? 'long' : squeezeAlert.type === 'short_squeeze' ? 'short' : 'none',
        squeezeProbability: squeezeAlert.probability,
      };

      // Analyze Funding Rate
      // High positive funding = longs paying shorts = crowded long = contrarian bearish
      // High negative funding = shorts paying longs = crowded short = contrarian bullish
      if (fundingRate) {
        const rate = fundingRate.fundingRate;
        const ratePercent = rate * 100;

        if (rate > 0.01) {
          // Very high positive funding (>0.01% per 8h = 0.03%/day)
          signals.push({ signal: 'bearish', weight: 0.6, reason: `Extreme funding (${ratePercent.toFixed(3)}%) - overleveraged longs` });
          derivativesFactors.fundingSignal = 'bearish';
        } else if (rate > 0.005) {
          // Elevated positive funding
          signals.push({ signal: 'bearish', weight: 0.3, reason: `High funding (${ratePercent.toFixed(3)}%) - crowded long` });
          derivativesFactors.fundingSignal = 'bearish';
        } else if (rate < -0.01) {
          // Very negative funding
          signals.push({ signal: 'bullish', weight: 0.6, reason: `Negative funding (${ratePercent.toFixed(3)}%) - overleveraged shorts` });
          derivativesFactors.fundingSignal = 'bullish';
        } else if (rate < -0.005) {
          // Moderately negative funding
          signals.push({ signal: 'bullish', weight: 0.3, reason: `Low funding (${ratePercent.toFixed(3)}%) - crowded short` });
          derivativesFactors.fundingSignal = 'bullish';
        }
      }

      // Analyze Open Interest
      // High OI + directional move = conviction (amplify signal)
      // High OI + no move = potential for big move either way
      if (openInterest) {
        const oiBillions = openInterest.openInterestValue / 1_000_000_000;

        if (oiBillions > 25) {
          // Very high OI - increased conviction on directional signals
          signals.push({ signal: 'neutral', weight: 0.2, reason: `High OI ($${oiBillions.toFixed(1)}B) - elevated leverage` });
        }
      }

      // Analyze Squeeze Risk
      // If squeeze conditions detected, amplify the counter-signal
      if (squeezeAlert.type !== 'none' && squeezeAlert.probability !== 'low') {
        const weight = squeezeAlert.probability === 'high' ? 0.7 : 0.4;

        if (squeezeAlert.type === 'long_squeeze') {
          signals.push({ signal: 'bearish', weight, reason: `Long squeeze risk (${squeezeAlert.probability})` });
        } else if (squeezeAlert.type === 'short_squeeze') {
          signals.push({ signal: 'bullish', weight, reason: `Short squeeze risk (${squeezeAlert.probability})` });
        }
      }
    }

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
    let predictedPrice24h: number | null = null;

    const atr = indicators.atr || currentPrice * 0.02;

    if (direction === 'up' || direction === 'down') {
      const atrMultiplier = 2;
      if (direction === 'up') {
        targetPrice = currentPrice + atr * atrMultiplier;
        stopLoss = currentPrice - atr;
      } else {
        targetPrice = currentPrice - atr * atrMultiplier;
        stopLoss = currentPrice + atr;
      }
    }

    // Calculate 24h price prediction based on direction, confidence, and ATR
    const finalConfidence = Math.min(0.85, Math.round(confidence * 100) / 100);

    if (direction === 'up') {
      const movePercent = (finalConfidence - 0.5) * 2;
      predictedPrice24h = currentPrice * (1 + (movePercent * atr / currentPrice * 1.5));
    } else if (direction === 'down') {
      const movePercent = (finalConfidence - 0.5) * 2;
      predictedPrice24h = currentPrice * (1 - (movePercent * atr / currentPrice * 1.5));
    } else {
      predictedPrice24h = currentPrice;
    }

    return {
      direction,
      confidence: finalConfidence,
      targetPrice,
      stopLoss,
      predictedPrice24h,
      reasoning,
      derivativesFactors,
    };
  }
}
