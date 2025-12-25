// Fetch On-Chain Data for Dashboard
// Phase 6 Sprint 4: Exchange Reserves, MVRV, Whale Flows
// Updated: Now uses REAL data from personal Bitcoin node (Raspberry Pi 5 + Knots)
// + CoinMetrics Community API for real realized cap
// Updated: Now uses Netlify Blob storage instead of GitHub commits
import type { Config, Context } from '@netlify/functions';
import { fetchNodeData, formatHashrate, getMempoolCongestion } from './lib/node-data';
import { calculateRealMVRV, fetchRealizedCap } from './lib/coinmetrics';
import { saveToBlob } from './lib/shared';

interface OnChainData {
  lastUpdated: string;
  // Real data from personal Bitcoin node (Raspberry Pi 5 + Bitcoin Knots)
  nodeData: {
    source: 'personal-node' | 'fallback';
    blockHeight: number;
    hashrate: number;
    hashrateFormatted: string;
    difficulty: number;
    mempool: {
      size: number;
      bytes: number;
      feesBTC: number;
      congestion: 'low' | 'medium' | 'high' | 'extreme';
    };
    utxo?: {
      totalSupply: number;
      txoutCount: number;
    };
    lastNodeUpdate: number;
  };
  // Real MVRV from CoinMetrics + personal node supply
  mvrv: {
    ratio: number;
    zone: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
    marketCap: number;
    realizedCap: number;
    signal: string;
    source: 'real' | 'estimated';
  };
  // NOTE: Exchange reserves removed - was fake/simulated data
  // We only show real data now. Exchange reserves require paid APIs (CryptoQuant/Glassnode)
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

// REMOVED: loadWhaleData - was loading fake/simulated whale data
// Whale watching now done via personal node mempool (see whale-watch.sh on Pi)

// REMOVED: Fake exchange reserve data
// Exchange reserves require paid APIs (CryptoQuant, Glassnode, etc.)
// We only show real data now - honesty over fake metrics

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

// Save to Netlify Blob storage (no GitHub commits = no build triggers!)
async function saveToBlobStorage(data: OnChainData): Promise<boolean> {
  return saveToBlob('onchain-data', data);
}

export default async (req: Request, context: Context) => {
  console.log('Fetching on-chain data (with real node data)...');

  // NEW: Fetch real data from personal Bitcoin node
  const nodeResponse = await fetchNodeData();
  console.log(`Node data source: ${nodeResponse.source}`);

  // Fetch BTC price and market data
  const btcPrice = await fetchBTCPrice();
  if (!btcPrice) {
    return new Response(JSON.stringify({ success: false, error: 'Could not fetch BTC price' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const marketData = await fetchMarketData();

  // Calculate REAL MVRV using:
  // - Real total supply from personal node (if available)
  // - Real realized cap from CoinMetrics
  const nodeData = nodeResponse.data;
  const realSupply = nodeData?.utxo?.total_supply || marketData.circulatingSupply;

  // Try to get real MVRV first
  let mvrvData = await calculateRealMVRV(realSupply, btcPrice);
  let mvrvSource = 'real';

  // Fallback to estimated if CoinMetrics fails
  if (!mvrvData) {
    console.log('Falling back to estimated MVRV');
    const realizedCap = await estimateRealizedCap(btcPrice, marketData.circulatingSupply);
    const mvrvRatio = marketData.marketCap / realizedCap;
    const mvrvInfo = getMVRVZone(mvrvRatio);
    mvrvData = {
      mvrv: Math.round(mvrvRatio * 100) / 100,
      marketCap: marketData.marketCap,
      realizedCap,
      zone: mvrvInfo.zone,
      signal: mvrvInfo.signal,
      source: 'estimated' as const,
    };
    mvrvSource = 'estimated';
  }

  console.log(`MVRV source: ${mvrvSource}, value: ${mvrvData.mvrv}`);

  // Build node data section (REAL data from personal Bitcoin node!)
  const nodeDataSection: OnChainData['nodeData'] = {
    source: nodeResponse.source,
    blockHeight: nodeData?.block_height || 0,
    hashrate: nodeData?.hashrate || 0,
    hashrateFormatted: nodeData ? formatHashrate(nodeData.hashrate) : 'N/A',
    difficulty: nodeData?.difficulty || 0,
    mempool: {
      size: nodeData?.mempool_size || 0,
      bytes: nodeData?.mempool_bytes || 0,
      feesBTC: nodeData?.mempool_fees_btc || 0,
      congestion: nodeData ? getMempoolCongestion(nodeData.mempool_size) : 'low',
    },
    utxo: nodeData?.utxo ? {
      totalSupply: nodeData.utxo.total_supply,
      txoutCount: nodeData.utxo.txout_count,
    } : undefined,
    lastNodeUpdate: nodeData?.timestamp || 0,
  };

  const onChainData: OnChainData = {
    lastUpdated: new Date().toISOString(),
    nodeData: nodeDataSection,
    mvrv: {
      ratio: mvrvData.mvrv,
      zone: mvrvData.zone,
      marketCap: mvrvData.marketCap,
      realizedCap: mvrvData.realizedCap,
      signal: mvrvData.signal,
      source: mvrvSource as 'real' | 'estimated',
    },
  };

  // Save to GitHub
  const saved = await saveToBlobStorage(onChainData);

  return new Response(JSON.stringify({
    success: true,
    saved,
    nodeSource: nodeResponse.source,
    data: onChainData,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Note: Schedule removed - data now saved to Blob storage on-demand
