/**
 * Market Report Library
 * Generates comprehensive daily market analysis reports
 */

import { SignalAggregator, SignalInput, AggregatedSignal } from './signal-aggregator';

export interface MarketMetrics {
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
  volume24h: number;
  marketCap: number;
  dominance: number;
  volatility: number;
}

export interface OnChainMetrics {
  mvrv: number;
  sopr: number;
  nupl: number;
  nvt: number;
  exchangeNetflow: number;
  activeAddresses: number;
  transactionVolume: number;
}

export interface DerivativesMetrics {
  fundingRate: number;
  openInterest: number;
  longShortRatio: number;
  liquidations24h: { longs: number; shorts: number };
  impliedVolatility?: number;
}

export interface SentimentMetrics {
  fearGreed: number;
  socialVolume?: number;
  whaleActivity: 'accumulating' | 'distributing' | 'neutral';
}

export interface MarketGrade {
  grade: string; // A+ to F
  score: number; // 0-100
  label: string; // Exceptional, Strong, Good, Fair, Poor, Very Poor
}

export interface MarketHighlight {
  type: 'bullish' | 'bearish' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface MarketReport {
  date: string;
  timestamp: number;
  grade: MarketGrade;
  signal: AggregatedSignal;
  summary: string;
  highlights: MarketHighlight[];
  warnings: MarketHighlight[];
  priceAction: {
    current: number;
    change24h: number;
    trend: string;
    support: number | null;
    resistance: number | null;
  };
  onchainSummary: {
    overall: string;
    keyMetrics: { name: string; value: string; signal: string }[];
  };
  derivativesSummary: {
    overall: string;
    keyMetrics: { name: string; value: string; signal: string }[];
  };
  sentimentSummary: {
    overall: string;
    fearGreed: number;
    sentiment: string;
  };
  historicalComparison: {
    vsYesterday: { score: number; change: string };
    vs7DaysAgo: { score: number; change: string };
    vs30DaysAgo: { score: number; change: string };
  };
  recommendation: string;
}

export class MarketReportGenerator {
  private signalAggregator: SignalAggregator;

  constructor() {
    this.signalAggregator = new SignalAggregator();
  }

  /**
   * Generate comprehensive market report
   */
  generate(
    marketMetrics: MarketMetrics,
    onchain: OnChainMetrics,
    derivatives: DerivativesMetrics,
    sentiment: SentimentMetrics,
    historicalGrades?: { yesterday?: number; week?: number; month?: number }
  ): MarketReport {
    // Prepare signal input
    const signalInput: SignalInput = {
      technical: {
        rsi: this.calculateRSI(marketMetrics.priceChange24h),
        volume_trend: { signal: this.getVolumeTrend(marketMetrics.volume24h) },
      },
      onchain: {
        mvrv: onchain.mvrv,
        sopr: onchain.sopr,
        nupl: onchain.nupl,
        nvt: onchain.nvt,
        exchangeNetflow: onchain.exchangeNetflow,
      },
      derivatives: {
        fundingRate: derivatives.fundingRate,
        openInterest: derivatives.openInterest,
        longShortRatio: derivatives.longShortRatio,
        liquidations: derivatives.liquidations24h,
      },
      priceModels: {
        realized_price: { ratio: onchain.mvrv }, // Simplified
      },
      sentiment: {
        fearGreed: sentiment.fearGreed,
        whale_activity: { signal: sentiment.whaleActivity as any },
      },
    };

    // Generate aggregated signal
    const signal = this.signalAggregator.aggregate(signalInput);

    // Calculate market grade
    const grade = this.calculateGrade(signal, marketMetrics, onchain, derivatives, sentiment);

    // Generate highlights and warnings
    const highlights = this.generateHighlights(signal, marketMetrics, onchain, derivatives, sentiment);
    const warnings = this.generateWarnings(signal, marketMetrics, onchain, derivatives, sentiment);

    // Generate summary sections
    const onchainSummary = this.generateOnchainSummary(onchain);
    const derivativesSummary = this.generateDerivativesSummary(derivatives);
    const sentimentSummary = this.generateSentimentSummary(sentiment);

    // Calculate historical comparison
    const historicalComparison = this.calculateHistoricalComparison(grade.score, historicalGrades);

    // Generate overall summary
    const summary = this.generateSummary(signal, grade, marketMetrics);

    // Generate recommendation
    const recommendation = this.generateRecommendation(signal, grade, warnings);

    return {
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      grade,
      signal,
      summary,
      highlights,
      warnings,
      priceAction: {
        current: marketMetrics.price,
        change24h: marketMetrics.priceChange24h,
        trend: this.getPriceTrend(marketMetrics),
        support: null, // Would need chart analysis
        resistance: null, // Would need chart analysis
      },
      onchainSummary,
      derivativesSummary,
      sentimentSummary,
      historicalComparison,
      recommendation,
    };
  }

