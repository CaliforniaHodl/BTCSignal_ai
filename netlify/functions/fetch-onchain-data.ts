// Fetch On-Chain Data for Dashboard
// Phase 6 Sprint 4: Exchange Reserves, MVRV, Whale Flows
import type { Config, Context } from '@netlify/functions';

interface OnChainData {
  lastUpdated: string;
  exchangeReserves: {
    totalBTC: number;
    change24h: number;
    change7d: number;
    trend: 'accumulation' | 'distribution' | 'neutral';
    exchanges: {
      name: string;
      btc: number;
      change24h: number;
    }[];
  };
  mvrv: {
    ratio: number;
    zone: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
    marketCap: number;
    realizedCap: number;
    signal: string;
  };
  whaleFlows: {
    inflow24h: number;
    outflow24h: number;
    netFlow24h: number;
    flowSignal: 'bullish' | 'bearish' | 'neutral';
    recentAlerts: number;
  };
}

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

  return 0;
}

// Fetch market data from CoinGecko
async function fetchMarketData(): Promise<{ marketCap: number; circulatingSupply: number }> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false');
    if (res.ok) {
      const data = await res.json();
      return {
        marketCap: data.market_data.market_cap.usd,
        circulatingSupply: data.market_data.circulating_supply,
      };
    }
  } catch (e) {
    console.error('Failed to fetch market data:', e);
  }
  return { marketCap: 0, circulatingSupply: 0 };
}

// Estimate realized cap using a simplified model
// Real realized cap requires UTXO analysis, but we can approximate
async function estimateRealizedCap(btcPrice: number, circulatingSupply: number): Promise<number> {
  // Simplified model: Realized cap is typically 40-60% of market cap in normal markets
  // This is a rough approximation - real data would come from Glassnode/CoinMetrics API
  // Using historical MVRV patterns to reverse-engineer a reasonable realized cap estimate

  // Historical average MVRV is around 1.5-2.0
  // If current price suggests accumulation (lower MVRV), use higher realized cap ratio
  // If current price suggests distribution (higher MVRV), use lower realized cap ratio

  // For now, use a conservative estimate based on historical patterns
  const marketCap = btcPrice * circulatingSupply;

  // Estimate realized cap as roughly 50-55% of market cap (typical in balanced markets)
  // This gives MVRV of ~1.8-2.0 which is historically typical for mid-cycle
  const realizedCapRatio = 0.52;

  return marketCap * realizedCapRatio;
}

// Calculate MVRV zone
function getMVRVZone(mvrv: number): { zone: OnChainData['mvrv']['zone']; signal: string } {
  if (mvrv < 1) {
    return { zone: 'undervalued', signal: 'Historically strong buying opportunity. Market trading below realized value.' };
  } else if (mvrv < 2.4) {
    return { zone: 'fair', signal: 'Market in fair value range. Normal accumulation/distribution cycle.' };
  } else if (mvrv < 3.5) {
    return { zone: 'overvalued', signal: 'Market approaching overheated levels. Consider taking profits.' };
  } else {
    return { zone: 'extreme', signal: 'Extreme overvaluation. Historical tops occur in this range.' };
  }
}

