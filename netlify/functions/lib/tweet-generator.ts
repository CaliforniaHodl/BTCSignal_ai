// Tweet Generator - Shared logic for generating tweets for different accounts
import { AnalysisResult, HistoricalCall } from './blog-generator';
import { OnChainMetrics, formatMetricsForDisplay, generateOnChainSummary } from './onchain-analyzer';
import { ExchangeFlowData, formatExchangeFlowsForTweet, generateExchangeFlowSummary } from './exchange-analyzer';
import { ProfitabilityMetrics, formatMetricsForDisplay as formatProfitabilityMetrics, generateProfitabilitySummary } from './profitability-analyzer';

export interface TweetContent {
  tweets: string[];
  type: 'thread' | 'single';
}

export interface WhaleAlert {
  id: string;
  timestamp: string;
  txid: string;
  type: 'exchange_deposit' | 'exchange_withdrawal' | 'whale_transfer' | 'dormant_wallet';
  amount_btc: number;
  amount_usd: number;
  confidence: 'high' | 'medium' | 'low';
  from_type: string;
  to_type: string;
  analysis: string;
}

// Generate tweets for @BTCTradingBotAI (trading signals)
export function generateTradingBotTweets(
  analysis: AnalysisResult,
  historicalCalls: HistoricalCall[] | undefined,
  onChainData?: OnChainMetrics,
  exchangeFlowData?: ExchangeFlowData,
  profitabilityData?: ProfitabilityMetrics
): TweetContent {
  const { currentPrice, priceChange24h, prediction, indicators, patterns, high24h, low24h, blockHeight } = analysis;

  // Format helpers
  const formatPrice = (price: number) => '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatPercent = (pct: number) => (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  const formatNumber = (num: number) => num.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Direction emoji and text
  const directionEmoji = prediction.direction === 'up' ? '🟢' : prediction.direction === 'down' ? '🔴' : '🟡';
  const directionText = prediction.direction === 'up' ? 'BULLISH' : prediction.direction === 'down' ? 'BEARISH' : 'NEUTRAL';

  // Confidence level
  const confidenceEmoji = prediction.confidence >= 0.7 ? '🔥' : prediction.confidence >= 0.5 ? '📊' : '⚠️';
  const confidenceText = prediction.confidence >= 0.7 ? 'High' : prediction.confidence >= 0.5 ? 'Medium' : 'Low';

  // Calculate historical accuracy (handle undefined/empty historicalCalls)
  const safeHistoricalCalls = historicalCalls || [];
  const completedCalls = safeHistoricalCalls.filter(c => c.actualResult !== 'pending');
  const wins = completedCalls.filter(c => c.actualResult === 'win').length;
  const winRate = completedCalls.length > 0 ? ((wins / completedCalls.length) * 100).toFixed(1) : 'N/A';

  // Tweet 1: Main signal
  const tweet1 = `${directionEmoji} #Bitcoin ${directionText} Signal

📈 Price: ${formatPrice(currentPrice)} (${formatPercent(priceChange24h)} 24h)
🎯 Target: ${prediction.targetPrice ? formatPrice(prediction.targetPrice) : 'N/A'}
🛑 Stop: ${prediction.stopLoss ? formatPrice(prediction.stopLoss) : 'N/A'}
${confidenceEmoji} Confidence: ${confidenceText} (${(prediction.confidence * 100).toFixed(0)}%)

${blockHeight ? `⛏️ Block: ${blockHeight.toLocaleString()}` : ''}

#BTC #Crypto`;

  // Tweet 2: Technical indicators (with defensive checks)
  const rsiArray = Array.isArray(indicators?.rsi) ? indicators.rsi : [];
  const rsi = rsiArray.length > 0 ? rsiArray[rsiArray.length - 1] : 50;
  const macd = indicators?.macd || { MACD: 0, signal: 0, histogram: 0 };
  const macdLine = Array.isArray((macd as any).macdLine) ? (macd as any).macdLine : [];
  const signalLine = Array.isArray((macd as any).signalLine) ? (macd as any).signalLine : [];
  const macdValue = macdLine.length > 0 ? macdLine[macdLine.length - 1] : (macd as any).MACD || 0;
  const macdSignal = signalLine.length > 0 ? signalLine[signalLine.length - 1] : (macd as any).signal || 0;
  const macdHistogram = macdValue - macdSignal;

  const rsiStatus = rsi > 70 ? 'Overbought ⚠️' : rsi < 30 ? 'Oversold ⚠️' : 'Neutral ✅';
  const macdStatus = macdHistogram > 0 ? 'Bullish ✅' : 'Bearish ❌';

  const safePatterns = Array.isArray(patterns) ? patterns : [];
  const tweet2 = `📊 Technical Analysis

RSI(14): ${rsi.toFixed(1)} - ${rsiStatus}
MACD: ${macdStatus}
24h Range: ${formatPrice(low24h)} - ${formatPrice(high24h)}

${safePatterns.length > 0 ? `📐 Patterns: ${safePatterns.slice(0, 2).map(p => p.name).join(', ')}` : ''}

🔗 Full analysis: btctradingsignalai.netlify.app`;

  // Tweet 3: On-Chain Metrics (if available)
  let tweet3 = '';
  if (onChainData) {
    const onChainLines = formatMetricsForDisplay(onChainData);
    const { headline, bias } = generateOnChainSummary(onChainData);
    const onChainEmoji = bias === 'bullish' ? '🟢' : bias === 'bearish' ? '🔴' : '🟡';

    tweet3 = `⛓️ On-Chain Analysis

${onChainEmoji} ${headline}

${onChainLines.join('\n')}

📊 Data: CoinGecko, Blockchain.info`;
  }

  // Tweet 4: Exchange Flows (if available)
  let tweet4 = '';
  if (exchangeFlowData && (exchangeFlowData.inflow24h > 0 || exchangeFlowData.outflow24h > 0)) {
    const flowLines = formatExchangeFlowsForTweet(exchangeFlowData);
    const { headline: flowHeadline, bias: flowBias } = generateExchangeFlowSummary(exchangeFlowData);
    const flowEmoji = flowBias === 'bullish' ? '🟢' : flowBias === 'bearish' ? '🔴' : '🟡';

    tweet4 = `🏦 Exchange Flows

${flowEmoji} ${flowHeadline}

${flowLines.join('\n')}

🐋 Whale Ratio: ${(exchangeFlowData.whaleRatio * 100).toFixed(0)}%

📊 Data: Mempool.space whale tracking`;
  }

  // Tweet 5: Profitability Metrics (if available)
  let tweet5 = '';
  if (profitabilityData) {
    const profitLines = formatProfitabilityMetrics(profitabilityData);
    const { headline: profitHeadline, bias: profitBias } = generateProfitabilitySummary(profitabilityData);
    const profitEmoji = profitBias === 'bullish' ? '🟢' : profitBias === 'bearish' ? '🔴' : '🟡';

    tweet5 = `💰 Profitability Analysis

${profitEmoji} ${profitHeadline}

${profitLines.join('\n')}

📊 Data: CoinGecko price history, proxy SOPR calculations`;
  }

  // Tweet 6: Track record (if we have history)
  let tweet6 = '';
  if (completedCalls.length >= 3) {
    tweet6 = `📈 Track Record (Last 30 Days)

✅ Wins: ${wins}
❌ Losses: ${completedCalls.length - wins}
📊 Win Rate: ${winRate}%

Not financial advice. DYOR.`;
  }

  const tweets = [tweet1, tweet2];
  if (tweet3) tweets.push(tweet3);
  if (tweet4) tweets.push(tweet4);
  if (tweet5) tweets.push(tweet5);
  if (tweet6) tweets.push(tweet6);

  return { tweets, type: 'thread' };
}

