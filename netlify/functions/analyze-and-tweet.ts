import type { Config, Context } from '@netlify/functions';
import { DataProvider } from './lib/data-provider';
import { TechnicalAnalyzer } from './lib/technical-analysis';
import { PredictionEngine } from './lib/prediction-engine';
import { TwitterClient } from './lib/twitter-client';
import { BlogGenerator, AnalysisResult } from './lib/blog-generator';
import { HistoricalTracker } from './lib/historical-tracker';
import { DerivativesAnalyzer } from './lib/derivatives-analyzer';

const SYMBOL = 'BTC-USD';
const TIMEFRAME = '1h';
const CANDLE_LIMIT = 100;
const CANDLE_LIMIT_24H = 24; // 24 x 1h = 24h for 24h high/low

// Save post to GitHub repository using OAuth
async function savePostToGitHub(filename: string, content: string): Promise<boolean> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const repo = process.env.GITHUB_REPO; // format: "owner/repo"

  if (!clientId || !clientSecret || !repo) {
    console.log('GitHub credentials not set, skipping post save');
    return false;
  }

  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const path = `content/posts/${filename}`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Add analysis post: ${filename}`,
        content: Buffer.from(content).toString('base64'),
        branch: 'main',
      }),
    });

    if (response.ok) {
      console.log(`Post saved to GitHub: ${path}`);
      return true;
    } else {
      const error = await response.json();
      console.error('GitHub API error:', error);
      return false;
    }
  } catch (error: any) {
    console.error('Failed to save to GitHub:', error.message);
    return false;
  }
}

export default async (req: Request, context: Context) => {
  console.log('Starting Bitcoin analysis...');

  try {
    // Initialize services
    const dataProvider = new DataProvider();
    const technicalAnalyzer = new TechnicalAnalyzer();
    const predictionEngine = new PredictionEngine();
    const blogGenerator = new BlogGenerator();
    const historicalTracker = new HistoricalTracker();
    const derivativesAnalyzer = new DerivativesAnalyzer();

    // Fetch market data from Coinbase
    console.log(`Fetching ${SYMBOL} ${TIMEFRAME} data from Coinbase...`);
    const marketData = await dataProvider.fetchCoinbaseData(SYMBOL, TIMEFRAME, CANDLE_LIMIT);

    // Calculate indicators
    const indicators = technicalAnalyzer.calculateIndicators(marketData.data);

    // Identify patterns
    const patterns = technicalAnalyzer.identifyPatterns(marketData.data, indicators);

    // Generate prediction
    const prediction = predictionEngine.predict(marketData.data, indicators, patterns);

    // Calculate price metrics
    const currentPrice = marketData.data[marketData.data.length - 1].close;
    const startPrice = marketData.data[0].close;
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;

    // Calculate 24h metrics (last 6 candles for 4h timeframe)
    const last24hData = marketData.data.slice(-CANDLE_LIMIT_24H);
    const price24hAgo = last24hData[0].open;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    const high24h = Math.max(...last24hData.map(d => d.high));
    const low24h = Math.min(...last24hData.map(d => d.low));

    // Update pending historical calls with current price
    console.log('Updating historical call results...');
    await historicalTracker.updatePendingCalls(currentPrice);

    // Get historical calls for the thread
    const historicalCalls = await historicalTracker.getLast30DaysCalls();
    console.log(`Found ${historicalCalls.length} historical calls`);

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
    };

    // Generate thread tweets
    const thread = blogGenerator.generateThread(analysis, historicalCalls);
    const threadArray = blogGenerator.getThreadArray(thread);
    console.log('Generated thread with', threadArray.length, 'tweets');

    // Generate markdown blog post with thread format
    const blogMarkdown = blogGenerator.generateMarkdown(analysis, historicalCalls);
    const filename = blogGenerator.generateFilename(analysis);
    console.log('Generated blog post:', filename);

    // Save post to GitHub (triggers Netlify rebuild)
    const postSaved = await savePostToGitHub(filename, blogMarkdown);

    // Add new call to historical tracking
    if ((prediction.direction === 'up' || prediction.direction === 'down') && prediction.targetPrice) {
      const newCall = historicalTracker.createCallFromAnalysis(
        analysis.timestamp,
        prediction.direction,
        prediction.confidence,
        currentPrice,
        prediction.targetPrice
      );
      await historicalTracker.addCall(newCall);
      console.log('Added new call to historical tracking');
    }

    // Post thread to Twitter (if credentials are set)
    let threadResult = null;
    let derivativesAlerts: string[] = [];
    if (process.env.TWITTER_API_KEY) {
      try {
        const twitterClient = new TwitterClient();
        threadResult = await twitterClient.postThread(threadArray);
        console.log('Thread posted:', threadResult.length, 'tweets');

        // Fetch derivatives data and post separate alerts if needed
        console.log('Checking derivatives data for alerts...');
        try {
          const derivativesData = await derivativesAnalyzer.getDerivativesData(currentPrice, priceChange24h);
          const alertStatus = derivativesAnalyzer.shouldAlert(derivativesData);

          // Post squeeze alert as separate tweet (uses police siren emoji)
          if (alertStatus.squeeze) {
            const squeezeAlert = derivativesAnalyzer.generateSqueezeAlert(derivativesData, currentPrice);
            if (squeezeAlert) {
              console.log('Posting squeeze alert tweet...');
              await twitterClient.tweet(squeezeAlert);
              derivativesAlerts.push('squeeze');
              console.log('Squeeze alert posted!');
            }
          }

          // Post options expiry alert as separate tweet (uses bell emoji)
          if (alertStatus.options) {
            const optionsAlert = derivativesAnalyzer.generateOptionsAlert(derivativesData, currentPrice);
            if (optionsAlert) {
              console.log('Posting options expiry alert tweet...');
              await twitterClient.tweet(optionsAlert);
              derivativesAlerts.push('options');
              console.log('Options expiry alert posted!');
            }
          }

          if (derivativesAlerts.length === 0) {
            console.log('No derivatives alerts triggered');
          }
        } catch (derivativesError: any) {
          console.error('Derivatives analysis error:', derivativesError.message);
        }
      } catch (twitterError: any) {
        console.error('Twitter error:', twitterError.message);
      }
    } else {
      console.log('Twitter credentials not set, skipping thread');
    }

    // Return result
    return new Response(JSON.stringify({
      success: true,
      analysis: {
        symbol: analysis.symbol,
        timeframe: analysis.timeframe,
        price: analysis.currentPrice,
        priceChange24h: analysis.priceChange24h,
        high24h: analysis.high24h,
        low24h: analysis.low24h,
        direction: analysis.prediction.direction,
        confidence: analysis.prediction.confidence,
        sentiment: prediction.direction === 'up' ? 'bullish' : prediction.direction === 'down' ? 'bearish' : 'neutral',
        timestamp: analysis.timestamp.toISOString(),
      },
      thread: threadResult ? {
        count: threadResult.length,
        tweets: threadResult,
        content: threadArray,
      } : null,
      post: {
        filename,
        saved: postSaved,
        content: blogMarkdown,
      },
      historical: {
        totalCalls: historicalCalls.length,
        wins: historicalCalls.filter(c => c.actualResult === 'win').length,
        losses: historicalCalls.filter(c => c.actualResult === 'loss').length,
        pending: historicalCalls.filter(c => c.actualResult === 'pending').length,
      },
      derivativesAlerts,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Schedule: runs daily at 9am PST (5pm UTC)
export const config: Config = {
  schedule: '0 17 * * *',
};