  /**
   * Calculate overall market grade
   */
  private calculateGrade(
    signal: AggregatedSignal,
    market: MarketMetrics,
    onchain: OnChainMetrics,
    derivatives: DerivativesMetrics,
    sentiment: SentimentMetrics
  ): MarketGrade {
    // Start with signal score (normalized to 0-100)
    let score = ((signal.score + 100) / 2);

    // Adjust for extreme conditions
    if (onchain.mvrv > 3.5) score *= 0.7; // Cycle top warning
    if (onchain.mvrv < 1.0) score *= 1.3; // Undervaluation bonus
    if (derivatives.fundingRate > 0.001) score *= 0.8; // High funding penalty
    if (Math.abs(derivatives.fundingRate) < 0.0001) score *= 1.1; // Neutral funding bonus
    if (sentiment.fearGreed < 20) score *= 1.2; // Fear is bullish
    if (sentiment.fearGreed > 80) score *= 0.8; // Greed is bearish

    // Volatility adjustment
    if (market.volatility > 15) score *= 0.9; // High vol penalty

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Convert to letter grade
    let grade: string;
    let label: string;

    if (score >= 90) {
      grade = 'A+';
      label = 'Exceptional';
    } else if (score >= 85) {
      grade = 'A';
      label = 'Excellent';
    } else if (score >= 80) {
      grade = 'A-';
      label = 'Very Good';
    } else if (score >= 75) {
      grade = 'B+';
      label = 'Good';
    } else if (score >= 70) {
      grade = 'B';
      label = 'Above Average';
    } else if (score >= 65) {
      grade = 'B-';
      label = 'Slightly Above Average';
    } else if (score >= 60) {
      grade = 'C+';
      label = 'Average';
    } else if (score >= 55) {
      grade = 'C';
      label = 'Fair';
    } else if (score >= 50) {
      grade = 'C-';
      label = 'Below Average';
    } else if (score >= 45) {
      grade = 'D+';
      label = 'Poor';
    } else if (score >= 40) {
      grade = 'D';
      label = 'Very Poor';
    } else if (score >= 35) {
      grade = 'D-';
      label = 'Critical';
    } else {
      grade = 'F';
      label = 'Failing';
    }

    return { grade, score, label };
  }

  /**
   * Generate market highlights
   */
  private generateHighlights(
    signal: AggregatedSignal,
    market: MarketMetrics,
    onchain: OnChainMetrics,
    derivatives: DerivativesMetrics,
    sentiment: SentimentMetrics
  ): MarketHighlight[] {
    const highlights: MarketHighlight[] = [];

    // Top bullish factors
    for (const factor of signal.bullishFactors.slice(0, 3)) {
      highlights.push({
        type: 'bullish',
        title: factor.name,
        description: factor.explanation,
        impact: factor.weight > 7 ? 'high' : factor.weight > 5 ? 'medium' : 'low',
      });
    }

    // Top bearish factors
    for (const factor of signal.bearishFactors.slice(0, 3)) {
      highlights.push({
        type: 'bearish',
        title: factor.name,
        description: factor.explanation,
        impact: factor.weight > 7 ? 'high' : factor.weight > 5 ? 'medium' : 'low',
      });
    }

    // Notable events
    if (Math.abs(market.priceChange24h) > 5) {
      highlights.push({
        type: market.priceChange24h > 0 ? 'bullish' : 'bearish',
        title: `Significant ${market.priceChange24h > 0 ? 'Rally' : 'Decline'}`,
        description: `Price moved ${market.priceChange24h.toFixed(2)}% in 24 hours`,
        impact: Math.abs(market.priceChange24h) > 10 ? 'high' : 'medium',
      });
    }

    return highlights;
  }

