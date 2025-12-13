import { OHLCV } from './data-provider';
import { TechnicalIndicators, Pattern } from './technical-analysis';
import { DerivativesData } from './derivatives-analyzer';
import { OnChainMetrics, analyzeOnChainMetrics, calculateOnChainScore } from './onchain-analyzer';
import { ExchangeFlowData, generateExchangeFlowSignals } from './exchange-analyzer';

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
  // On-chain factors included in signal
  onChainFactors?: {
    score: number;
    bias: 'bullish' | 'bearish' | 'neutral';
    topSignals: string[];
  };
  // Exchange flow factors included in signal
  exchangeFlowFactors?: {
    netflow: number;
    signal: 'bullish' | 'bearish' | 'neutral';
    whaleRatio: number;
    factors: string[];
  };
}

export class PredictionEngine {
  /**
   * Predict next market move based on indicators, patterns, derivatives, on-chain, and exchange flows
   */
  predict(
    data: OHLCV[],
    indicators: TechnicalIndicators,
    patterns: Pattern[],
    derivativesData?: DerivativesData,
    onChainData?: OnChainMetrics,
    exchangeFlowData?: ExchangeFlowData
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

    // Analyze MACD - BUG FIX: Detect actual crossovers, not just position
    if (indicators.macd !== null) {
      const currentHist = indicators.macd.histogram;
      const prevHist = indicators.prevMacdHistogram;

      // Check for actual crossover (histogram sign change)
      if (prevHist !== null) {
        if (prevHist <= 0 && currentHist > 0) {
          // Actual bullish crossover: MACD just crossed above signal line
          signals.push({ signal: 'bullish', weight: 0.8, reason: 'MACD bullish crossover (confirmed)' });
        } else if (prevHist >= 0 && currentHist < 0) {
          // Actual bearish crossover: MACD just crossed below signal line
          signals.push({ signal: 'bearish', weight: 0.8, reason: 'MACD bearish crossover (confirmed)' });
        } else if (currentHist > 0) {
          // Above signal but not a fresh crossover - bullish momentum but lower weight
          signals.push({ signal: 'bullish', weight: 0.4, reason: 'MACD bullish (above signal)' });
        } else if (currentHist < 0) {
          // Below signal but not a fresh crossover - bearish momentum but lower weight
          signals.push({ signal: 'bearish', weight: 0.4, reason: 'MACD bearish (below signal)' });
        }
      } else {
        // No previous data, fall back to position-based (lower weight)
        if (indicators.macd.MACD > indicators.macd.signal) {
          signals.push({ signal: 'bullish', weight: 0.4, reason: 'MACD bullish (position)' });
        } else {
          signals.push({ signal: 'bearish', weight: 0.4, reason: 'MACD bearish (position)' });
        }
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

    // NEW: Volume analysis - volume confirms price moves
    if (indicators.volumeRatio !== null) {
      const volRatio = indicators.volumeRatio;

      // High volume amplifies existing signals
      if (volRatio > 2.0) {
        // Extreme volume - check if it confirms direction
        const priceUp = data[data.length - 1].close > data[data.length - 2].close;
        if (priceUp) {
          signals.push({ signal: 'bullish', weight: 0.6, reason: `High volume rally (${volRatio.toFixed(1)}x avg)` });
        } else {
          signals.push({ signal: 'bearish', weight: 0.6, reason: `High volume selloff (${volRatio.toFixed(1)}x avg)` });
        }
      } else if (volRatio > 1.5) {
        const priceUp = data[data.length - 1].close > data[data.length - 2].close;
        if (priceUp) {
          signals.push({ signal: 'bullish', weight: 0.3, reason: `Above avg volume on green (${volRatio.toFixed(1)}x)` });
        } else {
          signals.push({ signal: 'bearish', weight: 0.3, reason: `Above avg volume on red (${volRatio.toFixed(1)}x)` });
        }
      } else if (volRatio < 0.5) {
        // Low volume moves are suspect - reduce conviction
        signals.push({ signal: 'neutral', weight: 0.2, reason: `Low volume (${volRatio.toFixed(1)}x avg) - weak conviction` });
      }
    }

    // NEW: Volume trend analysis
    if (indicators.volumeTrend === 'increasing') {
      signals.push({ signal: 'neutral', weight: 0.2, reason: 'Volume trend increasing - momentum building' });
    } else if (indicators.volumeTrend === 'decreasing') {
      signals.push({ signal: 'neutral', weight: 0.2, reason: 'Volume trend decreasing - momentum fading' });
    }

    // NEW: RSI divergence - powerful reversal signal
    if (indicators.rsiDivergence === 'bullish') {
      signals.push({ signal: 'bullish', weight: 0.8, reason: 'Bullish RSI divergence (price lower, RSI higher)' });
    } else if (indicators.rsiDivergence === 'bearish') {
      signals.push({ signal: 'bearish', weight: 0.8, reason: 'Bearish RSI divergence (price higher, RSI lower)' });
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

    // ===== ON-CHAIN ANALYSIS =====
    let onChainFactors: Prediction['onChainFactors'] = undefined;

    if (onChainData) {
      const onChainSignals = analyzeOnChainMetrics(onChainData);
      const { score, bias } = calculateOnChainScore(onChainSignals);

      // Extract top signals for reasoning
      const topSignals = onChainSignals
        .filter(s => s.signal !== 'neutral')
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3);

      onChainFactors = {
        score,
        bias,
        topSignals: topSignals.map(s => s.reason)
      };

      // Add on-chain signals to main signals array
      onChainSignals.forEach(s => {
        if (s.signal !== 'neutral' && s.weight >= 0.4) {
          signals.push({
            signal: s.signal,
            weight: s.weight * 0.8, // Slightly reduce on-chain weight vs TA
            reason: s.reason
          });
        }
      });

      // Add macro on-chain bias signal
      if (Math.abs(score) > 0.3) {
        const macroSignal = score > 0 ? 'bullish' : 'bearish';
        const macroWeight = Math.min(Math.abs(score), 0.7);
        signals.push({
          signal: macroSignal,
          weight: macroWeight,
          reason: `On-chain macro: ${bias} (score: ${score.toFixed(2)})`
        });
      }
    }

    // ===== EXCHANGE FLOW ANALYSIS =====
    let exchangeFlowFactors: Prediction['exchangeFlowFactors'] = undefined;

    if (exchangeFlowData) {
      const flowSignals = generateExchangeFlowSignals(exchangeFlowData);

      exchangeFlowFactors = {
        netflow: exchangeFlowData.netflow24h,
        signal: flowSignals.signal,
        whaleRatio: exchangeFlowData.whaleRatio,
        factors: flowSignals.factors,
      };

      // Add flow signals to main signals array
      if (flowSignals.signal !== 'neutral') {
        signals.push({
          signal: flowSignals.signal,
          weight: flowSignals.weight,
          reason: `Exchange flows ${flowSignals.signal} (${exchangeFlowData.netflow24h >= 0 ? '+' : ''}${exchangeFlowData.netflow24h.toFixed(0)} BTC net)`
        });
      }

      // Add individual flow factors
      flowSignals.factors.forEach(factor => {
        const factorSignal = flowSignals.signal;
        signals.push({
          signal: factorSignal,
          weight: flowSignals.weight * 0.5,
          reason: factor
        });
      });
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
      // BUG FIX: Mixed signals should have LOW confidence, not high
      // When bullish/bearish are balanced, we're uncertain about direction
      confidence = 0.5 + (Math.abs(bullishPercent - bearishPercent) * 2);
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
      onChainFactors,
      exchangeFlowFactors,
    };
  }
}
