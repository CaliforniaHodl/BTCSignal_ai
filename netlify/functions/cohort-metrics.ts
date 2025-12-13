// Cohort Metrics - Phase 4: Cohort Analysis
// LTH/STH supply, whale tiers, illiquid supply
import type { Config, Context } from '@netlify/functions';
import {
  CohortMetrics,
  HolderCohorts,
  estimateLTHSTHSplit,
  estimateWhaleDistribution,
  estimateSupplyLiquidity,
  calculateLTHSTHRatio
} from './lib/cohort-analyzer';

// Fetch BTC price and market data from CoinGecko
async function fetchBTCData(): Promise<{
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
        priceChange30d: data.market_data.price_change_percentage_30d || 0
      };
    }
  } catch (e) {
    console.error('Failed to fetch BTC data:', e);
  }
  return { price: 0, marketCap: 0, circulatingSupply: 0, priceChange30d: 0 };
}

// Calculate 30-day volatility from price history
async function calculateVolatility(): Promise<number> {
  try {
    // Fetch 30 days of price data
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily'
    );
    if (res.ok) {
      const data = await res.json();
      if (data.prices && data.prices.length > 0) {
        const prices = data.prices.map((p: [number, number]) => p[1]);

        // Calculate daily returns
        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
          returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        // Calculate standard deviation of returns
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);

        return volatility;
      }
    }
  } catch (e) {
    console.error('Failed to calculate volatility:', e);
  }
  return 0.03; // Default 3% daily volatility
}

// Try to fetch LTH/STH data from CoinMetrics Community API
async function fetchLTHSTHFromCoinMetrics(): Promise<{ lth: number; sth: number } | null> {
  try {
    // CoinMetrics has supply age bands in their community API
    // Metrics: SplyCur1d, SplyCur1w, SplyCur1m, SplyCur3m, SplyCur6m, SplyCur1y, etc.
    // We need supply > 155 days (LTH) vs < 155 days (STH)

    // Note: CoinMetrics Community API has limited metrics
    // The full supply age bands require a paid subscription
    // For now, we'll return null and use estimation

    const res = await fetch(
      'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=SplyCur&frequency=1d&limit_per_asset=1'
    );

    if (res.ok) {
      const data = await res.json();
      // If we had age band data, we'd parse it here
      // For now, return null to trigger estimation
    }
  } catch (e) {
    console.error('CoinMetrics LTH/STH fetch failed:', e);
  }
  return null;
}

// Calculate holder cohorts
function calculateHolderCohorts(
  circulatingSupply: number,
  lthBTC: number,
  sthBTC: number,
  priceChange30d: number
): HolderCohorts {
  const lthPct = (lthBTC / circulatingSupply) * 100;
  const sthPct = (sthBTC / circulatingSupply) * 100;

  // Estimate 30-day change based on price action
  // Rising price = LTH distributing, STH accumulating
  // Falling price = LTH accumulating, STH distributing
  let lthChange30d = 0;
  let sthChange30d = 0;

  if (priceChange30d > 10) {
    // Strong rally - LTH taking profits
    lthChange30d = -0.5;
    sthChange30d = 0.5;
  } else if (priceChange30d > 5) {
    lthChange30d = -0.3;
    sthChange30d = 0.3;
  } else if (priceChange30d < -10) {
    // Deep correction - LTH accumulating
    lthChange30d = 0.7;
    sthChange30d = -0.7;
  } else if (priceChange30d < -5) {
    lthChange30d = 0.4;
    sthChange30d = -0.4;
  }

  const lthTrend = lthChange30d > 0.3 ? 'accumulating' :
                   lthChange30d < -0.3 ? 'distributing' : 'stable';
  const sthTrend = sthChange30d > 0.3 ? 'accumulating' :
                   sthChange30d < -0.3 ? 'distributing' : 'stable';

  const lthSthRatio = calculateLTHSTHRatio(lthBTC, sthBTC);

  return {
    lthSupply: {
      btc: Math.round(lthBTC),
      percentage: Math.round(lthPct * 10) / 10,
      change30d: Math.round(lthChange30d * 10) / 10,
      trend: lthTrend,
      description: lthPct > 75 ? 'Very high LTH supply - strong holder conviction' :
                   lthPct > 70 ? 'High LTH supply - coins held off market' :
                   lthPct < 65 ? 'Lower LTH supply - weaker hands' :
                   'Moderate LTH supply'
    },
    sthSupply: {
      btc: Math.round(sthBTC),
      percentage: Math.round(sthPct * 10) / 10,
      change30d: Math.round(sthChange30d * 10) / 10,
      trend: sthTrend,
      description: sthPct > 35 ? 'High STH supply - more speculation and trading' :
                   sthPct > 25 ? 'Moderate STH supply - normal market activity' :
                   'Low STH supply - less active trading'
    },
    lthSthRatio
  };
}

