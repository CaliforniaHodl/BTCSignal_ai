import { Prediction } from './prediction-engine';
import { TechnicalIndicators, Pattern } from './technical-analysis';

export interface AnalysisResult {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  priceChange: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  prediction: Prediction;
  indicators: TechnicalIndicators;
  patterns: Pattern[];
  timestamp: Date;
}

export interface TradingSuggestion {
  type: 'bullish' | 'bearish';
  entry: number;
  target: number;
  stopLoss: number;
  riskReward: string;
  reasoning: string;
}

export interface ThreadTweets {
  taOverview: string;
  tradeSetups: string;
  callAndOutlook: string;
}

export interface HistoricalCall {
  date: string;
  direction: 'up' | 'down' | 'hold';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  actualResult: 'win' | 'loss' | 'pending';
  pnlPercent: number | null;
}

export interface WeeklyRefinement {
  originalBias: 'up' | 'down' | 'hold';
  refinedBias: 'up' | 'down' | 'hold';
  refinedConfidence: number;
  priceMovement7d: number;
  reasoning: string;
  daysTracked: number;
}

export class BlogGenerator {
  /**
   * Generate trading suggestions for bullish and bearish scenarios
   */
  generateTradingSuggestions(analysis: AnalysisResult): {
    bullish: TradingSuggestion;
    bearish: TradingSuggestion;
  } {
    const { currentPrice, indicators } = analysis;
    const atr = indicators.atr || currentPrice * 0.02;

    // Bullish suggestion - long position
    const bullish: TradingSuggestion = {
      type: 'bullish',
      entry: currentPrice,
      target: currentPrice + (atr * 2.5),
      stopLoss: currentPrice - atr,
      riskReward: '1:2.5',
      reasoning: indicators.rsi !== null && indicators.rsi < 40
        ? 'RSI showing oversold conditions, potential bounce'
        : 'Trend momentum supports upside continuation',
    };

    // Bearish suggestion - short position
    const bearish: TradingSuggestion = {
      type: 'bearish',
      entry: currentPrice,
      target: currentPrice - (atr * 2.5),
      stopLoss: currentPrice + atr,
      riskReward: '1:2.5',
      reasoning: indicators.rsi !== null && indicators.rsi > 60
        ? 'RSI elevated, potential pullback ahead'
        : 'Resistance overhead may cap gains',
    };

    return { bullish, bearish };
  }

