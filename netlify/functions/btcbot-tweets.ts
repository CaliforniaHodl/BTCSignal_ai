// BTCTradingBot Twitter Posts - @BTCTradingBotAI
// Posts daily trading signals and derivatives alerts
// Version: 2026-01-02-v3 (added defensive checks)
console.log('[BTCTradingBot] Module loading - v2026-01-02-v3');
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
import { ExchangeFlowData } from './lib/exchange-analyzer';
import { ProfitabilityMetrics } from './lib/profitability-analyzer';
import { CohortMetrics } from './lib/cohort-analyzer';
import { MarketDataCache } from './lib/market-data-cache';
import { HistoricalLearner } from './lib/historical-learner';

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

// Fetch exchange flow data
async function fetchExchangeFlowData(): Promise<ExchangeFlowData | null> {
  try {
    // First try the Netlify function
    const response = await fetch(`https://${process.env.URL || 'btctradingsignalai.netlify.app'}/.netlify/functions/exchange-flows`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data?.flows) {
        console.log('Exchange flow data fetched successfully');
        return result.data.flows;
      }
    }

    // Fallback: Try reading from GitHub cache
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (token && repo) {
      const cacheUrl = `https://api.github.com/repos/${repo}/contents/data/exchange-flows.json`;
      const cacheRes = await fetch(cacheUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
        console.log('Exchange flow data loaded from GitHub cache');
        return content.flows;
      }
    }

    console.log('Exchange flow data unavailable');
    return null;
  } catch (e: any) {
    console.error('Error fetching exchange flow data:', e.message);
    return null;
  }
}

// Fetch profitability metrics data
async function fetchProfitabilityData(): Promise<ProfitabilityMetrics | null> {
  try {
    // First try the Netlify function
    const response = await fetch(`https://${process.env.URL || 'btctradingsignalai.netlify.app'}/.netlify/functions/profitability-metrics`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        console.log('Profitability data fetched successfully');
        return result.data;
      }
    }

    // Fallback: Try reading from GitHub cache
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (token && repo) {
      const cacheUrl = `https://api.github.com/repos/${repo}/contents/data/profitability-metrics.json`;
      const cacheRes = await fetch(cacheUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
        console.log('Profitability data loaded from GitHub cache');
        return content;
      }
    }

    console.log('Profitability data unavailable');
    return null;
  } catch (e: any) {
    console.error('Error fetching profitability data:', e.message);
    return null;
  }
}

