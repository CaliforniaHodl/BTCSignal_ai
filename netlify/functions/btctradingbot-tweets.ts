// BTCTradingBot Twitter Posts - @BTCTradingBotAI
// Posts daily trading signals and derivatives alerts
import type { Config, Context } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';
import { DataProvider } from './lib/data-provider';
import { TechnicalAnalyzer } from './lib/technical-analysis';
import { PredictionEngine } from './lib/prediction-engine';
import { BlogGenerator, AnalysisResult } from './lib/blog-generator';
import { HistoricalTracker } from './lib/historical-tracker';
import { DerivativesAnalyzer } from './lib/derivatives-analyzer';
import { generateTradingBotTweets, generateDerivativesAlertTweet } from './lib/tweet-generator';
import { OnChainMetrics } from './lib/onchain-analyzer';

const SYMBOL = 'BTC-USD';
const TIMEFRAME = '1h';
const CANDLE_LIMIT = 100;
const CANDLE_LIMIT_24H = 24;

// Fetch on-chain metrics data
async function fetchOnChainData(): Promise<OnChainMetrics | null> {
  try {
    // First try the Netlify function (which also updates the cache)
    const response = await fetch(`https://${process.env.URL || 'btctradingsignalai.netlify.app'}/.netlify/functions/onchain-metrics`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        console.log('On-chain data fetched successfully');
        return result.data;
      }
    }

    // Fallback: Try reading from GitHub cache
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (token && repo) {
      const cacheUrl = `https://api.github.com/repos/${repo}/contents/data/onchain-metrics.json`;
      const cacheRes = await fetch(cacheUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
        console.log('On-chain data loaded from GitHub cache');
        return content;
      }
    }

    console.log('On-chain data unavailable');
    return null;
  } catch (e: any) {
    console.error('Error fetching on-chain data:', e.message);
    return null;
  }
}

interface ThreadTweet {
  id: string;
  text: string;
}

// Phase 6 Sprint 2: Log signal for accuracy tracking
async function logSignalToHistory(price: number, direction: string, confidence: number, target?: number): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping signal logging');
    return false;
  }

  const path = 'data/signal-history.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file
    let sha: string | undefined;
    let history: any = {
      lastUpdated: new Date().toISOString(),
      signals: [],
      stats: { total: 0, correct: 0, accuracy7d: 0, accuracy30d: 0, accuracyAll: 0, avgConfidence: 0, streakCurrent: 0, streakBest: 0 }
    };

    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      history = JSON.parse(Buffer.from(data.content, 'base64').toString());
    }

    // Create new signal entry
    const now = Date.now();
    const signalId = new Date().toISOString().slice(0, 13).replace('T', '-').replace(':', '');

    const newSignal = {
      id: signalId,
      timestamp: now,
      priceAtSignal: price,
      direction: direction.toLowerCase() as 'up' | 'down' | 'neutral',
      confidence: confidence,
      target: target,
      checked: false
    };

    history.signals.push(newSignal);
    history.lastUpdated = new Date().toISOString();

    // Save updated history
    const content = JSON.stringify(history, null, 2);
    const body: any = {
      message: `Log signal: ${direction} @ $${price.toLocaleString()} (${confidence}% confidence)`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`Signal logged: ${signalId} - ${direction} @ $${price}`);
      return true;
    } else {
      console.error('Failed to save signal:', await res.text());
      return false;
    }
  } catch (e: any) {
    console.error('Error logging signal:', e.message);
    return false;
  }
}

async function postThread(client: TwitterApi, tweets: string[]): Promise<ThreadTweet[]> {
  if (tweets.length === 0) {
    throw new Error('Thread must contain at least one tweet');
  }

  const results: ThreadTweet[] = [];
  let previousTweetId: string | null = null;

  for (const tweetText of tweets) {
    const options: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
      text: tweetText,
    };

    if (previousTweetId) {
      options.reply = { in_reply_to_tweet_id: previousTweetId };
    }

    const result = await client.v2.tweet(options);
    previousTweetId = result.data.id;

    results.push({
      id: result.data.id,
      text: result.data.text,
    });
  }

  return results;
}