  /**
   * Analyze 7-day price action and refine prediction
   */
  generateWeeklyRefinement(
    analysis: AnalysisResult,
    historicalCalls: HistoricalCall[]
  ): WeeklyRefinement {
    const { currentPrice, prediction, indicators } = analysis;

    // Get calls from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCalls = historicalCalls.filter(c => new Date(c.date) >= sevenDaysAgo);

    if (recentCalls.length === 0) {
      return {
        originalBias: prediction.direction,
        refinedBias: prediction.direction,
        refinedConfidence: prediction.confidence,
        priceMovement7d: 0,
        reasoning: 'First week of tracking - following TA signals',
        daysTracked: 0,
      };
    }

    // Calculate 7d price movement from oldest recent call
    const oldestCall = recentCalls.reduce((oldest, call) =>
      new Date(call.date) < new Date(oldest.date) ? call : oldest
    );
    const priceMovement7d = ((currentPrice - oldestCall.entryPrice) / oldestCall.entryPrice) * 100;

    // Analyze win/loss pattern
    const completedCalls = recentCalls.filter(c => c.actualResult !== 'pending');
    const wins = completedCalls.filter(c => c.actualResult === 'win').length;
    const losses = completedCalls.filter(c => c.actualResult === 'loss').length;
    const winRate = completedCalls.length > 0 ? wins / completedCalls.length : 0.5;

    // Determine if we should reverse or stick with current bias
    let refinedBias = prediction.direction;
    let refinedConfidence = prediction.confidence;
    let reasoning = '';

    // Check for reversal signals
    const strongUpMove = priceMovement7d > 5;
    const strongDownMove = priceMovement7d < -5;
    const consecutiveLosses = this.getConsecutiveLosses(recentCalls);
    const rsiOversold = indicators.rsi !== null && indicators.rsi < 30;
    const rsiOverbought = indicators.rsi !== null && indicators.rsi > 70;

    if (consecutiveLosses >= 2) {
      // Been wrong multiple times - consider reversal
      if (prediction.direction === 'up' && strongDownMove) {
        refinedBias = 'down';
        refinedConfidence = Math.min(0.75, prediction.confidence + 0.1);
        reasoning = `Reversing bias: ${consecutiveLosses} consecutive losses, -${Math.abs(priceMovement7d).toFixed(1)}% over 7d`;
      } else if (prediction.direction === 'down' && strongUpMove) {
        refinedBias = 'up';
        refinedConfidence = Math.min(0.75, prediction.confidence + 0.1);
        reasoning = `Reversing bias: ${consecutiveLosses} consecutive losses, +${priceMovement7d.toFixed(1)}% over 7d`;
      } else {
        reasoning = `Cautious: ${consecutiveLosses} losses but no clear reversal yet`;
        refinedConfidence = Math.max(0.45, prediction.confidence - 0.15);
      }
    } else if (winRate >= 0.6 && completedCalls.length >= 3) {
      // Winning streak - increase confidence
      refinedConfidence = Math.min(0.85, prediction.confidence + 0.1);
      reasoning = `Confident: ${wins}W-${losses}L this week, trend intact`;
    } else if (rsiOversold && prediction.direction === 'down') {
      // RSI suggests bounce but we're bearish - reduce confidence
      refinedConfidence = Math.max(0.5, prediction.confidence - 0.1);
      reasoning = 'RSI oversold may trigger bounce - reducing bearish conviction';
    } else if (rsiOverbought && prediction.direction === 'up') {
      // RSI suggests pullback but we're bullish - reduce confidence
      refinedConfidence = Math.max(0.5, prediction.confidence - 0.1);
      reasoning = 'RSI overbought may trigger pullback - reducing bullish conviction';
    } else {
      reasoning = `Maintaining bias: ${priceMovement7d >= 0 ? '+' : ''}${priceMovement7d.toFixed(1)}% over ${recentCalls.length}d`;
    }

    return {
      originalBias: prediction.direction,
      refinedBias,
      refinedConfidence,
      priceMovement7d,
      reasoning,
      daysTracked: recentCalls.length,
    };
  }