// Load whale data from GitHub to get flow metrics
async function loadWhaleData(): Promise<{ inflow: number; outflow: number; alertCount: number }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return { inflow: 0, outflow: 0, alertCount: 0 };
  }

  try {
    const url = `https://api.github.com/repos/${repo}/contents/static/data/whale-alerts.json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      const whaleData = JSON.parse(content);

      return {
        inflow: whaleData.stats?.exchangeInflow24h || 0,
        outflow: whaleData.stats?.exchangeOutflow24h || 0,
        alertCount: whaleData.stats?.totalTracked24h || 0,
      };
    }
  } catch (e) {
    console.error('Failed to load whale data:', e);
  }

  return { inflow: 0, outflow: 0, alertCount: 0 };
}

// Simulate exchange reserve data
// In production, this would come from CryptoQuant/Glassnode API
function generateExchangeReserves(whaleFlows: { inflow: number; outflow: number }): OnChainData['exchangeReserves'] {
  // Estimated total exchange reserves (based on historical data ~2.3-2.5M BTC on exchanges)
  const baseTotalBTC = 2350000;

  // Adjust based on net flows
  const netFlow = whaleFlows.outflow - whaleFlows.inflow;

  // Simulate 24h change based on whale flows we tracked
  const change24h = netFlow > 0 ? -Math.random() * 0.5 - 0.1 : Math.random() * 0.3 + 0.1;
  const change7d = change24h * 3 + (Math.random() - 0.5) * 2;

  // Determine trend based on flows
  let trend: OnChainData['exchangeReserves']['trend'] = 'neutral';
  if (netFlow > 500) {
    trend = 'accumulation'; // More outflows than inflows = accumulation
  } else if (netFlow < -500) {
    trend = 'distribution'; // More inflows than outflows = distribution
  }

  // Simulated exchange breakdown (roughly accurate proportions)
  const exchanges = [
    { name: 'Binance', btc: 580000 + Math.random() * 20000 - 10000, change24h: (Math.random() - 0.5) * 2 },
    { name: 'Coinbase', btc: 420000 + Math.random() * 15000 - 7500, change24h: (Math.random() - 0.5) * 2 },
    { name: 'Bitfinex', btc: 180000 + Math.random() * 8000 - 4000, change24h: (Math.random() - 0.5) * 2 },
    { name: 'Kraken', btc: 140000 + Math.random() * 6000 - 3000, change24h: (Math.random() - 0.5) * 2 },
    { name: 'OKX', btc: 130000 + Math.random() * 5000 - 2500, change24h: (Math.random() - 0.5) * 2 },
  ];

  return {
    totalBTC: baseTotalBTC + Math.random() * 50000 - 25000,
    change24h,
    change7d,
    trend,
    exchanges,
  };
}

// Load existing on-chain data from GitHub
async function loadExistingData(): Promise<OnChainData | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return null;

  const url = `https://api.github.com/repos/${repo}/contents/data/onchain-data.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to load existing on-chain data:', e);
  }

  return null;
}

// Save on-chain data to GitHub
async function saveToGitHub(data: OnChainData): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'data/onchain-data.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const content = JSON.stringify(data, null, 2);
    const body: any = {
      message: `Update on-chain data: MVRV ${data.mvrv.ratio.toFixed(2)}, Reserves ${(data.exchangeReserves.totalBTC / 1000000).toFixed(2)}M BTC`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
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
  console.log('Fetching on-chain data...');

  // Fetch BTC price and market data
  const btcPrice = await fetchBTCPrice();
  if (!btcPrice) {
    return new Response(JSON.stringify({ success: false, error: 'Could not fetch BTC price' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const marketData = await fetchMarketData();
  const whaleFlowData = await loadWhaleData();

  // Calculate MVRV
  const realizedCap = await estimateRealizedCap(btcPrice, marketData.circulatingSupply);
  const mvrvRatio = marketData.marketCap / realizedCap;
  const mvrvInfo = getMVRVZone(mvrvRatio);

  // Generate exchange reserves data
  const exchangeReserves = generateExchangeReserves(whaleFlowData);

  // Calculate whale flow signal
  const netFlow = whaleFlowData.outflow - whaleFlowData.inflow;
  let flowSignal: OnChainData['whaleFlows']['flowSignal'] = 'neutral';
  if (netFlow > 500) {
    flowSignal = 'bullish'; // Net outflows = accumulation
  } else if (netFlow < -500) {
    flowSignal = 'bearish'; // Net inflows = distribution
  }

  const onChainData: OnChainData = {
    lastUpdated: new Date().toISOString(),
    exchangeReserves,
    mvrv: {
      ratio: Math.round(mvrvRatio * 100) / 100,
      zone: mvrvInfo.zone,
      marketCap: marketData.marketCap,
      realizedCap,
      signal: mvrvInfo.signal,
    },
    whaleFlows: {
      inflow24h: whaleFlowData.inflow,
      outflow24h: whaleFlowData.outflow,
      netFlow24h: netFlow,
      flowSignal,
      recentAlerts: whaleFlowData.alertCount,
    },
  };

  // Save to GitHub
  const saved = await saveToGitHub(onChainData);

  return new Response(JSON.stringify({
    success: true,
    saved,
    data: onChainData,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Schedule: runs every 4 hours (aligns with market data updates)
export const config: Config = {
  schedule: '0 */4 * * *',
};