// Generate tweets for @BTCWhaleWatcher (whale alerts)
export function generateWhaleWatcherTweets(alerts: WhaleAlert[]): TweetContent[] {
  const tweetContents: TweetContent[] = [];

  for (const alert of alerts) {
    const tweet = generateSingleWhaleAlert(alert);
    if (tweet) {
      tweetContents.push({ tweets: [tweet], type: 'single' });
    }
  }

  return tweetContents;
}

// Generate a single whale alert tweet
export function generateSingleWhaleAlert(alert: WhaleAlert): string | null {
  const { type, amount_btc, amount_usd, from_type, to_type, confidence, txid } = alert;

  // Format helpers
  const formatBTC = (btc: number) => btc.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const formatUSD = (usd: number) => {
    if (usd >= 1_000_000_000) return '$' + (usd / 1_000_000_000).toFixed(2) + 'B';
    if (usd >= 1_000_000) return '$' + (usd / 1_000_000).toFixed(1) + 'M';
    return '$' + usd.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  // Skip low confidence alerts for tweets
  if (confidence === 'low') return null;

  // Emoji based on type
  let emoji = '🐋';
  let action = '';
  let sentiment = '';

  switch (type) {
    case 'exchange_deposit':
      emoji = '📥🔴';
      action = `deposited to ${to_type}`;
      sentiment = '⚠️ Potential sell pressure incoming';
      break;
    case 'exchange_withdrawal':
      emoji = '📤🟢';
      action = `withdrawn from ${from_type}`;
      sentiment = '💎 Accumulation signal - coins moving to cold storage';
      break;
    case 'whale_transfer':
      emoji = '🔄🐋';
      action = `transferred`;
      sentiment = '👀 Large wallet movement - monitor for follow-up';
      break;
    case 'dormant_wallet':
      emoji = '💤⚡';
      action = `moved from dormant wallet`;
      sentiment = '🚨 Old coins awakening - could signal major move';
      break;
    default:
      emoji = '🐋';
      action = 'moved';
      sentiment = '';
  }

  const shortTxid = txid.substring(0, 8) + '...' + txid.substring(txid.length - 4);

  const tweet = `${emoji} WHALE ALERT

${formatBTC(amount_btc)} BTC (${formatUSD(amount_usd)}) ${action}

${sentiment}

🔗 TX: ${shortTxid}
📊 mempool.space/tx/${txid}

#Bitcoin #WhaleAlert #BTC`;

  return tweet;
}

// Generate daily whale summary tweet
export function generateWhaleSummaryTweet(
  stats: { totalTracked24h: number; largestTx24h: number; exchangeInflow24h: number; exchangeOutflow24h: number },
  btcPrice: number
): string {
  const formatBTC = (btc: number) => btc.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatUSD = (usd: number) => {
    if (usd >= 1_000_000_000) return '$' + (usd / 1_000_000_000).toFixed(2) + 'B';
    if (usd >= 1_000_000) return '$' + (usd / 1_000_000).toFixed(1) + 'M';
    return '$' + usd.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const netFlow = stats.exchangeOutflow24h - stats.exchangeInflow24h;
  const netFlowEmoji = netFlow > 0 ? '🟢' : netFlow < 0 ? '🔴' : '🟡';
  const netFlowText = netFlow > 0 ? 'Net outflow (bullish)' : netFlow < 0 ? 'Net inflow (bearish)' : 'Balanced';

  return `🐋 Daily Whale Summary

📊 Transactions tracked: ${stats.totalTracked24h}
💰 Largest TX: ${formatBTC(stats.largestTx24h)} BTC (${formatUSD(stats.largestTx24h * btcPrice)})

Exchange Flow:
📥 Inflow: ${formatBTC(stats.exchangeInflow24h)} BTC
📤 Outflow: ${formatBTC(stats.exchangeOutflow24h)} BTC
${netFlowEmoji} ${netFlowText}

#Bitcoin #WhaleWatch #BTC`;
}

// Generate derivatives alert tweet (for trading bot)
export function generateDerivativesAlertTweet(
  alertType: 'squeeze' | 'options',
  data: {
    fundingRate?: number;
    openInterest?: number;
    longShortRatio?: number;
    expiryAmount?: number;
  },
  currentPrice: number
): string | null {
  const formatPrice = (price: number) => '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });

  if (alertType === 'squeeze' && data.fundingRate !== undefined) {
    const isLongSqueeze = data.fundingRate > 0.05;
    const isShortSqueeze = data.fundingRate < -0.03;

    if (isLongSqueeze) {
      return `🚨 LONG SQUEEZE ALERT

Funding rate extremely high: ${(data.fundingRate * 100).toFixed(3)}%
BTC Price: ${formatPrice(currentPrice)}

⚠️ Longs are overleveraged
📉 Risk of cascade liquidations

#Bitcoin #BTC #Trading`;
    } else if (isShortSqueeze) {
      return `🚨 SHORT SQUEEZE ALERT

Funding rate extremely negative: ${(data.fundingRate * 100).toFixed(3)}%
BTC Price: ${formatPrice(currentPrice)}

⚠️ Shorts are overleveraged
📈 Risk of short squeeze

#Bitcoin #BTC #Trading`;
    }
  }

  if (alertType === 'options' && data.expiryAmount) {
    return `🔔 OPTIONS EXPIRY ALERT

${formatPrice(data.expiryAmount)} in BTC options expiring soon
Current price: ${formatPrice(currentPrice)}

📊 Expect increased volatility
⚠️ Max pain levels in play

#Bitcoin #BTC #Options`;
  }

  return null;
}
