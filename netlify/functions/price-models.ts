// Price Models Netlify Function - Phase 6
// Calculates Bitcoin valuation models (S2F, Thermocap, NUPL, Puell, etc.)
// Updated: Now uses Netlify Blob storage instead of GitHub commits
// Scheduled to run every 4 hours

import type { Config, Context } from '@netlify/functions';
import {
  calculateStockToFlow,
  calculateThermocap,
  calculateRealizedCap,
  calculateNUPL,
  calculatePuellMultiple,
  calculateMVRVZScore,
  calculateRHODLRatio,
  calculateDeltaCap,
  calculateOverallValuation,
  BTC_CONSTANTS,
  type PriceModels,
} from './lib/price-models';
import { saveToBlob } from './lib/shared';

// Fetch BTC price from multiple sources
async function fetchBTCPrice(): Promise<number> {
  try {
    // Try Binance US first
    const res = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
    if (res.ok) {
      const data = await res.json();
      return parseFloat(data.price);
    }
  } catch (e) {
    console.log('Binance US failed, trying CoinGecko');
  }

  try {
    // Fallback to CoinGecko
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      return data.bitcoin.usd;
    }
  } catch (e) {
    console.error('Failed to fetch BTC price:', e);
  }

  throw new Error('Failed to fetch BTC price from all sources');
}

// Fetch market data from CoinGecko
async function fetchMarketData(): Promise<{
  price: number;
  marketCap: number;
  circulatingSupply: number;
  priceChange30d: number;
}> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false'
    );
    if (res.ok) {
      const data = await res.json();
      return {
        price: data.market_data.current_price.usd,
        marketCap: data.market_data.market_cap.usd,
        circulatingSupply: data.market_data.circulating_supply,
        priceChange30d: data.market_data.price_change_percentage_30d || 0,
      };
    }
  } catch (e) {
    console.error('Failed to fetch market data:', e);
  }

  // Fallback: fetch price separately and estimate
  const price = await fetchBTCPrice();
  return {
    price,
    marketCap: price * BTC_CONSTANTS.CURRENT_CIRCULATING,
    circulatingSupply: BTC_CONSTANTS.CURRENT_CIRCULATING,
    priceChange30d: 0,
  };
}

// Estimate MVRV from historical patterns
// Real MVRV would come from CoinMetrics/Glassnode
async function estimateMVRV(price: number): Promise<number> {
  // Simplified MVRV estimation based on price level and historical patterns
  // Real-world MVRV typically ranges from 0.8 (bear market bottom) to 4.0+ (cycle top)

  // Use price as proxy for cycle position
  // This is rough but works for demonstration
  if (price < 30000) {
    // Bear market territory
    return 1.0 + Math.random() * 0.3; // 1.0-1.3
  } else if (price < 50000) {
    // Early bull market
    return 1.3 + Math.random() * 0.5; // 1.3-1.8
  } else if (price < 70000) {
    // Mid bull market
    return 1.8 + Math.random() * 0.7; // 1.8-2.5
  } else if (price < 100000) {
    // Late bull market
    return 2.5 + Math.random() * 1.0; // 2.5-3.5
  } else {
    // Euphoria territory
    return 3.5 + Math.random() * 1.0; // 3.5-4.5
  }
}

// Estimate LTH/STH split based on market conditions
function estimateLTHSTHSplit(
  circulatingSupply: number,
  priceChange30d: number
): { lth: number; sth: number } {
  // Base split (70% LTH, 30% STH in normal conditions)
  let lthPercentage = 0.70;

  // Adjust based on price action
  if (priceChange30d > 20) {
    lthPercentage -= 0.05; // Strong uptrend = more distribution
  } else if (priceChange30d < -20) {
    lthPercentage += 0.05; // Strong downtrend = more accumulation
  }

  // Clamp
  lthPercentage = Math.max(0.60, Math.min(0.80, lthPercentage));

  const lth = circulatingSupply * lthPercentage;
  const sth = circulatingSupply * (1 - lthPercentage);

  return { lth, sth };
}

