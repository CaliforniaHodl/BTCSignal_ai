// On-Chain Metrics - Phase 1 Sprint 1 & 1.2
// NVT Ratio, Puell Multiple, Stock-to-Flow, SSR, Reserve Risk, MVRV, Active Addresses
import type { Config, Context } from '@netlify/functions';

interface OnChainMetrics {
  lastUpdated: string;
  nvt: {
    ratio: number;
    signal: 'undervalued' | 'fair' | 'overvalued';
    description: string;
  };
  puellMultiple: {
    value: number;
    zone: 'buy' | 'neutral' | 'sell';
    description: string;
  };
  stockToFlow: {
    ratio: number;
    modelPrice: number;
    deflection: number;
    signal: 'undervalued' | 'fair' | 'overvalued';
  };
  ssr: {
    ratio: number;
    trend: 'bullish' | 'neutral' | 'bearish';
    description: string;
  };
  reserveRisk: {
    value: number;
    zone: 'opportunity' | 'neutral' | 'risk';
    description: string;
  };
  nupl: {
    value: number;
    zone: 'capitulation' | 'hope' | 'optimism' | 'belief' | 'euphoria';
    description: string;
  };
  // Sprint 1.2 additions
  mvrv?: {
    ratio: number;
    zone: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
    description: string;
    realizedCap: number;
  };
  activeAddresses?: {
    count24h: number;
    change7d: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    description: string;
  };
  transactionCount?: {
    count24h: number;
    change7d: number;
    description: string;
  };
}

// Fetch BTC price and market data from CoinGecko
async function fetchBTCData(): Promise<{
  price: number;
  marketCap: number;
  circulatingSupply: number;
  volume24h: number;
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
        volume24h: data.market_data.total_volume.usd,
      };
    }
  } catch (e) {
    console.error('Failed to fetch BTC data:', e);
  }
  return { price: 0, marketCap: 0, circulatingSupply: 0, volume24h: 0 };
}

// Fetch stablecoin market caps for SSR calculation
async function fetchStablecoinData(): Promise<{ totalMarketCap: number }> {
  try {
    // Fetch top stablecoins: USDT, USDC, BUSD, DAI
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin,dai,first-digital-usd&vs_currencies=usd&include_market_cap=true'
    );
    if (res.ok) {
      const data = await res.json();
      let totalCap = 0;
      if (data.tether?.usd_market_cap) totalCap += data.tether.usd_market_cap;
      if (data['usd-coin']?.usd_market_cap) totalCap += data['usd-coin'].usd_market_cap;
      if (data.dai?.usd_market_cap) totalCap += data.dai.usd_market_cap;
      if (data['first-digital-usd']?.usd_market_cap) totalCap += data['first-digital-usd'].usd_market_cap;
      return { totalMarketCap: totalCap };
    }
  } catch (e) {
    console.error('Failed to fetch stablecoin data:', e);
  }
  return { totalMarketCap: 0 };
}

// Fetch on-chain transaction volume from Blockchain.info
async function fetchTransactionVolume(): Promise<number> {
  try {
    // Get estimated transaction volume in BTC
    const res = await fetch('https://api.blockchain.info/charts/estimated-transaction-volume-usd?timespan=1days&format=json');
    if (res.ok) {
      const data = await res.json();
      if (data.values && data.values.length > 0) {
        // Return the latest value
        return data.values[data.values.length - 1].y;
      }
    }
  } catch (e) {
    console.error('Failed to fetch transaction volume:', e);
  }
  return 0;
}

// Fetch miner revenue for Puell Multiple
async function fetchMinerRevenue(): Promise<{ daily: number; avg365: number }> {
  try {
    // Get 365 days of miner revenue data
    const res = await fetch('https://api.blockchain.info/charts/miners-revenue?timespan=1year&format=json');
    if (res.ok) {
      const data = await res.json();
      if (data.values && data.values.length > 0) {
        const values = data.values.map((v: { y: number }) => v.y);
        const daily = values[values.length - 1];
        const avg365 = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        return { daily, avg365 };
      }
    }
  } catch (e) {
    console.error('Failed to fetch miner revenue:', e);
  }
  return { daily: 0, avg365: 0 };
}

// Fetch Active Addresses from Blockchain.info
async function fetchActiveAddresses(): Promise<{ count24h: number; change7d: number }> {
  try {
    // Get active addresses for last 30 days to calculate 7d change
    const res = await fetch('https://api.blockchain.info/charts/n-unique-addresses?timespan=30days&format=json');
    if (res.ok) {
      const data = await res.json();
      if (data.values && data.values.length >= 7) {
        const values = data.values.map((v: { y: number }) => v.y);
        const today = values[values.length - 1];
        const weekAgo = values[values.length - 8];
        const change7d = weekAgo > 0 ? ((today - weekAgo) / weekAgo) * 100 : 0;
        return { count24h: Math.round(today), change7d: Math.round(change7d * 10) / 10 };
      }
    }
  } catch (e) {
    console.error('Failed to fetch active addresses:', e);
  }
  return { count24h: 0, change7d: 0 };
}