  /**
   * Generate market warnings
   */
  private generateWarnings(
    signal: AggregatedSignal,
    market: MarketMetrics,
    onchain: OnChainMetrics,
    derivatives: DerivativesMetrics,
    sentiment: SentimentMetrics
  ): MarketHighlight[] {
    const warnings: MarketHighlight[] = [];

    // MVRV warnings
    if (onchain.mvrv > 3.5) {
      warnings.push({
        type: 'warning',
        title: 'Cycle Top Warning',
        description: `MVRV at ${onchain.mvrv.toFixed(2)} indicates extreme overvaluation. Historical cycle tops occur in this range.`,
        impact: 'high',
      });
    }

    // Funding rate warnings
    if (derivatives.fundingRate > 0.001) {
      warnings.push({
        type: 'warning',
        title: 'Overleveraged Longs',
        description: `Funding rate at ${(derivatives.fundingRate * 100).toFixed(3)}% indicates high long leverage. Long squeeze risk elevated.`,
        impact: 'high',
      });
    }

    if (derivatives.fundingRate < -0.0005) {
      warnings.push({
        type: 'warning',
        title: 'Overleveraged Shorts',
        description: `Negative funding indicates overleveraged shorts. Short squeeze potential.`,
        impact: 'medium',
      });
    }

    // Volatility warning
    if (market.volatility > 15) {
      warnings.push({
        type: 'warning',
        title: 'High Volatility',
        description: `24h volatility at ${market.volatility.toFixed(1)}%. Elevated risk for leveraged positions.`,
        impact: 'medium',
      });
    }

    // Liquidation warnings
    const totalLiqs = derivatives.liquidations24h.longs + derivatives.liquidations24h.shorts;
    if (totalLiqs > 500000000) {
      warnings.push({
        type: 'warning',
        title: 'High Liquidations',
        description: `$${(totalLiqs / 1e6).toFixed(0)}M liquidated in 24h. Market experiencing forced closures.`,
        impact: 'high',
      });
    }

    return warnings;
  }

  /**
   * Generate on-chain summary
   */
  private generateOnchainSummary(onchain: OnChainMetrics): {
    overall: string;
    keyMetrics: { name: string; value: string; signal: string }[];
  } {
    const metrics = [
      {
        name: 'MVRV Ratio',
        value: onchain.mvrv.toFixed(2),
        signal: onchain.mvrv > 2.4 ? 'bearish' : onchain.mvrv < 1.0 ? 'bullish' : 'neutral',
      },
      {
        name: 'SOPR',
        value: onchain.sopr.toFixed(3),
        signal: onchain.sopr < 0.95 ? 'bullish' : onchain.sopr > 1.05 ? 'bearish' : 'neutral',
      },
      {
        name: 'NUPL',
        value: `${(onchain.nupl * 100).toFixed(1)}%`,
        signal: onchain.nupl > 0.75 ? 'bearish' : onchain.nupl < 0 ? 'bullish' : 'neutral',
      },
      {
        name: 'NVT Ratio',
        value: onchain.nvt.toFixed(1),
        signal: onchain.nvt > 100 ? 'bearish' : onchain.nvt < 25 ? 'bullish' : 'neutral',
      },
    ];

    const bullishCount = metrics.filter(m => m.signal === 'bullish').length;
    const bearishCount = metrics.filter(m => m.signal === 'bearish').length;

    let overall: string;
    if (bullishCount > bearishCount + 1) {
      overall = 'On-chain metrics are generally bullish, indicating healthy network fundamentals.';
    } else if (bearishCount > bullishCount + 1) {
      overall = 'On-chain metrics show bearish signs, suggesting caution for new positions.';
    } else {
      overall = 'On-chain metrics are mixed, providing no clear directional bias.';
    }

    return { overall, keyMetrics: metrics };
  }

  /**
   * Generate derivatives summary
   */
  private generateDerivativesSummary(derivatives: DerivativesMetrics): {
    overall: string;
    keyMetrics: { name: string; value: string; signal: string }[];
  } {
    const fundingPct = derivatives.fundingRate * 100;
    const metrics = [
      {
        name: 'Funding Rate',
        value: `${fundingPct.toFixed(3)}%`,
        signal: fundingPct > 0.05 ? 'bearish' : fundingPct < -0.03 ? 'bullish' : 'neutral',
      },
      {
        name: 'Long/Short Ratio',
        value: derivatives.longShortRatio.toFixed(2),
        signal:
          derivatives.longShortRatio > 1.5 ? 'bearish' : derivatives.longShortRatio < 0.7 ? 'bullish' : 'neutral',
      },
      {
        name: 'Open Interest',
        value: `$${(derivatives.openInterest / 1e9).toFixed(2)}B`,
        signal: 'neutral',
      },
    ];

    let overall: string;
    if (Math.abs(derivatives.fundingRate) > 0.001) {
      overall = 'Derivatives market shows extreme positioning, indicating potential for mean reversion.';
    } else if (derivatives.longShortRatio > 1.5) {
      overall = 'Futures market is overcrowded on the long side, contrarian bearish signal.';
    } else if (derivatives.longShortRatio < 0.7) {
      overall = 'Futures market is overcrowded on the short side, contrarian bullish signal.';
    } else {
      overall = 'Derivatives market is balanced with no extreme positioning.';
    }

    return { overall, keyMetrics: metrics };
  }

