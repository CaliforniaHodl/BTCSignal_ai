// Profitability Metrics - Phase 3: SOPR Family & Realized Price
// Calculates SOPR, aSOPR, STH-SOPR, LTH-SOPR, and Realized Prices
import type { Config, Context } from '@netlify/functions';
import {
  ProfitabilityMetrics,
  calculateSOPR,
  calculateAdjustedSOPR,
  calculateSTHSOPR,
  calculateLTHSOPR,
  calculateRealizedPrice,
  calculateSTHRealizedPrice,
  calculateLTHRealizedPrice
} from './lib/profitability-analyzer';

interface PricePoint {
  price: number;
  timestamp: string;
  volume: number;
}

// Fetch BTC price history from CoinGecko
async function fetchBTCPriceHistory(days: number = 365): Promise<PricePoint[]> {
  try {
    // CoinGecko market chart API - free tier
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
    );

    if (res.ok) {
      const data = await res.json();
      const priceHistory: PricePoint[] = [];

      // Format: prices: [[timestamp, price], ...]
      // volumes: [[timestamp, volume], ...]
      if (data.prices && data.total_volumes) {
        for (let i = 0; i < data.prices.length; i++) {
          const [timestamp, price] = data.prices[i];
          const volume = data.total_volumes[i] ? data.total_volumes[i][1] : 0;

          priceHistory.push({
            price,
            timestamp: new Date(timestamp).toISOString(),
            volume
          });
        }
      }

      return priceHistory;
    }
  } catch (e) {
    console.error('Failed to fetch BTC price history:', e);
  }
  return [];
}

// Fetch current BTC data
async function fetchCurrentBTCData(): Promise<{
  price: number;
  marketCap: number;
  circulatingSupply: number;
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
        circulatingSupply: data.market_data.circulating_supply
      };
    }
  } catch (e) {
    console.error('Failed to fetch current BTC data:', e);
  }
  return { price: 0, marketCap: 0, circulatingSupply: 0 };
}

// Fetch MVRV from CoinMetrics Community API (if available)
async function fetchMVRVFromCoinMetrics(): Promise<{ mvrv: number; realizedCap: number } | null> {
  try {
    const mvrvRes = await fetch(
      'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur&frequency=1d&limit_per_asset=1'
    );

    if (mvrvRes.ok) {
      const mvrvData = await mvrvRes.json();
      if (mvrvData.data && mvrvData.data.length > 0) {
        const mvrv = parseFloat(mvrvData.data[0].CapMVRVCur);

        // Also fetch realized cap
        const realCapRes = await fetch(
          'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapRealUSD&frequency=1d&limit_per_asset=1'
        );

        let realizedCap = 0;
        if (realCapRes.ok) {
          const realCapData = await realCapRes.json();
          if (realCapData.data && realCapData.data.length > 0) {
            realizedCap = parseFloat(realCapData.data[0].CapRealUSD);
          }
        }

        return { mvrv, realizedCap };
      }
    }
  } catch (e) {
    console.error('Failed to fetch MVRV from CoinMetrics:', e);
  }
  return null;
}

// Save to GitHub
async function saveToGitHub(data: ProfitabilityMetrics): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'data/profitability-metrics.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const content = JSON.stringify(data, null, 2);
    const body: any = {
      message: `Update profitability metrics: SOPR ${data.sopr.value}, STH-SOPR ${data.sthSopr.value}, LTH-SOPR ${data.lthSopr.value}`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master'
    };

    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });

    return res.ok;
  } catch (error: any) {
    console.error('Failed to save to GitHub:', error.message);
    return false;
  }
}

export default async (req: Request, context: Context) => {
  console.log('Calculating profitability metrics (Phase 3)...');

  // Fetch data in parallel
  const [priceHistory, currentData, coinMetricsData] = await Promise.all([
    fetchBTCPriceHistory(730), // 2 years for LTH calculations
    fetchCurrentBTCData(),
    fetchMVRVFromCoinMetrics()
  ]);

  if (!currentData.price || priceHistory.length < 90) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Could not fetch sufficient price history'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const currentPrice = currentData.price;
  const mvrv = coinMetricsData?.mvrv;
  const realizedCap = coinMetricsData?.realizedCap;

  console.log(`Price history: ${priceHistory.length} days`);
  console.log(`Current price: $${currentPrice.toFixed(0)}`);
  if (mvrv) console.log(`MVRV: ${mvrv.toFixed(2)}`);

  // Calculate all SOPR metrics
  const sopr = calculateSOPR(currentPrice, priceHistory, mvrv);
  const asopr = calculateAdjustedSOPR(currentPrice, priceHistory, mvrv);
  const sthSopr = calculateSTHSOPR(currentPrice, priceHistory, mvrv);
  const lthSopr = calculateLTHSOPR(currentPrice, priceHistory, mvrv);

  // Calculate Realized Prices
  const realizedPrice = calculateRealizedPrice(
    priceHistory,
    realizedCap,
    currentData.circulatingSupply
  );
  const sthRealizedPrice = calculateSTHRealizedPrice(priceHistory);
  const lthRealizedPrice = calculateLTHRealizedPrice(priceHistory);

  const metrics: ProfitabilityMetrics = {
    lastUpdated: new Date().toISOString(),
    sopr,
    asopr,
    sthSopr,
    lthSopr,
    realizedPrice,
    sthRealizedPrice,
    lthRealizedPrice
  };

  // Log what we computed
  console.log(`SOPR: ${sopr.value.toFixed(3)} (${sopr.signal})`);
  console.log(`aSOPR: ${asopr.value.toFixed(3)} (${asopr.signal})`);
  console.log(`STH-SOPR: ${sthSopr.value.toFixed(3)} (${sthSopr.signal})`);
  console.log(`LTH-SOPR: ${lthSopr.value.toFixed(3)} (${lthSopr.signal})`);
  console.log(`Realized Price: $${realizedPrice.price.toLocaleString()} (${realizedPrice.signal})`);
  console.log(`STH Realized Price: $${sthRealizedPrice.toLocaleString()}`);
  console.log(`LTH Realized Price: $${lthRealizedPrice.toLocaleString()}`);

  // Save to GitHub
  const saved = await saveToGitHub(metrics);

  return new Response(
    JSON.stringify({
      success: true,
      saved,
      data: metrics
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
};

// Schedule: runs every 4 hours (same as on-chain metrics)
export const config: Config = {
  schedule: '45 */4 * * *'
};
