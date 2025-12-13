// Analyze and Generate Blog Post
// This function performs BTC analysis and saves a blog post to GitHub
// Twitter posting is handled separately by btctradingbot-tweets.ts
import type { Config, Context } from '@netlify/functions';
import { DataProvider } from './lib/data-provider';
import { TechnicalAnalyzer } from './lib/technical-analysis';
import { PredictionEngine } from './lib/prediction-engine';
import { BlogGenerator, AnalysisResult } from './lib/blog-generator';
import { HistoricalTracker } from './lib/historical-tracker';
import { DerivativesAnalyzer } from './lib/derivatives-analyzer';

const SYMBOL = 'BTC-USD';
const TIMEFRAME = '1h';
const CANDLE_LIMIT = 100;
const CANDLE_LIMIT_24H = 24;

// Save post to GitHub repository
async function savePostToGitHub(filename: string, content: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping post save');
    return false;
  }

  const path = `content/posts/${filename}`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Add analysis post: ${filename}`,
        content: Buffer.from(content).toString('base64'),
        branch: 'master',
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

    // Fetch derivatives data
    console.log('Fetching derivatives data...');
    let derivativesData = null;
    try {
      const currentPriceForDerivatives = marketData.data[marketData.data.length - 1].close;
      // BUG FIX: Use actual 24h data, not 100h ago (was using first candle of 100 1h candles)
      const last24hCandles = marketData.data.slice(-24);
      const price24hAgoForDerivatives = last24hCandles[0].close;
      const priceChange24hForDerivatives = ((currentPriceForDerivatives - price24hAgoForDerivatives) / price24hAgoForDerivatives) * 100;
      derivativesData = await derivativesAnalyzer.getDerivativesData(currentPriceForDerivatives, priceChange24hForDerivatives);
      console.log('Derivatives data fetched:', {
        fundingRate: derivativesData.fundingRate?.fundingRate,
        openInterest: derivativesData.openInterest?.openInterestValue,
        squeezeType: derivativesData.squeezeAlert.type,
      });
    } catch (derivativesError: any) {
      console.error('Failed to fetch derivatives data:', derivativesError.message);
    }

    // Generate prediction
    const prediction = predictionEngine.predict(marketData.data, indicators, patterns, derivativesData || undefined);

    // Calculate price metrics
    const currentPrice = marketData.data[marketData.data.length - 1].close;
    const startPrice = marketData.data[0].close;
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;

    // Calculate 24h metrics
    const last24hData = marketData.data.slice(-CANDLE_LIMIT_24H);
    const price24hAgo = last24hData[0].open;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    const high24h = Math.max(...last24hData.map(d => d.high));
    const low24h = Math.min(...last24hData.map(d => d.low));

    // Fetch current Bitcoin block height
    console.log('Fetching current block height...');
    let blockHeight: number | null = null;
    try {
      const blockHeightRes = await fetch('https://mempool.space/api/blocks/tip/height');
      if (blockHeightRes.ok) {
        blockHeight = parseInt(await blockHeightRes.text(), 10);
        console.log('Block height:', blockHeight);
      }
    } catch (blockHeightError: any) {
      console.error('Failed to fetch block height:', blockHeightError.message);
    }

    // Update pending historical calls with current price
    console.log('Updating historical call results...');
    await historicalTracker.updatePendingCalls(currentPrice);

    // Get historical calls
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
      derivativesData,
      blockHeight,
    };

    // Generate markdown blog post (no tweet URL since Twitter is separate)
    const blogMarkdown = blogGenerator.generateMarkdown(analysis, historicalCalls, null);
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
        prediction.targetPrice,
        prediction.stopLoss
      );
      await historicalTracker.addCall(newCall);
      console.log('Added new call to historical tracking');
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
      post: {
        filename,
        saved: postSaved,
      },
      historical: {
        totalCalls: historicalCalls.length,
        wins: historicalCalls.filter(c => c.actualResult === 'win').length,
        losses: historicalCalls.filter(c => c.actualResult === 'loss').length,
        pending: historicalCalls.filter(c => c.actualResult === 'pending').length,
      },
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
