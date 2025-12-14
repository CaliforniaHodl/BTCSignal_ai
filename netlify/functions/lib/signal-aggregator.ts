/**
 * Signal Aggregator Library
 * Combines all signals from different categories and calculates overall market bias
 */

export interface SignalInput {
  technical: {
    rsi?: number;
    macd?: { signal: 'bullish' | 'bearish' | 'neutral' };
    ma_cross?: { signal: 'bullish' | 'bearish' | 'neutral' };
    support_resistance?: { signal: 'bullish' | 'bearish' | 'neutral' };
    volume_trend?: { signal: 'bullish' | 'bearish' | 'neutral' };
  };
  onchain: {
    mvrv?: number;
    sopr?: number;
    nupl?: number;
    nvt?: number;
    exchangeNetflow?: number;
    reserveRisk?: number;
  };
  derivatives: {
    fundingRate?: number;
    openInterest?: number;
    longShortRatio?: number;
    liquidations?: { longs: number; shorts: number };
    maxPain?: number;
  };
  priceModels: {
    stockToFlow?: { deflection: number };
    realized_price?: { ratio: number };
    puellMultiple?: number;
  };
  sentiment: {
    fearGreed?: number;
    social_volume?: number;
    whale_activity?: { signal: 'bullish' | 'bearish' | 'neutral' };
  };
}

export interface SignalFactor {
  name: string;
  category: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  explanation: string;
}

export interface AggregatedSignal {
  overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0-100
  score: number; // -100 to +100
  breakdown: {
    technical: { score: number; weight: number; signal: string };
    onchain: { score: number; weight: number; signal: string };
    derivatives: { score: number; weight: number; signal: string };
    priceModels: { score: number; weight: number; signal: string };
    sentiment: { score: number; weight: number; signal: string };
  };
  bullishFactors: SignalFactor[];
  bearishFactors: SignalFactor[];
  neutralFactors: SignalFactor[];
  timestamp: number;
}

export class SignalAggregator {
  // Category weights (must sum to 100)
  private readonly WEIGHTS = {
    technical: 25,
    onchain: 30,
    derivatives: 20,
    priceModels: 15,
    sentiment: 10,
  };

  /**
   * Aggregate all signals into a single market bias
   */
  aggregate(input: SignalInput): AggregatedSignal {
    const factors: SignalFactor[] = [];

    // Analyze each category
    const technicalScore = this.analyzeTechnical(input.technical, factors);
    const onchainScore = this.analyzeOnchain(input.onchain, factors);
    const derivativesScore = this.analyzeDerivatives(input.derivatives, factors);
    const priceModelsScore = this.analyzePriceModels(input.priceModels, factors);
    const sentimentScore = this.analyzeSentiment(input.sentiment, factors);

    // Calculate weighted overall score
    const overallScore =
      (technicalScore * this.WEIGHTS.technical +
        onchainScore * this.WEIGHTS.onchain +
        derivativesScore * this.WEIGHTS.derivatives +
        priceModelsScore * this.WEIGHTS.priceModels +
        sentimentScore * this.WEIGHTS.sentiment) /
      100;

    // Determine overall signal
    let overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (overallScore > 20) overall = 'BULLISH';
    else if (overallScore < -20) overall = 'BEARISH';
    else overall = 'NEUTRAL';

    // Calculate confidence (0-100)
    const confidence = Math.min(100, Math.abs(overallScore));

    // Separate factors by signal
    const bullishFactors = factors
      .filter(f => f.signal === 'bullish')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    const bearishFactors = factors
      .filter(f => f.signal === 'bearish')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    const neutralFactors = factors.filter(f => f.signal === 'neutral');

    return {
      overall,
      confidence,
      score: overallScore,
      breakdown: {
        technical: {
          score: technicalScore,
          weight: this.WEIGHTS.technical,
          signal: this.getSignalLabel(technicalScore),
        },
        onchain: {
          score: onchainScore,
          weight: this.WEIGHTS.onchain,
          signal: this.getSignalLabel(onchainScore),
        },
        derivatives: {
          score: derivativesScore,
          weight: this.WEIGHTS.derivatives,
          signal: this.getSignalLabel(derivativesScore),
        },
        priceModels: {
          score: priceModelsScore,
          weight: this.WEIGHTS.priceModels,
          signal: this.getSignalLabel(priceModelsScore),
        },
        sentiment: {
          score: sentimentScore,
          weight: this.WEIGHTS.sentiment,
          signal: this.getSignalLabel(sentimentScore),
        },
      },
      bullishFactors,
      bearishFactors,
      neutralFactors,
      timestamp: Date.now(),
    };
  }

