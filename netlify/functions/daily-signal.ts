// BTCTradingBot - Simplified version
console.log('[twitter-bot-v2] Loading');

import type { Context } from '@netlify/functions';
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

export default async (req: Request, context: Context) => {
  console.log('[twitter-bot-v2] Handler started');

  if (!process.env.TWITTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'No Twitter credentials' }), { status: 400 });
  }

  try {
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    const dataProvider = new DataProvider();
    const technicalAnalyzer = new TechnicalAnalyzer();
    const predictionEngine = new PredictionEngine();
    const historicalTracker = new HistoricalTracker();

    console.log('Fetching market data...');
    const marketData = await dataProvider.fetchCoinbaseData(SYMBOL, TIMEFRAME, CANDLE_LIMIT);
    const indicators = technicalAnalyzer.calculateIndicators(marketData.data);
    const patterns = technicalAnalyzer.identifyPatterns(marketData.data, indicators);

    const currentPrice = marketData.data[marketData.data.length - 1].close;
    const last24hData = marketData.data.slice(-CANDLE_LIMIT_24H);
    const price24hAgo = last24hData[0].open;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    const high24h = Math.max(...last24hData.map(d => d.high));
    const low24h = Math.min(...last24hData.map(d => d.low));

    const prediction = predictionEngine.predict(marketData.data, indicators, patterns);
    const historicalCalls = await historicalTracker.getLast30DaysCalls();

    const analysis: AnalysisResult = {
      symbol: SYMBOL,
      timeframe: TIMEFRAME,
      currentPrice,
      priceChange: priceChange24h,
      priceChange24h,
      high24h,
      low24h,
      prediction,
      indicators,
      patterns,
      timestamp: new Date(),
      derivativesData: null,
      blockHeight: null,
    };

    const tweetContent = generateTradingBotTweets(analysis, historicalCalls);
    console.log('Generated', tweetContent.tweets.length, 'tweets');

    // Post thread
    let previousTweetId: string | null = null;
    for (const tweet of tweetContent.tweets) {
      const options: any = { text: tweet };
      if (previousTweetId) {
        options.reply = { in_reply_to_tweet_id: previousTweetId };
      }
      const result = await twitterClient.v2.tweet(options);
      previousTweetId = result.data.id;
    }

    console.log('Posted thread successfully');
    return new Response(JSON.stringify({
      success: true,
      tweets: tweetContent.tweets.length,
      price: currentPrice,
      direction: prediction.direction,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