// Save to GitHub
async function saveToGitHub(data: CohortMetrics): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'data/cohort-metrics.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const content = JSON.stringify(data, null, 2);
    const body: any = {
      message: `Update cohort metrics: LTH ${data.holderCohorts.lthSupply.percentage}%, Illiquid ${data.supplyLiquidity.illiquidSupply.percentage}%`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    return res.ok;
  } catch (error: any) {
    console.error('Failed to save to GitHub:', error.message);
    return false;
  }
}

export default async (req: Request, context: Context) => {
  console.log('Calculating cohort metrics (Phase 4)...');

  // Fetch required data
  const [btcData, volatility, coinMetricsLTH] = await Promise.all([
    fetchBTCData(),
    calculateVolatility(),
    fetchLTHSTHFromCoinMetrics()
  ]);

  if (!btcData.price || !btcData.circulatingSupply) {
    return new Response(
      JSON.stringify({ success: false, error: 'Could not fetch BTC data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Calculate LTH/STH split
  let lthBTC: number;
  let sthBTC: number;

  if (coinMetricsLTH) {
    // Use real data if available
    lthBTC = coinMetricsLTH.lth;
    sthBTC = coinMetricsLTH.sth;
    console.log('Using real LTH/STH data from CoinMetrics');
  } else {
    // Estimate based on market conditions
    const split = estimateLTHSTHSplit(
      btcData.circulatingSupply,
      btcData.priceChange30d,
      volatility
    );
    lthBTC = split.lth;
    sthBTC = split.sth;
    console.log('Using estimated LTH/STH split');
  }

  // Calculate holder cohorts
  const holderCohorts = calculateHolderCohorts(
    btcData.circulatingSupply,
    lthBTC,
    sthBTC,
    btcData.priceChange30d
  );

  // Estimate whale distribution
  const whaleCohorts = estimateWhaleDistribution(btcData.circulatingSupply);

  // Calculate supply liquidity
  const supplyLiquidity = estimateSupplyLiquidity(
    btcData.circulatingSupply,
    lthBTC,
    sthBTC,
    whaleCohorts
  );

  const metrics: CohortMetrics = {
    lastUpdated: new Date().toISOString(),
    holderCohorts,
    whaleCohorts,
    supplyLiquidity
  };

  // Log summary
  console.log(`Cohort metrics computed:`);
  console.log(`- LTH: ${holderCohorts.lthSupply.percentage}% (${holderCohorts.lthSupply.trend})`);
  console.log(`- STH: ${holderCohorts.sthSupply.percentage}% (${holderCohorts.sthSupply.trend})`);
  console.log(`- LTH/STH Ratio: ${holderCohorts.lthSthRatio.ratio} (${holderCohorts.lthSthRatio.signal})`);
  console.log(`- Illiquid Supply: ${supplyLiquidity.illiquidSupply.percentage}%`);
  console.log(`- Whale trend: ${whaleCohorts.whale.trend}`);

  // Save to GitHub
  const saved = await saveToGitHub(metrics);

  return new Response(
    JSON.stringify({
      success: true,
      saved,
      data: metrics,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};

// Schedule: runs every 6 hours
export const config: Config = {
  schedule: '15 */6 * * *',
};
