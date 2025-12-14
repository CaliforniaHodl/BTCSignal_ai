// CoinMetrics Community API - FREE real on-chain data
// https://docs.coinmetrics.io/api/v4
// Rate limit: 10 requests per 6 seconds (plenty for our needs)

const COINMETRICS_BASE = 'https://community-api.coinmetrics.io/v4';

export interface RealizedCapData {
  timestamp: string;
  realizedCap: number;
  source: 'coinmetrics';
}

export interface MVRVData {
  mvrv: number;
  marketCap: number;
  realizedCap: number;
  zone: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
  signal: string;
  source: 'real';
}

// Cache to avoid hitting rate limits
let realizedCapCache: { data: RealizedCapData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache (realized cap doesn't change fast)

/**
 * Fetch real realized cap from CoinMetrics Community API
 */
export async function fetchRealizedCap(): Promise<RealizedCapData | null> {
  // Return cached data if fresh
  if (realizedCapCache.data && Date.now() - realizedCapCache.timestamp < CACHE_TTL) {
    return realizedCapCache.data;
  }

  try {
    // CoinMetrics asset metrics endpoint
    const url = `${COINMETRICS_BASE}/timeseries/asset-metrics?assets=btc&metrics=CapRealUSD&frequency=1d&limit_per_asset=1`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`CoinMetrics returned ${res.status}`);
    }

    const json = await res.json();

    if (!json.data || json.data.length === 0) {
      throw new Error('No data returned from CoinMetrics');
    }

    const latest = json.data[json.data.length - 1];
    const realizedCap = parseFloat(latest.CapRealUSD);

    const data: RealizedCapData = {
      timestamp: latest.time,
      realizedCap,
      source: 'coinmetrics',
    };

    // Update cache
    realizedCapCache = { data, timestamp: Date.now() };

    console.log(`Fetched real realized cap from CoinMetrics: $${(realizedCap / 1e9).toFixed(2)}B`);
    return data;
  } catch (error: any) {
    console.error('CoinMetrics fetch error:', error.message);

    // Return stale cache if available
    if (realizedCapCache.data) {
      console.log('Using stale realized cap cache');
      return realizedCapCache.data;
    }

    return null;
  }
}

/**
 * Calculate REAL MVRV using:
 * - Real total supply from personal node
 * - Real realized cap from CoinMetrics
 * - Current price from any source
 */
export async function calculateRealMVRV(
  totalSupply: number,
  currentPrice: number
): Promise<MVRVData | null> {
  const realizedCapData = await fetchRealizedCap();

  if (!realizedCapData) {
    console.error('Could not fetch realized cap for MVRV calculation');
    return null;
  }

  const marketCap = totalSupply * currentPrice;
  const realizedCap = realizedCapData.realizedCap;
  const mvrv = marketCap / realizedCap;

  // Determine zone and signal
  let zone: MVRVData['zone'];
  let signal: string;

  if (mvrv < 1) {
    zone = 'undervalued';
    signal = 'Market trading below realized value - historically strong buying opportunity';
  } else if (mvrv < 2.4) {
    zone = 'fair';
    signal = 'Market in fair value range - normal accumulation/distribution cycle';
  } else if (mvrv < 3.5) {
    zone = 'overvalued';
    signal = 'Market approaching overheated levels - consider taking profits';
  } else {
    zone = 'extreme';
    signal = 'Extreme overvaluation - historical cycle tops occur in this range';
  }

  return {
    mvrv: Math.round(mvrv * 100) / 100,
    marketCap,
    realizedCap,
    zone,
    signal,
    source: 'real',
  };
}

/**
 * Fetch additional on-chain metrics from CoinMetrics
 */
export async function fetchOnChainMetrics(): Promise<any> {
  try {
    const metrics = [
      'CapRealUSD',      // Realized Cap
      'CapMVRVCur',      // MVRV (they calculate it too, for comparison)
      'NVTAdj',          // NVT Ratio
      'SplyAct1d',       // Active Supply (1 day)
      'TxCnt',           // Transaction Count
      'FeeTotUSD',       // Total Fees USD
    ].join(',');

    const url = `${COINMETRICS_BASE}/timeseries/asset-metrics?assets=btc&metrics=${metrics}&frequency=1d&limit_per_asset=1`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`CoinMetrics returned ${res.status}`);
    }

    const json = await res.json();
    return json.data?.[0] || null;
  } catch (error: any) {
    console.error('CoinMetrics metrics fetch error:', error.message);
    return null;
  }
}
