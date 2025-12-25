import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { DerivativesAdvancedAnalyzer, DerivativesAdvancedData } from './lib/derivatives-advanced';
import axios from 'axios';
import { saveToBlob, loadFromBlob } from './lib/shared';

/**
 * Get current BTC price from CoinGecko
 */
async function getCurrentPrice(): Promise<{ price: number; change24h: number }> {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin',
        vs_currencies: 'usd',
        include_24hr_change: 'true'
      },
      timeout: 5000
    });

    return {
      price: response.data.bitcoin.usd,
      change24h: response.data.bitcoin.usd_24h_change || 0
    };
  } catch (error) {
    console.error('Failed to fetch current price:', error);
    throw new Error('Failed to fetch BTC price');
  }
}

/**
 * Load previous data from Blob storage
 */
async function loadPreviousData(): Promise<DerivativesAdvancedData | null> {
  return loadFromBlob<DerivativesAdvancedData>('derivatives-advanced');
}

/**
 * Save data to Netlify Blob storage (no GitHub commits = no build triggers!)
 */
async function saveToBlobStorage(data: DerivativesAdvancedData): Promise<void> {
  const saved = await saveToBlob('derivatives-advanced', data);
  if (saved) {
    console.log('Derivatives advanced data saved to Blob storage');
  } else {
    throw new Error('Failed to save to Blob storage');
  }
}

/**
 * Main handler
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Starting derivatives-advanced analysis...');

    // Get current price
    const { price, change24h } = await getCurrentPrice();
    console.log(`Current BTC price: $${price}, 24h change: ${change24h.toFixed(2)}%`);

    // Load previous data for trend analysis
    const previousData = await loadPreviousData();
    const previousOIValue = previousData?.openInterest.totalUSD;
    const previousFundingRate = previousData?.fundingRate.weightedAverage;

    // Build historical funding rates array
    const historicalFundingRates: number[] = [];
    if (previousData?.fundingRate.weightedAverage) {
      historicalFundingRates.push(previousData.fundingRate.weightedAverage);
    }

    // Fetch advanced derivatives data
    const analyzer = new DerivativesAdvancedAnalyzer();
    const data = await analyzer.getAdvancedDerivativesData(
      price,
      change24h,
      previousOIValue,
      previousFundingRate,
      historicalFundingRates
    );

    console.log('Derivatives analysis complete');
    console.log(`Overall sentiment: ${data.overallSentiment} (confidence: ${(data.confidenceScore * 100).toFixed(1)}%)`);
    console.log(`Funding rate: ${(data.fundingRate.weightedAverage * 100).toFixed(4)}%`);
    console.log(`Total OI: $${(data.openInterest.totalUSD / 1e9).toFixed(2)}B`);
    console.log(`Long/Short ratio: ${data.longShortRatio.weightedRatio.toFixed(2)}`);

    // Save to GitHub cache
    await saveToBlobStorage(data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data,
        metadata: {
          btcPrice: price,
          priceChange24h: change24h,
          timestamp: data.timestamp,
          cached: false
        }
      })
    };
  } catch (error: any) {
    console.error('Error in derivatives-advanced function:', error);

    // Try to return cached data if available
    try {
      const cachedData = await loadPreviousData();
      if (cachedData) {
        console.log('Returning cached data due to error');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: cachedData,
            metadata: {
              cached: true,
              error: error.message
            }
          })
        };
      }
    } catch (cacheError) {
      console.error('Failed to load cache:', cacheError);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

export { handler };
// Note: Schedule removed - run on-demand only
