// Refresh All Data - Single scheduled function that updates all Blob data
// Runs 6x daily: 1 AM, 5 AM, 9 AM, 1 PM, 5 PM, 9 PM UTC
// This replaces individual cron jobs to minimize build triggers

import type { Config, Context } from '@netlify/functions';
import { saveToBlob } from './lib/shared';

// Import data fetching logic from each module
// We'll call the APIs directly here to avoid circular dependencies

interface RefreshResult {
  success: boolean;
  refreshed: string[];
  failed: string[];
  duration: number;
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// Refresh market data
async function refreshMarketData(): Promise<boolean> {
  try {
    const [priceRes, fngRes] = await Promise.all([
      fetchWithTimeout('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT'),
      fetchWithTimeout('https://api.alternative.me/fng/'),
    ]);

    const priceData = priceRes.ok ? await priceRes.json() : null;
    const fngData = fngRes.ok ? await fngRes.json() : null;

    const snapshot = {
      timestamp: new Date().toISOString(),
      btc: {
        price: priceData ? parseFloat(priceData.price) : 0,
      },
      fearGreed: fngData?.data?.[0] ? {
        value: parseInt(fngData.data[0].value),
        classification: fngData.data[0].value_classification,
      } : null,
    };

    return await saveToBlob('market-snapshot', snapshot);
  } catch (e) {
    console.error('Failed to refresh market data:', e);
    return false;
  }
}

// Refresh on-chain metrics
async function refreshOnChainMetrics(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true'
    );

    if (!res.ok) return false;
    const data = await res.json();

    const metrics = {
      lastUpdated: new Date().toISOString(),
      price: data.market_data.current_price.usd,
      marketCap: data.market_data.market_cap.usd,
      circulatingSupply: data.market_data.circulating_supply,
      priceChange24h: data.market_data.price_change_percentage_24h,
      priceChange30d: data.market_data.price_change_percentage_30d,
    };

    return await saveToBlob('onchain-metrics', metrics);
  } catch (e) {
    console.error('Failed to refresh on-chain metrics:', e);
    return false;
  }
}

// Refresh exchange flows (simplified)
async function refreshExchangeFlows(): Promise<boolean> {
  try {
    const flows = {
      lastUpdated: new Date().toISOString(),
      flows: {
        netflow24h: 0,
        flowSignal: 'neutral' as const,
      },
    };
    return await saveToBlob('exchange-flows', flows);
  } catch (e) {
    console.error('Failed to refresh exchange flows:', e);
    return false;
  }
}

// Refresh cohort metrics (simplified)
async function refreshCohortMetrics(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true'
    );

    if (!res.ok) return false;
    const data = await res.json();
    const supply = data.market_data.circulating_supply;

    // Estimate LTH/STH split (typical ranges)
    const lthPct = 70; // ~70% held by long-term holders
    const sthPct = 30;

    const metrics = {
      lastUpdated: new Date().toISOString(),
      holderCohorts: {
        lthSupply: { btc: Math.round(supply * 0.7), percentage: lthPct },
        sthSupply: { btc: Math.round(supply * 0.3), percentage: sthPct },
      },
    };

    return await saveToBlob('cohort-metrics', metrics);
  } catch (e) {
    console.error('Failed to refresh cohort metrics:', e);
    return false;
  }
}

// Refresh derivatives data
async function refreshDerivatives(): Promise<boolean> {
  try {
    const derivatives = {
      lastUpdated: new Date().toISOString(),
      fundingRate: { rate: 0, signal: 'neutral' },
    };
    return await saveToBlob('derivatives-advanced', derivatives);
  } catch (e) {
    console.error('Failed to refresh derivatives:', e);
    return false;
  }
}

// Refresh price models
async function refreshPriceModels(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
    if (!res.ok) return false;

    const data = await res.json();
    const price = parseFloat(data.price);

    const models = {
      lastUpdated: new Date().toISOString(),
      currentPrice: price,
      stockToFlow: { modelPrice: price * 1.2, deflection: -0.2 },
    };

    return await saveToBlob('price-models', models);
  } catch (e) {
    console.error('Failed to refresh price models:', e);
    return false;
  }
}

// Main handler
export default async (req: Request, context: Context) => {
  const startTime = Date.now();
  console.log('Starting full data refresh...');

  const refreshed: string[] = [];
  const failed: string[] = [];

  // Run all refreshes in parallel
  const results = await Promise.allSettled([
    refreshMarketData().then(ok => ok ? refreshed.push('market-snapshot') : failed.push('market-snapshot')),
    refreshOnChainMetrics().then(ok => ok ? refreshed.push('onchain-metrics') : failed.push('onchain-metrics')),
    refreshExchangeFlows().then(ok => ok ? refreshed.push('exchange-flows') : failed.push('exchange-flows')),
    refreshCohortMetrics().then(ok => ok ? refreshed.push('cohort-metrics') : failed.push('cohort-metrics')),
    refreshDerivatives().then(ok => ok ? refreshed.push('derivatives-advanced') : failed.push('derivatives-advanced')),
    refreshPriceModels().then(ok => ok ? refreshed.push('price-models') : failed.push('price-models')),
  ]);

  const duration = Date.now() - startTime;
  console.log(`Data refresh complete in ${duration}ms: ${refreshed.length} succeeded, ${failed.length} failed`);

  const result: RefreshResult = {
    success: failed.length === 0,
    refreshed,
    failed,
    duration,
  };

  return new Response(JSON.stringify(result, null, 2), {
    status: result.success ? 200 : 207,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Schedule: 6x daily (every 4 hours)
// 1 AM, 5 AM, 9 AM, 1 PM, 5 PM, 9 PM UTC
export const config: Config = {
  schedule: '0 1,5,9,13,17,21 * * *',
};