export default async (req: Request, context: Context) => {
  console.log('BTCTradingBot: Starting tweet generation...');

  // Check for Twitter credentials
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET ||
      !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
    console.log('Twitter credentials not configured');
    return new Response(JSON.stringify({
      success: false,
      error: 'Twitter credentials not configured',
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Initialize Twitter client
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    // Initialize analysis services
    const dataProvider = new DataProvider();
    const technicalAnalyzer = new TechnicalAnalyzer();
    const predictionEngine = new PredictionEngine();
    const blogGenerator = new BlogGenerator();
    const historicalTracker = new HistoricalTracker();
    const derivativesAnalyzer = new DerivativesAnalyzer();

    // Fetch market data
    console.log('Fetching market data...');
    const marketData = await dataProvider.fetchCoinbaseData(SYMBOL, TIMEFRAME, CANDLE_LIMIT);
    const indicators = technicalAnalyzer.calculateIndicators(marketData.data);
    const patterns = technicalAnalyzer.identifyPatterns(marketData.data, indicators);

    // Calculate price metrics
    const currentPrice = marketData.data[marketData.data.length - 1].close;
    const startPrice = marketData.data[0].close;
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;

    const last24hData = marketData.data.slice(-CANDLE_LIMIT_24H);
    const price24hAgo = last24hData[0].open;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    const high24h = Math.max(...last24hData.map(d => d.high));
    const low24h = Math.min(...last24hData.map(d => d.low));

    // Fetch derivatives data
    console.log('Fetching derivatives data...');
    let derivativesData = null;
    try {
      derivativesData = await derivativesAnalyzer.getDerivativesData(currentPrice, priceChange24h);
    } catch (e: any) {
      console.error('Derivatives fetch error:', e.message);
    }

    // Fetch on-chain data
    console.log('Fetching on-chain data...');
    let onChainData: OnChainMetrics | null = null;
    try {
      onChainData = await fetchOnChainData();
    } catch (e: any) {
      console.error('On-chain fetch error:', e.message);
    }

    // Generate prediction (now includes on-chain data)
    const prediction = predictionEngine.predict(
      marketData.data,
      indicators,
      patterns,
      derivativesData || undefined,
      onChainData || undefined
    );

    // Fetch block height
    let blockHeight: number | null = null;
    try {
      const blockRes = await fetch('https://mempool.space/api/blocks/tip/height');
      if (blockRes.ok) {
        blockHeight = parseInt(await blockRes.text(), 10);
      }
    } catch (e) {}

    // Get historical calls
    const historicalCalls = await historicalTracker.getLast30DaysCalls();

    // Build analysis result
    const analysis: AnalysisResult = {
      symbol: SYMBOL,
      timeframe: TIMEFRAME,
      currentPrice,
      priceChange,
      priceChange24h,
      high24h,
      low24h,
      prediction,
      indicators,
      patterns,
      timestamp: new Date(),
      derivativesData,
      blockHeight,
    };

    // Generate tweets using shared generator (now includes on-chain data)
    const tweetContent = generateTradingBotTweets(analysis, historicalCalls, onChainData || undefined);
    console.log(`Generated ${tweetContent.tweets.length} tweets (on-chain: ${onChainData ? 'yes' : 'no'})`);

    // Post thread
    const threadResult = await postThread(twitterClient, tweetContent.tweets);
    console.log(`Posted thread: ${threadResult.length} tweets`);

    // Phase 6 Sprint 2: Log signal for accuracy tracking
    const signalLogged = await logSignalToHistory(
      currentPrice,
      prediction.direction,
      prediction.confidence,
      prediction.targets?.primary
    );
    console.log(`Signal logged: ${signalLogged}`);

    // Check for derivatives alerts
    const derivativesAlerts: string[] = [];
    if (derivativesData) {
      const alertStatus = derivativesAnalyzer.shouldAlert(derivativesData);

      if (alertStatus.squeeze) {
        const squeezeAlert = generateDerivativesAlertTweet('squeeze', {
          fundingRate: derivativesData.fundingRate?.fundingRate,
        }, currentPrice);
        if (squeezeAlert) {
          await twitterClient.v2.tweet(squeezeAlert);
          derivativesAlerts.push('squeeze');
          console.log('Posted squeeze alert');
        }
      }

      if (alertStatus.options) {
        const optionsAlert = generateDerivativesAlertTweet('options', {
          expiryAmount: derivativesData.optionsExpiry?.totalNotionalValue,
        }, currentPrice);
        if (optionsAlert) {
          await twitterClient.v2.tweet(optionsAlert);
          derivativesAlerts.push('options');
          console.log('Posted options alert');
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      account: 'BTCTradingBotAI',
      thread: {
        count: threadResult.length,
        tweets: threadResult,
      },
      derivativesAlerts,
      analysis: {
        price: currentPrice,
        direction: prediction.direction,
        confidence: prediction.confidence,
        onChainBias: prediction.onChainFactors?.bias || 'unavailable',
        onChainScore: prediction.onChainFactors?.score || 0,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('BTCTradingBot error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Schedule: Daily at 9am PST (5pm UTC)
export const config: Config = {
  schedule: '0 17 * * *',
};