  /**
   * Analyze technical indicators
   */
  private analyzeTechnical(data: SignalInput['technical'], factors: SignalFactor[]): number {
    let score = 0;
    let count = 0;

    // RSI
    if (data.rsi !== undefined) {
      count++;
      if (data.rsi > 70) {
        score -= 30;
        factors.push({
          name: 'RSI Overbought',
          category: 'Technical',
          value: data.rsi.toFixed(1),
          signal: 'bearish',
          weight: 8,
          explanation: `RSI at ${data.rsi.toFixed(1)} indicates overbought conditions`,
        });
      } else if (data.rsi < 30) {
        score += 30;
        factors.push({
          name: 'RSI Oversold',
          category: 'Technical',
          value: data.rsi.toFixed(1),
          signal: 'bullish',
          weight: 8,
          explanation: `RSI at ${data.rsi.toFixed(1)} indicates oversold conditions`,
        });
      } else {
        factors.push({
          name: 'RSI Neutral',
          category: 'Technical',
          value: data.rsi.toFixed(1),
          signal: 'neutral',
          weight: 3,
          explanation: 'RSI in neutral range',
        });
      }
    }

    // MACD
    if (data.macd) {
      count++;
      if (data.macd.signal === 'bullish') {
        score += 25;
        factors.push({
          name: 'MACD Bullish',
          category: 'Technical',
          value: 'Bullish Cross',
          signal: 'bullish',
          weight: 7,
          explanation: 'MACD line crossed above signal line',
        });
      } else if (data.macd.signal === 'bearish') {
        score -= 25;
        factors.push({
          name: 'MACD Bearish',
          category: 'Technical',
          value: 'Bearish Cross',
          signal: 'bearish',
          weight: 7,
          explanation: 'MACD line crossed below signal line',
        });
      }
    }

    // MA Cross
    if (data.ma_cross) {
      count++;
      if (data.ma_cross.signal === 'bullish') {
        score += 20;
        factors.push({
          name: 'MA Golden Cross',
          category: 'Technical',
          value: 'Bullish',
          signal: 'bullish',
          weight: 6,
          explanation: 'Short-term MA crossed above long-term MA',
        });
      } else if (data.ma_cross.signal === 'bearish') {
        score -= 20;
        factors.push({
          name: 'MA Death Cross',
          category: 'Technical',
          value: 'Bearish',
          signal: 'bearish',
          weight: 6,
          explanation: 'Short-term MA crossed below long-term MA',
        });
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Analyze on-chain metrics
   */
  private analyzeOnchain(data: SignalInput['onchain'], factors: SignalFactor[]): number {
    let score = 0;
    let count = 0;

    // MVRV
    if (data.mvrv !== undefined) {
      count++;
      if (data.mvrv > 3.5) {
        score -= 40;
        factors.push({
          name: 'MVRV Extreme',
          category: 'On-Chain',
          value: data.mvrv.toFixed(2),
          signal: 'bearish',
          weight: 10,
          explanation: `MVRV at ${data.mvrv.toFixed(2)} signals extreme overvaluation`,
        });
      } else if (data.mvrv < 1.0) {
        score += 40;
        factors.push({
          name: 'MVRV Undervalued',
          category: 'On-Chain',
          value: data.mvrv.toFixed(2),
          signal: 'bullish',
          weight: 10,
          explanation: `MVRV at ${data.mvrv.toFixed(2)} signals undervaluation`,
        });
      } else if (data.mvrv > 2.4) {
        score -= 20;
        factors.push({
          name: 'MVRV Elevated',
          category: 'On-Chain',
          value: data.mvrv.toFixed(2),
          signal: 'bearish',
          weight: 6,
          explanation: 'MVRV indicates overvaluation',
        });
      }
    }

    // SOPR
    if (data.sopr !== undefined) {
      count++;
      if (data.sopr < 0.95) {
        score += 35;
        factors.push({
          name: 'SOPR Capitulation',
          category: 'On-Chain',
          value: data.sopr.toFixed(3),
          signal: 'bullish',
          weight: 9,
          explanation: `SOPR at ${data.sopr.toFixed(3)} indicates capitulation`,
        });
      } else if (data.sopr > 1.05) {
        score -= 15;
        factors.push({
          name: 'SOPR Profit Taking',
          category: 'On-Chain',
          value: data.sopr.toFixed(3),
          signal: 'bearish',
          weight: 5,
          explanation: 'Heavy profit realization ongoing',
        });
      }
    }

    // NUPL
    if (data.nupl !== undefined) {
      count++;
      if (data.nupl > 0.75) {
        score -= 30;
        factors.push({
          name: 'NUPL Euphoria',
          category: 'On-Chain',
          value: `${(data.nupl * 100).toFixed(1)}%`,
          signal: 'bearish',
          weight: 8,
          explanation: 'Market in euphoria phase',
        });
      } else if (data.nupl < 0) {
        score += 30;
        factors.push({
          name: 'NUPL Capitulation',
          category: 'On-Chain',
          value: `${(data.nupl * 100).toFixed(1)}%`,
          signal: 'bullish',
          weight: 8,
          explanation: 'Market in capitulation',
        });
      }
    }

    // Exchange Netflow
    if (data.exchangeNetflow !== undefined) {
      count++;
      if (data.exchangeNetflow > 10000) {
        score -= 25;
        factors.push({
          name: 'Exchange Inflow',
          category: 'On-Chain',
          value: `${(data.exchangeNetflow / 1000).toFixed(1)}K BTC`,
          signal: 'bearish',
          weight: 7,
          explanation: 'Large BTC moving to exchanges',
        });
      } else if (data.exchangeNetflow < -10000) {
        score += 25;
        factors.push({
          name: 'Exchange Outflow',
          category: 'On-Chain',
          value: `${(Math.abs(data.exchangeNetflow) / 1000).toFixed(1)}K BTC`,
          signal: 'bullish',
          weight: 7,
          explanation: 'Large BTC accumulation off exchanges',
        });
      }
    }

    // NVT
    if (data.nvt !== undefined) {
      count++;
      if (data.nvt > 100) {
        score -= 20;
        factors.push({
          name: 'NVT Overvalued',
          category: 'On-Chain',
          value: data.nvt.toFixed(1),
          signal: 'bearish',
          weight: 5,
          explanation: 'Network value exceeds transaction volume',
        });
      } else if (data.nvt < 25) {
        score += 20;
        factors.push({
          name: 'NVT Undervalued',
          category: 'On-Chain',
          value: data.nvt.toFixed(1),
          signal: 'bullish',
          weight: 5,
          explanation: 'Strong network usage relative to price',
        });
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Analyze derivatives data
   */
  private analyzeDerivatives(data: SignalInput['derivatives'], factors: SignalFactor[]): number {
    let score = 0;
    let count = 0;

    // Funding Rate
    if (data.fundingRate !== undefined) {
      count++;
      const rate = data.fundingRate * 100;
      if (rate > 0.1) {
        score -= 35;
        factors.push({
          name: 'Funding Extreme Positive',
          category: 'Derivatives',
          value: `${rate.toFixed(3)}%`,
          signal: 'bearish',
          weight: 9,
          explanation: 'Overleveraged longs - squeeze risk',
        });
      } else if (rate < -0.05) {
        score += 35;
        factors.push({
          name: 'Funding Extreme Negative',
          category: 'Derivatives',
          value: `${rate.toFixed(3)}%`,
          signal: 'bullish',
          weight: 9,
          explanation: 'Overleveraged shorts - squeeze potential',
        });
      } else if (rate > 0.05) {
        score -= 15;
        factors.push({
          name: 'Funding Elevated',
          category: 'Derivatives',
          value: `${rate.toFixed(3)}%`,
          signal: 'bearish',
          weight: 5,
          explanation: 'Longs paying premium',
        });
      }
    }

    // Long/Short Ratio
    if (data.longShortRatio !== undefined) {
      count++;
      if (data.longShortRatio > 2.0) {
        score -= 25;
        factors.push({
          name: 'L/S Ratio High',
          category: 'Derivatives',
          value: data.longShortRatio.toFixed(2),
          signal: 'bearish',
          weight: 7,
          explanation: 'Too many longs - contrarian bearish',
        });
      } else if (data.longShortRatio < 0.5) {
        score += 25;
        factors.push({
          name: 'L/S Ratio Low',
          category: 'Derivatives',
          value: data.longShortRatio.toFixed(2),
          signal: 'bullish',
          weight: 7,
          explanation: 'Too many shorts - contrarian bullish',
        });
      }
    }

    // Liquidations
    if (data.liquidations) {
      count++;
      const total = data.liquidations.longs + data.liquidations.shorts;
      if (data.liquidations.longs > data.liquidations.shorts * 2) {
        score += 20;
        factors.push({
          name: 'Long Liquidations',
          category: 'Derivatives',
          value: `$${(data.liquidations.longs / 1e6).toFixed(0)}M`,
          signal: 'bullish',
          weight: 6,
          explanation: 'Long flush may signal bottom',
        });
      } else if (data.liquidations.shorts > data.liquidations.longs * 2) {
        score -= 20;
        factors.push({
          name: 'Short Liquidations',
          category: 'Derivatives',
          value: `$${(data.liquidations.shorts / 1e6).toFixed(0)}M`,
          signal: 'bearish',
          weight: 6,
          explanation: 'Short squeeze may be exhausting',
        });
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Analyze price models
   */
  private analyzePriceModels(data: SignalInput['priceModels'], factors: SignalFactor[]): number {
    let score = 0;
    let count = 0;

    // Stock-to-Flow
    if (data.stockToFlow && data.stockToFlow.deflection !== undefined) {
      count++;
      const deflection = data.stockToFlow.deflection;
      if (deflection < -50) {
        score += 35;
        factors.push({
          name: 'S2F Undervalued',
          category: 'Price Models',
          value: `${deflection.toFixed(0)}%`,
          signal: 'bullish',
          weight: 8,
          explanation: 'Price significantly below S2F model',
        });
      } else if (deflection > 50) {
        score -= 25;
        factors.push({
          name: 'S2F Overvalued',
          category: 'Price Models',
          value: `+${deflection.toFixed(0)}%`,
          signal: 'bearish',
          weight: 6,
          explanation: 'Price significantly above S2F model',
        });
      }
    }

    // Realized Price Ratio
    if (data.realized_price && data.realized_price.ratio !== undefined) {
      count++;
      const ratio = data.realized_price.ratio;
      if (ratio < 0.8) {
        score += 30;
        factors.push({
          name: 'Below Realized Price',
          category: 'Price Models',
          value: `${(ratio * 100).toFixed(0)}%`,
          signal: 'bullish',
          weight: 7,
          explanation: 'Market trading below on-chain cost basis',
        });
      } else if (ratio > 2.0) {
        score -= 20;
        factors.push({
          name: 'Above Realized Price',
          category: 'Price Models',
          value: `${(ratio * 100).toFixed(0)}%`,
          signal: 'bearish',
          weight: 5,
          explanation: 'Market extended above cost basis',
        });
      }
    }

    // Puell Multiple
    if (data.puellMultiple !== undefined) {
      count++;
      if (data.puellMultiple < 0.5) {
        score += 30;
        factors.push({
          name: 'Puell Buy Zone',
          category: 'Price Models',
          value: data.puellMultiple.toFixed(2),
          signal: 'bullish',
          weight: 7,
          explanation: 'Miner stress indicates bottom',
        });
      } else if (data.puellMultiple > 1.2) {
        score -= 20;
        factors.push({
          name: 'Puell Sell Zone',
          category: 'Price Models',
          value: data.puellMultiple.toFixed(2),
          signal: 'bearish',
          weight: 5,
          explanation: 'High miner distribution',
        });
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Analyze sentiment indicators
   */
  private analyzeSentiment(data: SignalInput['sentiment'], factors: SignalFactor[]): number {
    let score = 0;
    let count = 0;

    // Fear & Greed
    if (data.fearGreed !== undefined) {
      count++;
      if (data.fearGreed < 20) {
        score += 30;
        factors.push({
          name: 'Extreme Fear',
          category: 'Sentiment',
          value: data.fearGreed.toString(),
          signal: 'bullish',
          weight: 6,
          explanation: 'Extreme fear indicates buying opportunity',
        });
      } else if (data.fearGreed > 80) {
        score -= 30;
        factors.push({
          name: 'Extreme Greed',
          category: 'Sentiment',
          value: data.fearGreed.toString(),
          signal: 'bearish',
          weight: 6,
          explanation: 'Extreme greed suggests overheated market',
        });
      }
    }

    // Whale Activity
    if (data.whale_activity) {
      count++;
      if (data.whale_activity.signal === 'bullish') {
        score += 20;
        factors.push({
          name: 'Whale Accumulation',
          category: 'Sentiment',
          value: 'Accumulating',
          signal: 'bullish',
          weight: 5,
          explanation: 'Smart money accumulating',
        });
      } else if (data.whale_activity.signal === 'bearish') {
        score -= 20;
        factors.push({
          name: 'Whale Distribution',
          category: 'Sentiment',
          value: 'Distributing',
          signal: 'bearish',
          weight: 5,
          explanation: 'Smart money distributing',
        });
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Get signal label from score
   */
  private getSignalLabel(score: number): string {
    if (score > 20) return 'Bullish';
    if (score < -20) return 'Bearish';
    return 'Neutral';
  }

  /**
   * Format aggregated signal for display
   */
  formatSignal(signal: AggregatedSignal): string {
    const lines: string[] = [];
    lines.push(`Overall Signal: ${signal.overall} (${signal.confidence}% confidence)`);
    lines.push(`Score: ${signal.score.toFixed(1)}`);
    lines.push('');
    lines.push('Breakdown:');
    lines.push(`  Technical (${signal.breakdown.technical.weight}%): ${signal.breakdown.technical.signal}`);
    lines.push(`  On-Chain (${signal.breakdown.onchain.weight}%): ${signal.breakdown.onchain.signal}`);
    lines.push(`  Derivatives (${signal.breakdown.derivatives.weight}%): ${signal.breakdown.derivatives.signal}`);
    lines.push(`  Price Models (${signal.breakdown.priceModels.weight}%): ${signal.breakdown.priceModels.signal}`);
    lines.push(`  Sentiment (${signal.breakdown.sentiment.weight}%): ${signal.breakdown.sentiment.signal}`);
    return lines.join('\n');
  }
}