// Fetch cohort metrics data
async function fetchCohortData(): Promise<CohortMetrics | null> {
  try {
    // First try the Netlify function
    const response = await fetch(`https://${process.env.URL || 'btctradingsignalai.netlify.app'}/.netlify/functions/cohort-metrics`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        console.log('Cohort data fetched successfully');
        return result.data;
      }
    }

    // Fallback: Try reading from GitHub cache
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (token && repo) {
      const cacheUrl = `https://api.github.com/repos/${repo}/contents/data/cohort-metrics.json`;
      const cacheRes = await fetch(cacheUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
        console.log('Cohort data loaded from GitHub cache');
        return content;
      }
    }

    console.log('Cohort data unavailable');
    return null;
  } catch (e: any) {
    console.error('Error fetching cohort data:', e.message);
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

    // Fetch exchange flow data
    console.log('Fetching exchange flow data...');
    let exchangeFlowData: ExchangeFlowData | null = null;
    try {
      exchangeFlowData = await fetchExchangeFlowData();
    } catch (e: any) {
      console.error('Exchange flow fetch error:', e.message);
    }

    // Fetch profitability data
    console.log('Fetching profitability data...');
    let profitabilityData: ProfitabilityMetrics | null = null;
    try {
      profitabilityData = await fetchProfitabilityData();
    } catch (e: any) {
      console.error('Profitability fetch error:', e.message);
    }

    // Fetch cohort data
    console.log('Fetching cohort data...');
    let cohortData: CohortMetrics | null = null;
    try {
      cohortData = await fetchCohortData();
    } catch (e: any) {
      console.error('Cohort fetch error:', e.message);
    }

    // Load hourly trend data from cache (24x daily updates)
    console.log('Loading hourly trend data from cache...');
    const marketCache = new MarketDataCache();
    let hourlyTrendData = null;
    try {
      hourlyTrendData = await marketCache.getHourlyTrendFactors();
      if (hourlyTrendData) {
        console.log(`Hourly trend data loaded (${hourlyTrendData.dataAge.toFixed(0)} min old)`);
        console.log(`  Funding velocity 6h: ${hourlyTrendData.fundingVelocity6h.toFixed(4)}%/h`);
        console.log(`  OI change 24h: ${hourlyTrendData.oiChange24h.toFixed(2)}%`);
        console.log(`  Multi-TF bias: ${hourlyTrendData.multiTimeframeBias}`);
      }
    } catch (e: any) {
      console.error('Hourly trend cache error:', e.message);
    }

    // Generate prediction (now includes all on-chain, flow, profitability, cohort, and hourly trend data)
    const prediction = predictionEngine.predict(
      marketData.data,
      indicators,
      patterns,
      derivativesData || undefined,
      onChainData || undefined,
      exchangeFlowData || undefined,
      profitabilityData || undefined,
      cohortData || undefined,
      undefined, // derivativesAdvancedData
      undefined, // priceModelsData
      hourlyTrendData || undefined
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

    // Generate tweets using shared generator (now includes all on-chain data)
    const tweetContent = generateTradingBotTweets(analysis, historicalCalls, onChainData || undefined, exchangeFlowData || undefined, profitabilityData || undefined);
    console.log(`Generated ${tweetContent.tweets.length} tweets (on-chain: ${onChainData ? 'yes' : 'no'}, flows: ${exchangeFlowData ? 'yes' : 'no'}, profit: ${profitabilityData ? 'yes' : 'no'}, cohort: ${cohortData ? 'yes' : 'no'})`);

    // Post thread
    const threadResult = await postThread(twitterClient, tweetContent.tweets);
    console.log(`Posted thread: ${threadResult.length} tweets`);

    // Historical Learning: Log signal with patterns and check past outcomes
    const historicalLearner = new HistoricalLearner();
    await historicalLearner.loadData();

    // Check outcomes of past signals first
    const outcomesUpdated = await historicalLearner.checkOutcomes(currentPrice);
    if (outcomesUpdated > 0) {
      console.log(`Updated ${outcomesUpdated} historical signal outcomes`);
    }

    // Log the new signal with pattern information
    const signalId = await historicalLearner.logSignal(
      currentPrice,
      prediction.direction,
      prediction.confidence,
      prediction.patternFactors?.patterns.map(p => ({
        pattern: p.name,
        confidence: p.confidence,
        bias: p.bias,
        timeframe: p.timeframe as '24h' | '48h' | '72h',
        description: p.reasoning,
        reasoning: p.reasoning,
        historicalAccuracy: p.historicalAccuracy,
      })) || [],
      {
        h24: prediction.targets?.h24.price,
        h48: prediction.targets?.h48.price,
        h72: prediction.targets?.h72.price,
      }
    );
    console.log(`Signal logged with pattern learning: ${signalId}`);

    // Get learning insights
    const learningStats = historicalLearner.getStats();
    const insights = historicalLearner.getInsights();
    console.log(`Historical accuracy: 24h=${(learningStats.accuracy24h * 100).toFixed(0)}%, 72h=${(learningStats.accuracy72h * 100).toFixed(0)}%`);
    console.log(`Current streak: ${insights.streak}`);

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
        exchangeFlowSignal: prediction.exchangeFlowFactors?.signal || 'unavailable',
        exchangeFlowNetflow: prediction.exchangeFlowFactors?.netflow || 0,
        profitabilityBias: prediction.profitabilityFactors?.bias || 'unavailable',
        profitabilityScore: prediction.profitabilityFactors?.score || 0,
        cohortBias: prediction.cohortFactors?.bias || 'unavailable',
        cohortScore: prediction.cohortFactors?.score || 0,
        // Hourly trend data from 24x daily cache
        hourlyTrendBias: prediction.hourlyTrendFactors?.multiTimeframeBias || 'unavailable',
        hourlyTrendConfidence: prediction.hourlyTrendFactors?.multiTimeframeConfidence || 0,
        fundingVelocity6h: prediction.hourlyTrendFactors?.fundingVelocity6h || 0,
        oiMomentum24h: prediction.hourlyTrendFactors?.oiMomentum24h || 0,
        hourlyDataAge: prediction.hourlyTrendFactors?.dataAge || -1,
        // Pattern recognition (72h predictions)
        dominantPattern: prediction.patternFactors?.dominantPattern || 'none',
        patternBias: prediction.patternFactors?.patternBias || 'neutral',
        patternConfidence: prediction.patternFactors?.patternConfidence || 0,
        patterns: prediction.patternFactors?.patterns.slice(0, 3).map(p => p.name) || [],
        // Extended targets
        target24h: prediction.targets?.h24.price || null,
        target48h: prediction.targets?.h48.price || null,
        target72h: prediction.targets?.h72.price || null,
        confidence24h: prediction.targets?.h24.confidence || 0,
        confidence48h: prediction.targets?.h48.confidence || 0,
        confidence72h: prediction.targets?.h72.confidence || 0,
      },
      // Historical learning stats
      learning: {
        totalSignals: learningStats.totalSignals,
        accuracy24h: learningStats.accuracy24h,
        accuracy72h: learningStats.accuracy72h,
        currentStreak: learningStats.currentStreak,
        bestStreak: learningStats.bestStreak,
        bestPatterns: insights.bestPatterns.slice(0, 3),
      },
      // Temporal synthesis (PAST + PRESENT + FUTURE)
      temporal: {
        pastBias: prediction.temporalSynthesis?.pastBias || 'neutral',
        presentBias: prediction.temporalSynthesis?.presentBias || 'neutral',
        futureBias: prediction.temporalSynthesis?.futureBias || 'neutral',
        hasConflict: prediction.temporalSynthesis?.hasConflict || false,
        isSpeculation: prediction.temporalSynthesis?.isSpeculation || false,
        reliableTimeframe: prediction.temporalSynthesis?.reliableTimeframe || 'short',
        synthesis: prediction.temporalSynthesis?.synthesis || '',
        warnings: prediction.temporalSynthesis?.warnings || [],
        actionableAdvice: prediction.temporalSynthesis?.actionableAdvice || '',
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

// Schedule: Daily at 9am PST (5pm UTC) - uses hourly cached market data for 24h trend analysis
