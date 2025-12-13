// Exchange Flows - Phase 2: Exchange Intelligence
// Aggregates whale tracker data into exchange flow metrics
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

// Fetch previous reserves from cache
async function fetchPreviousReserves(): Promise<ExchangeReserveEstimate[] | undefined> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return undefined;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/data/exchange-flows.json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
      return content.reserves;
    }
  } catch (e) {
    // File might not exist yet
  }

  return undefined;
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

// Save results to GitHub cache
async function saveToGitHub(data: ExchangeFlowsResult): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'data/exchange-flows.json';
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
      message: `Update exchange flows: ${data.flows.flowSignal} (${data.flows.netflow24h >= 0 ? '+' : ''}${data.flows.netflow24h.toFixed(0)} BTC)`,
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

    // Save to GitHub cache
    const saved = await saveToGitHub(result);
    console.log(`Exchange flows saved: ${saved}`);

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
