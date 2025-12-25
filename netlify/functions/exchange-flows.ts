// Exchange Flows - Phase 2: Exchange Intelligence
// Aggregates whale tracker data into exchange flow metrics
// Updated: Now uses Netlify Blob storage instead of GitHub commits to avoid build triggers
import type { Config, Context } from '@netlify/functions';
import {
  analyzeExchangeFlows,
  estimateExchangeReserves,
  calculateFundFlowRatio,
  generateExchangeFlowSignals,
  ExchangeFlowData,
  ExchangeReserveEstimate,
} from './lib/exchange-analyzer';
import { WhaleAlert } from './lib/tweet-generator';
import { saveToBlob, loadFromBlob } from './lib/blob-storage';

interface ExchangeFlowsResult {
  lastUpdated: string;
  flows: ExchangeFlowData;
  reserves: ExchangeReserveEstimate[];
  fundFlowRatio: { ratio: number; interpretation: string };
  signals: {
    signal: 'bullish' | 'bearish' | 'neutral';
    weight: number;
    factors: string[];
  };
}

// Fetch whale alert data from GitHub cache
async function fetchWhaleData(): Promise<WhaleAlert[]> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set');
    return [];
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
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
      return content.alerts || [];
    }
  } catch (e: any) {
    console.error('Failed to fetch whale data:', e.message);
  }

  return [];
}

// Fetch previous reserves from Blob storage
async function fetchPreviousReserves(): Promise<ExchangeReserveEstimate[] | undefined> {
  try {
    const data = await loadFromBlob<ExchangeFlowsResult>('exchange-flows');
    return data?.reserves;
  } catch (e) {
    // Data might not exist yet
    return undefined;
  }
}

// Fetch total on-chain volume from blockchain.info
async function fetchOnChainVolume(): Promise<number> {
  try {
    const res = await fetch('https://api.blockchain.info/stats');
    if (res.ok) {
      const data = await res.json();
      // trade_volume_btc is daily volume
      return data.trade_volume_btc || 0;
    }
  } catch (e: any) {
    console.error('Failed to fetch on-chain volume:', e.message);
  }
  return 0;
}

// Save results to Netlify Blob storage (no GitHub commits = no build triggers!)
async function saveToBlobStorage(data: ExchangeFlowsResult): Promise<boolean> {
  return saveToBlob('exchange-flows', data);
}

export default async (req: Request, context: Context) => {
  console.log('Exchange Flows: Analyzing exchange intelligence...');

  try {
    // Fetch data in parallel
    const [whaleAlerts, previousReserves, onChainVolume] = await Promise.all([
      fetchWhaleData(),
      fetchPreviousReserves(),
      fetchOnChainVolume(),
    ]);

    console.log(`Loaded ${whaleAlerts.length} whale alerts`);

    // Analyze exchange flows
    const flows = analyzeExchangeFlows(whaleAlerts);
    console.log(`Exchange flows: ${flows.flowSignal} (netflow: ${flows.netflow24h.toFixed(0)} BTC)`);

    // Estimate reserves
    const reserves = estimateExchangeReserves(flows, previousReserves);

    // Calculate fund flow ratio
    const exchangeVolume = flows.inflow24h + flows.outflow24h;
    const fundFlowRatio = calculateFundFlowRatio(exchangeVolume, onChainVolume);

    // Generate signals
    const signals = generateExchangeFlowSignals(flows);

    const result: ExchangeFlowsResult = {
      lastUpdated: new Date().toISOString(),
      flows,
      reserves,
      fundFlowRatio,
      signals,
    };

    // Save to Blob storage (no build trigger!)
    const saved = await saveToBlobStorage(result);
    console.log(`Exchange flows saved to Blob: ${saved}`);

    return new Response(JSON.stringify({
      success: true,
      saved,
      data: result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Exchange flows error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Schedule: runs every 30 minutes
export const config: Config = {
  schedule: '*/30 * * * *',
};