  /**
   * Generate sentiment summary
   */
  private generateSentimentSummary(sentiment: SentimentMetrics): {
    overall: string;
    fearGreed: number;
    sentiment: string;
  } {
    let sentimentLabel: string;
    if (sentiment.fearGreed < 20) sentimentLabel = 'Extreme Fear';
    else if (sentiment.fearGreed < 40) sentimentLabel = 'Fear';
    else if (sentiment.fearGreed < 60) sentimentLabel = 'Neutral';
    else if (sentiment.fearGreed < 80) sentimentLabel = 'Greed';
    else sentimentLabel = 'Extreme Greed';

    let overall: string;
    if (sentiment.fearGreed < 20) {
      overall = 'Extreme fear dominates the market, historically a contrarian buying signal.';
    } else if (sentiment.fearGreed > 80) {
      overall = 'Extreme greed suggests market may be overheated. Exercise caution.';
    } else {
      overall = `Market sentiment is ${sentimentLabel.toLowerCase()}, indicating balanced psychology.`;
    }

    return {
      overall,
      fearGreed: sentiment.fearGreed,
      sentiment: sentimentLabel,
    };
  }

  /**
   * Calculate historical comparison
   */
  private calculateHistoricalComparison(
    currentScore: number,
    historicalGrades?: { yesterday?: number; week?: number; month?: number }
  ): MarketReport['historicalComparison'] {
    const compare = (historical?: number) => {
      if (!historical) return { score: 0, change: 'N/A' };
      const diff = currentScore - historical;
      let change: string;
      if (Math.abs(diff) < 3) change = 'Unchanged';
      else if (diff > 0) change = `Improved +${diff.toFixed(1)}`;
      else change = `Declined ${diff.toFixed(1)}`;
      return { score: historical, change };
    };

    return {
      vsYesterday: compare(historicalGrades?.yesterday),
      vs7DaysAgo: compare(historicalGrades?.week),
      vs30DaysAgo: compare(historicalGrades?.month),
    };
  }

  /**
   * Generate overall summary
   */
  private generateSummary(signal: AggregatedSignal, grade: MarketGrade, market: MarketMetrics): string {
    const parts: string[] = [];

    parts.push(`Market Grade: ${grade.grade} (${grade.label})`);
    parts.push(`Overall Signal: ${signal.overall} with ${signal.confidence}% confidence`);
    parts.push(`Bitcoin trading at $${market.price.toLocaleString()} (${market.priceChange24h > 0 ? '+' : ''}${market.priceChange24h.toFixed(2)}% 24h)`);

    if (signal.overall === 'BULLISH') {
      parts.push('Market conditions favor upside with multiple bullish catalysts aligned.');
    } else if (signal.overall === 'BEARISH') {
      parts.push('Market conditions suggest downside risk with bearish factors dominating.');
    } else {
      parts.push('Market is in a consolidation phase with no clear directional bias.');
    }

    return parts.join('. ');
  }

  /**
   * Generate trading recommendation
   */
  private generateRecommendation(signal: AggregatedSignal, grade: MarketGrade, warnings: MarketHighlight[]): string {
    const criticalWarnings = warnings.filter(w => w.impact === 'high');

    if (criticalWarnings.length > 0) {
      return 'Exercise extreme caution. Multiple high-impact warnings active. Reduce position sizes and avoid new leveraged positions.';
    }

    if (signal.overall === 'BULLISH' && grade.score > 70) {
      return 'Favorable conditions for long positions. Consider entries on pullbacks. Use appropriate stop losses.';
    }

    if (signal.overall === 'BEARISH' && grade.score < 50) {
      return 'Defensive positioning recommended. Preserve capital and wait for better risk/reward setups.';
    }

    if (signal.confidence < 50) {
      return 'Low confidence signal. Market lacks clear direction. Best to wait for confirmation before taking new positions.';
    }

    return 'Mixed signals suggest patience. Wait for clearer market structure before committing significant capital.';
  }

  /**
   * Helper: Calculate RSI (simplified)
   */
  private calculateRSI(priceChange: number): number {
    // Simplified RSI based on price change
    // In production, would use actual RSI calculation
    if (priceChange > 0) {
      return 50 + Math.min(30, priceChange * 2);
    } else {
      return 50 - Math.min(30, Math.abs(priceChange) * 2);
    }
  }

  /**
   * Helper: Get volume trend
   */
  private getVolumeTrend(volume: number): 'bullish' | 'bearish' | 'neutral' {
    // Would need historical volume data
    return 'neutral';
  }

  /**
   * Helper: Get price trend
   */
  private getPriceTrend(market: MarketMetrics): string {
    if (market.priceChange24h > 3) return 'Strong Uptrend';
    if (market.priceChange24h > 1) return 'Uptrend';
    if (market.priceChange24h < -3) return 'Strong Downtrend';
    if (market.priceChange24h < -1) return 'Downtrend';
    return 'Ranging';
  }
}