// Calculate historical average price (proxy for Puell Multiple MA)
async function fetchHistoricalAvgPrice(): Promise<number> {
  try {
    // Fetch 365-day price history from CoinGecko
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily'
    );
    if (res.ok) {
      const data = await res.json();
      const prices = data.prices.map((p: any[]) => p[1]);
      const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
      return avgPrice;
    }
  } catch (e) {
    console.error('Failed to fetch historical price:', e);
  }

  // Fallback: estimate based on current price
  const currentPrice = await fetchBTCPrice();
  return currentPrice * 0.85; // Rough approximation
}

// Save data to Netlify Blob storage (no GitHub commits = no build triggers!)
async function saveToBlobStorage(data: PriceModels): Promise<void> {
  const saved = await saveToBlob('price-models', data);
  if (saved) {
    console.log('Successfully saved price models to Blob storage');
  } else {
    console.error('Failed to save to Blob storage');
  }
}

// Main handler
export default async (req: Request, context: Context) => {
  try {
    console.log('Starting price models calculation...');

    // Fetch all required data
    const marketData = await fetchMarketData();
    const { price, marketCap, circulatingSupply, priceChange30d } = marketData;

    console.log(`Current BTC price: $${price.toLocaleString()}`);
    console.log(`Market cap: $${(marketCap / 1e9).toFixed(2)}B`);

    // Estimate MVRV
    const mvrv = await estimateMVRV(price);
    console.log(`Estimated MVRV: ${mvrv.toFixed(2)}`);

    // Estimate LTH/STH split
    const { lth, sth } = estimateLTHSTHSplit(circulatingSupply, priceChange30d);

    // Fetch historical average price for Puell Multiple
    const historicalAvgPrice = await fetchHistoricalAvgPrice();

    // Calculate all models
    console.log('Calculating valuation models...');

    // 1. Stock-to-Flow
    const stockToFlow = calculateStockToFlow(price, circulatingSupply);

    // 2. Thermocap
    const thermocap = calculateThermocap(marketCap);

    // 3. Realized Cap (from MVRV)
    const realizedCap = calculateRealizedCap(marketCap, mvrv);

    // 4. NUPL
    const nupl = calculateNUPL(marketCap, realizedCap.realizedCap);

    // 5. Puell Multiple
    const puellMultiple = calculatePuellMultiple(price, BTC_CONSTANTS.DAILY_ISSUANCE, historicalAvgPrice);

    // 6. MVRV Z-Score
    const mvrvZScore = calculateMVRVZScore(mvrv);

    // 7. RHODL Ratio
    const rhodlRatio = calculateRHODLRatio(lth, sth);

    // 8. Delta Cap
    // Historical avg market cap = roughly 60% of current market cap (conservative estimate)
    const historicalAvgMarketCap = marketCap * 0.60;
    const deltaCap = calculateDeltaCap(marketCap, realizedCap.realizedCap, historicalAvgMarketCap, circulatingSupply);

    // 9. Overall Valuation Score
    const overallValuation = calculateOverallValuation({
      s2f: stockToFlow,
      thermocap,
      realizedCap,
      nupl,
      puell: puellMultiple,
      mvrvZ: mvrvZScore,
      rhodl: rhodlRatio,
      deltaCap,
    });

    // Compile result
    const priceModels: PriceModels = {
      lastUpdated: new Date().toISOString(),
      currentPrice: price,
      stockToFlow,
      thermocap,
      realizedCap,
      nupl,
      puellMultiple,
      mvrvZScore,
      rhodlRatio,
      deltaCap,
      overallValuation,
    };

    console.log(`Overall valuation: ${overallValuation.rating} (score: ${overallValuation.score})`);

    // Save to GitHub
    await saveToBlobStorage(priceModels);

    return new Response(JSON.stringify(priceModels, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=14400', // 4 hours
      },
    });
  } catch (error: any) {
    console.error('Error in price models function:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to calculate price models',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Note: Schedule removed - data now saved to Blob storage on-demand