// Fetch Transaction Count from Blockchain.info
async function fetchTransactionCount(): Promise<{ count24h: number; change7d: number }> {
  try {
    const res = await fetch('https://api.blockchain.info/charts/n-transactions?timespan=30days&format=json');
    if (res.ok) {
      const data = await res.json();
      if (data.values && data.values.length >= 7) {
        const values = data.values.map((v: { y: number }) => v.y);
        const today = values[values.length - 1];
        const weekAgo = values[values.length - 8];
        const change7d = weekAgo > 0 ? ((today - weekAgo) / weekAgo) * 100 : 0;
        return { count24h: Math.round(today), change7d: Math.round(change7d * 10) / 10 };
      }
    }
  } catch (e) {
    console.error('Failed to fetch transaction count:', e);
  }
  return { count24h: 0, change7d: 0 };
}

// Fetch MVRV from CoinMetrics Community API (free tier)
async function fetchMVRVFromCoinMetrics(): Promise<{ mvrv: number; realizedCap: number } | null> {
  try {
    // CoinMetrics Community API - Free tier
    // Get MVRV ratio directly
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

// Calculate MVRV signal
function calculateMVRV(
  mvrv: number,
  realizedCap: number
): OnChainMetrics['mvrv'] {
  let zone: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
  let description: string;

  if (mvrv < 1) {
    zone = 'undervalued';
    description = 'Market below realized value. Historically strong buy zone.';
  } else if (mvrv < 2.4) {
    zone = 'fair';
    description = 'Market value aligned with realized value. Normal conditions.';
  } else if (mvrv < 3.5) {
    zone = 'overvalued';
    description = 'Market premium above realized value. Elevated risk.';
  } else {
    zone = 'extreme';
    description = 'Extreme market premium. Historically strong sell zone.';
  }

  return {
    ratio: Math.round(mvrv * 100) / 100,
    zone,
    description,
    realizedCap,
  };
}

// Calculate Active Addresses signal
function calculateActiveAddresses(
  count24h: number,
  change7d: number
): OnChainMetrics['activeAddresses'] {
  let trend: 'increasing' | 'stable' | 'decreasing';
  let description: string;

  if (change7d > 5) {
    trend = 'increasing';
    description = 'Network activity growing. Bullish adoption signal.';
  } else if (change7d < -5) {
    trend = 'decreasing';
    description = 'Network activity declining. Reduced engagement.';
  } else {
    trend = 'stable';
    description = 'Network activity stable.';
  }

  return {
    count24h,
    change7d,
    trend,
    description,
  };
}

// Calculate Transaction Count signal
function calculateTransactionCount(
  count24h: number,
  change7d: number
): OnChainMetrics['transactionCount'] {
  let description: string;

  if (change7d > 10) {
    description = 'Transaction activity surging. High network utilization.';
  } else if (change7d < -10) {
    description = 'Transaction activity declining. Reduced on-chain demand.';
  } else {
    description = 'Transaction activity normal.';
  }

  return {
    count24h,
    change7d,
    description,
  };
}

// Calculate NVT Ratio (Network Value to Transactions)
function calculateNVT(marketCap: number, txVolume: number): OnChainMetrics['nvt'] {
  if (txVolume === 0) {
    return {
      ratio: 0,
      signal: 'fair',
      description: 'Unable to calculate - no transaction data',
    };
  }

  const ratio = marketCap / txVolume;

  let signal: OnChainMetrics['nvt']['signal'];
  let description: string;

  if (ratio < 25) {
    signal = 'undervalued';
    description = 'Network utility exceeds valuation. Historically bullish.';
  } else if (ratio < 65) {
    signal = 'fair';
    description = 'Network value aligned with transaction activity.';
  } else {
    signal = 'overvalued';
    description = 'High NVT suggests speculative premium. Caution advised.';
  }

  return { ratio: Math.round(ratio * 10) / 10, signal, description };
}

// Calculate Puell Multiple
function calculatePuellMultiple(dailyRevenue: number, avg365Revenue: number): OnChainMetrics['puellMultiple'] {
  if (avg365Revenue === 0) {
    return {
      value: 0,
      zone: 'neutral',
      description: 'Unable to calculate - insufficient miner data',
    };
  }

  const value = dailyRevenue / avg365Revenue;

  let zone: OnChainMetrics['puellMultiple']['zone'];
  let description: string;

  if (value < 0.5) {
    zone = 'buy';
    description = 'Miners under extreme stress. Historically strong buy zone.';
  } else if (value < 1.2) {
    zone = 'neutral';
    description = 'Miner profitability in normal range.';
  } else {
    zone = 'sell';
    description = 'Miners highly profitable. Distribution pressure likely.';
  }

  return { value: Math.round(value * 100) / 100, zone, description };
}

// Calculate Stock-to-Flow Ratio and Model Price
function calculateStockToFlow(
  circulatingSupply: number,
  currentPrice: number
): OnChainMetrics['stockToFlow'] {
  // Current block reward is 3.125 BTC per block (post-April 2024 halving)
  // ~144 blocks per day = 450 BTC/day = 164,250 BTC/year flow
  const blocksPerDay = 144;
  const blockReward = 3.125;
  const annualFlow = blocksPerDay * blockReward * 365;

  const ratio = circulatingSupply / annualFlow;

  // S2F Model Price (simplified): Price = e^(3.21 * ln(S2F) - 1.60)
  // Based on PlanB's original model coefficients
  const modelPrice = Math.exp(3.21 * Math.log(ratio) - 1.60);

  // Deflection: how far current price is from model price
  const deflection = ((currentPrice - modelPrice) / modelPrice) * 100;

  let signal: OnChainMetrics['stockToFlow']['signal'];
  if (deflection < -30) {
    signal = 'undervalued';
  } else if (deflection > 30) {
    signal = 'overvalued';
  } else {
    signal = 'fair';
  }

  return {
    ratio: Math.round(ratio * 10) / 10,
    modelPrice: Math.round(modelPrice),
    deflection: Math.round(deflection * 10) / 10,
    signal,
  };
}

// Calculate Stablecoin Supply Ratio (SSR)
function calculateSSR(btcMarketCap: number, stablecoinMarketCap: number): OnChainMetrics['ssr'] {
  if (stablecoinMarketCap === 0) {
    return {
      ratio: 0,
      trend: 'neutral',
      description: 'Unable to calculate - no stablecoin data',
    };
  }

  const ratio = btcMarketCap / stablecoinMarketCap;

  let trend: OnChainMetrics['ssr']['trend'];
  let description: string;

  // Lower SSR = more stablecoin buying power relative to BTC
  // Historical ranges: SSR < 5 = high buying power, SSR > 15 = low buying power
  if (ratio < 6) {
    trend = 'bullish';
    description = 'High stablecoin buying power. Dry powder available.';
  } else if (ratio < 12) {
    trend = 'neutral';
    description = 'Moderate stablecoin reserves relative to BTC.';
  } else {
    trend = 'bearish';
    description = 'Low stablecoin buying power. Limited dry powder.';
  }

  return { ratio: Math.round(ratio * 10) / 10, trend, description };
}

// Calculate Reserve Risk
// Reserve Risk = Price / (HODL Bank)
// HODL Bank approximates the opportunity cost of not selling
function calculateReserveRisk(price: number, circulatingSupply: number): OnChainMetrics['reserveRisk'] {
  // Simplified HODL Bank estimation
  // True calculation requires UTXO age data - this is an approximation
  // Using a proxy based on price and supply dynamics

  // Approximate HODL Bank as cumulative "cost" held by long-term holders
  // This is a simplified model - real Reserve Risk needs UTXO data
  const hodlBank = circulatingSupply * price * 0.4; // Assume 40% LTH at avg cost basis of current price

  const value = (price * circulatingSupply) / hodlBank;

  let zone: OnChainMetrics['reserveRisk']['zone'];
  let description: string;

  if (value < 0.002) {
    zone = 'opportunity';
    description = 'Low reserve risk. Strong accumulation signal.';
  } else if (value < 0.008) {
    zone = 'neutral';
    description = 'Moderate reserve risk. Normal market conditions.';
  } else {
    zone = 'risk';
    description = 'High reserve risk. Consider taking profits.';
  }

  return {
    value: Math.round(value * 10000) / 10000,
    zone,
    description,
  };
}

// Calculate NUPL (Net Unrealized Profit/Loss)
// NUPL = (Market Cap - Realized Cap) / Market Cap
function calculateNUPL(marketCap: number, realizedCap: number): OnChainMetrics['nupl'] {
  if (marketCap === 0) {
    return {
      value: 0,
      zone: 'hope',
      description: 'Unable to calculate',
    };
  }

  const value = (marketCap - realizedCap) / marketCap;

  let zone: OnChainMetrics['nupl']['zone'];
  let description: string;

  if (value < 0) {
    zone = 'capitulation';
    description = 'Market in net loss. Historically strong buying opportunity.';
  } else if (value < 0.25) {
    zone = 'hope';
    description = 'Early recovery phase. Accumulation zone.';
  } else if (value < 0.5) {
    zone = 'optimism';
    description = 'Growing confidence. Healthy market sentiment.';
  } else if (value < 0.75) {
    zone = 'belief';
    description = 'Strong conviction. Bull market phase.';
  } else {
    zone = 'euphoria';
    description = 'Extreme greed. Consider taking profits.';
  }

  return {
    value: Math.round(value * 100) / 100,
    zone,
    description,
  };
}

// Estimate Realized Cap (simplified - real calculation needs UTXO data)
function estimateRealizedCap(marketCap: number, price: number): number {
  // Simplified estimation based on typical MVRV patterns
  // In a balanced market, realized cap is roughly 50-60% of market cap
  // This changes with market cycles
  // For a more accurate calculation, we'd need CoinMetrics or Glassnode API
  return marketCap * 0.55;
}

// Save to GitHub
async function saveToGitHub(data: OnChainMetrics): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'data/onchain-metrics.json';
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
    const mvrvInfo = data.mvrv ? `, MVRV ${data.mvrv.ratio}` : '';
    const body: any = {
      message: `Update on-chain metrics: NVT ${data.nvt.ratio}, Puell ${data.puellMultiple.value}, NUPL ${data.nupl.zone}${mvrvInfo}`,
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
  console.log('Calculating on-chain metrics (Sprint 1.2)...');

  // Fetch all required data in parallel
  const [btcData, stablecoinData, txVolume, minerRevenue, activeAddr, txCount, coinMetricsData] = await Promise.all([
    fetchBTCData(),
    fetchStablecoinData(),
    fetchTransactionVolume(),
    fetchMinerRevenue(),
    fetchActiveAddresses(),
    fetchTransactionCount(),
    fetchMVRVFromCoinMetrics(),
  ]);

  if (!btcData.price) {
    return new Response(
      JSON.stringify({ success: false, error: 'Could not fetch BTC data' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Calculate all metrics
  const nvt = calculateNVT(btcData.marketCap, txVolume);
  const puellMultiple = calculatePuellMultiple(minerRevenue.daily, minerRevenue.avg365);
  const stockToFlow = calculateStockToFlow(btcData.circulatingSupply, btcData.price);
  const ssr = calculateSSR(btcData.marketCap, stablecoinData.totalMarketCap);
  const reserveRisk = calculateReserveRisk(btcData.price, btcData.circulatingSupply);

  // Use real MVRV from CoinMetrics if available, otherwise estimate
  let realizedCap: number;
  let nupl: OnChainMetrics['nupl'];
  let mvrv: OnChainMetrics['mvrv'] | undefined;

  if (coinMetricsData && coinMetricsData.mvrv > 0) {
    // Use real CoinMetrics data
    realizedCap = coinMetricsData.realizedCap;
    mvrv = calculateMVRV(coinMetricsData.mvrv, realizedCap);
    nupl = calculateNUPL(btcData.marketCap, realizedCap);
    console.log(`Using real MVRV from CoinMetrics: ${coinMetricsData.mvrv.toFixed(2)}`);
  } else {
    // Fall back to estimated realized cap
    realizedCap = estimateRealizedCap(btcData.marketCap, btcData.price);
    nupl = calculateNUPL(btcData.marketCap, realizedCap);
    console.log('Using estimated realized cap (CoinMetrics unavailable)');
  }

  // Calculate Active Addresses and Transaction Count if available
  let activeAddresses: OnChainMetrics['activeAddresses'] | undefined;
  let transactionCount: OnChainMetrics['transactionCount'] | undefined;

  if (activeAddr.count24h > 0) {
    activeAddresses = calculateActiveAddresses(activeAddr.count24h, activeAddr.change7d);
  }

  if (txCount.count24h > 0) {
    transactionCount = calculateTransactionCount(txCount.count24h, txCount.change7d);
  }

  const metrics: OnChainMetrics = {
    lastUpdated: new Date().toISOString(),
    nvt,
    puellMultiple,
    stockToFlow,
    ssr,
    reserveRisk,
    nupl,
    // Sprint 1.2 additions
    ...(mvrv && { mvrv }),
    ...(activeAddresses && { activeAddresses }),
    ...(transactionCount && { transactionCount }),
  };

  // Log what we computed
  console.log(`Metrics computed: NVT=${nvt.ratio}, Puell=${puellMultiple.value}, NUPL=${nupl.zone}`);
  if (mvrv) console.log(`MVRV=${mvrv.ratio} (${mvrv.zone})`);
  if (activeAddresses) console.log(`Active Addresses=${activeAddresses.count24h} (${activeAddresses.trend})`);

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

// Schedule: runs every 4 hours
export const config: Config = {
  schedule: '30 */4 * * *',
};