  /**
   * Count consecutive losses from most recent calls
   */
  private getConsecutiveLosses(calls: HistoricalCall[]): number {
    const sorted = [...calls]
      .filter(c => c.actualResult !== 'pending')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let count = 0;
    for (const call of sorted) {
      if (call.actualResult === 'loss') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Generate thread tweets (3 tweets to stay within 100 API calls/month)
   * Social-friendly format with emojis and hashtags
   */
  generateThread(analysis: AnalysisResult, historicalCalls: HistoricalCall[]): ThreadTweets {
    const { currentPrice, priceChange24h, high24h, low24h, indicators } = analysis;
    const suggestions = this.generateTradingSuggestions(analysis);
    const stats = this.calculateHistoricalStats(historicalCalls);
    const weekly = this.generateWeeklyRefinement(analysis, historicalCalls);

    const price = Math.round(currentPrice).toLocaleString();
    const change24h = priceChange24h >= 0 ? `+${priceChange24h.toFixed(1)}` : priceChange24h.toFixed(1);

    // Tweet 1: TA Overview - social friendly
    const rsiVal = indicators.rsi !== null ? Math.round(indicators.rsi) : 'N/A';
    const macdTrend = indicators.macd !== null
      ? (indicators.macd.MACD > indicators.macd.signal ? 'bullish' : 'bearish')
      : 'neutral';
    const openingLine = priceChange24h >= 10 ? '🔥 Bitcoin exploding!'
      : priceChange24h >= 5 ? '🚀 Bitcoin ripping higher!'
      : priceChange24h >= 3 ? '🚀 Bitcoin waking up again!'
      : priceChange24h >= 1 ? '📈 Bitcoin pushing up'
      : priceChange24h >= 0 ? '📊 Bitcoin holding steady'
      : priceChange24h >= -1 ? '📊 Bitcoin consolidating'
      : priceChange24h >= -3 ? '📉 Bitcoin pulling back'
      : priceChange24h >= -5 ? '📉 Bitcoin sliding lower'
      : priceChange24h >= -10 ? '⚠️ Bitcoin dumping hard'
      : '🩸 Bitcoin in freefall';
    const taOverview = `${openingLine}\n$BTC ${change24h}% in the last 24h → sitting at $${price}\nH: $${Math.round(high24h).toLocaleString()} | L: $${Math.round(low24h).toLocaleString()}\nRSI ${rsiVal} | MACD showing ${macdTrend} momentum`;

    // Tweet 2: Combined Long + Short setups
    const entry = Math.round(currentPrice).toLocaleString();
    const longTP = Math.round(suggestions.bullish.target).toLocaleString();
    const longSL = Math.round(suggestions.bullish.stopLoss).toLocaleString();
    const shortTP = Math.round(suggestions.bearish.target).toLocaleString();
    const shortSL = Math.round(suggestions.bearish.stopLoss).toLocaleString();
    const tradeSetups = `📈 Long setup\nEntry: ${entry}\nTP: ${longTP}\nSL: ${longSL}\nR:R 1:2.5\n\n📉 Short setup\nEntry: ${entry}\nTP: ${shortTP}\nSL: ${shortSL}\nR:R 1:2.5`;

    // Tweet 3: Trading call + 7d outlook + hashtags
    const direction = weekly.refinedBias.toUpperCase();
    const conf = Math.round(weekly.refinedConfidence * 100);
    const move7d = weekly.priceMovement7d >= 0 ? `+${weekly.priceMovement7d.toFixed(1)}` : weekly.priceMovement7d.toFixed(1);
    const buildingData = weekly.daysTracked < 7 ? '\n\nMore signals coming as the data builds 🔍' : '';
    const record = stats.wins + stats.losses > 0 ? `\n30d record: ${stats.wins}W-${stats.losses}L` : '';
    const callAndOutlook = `My bot says: ${conf}% ${direction} bias${record}\n7-day outlook → ${move7d}%${buildingData}\n\n#Bitcoin #BTC #TradingSignals #CryptoBot\n\nNot financial advice.`;

    return {
      taOverview,
      tradeSetups,
      callAndOutlook,
    };
  }

  /**
   * Get thread as array for posting
   */
  getThreadArray(thread: ThreadTweets): string[] {
    return [
      thread.taOverview,
      thread.tradeSetups,
      thread.callAndOutlook,
    ];
  }

  /**
   * Calculate historical stats from past calls
   */
  calculateHistoricalStats(calls: HistoricalCall[]): {
    wins: number;
    losses: number;
    winRate: string;
    avgGain: string;
    avgLoss: string;
  } {
    const completedCalls = calls.filter(c => c.actualResult !== 'pending');
    const wins = completedCalls.filter(c => c.actualResult === 'win');
    const losses = completedCalls.filter(c => c.actualResult === 'loss');

    const winRate = completedCalls.length > 0
      ? ((wins.length / completedCalls.length) * 100).toFixed(0)
      : '0';

    const avgGain = wins.length > 0
      ? (wins.reduce((sum, c) => sum + (c.pnlPercent || 0), 0) / wins.length).toFixed(1)
      : '0.0';

    const avgLoss = losses.length > 0
      ? (losses.reduce((sum, c) => sum + (c.pnlPercent || 0), 0) / losses.length).toFixed(1)
      : '0.0';

    return {
      wins: wins.length,
      losses: losses.length,
      winRate,
      avgGain,
      avgLoss,
    };
  }

  /**
   * Generate Markdown blog post with thread format
   */
  generateMarkdown(analysis: AnalysisResult, historicalCalls: HistoricalCall[] = []): string {
    const { symbol, timeframe, currentPrice, priceChange, priceChange24h, high24h, low24h, prediction, indicators, patterns, timestamp } = analysis;

    const suggestions = this.generateTradingSuggestions(analysis);
    const thread = this.generateThread(analysis, historicalCalls);
    const stats = this.calculateHistoricalStats(historicalCalls);
    const weekly = this.generateWeeklyRefinement(analysis, historicalCalls);

    const refinedEmoji = weekly.refinedBias === 'up' ? '📈' : weekly.refinedBias === 'down' ? '📉' : '⏸️';
    const refinedSentiment = weekly.refinedBias === 'up' ? 'bullish' : weekly.refinedBias === 'down' ? 'bearish' : 'neutral';
    const priceChangeSign = priceChange >= 0 ? '+' : '';
    const priceChange24hSign = priceChange24h >= 0 ? '+' : '';

    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toISOString().split('T')[1].substring(0, 5);

    let md = `---
title: "${symbol} ${refinedEmoji} ${weekly.refinedBias.toUpperCase()} ${(weekly.refinedConfidence * 100).toFixed(0)}%"
date: ${timestamp.toISOString()}
symbol: "${symbol}"
timeframe: "${timeframe}"
direction: "${weekly.refinedBias}"
sentiment: "${refinedSentiment}"
confidence: ${(weekly.refinedConfidence * 100).toFixed(0)}
price: ${currentPrice.toFixed(2)}
priceChange: "${priceChangeSign}${priceChange.toFixed(2)}%"
priceChange24h: "${priceChange24hSign}${priceChange24h.toFixed(2)}%"
high24h: ${high24h.toFixed(2)}
low24h: ${low24h.toFixed(2)}
targetPrice: ${prediction.targetPrice ? prediction.targetPrice.toFixed(2) : 'null'}
stopLoss: ${prediction.stopLoss ? prediction.stopLoss.toFixed(2) : 'null'}
rsi: ${indicators.rsi !== null ? indicators.rsi.toFixed(1) : 'null'}
historicalWins: ${stats.wins}
historicalLosses: ${stats.losses}
historicalWinRate: ${stats.winRate}
priceMovement7d: ${weekly.priceMovement7d.toFixed(2)}
daysTracked: ${weekly.daysTracked}
---

## ${symbol} Analysis Thread

**Date:** ${dateStr} at ${timeStr} UTC
**Timeframe:** ${timeframe}

---

### 1. 24h Technical Overview

**Current Price:** $${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
**24h Change:** ${priceChange24hSign}${priceChange24h.toFixed(2)}%
**24h High:** $${high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
**24h Low:** $${low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

| Indicator | Value |
|-----------|-------|
${indicators.rsi !== null ? `| RSI (14) | ${indicators.rsi.toFixed(1)} ${indicators.rsi < 30 ? '(Oversold)' : indicators.rsi > 70 ? '(Overbought)' : ''} |` : ''}
${indicators.macd !== null ? `| MACD | ${indicators.macd.MACD.toFixed(2)} (Signal: ${indicators.macd.signal.toFixed(2)}) |` : ''}
${indicators.ema20 !== null ? `| EMA (20) | $${indicators.ema20.toFixed(2)} |` : ''}
${indicators.sma50 !== null ? `| SMA (50) | $${indicators.sma50.toFixed(2)} |` : ''}
${indicators.bollingerBands !== null ? `| BB Upper | $${indicators.bollingerBands.upper.toFixed(2)} |
| BB Middle | $${indicators.bollingerBands.middle.toFixed(2)} |
| BB Lower | $${indicators.bollingerBands.lower.toFixed(2)} |` : ''}

${patterns.length > 0 ? `**Patterns:** ${patterns.map(p => p.name).join(', ')}` : ''}

---

### 2. Bullish Trade Setup

| Parameter | Value |
|-----------|-------|
| Entry | $${suggestions.bullish.entry.toFixed(2)} |
| Target | $${suggestions.bullish.target.toFixed(2)} |
| Stop Loss | $${suggestions.bullish.stopLoss.toFixed(2)} |
| Risk:Reward | ${suggestions.bullish.riskReward} |

*${suggestions.bullish.reasoning}*

---

### 3. Bearish Trade Setup

| Parameter | Value |
|-----------|-------|
| Entry | $${suggestions.bearish.entry.toFixed(2)} |
| Target | $${suggestions.bearish.target.toFixed(2)} |
| Stop Loss | $${suggestions.bearish.stopLoss.toFixed(2)} |
| Risk:Reward | ${suggestions.bearish.riskReward} |

*${suggestions.bearish.reasoning}*

---

### 4. Trading Call ${refinedEmoji}

| Metric | Value |
|--------|-------|
| **Direction** | ${weekly.refinedBias.toUpperCase()} |
| **Confidence** | ${(weekly.refinedConfidence * 100).toFixed(0)}% |
| **Bias** | ${refinedSentiment} |
| **TA Signal** | ${prediction.direction.toUpperCase()} (${(prediction.confidence * 100).toFixed(0)}%) |

**Signals:**
${prediction.reasoning.map(r => `- ${r}`).join('\n')}

---

### 5. 7-Day Refined Outlook

| Metric | Value |
|--------|-------|
| Days Tracked | ${weekly.daysTracked} |
| 7d Price Move | ${weekly.priceMovement7d >= 0 ? '+' : ''}${weekly.priceMovement7d.toFixed(2)}% |
| Original Bias | ${weekly.originalBias.toUpperCase()} |
| Refined Bias | ${weekly.refinedBias.toUpperCase()} |

**Analysis:** ${weekly.reasoning}

---

### 6. 30-Day Performance

| Metric | Value |
|--------|-------|
| Record | ${stats.wins}W - ${stats.losses}L |
| Win Rate | ${stats.winRate}% |
| Avg Gain | ${parseFloat(stats.avgGain) >= 0 ? '+' : ''}${stats.avgGain}% |
| Avg Loss | ${stats.avgLoss}% |

---

### Thread Tweets

\`\`\`
Tweet 1 (TA Overview):
${thread.taOverview}

Tweet 2 (Trade Setups):
${thread.tradeSetups}

Tweet 3 (Call + Outlook):
${thread.callAndOutlook}
\`\`\`

---

*Automated analysis. Not financial advice. Trade at your own risk.*
`;

    return md;
  }

  /**
   * Generate tweet text (max 280 chars) - legacy single tweet
   */
  generateTweet(analysis: AnalysisResult): string {
    const { prediction, currentPrice, indicators } = analysis;

    const directionEmoji = prediction.direction === 'up' ? '📈' : prediction.direction === 'down' ? '📉' : '⏸️';
    const confidence = (prediction.confidence * 100).toFixed(0);

    let tweet = `$BTC ${directionEmoji} ${prediction.direction.toUpperCase()} (${confidence}%)\n\n`;
    tweet += `Price: $${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;

    if (indicators.rsi !== null) {
      const rsiStatus = indicators.rsi < 30 ? ' oversold' : indicators.rsi > 70 ? ' overbought' : '';
      tweet += `RSI: ${indicators.rsi.toFixed(0)}${rsiStatus}\n`;
    }

    if (prediction.targetPrice) {
      tweet += `Target: $${prediction.targetPrice.toFixed(0)}\n`;
    }

    // Add top signal (shortened)
    if (prediction.reasoning.length > 1) {
      const signal = prediction.reasoning[1]; // Skip the summary line
      if (signal && tweet.length + signal.length < 255) {
        tweet += `\n${signal}`;
      }
    }

    tweet += `\n\n#Bitcoin #BTC #Crypto`;

    return tweet.substring(0, 280);
  }

  /**
   * Generate filename for the post
   */
  generateFilename(analysis: AnalysisResult): string {
    const date = analysis.timestamp.toISOString().split('T')[0];
    const time = analysis.timestamp.toISOString().split('T')[1].substring(0, 5).replace(':', '');
    return `${date}-${time}-${analysis.symbol.toLowerCase()}.md`;
  }
}
