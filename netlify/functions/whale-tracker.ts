import type { Config, Context } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';
import { generateSingleWhaleAlert } from './lib/tweet-generator';

// Whale alert structure
interface WhaleAlert {
  id: string;
  timestamp: string;
  txid: string;
  type: 'exchange_deposit' | 'exchange_withdrawal' | 'whale_transfer' | 'dormant_wallet';
  amount_btc: number;
  amount_usd: number;
  confidence: 'high' | 'medium' | 'low';
  from_type: string;
  to_type: string;
  analysis: string;
}

interface WhaleData {
  lastUpdated: string;
  alerts: WhaleAlert[];
  stats: {
    totalTracked24h: number;
    largestTx24h: number;
    exchangeInflow24h: number;
    exchangeOutflow24h: number;
  };
}

// Known exchange addresses (partial list - major exchanges cold/hot wallets)
const KNOWN_EXCHANGES: Record<string, string> = {
  // Binance
  '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo': 'Binance',
  'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97': 'Binance',
  '3JZq4atUahhuA9rLhXLMhhTo133J9rF97j': 'Binance',
  '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s': 'Binance',

  // Coinbase
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh': 'Coinbase',
  '3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS': 'Coinbase',
  '1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g': 'Coinbase',

  // Kraken
  'bc1qa5wkgaew2dkv56kfvj49j0av5nml45x9ek9hz6': 'Kraken',
  '3AfSvBkWHLZH4XnPPMXEqrvoT4CtDMuWhk': 'Kraken',

  // Bitfinex
  'bc1qgxj7pc9npqntgv7w39h72y5lnppyqz05xhgm3e': 'Bitfinex',
  '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r': 'Bitfinex',

  // Huobi/HTX
  '1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ': 'HTX',
  '1AC4fMwgY8j9onSbXEWeH6Zan8QGMSdmtA': 'HTX',

  // OKX
  'bc1q2s3rjwvam9dt2ftt4sqxqjf3twav0gdnv0z5jk': 'OKX',

  // Bybit
  'bc1qjasf9z3h7w3jspkhtgatgpyvvzgpa2wwd2lr0eh5tx44reyn2k7sfc27a4': 'Bybit',

  // Gemini
  '3D8qAoMkZ8F1b3bCcCuWAHqD7ZvXvqoHKq': 'Gemini',
};

// Known cold storage / institutional wallets to filter out
const COLD_WALLETS: string[] = [
  '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', // Binance cold
  'bc1qazcm763858nkj2dj986etajv6wquslv8uxwczt', // MicroStrategy
  '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', // Grayscale
  '35pgGeez3ou6ofrpjt8T7bvC9t6RrUK4p6', // BitGo
];

// BTC price cache
let btcPriceUSD = 0;

// Fetch current BTC price
async function fetchBTCPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await res.json();
    return parseFloat(data.price);
  } catch (e) {
    console.error('Failed to fetch BTC price:', e);
    return 0;
  }
}

// Check if address is known exchange
function isExchange(address: string): string | null {
  if (!address) return null;

  // Direct match
  if (KNOWN_EXCHANGES[address]) {
    return KNOWN_EXCHANGES[address];
  }

  // Prefix matching for exchange clusters
  const exchangePrefixes: Record<string, string> = {
    '1NDyJ': 'Binance',
    '3Kzh9': 'Coinbase',
    '1Kr6Q': 'Coinbase',
    'bc1qxy2': 'Coinbase',
    'bc1qa5wk': 'Kraken',
    'bc1qgxj7': 'Bitfinex',
  };

  for (const [prefix, exchange] of Object.entries(exchangePrefixes)) {
    if (address.startsWith(prefix)) {
      return exchange;
    }
  }

  return null;
}

// Check if this is a cold wallet transfer (should filter out)
function isColdWalletTransfer(inputAddrs: string[], outputAddrs: string[]): boolean {
  return [...inputAddrs, ...outputAddrs].some(addr => COLD_WALLETS.includes(addr));
}

// Check for "round number" heuristic (retail usually sends round amounts)
function hasRoundAmount(amountBTC: number): boolean {
  // Check if it's a suspiciously round number like 1.0, 10.0, 100.0
  const str = amountBTC.toFixed(8);
  const decimals = str.split('.')[1] || '';
  const nonZeroDecimals = decimals.replace(/0+$/, '').length;

  // Very round numbers (0-1 significant decimal) are more likely retail
  return nonZeroDecimals <= 1 && amountBTC < 100;
}

// Analyze a transaction and determine if it's whale-worthy
function analyzeTransaction(tx: any): WhaleAlert | null {
  // Calculate total output value (in satoshis)
  const totalValueSats = tx.vout?.reduce((sum: number, out: any) => sum + (out.value || 0), 0) || 0;
  const totalValueBTC = totalValueSats / 100000000;

  // Filter: minimum 500 BTC
  if (totalValueBTC < 500) {
    return null;
  }

  // Get input addresses
  const inputAddrs: string[] = tx.vin?.map((v: any) => v.prevout?.scriptpubkey_address).filter(Boolean) || [];

  // Get output addresses
  const outputAddrs: string[] = tx.vout?.map((v: any) => v.scriptpubkey_address).filter(Boolean) || [];

  // Filter: skip cold wallet shuffling
  if (isColdWalletTransfer(inputAddrs, outputAddrs)) {
    console.log(`Skipping cold wallet transfer: ${tx.txid.substring(0, 8)}...`);
    return null;
  }

  // Filter: skip likely retail round amounts under 100 BTC
  if (hasRoundAmount(totalValueBTC) && totalValueBTC < 100) {
    return null;
  }

  // Determine transaction type
  let type: WhaleAlert['type'] = 'whale_transfer';
  let fromType = 'Unknown';
  let toType = 'Unknown';
  let confidence: WhaleAlert['confidence'] = 'medium';
  let analysis = '';

  // Check inputs for exchange origin
  const inputExchange = inputAddrs.map(isExchange).find(Boolean);
  if (inputExchange) {
    fromType = inputExchange;
  }

  // Check outputs for exchange destination
  const outputExchange = outputAddrs.map(isExchange).find(Boolean);
  if (outputExchange) {
    toType = outputExchange;
  }

  // Classify transaction
  if (inputExchange && !outputExchange) {
    type = 'exchange_withdrawal';
    analysis = `${totalValueBTC.toFixed(2)} BTC withdrawn from ${inputExchange}. Large withdrawals often indicate institutional accumulation or OTC deals.`;
    confidence = 'high';
  } else if (!inputExchange && outputExchange) {
    type = 'exchange_deposit';
    analysis = `${totalValueBTC.toFixed(2)} BTC deposited to ${outputExchange}. Large deposits may signal intent to sell - watch for increased selling pressure.`;
    confidence = 'high';
  } else if (inputExchange && outputExchange) {
    if (inputExchange === outputExchange) {
      // Internal transfer, skip
      return null;
    }
    analysis = `${totalValueBTC.toFixed(2)} BTC moved from ${inputExchange} to ${outputExchange}. Cross-exchange arbitrage or portfolio rebalancing.`;
    confidence = 'medium';
  } else {
    // Check for UTXO patterns suggesting dormant wallet
    const inputCount = tx.vin?.length || 0;

    if (inputCount === 1) {
      type = 'dormant_wallet';
      analysis = `${totalValueBTC.toFixed(2)} BTC moved from single UTXO. Could be dormant wallet awakening - significant if wallet was inactive for extended period.`;
      confidence = 'medium';
    } else if (inputCount > 10) {
      analysis = `${totalValueBTC.toFixed(2)} BTC consolidated from ${inputCount} inputs. UTXO consolidation often precedes large moves.`;
      confidence = 'low';
    } else {
      analysis = `${totalValueBTC.toFixed(2)} BTC whale transfer detected. Destination unknown - monitor for follow-up activity.`;
      confidence = 'medium';
    }
  }

  const amountUSD = totalValueBTC * btcPriceUSD;

  return {
    id: `whale_${tx.txid.substring(0, 12)}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    txid: tx.txid,
    type,
    amount_btc: Math.round(totalValueBTC * 100) / 100,
    amount_usd: Math.round(amountUSD),
    confidence,
    from_type: fromType,
    to_type: toType,
    analysis,
  };
}

// Fetch recent mempool transactions
async function fetchMempoolTransactions(): Promise<any[]> {
  try {
    // Get recent unconfirmed transactions
    const res = await fetch('https://mempool.space/api/mempool/recent');
    if (!res.ok) {
      console.error('Mempool API error:', res.status);
      return [];
    }

    const recentTxs = await res.json();

    // Filter for large transactions (value > 50B sats = 500 BTC)
    const largeTxIds = recentTxs
      .filter((tx: any) => tx.value > 50000000000) // 500 BTC in satoshis
      .map((tx: any) => tx.txid);

    if (largeTxIds.length === 0) {
      // Also check recent blocks for confirmed large txs
      const blocksRes = await fetch('https://mempool.space/api/blocks');
      if (blocksRes.ok) {
        const blocks = await blocksRes.json();
        if (blocks.length > 0) {
          const blockTxsRes = await fetch(`https://mempool.space/api/block/${blocks[0].id}/txs/0`);
          if (blockTxsRes.ok) {
            const blockTxs = await blockTxsRes.json();
            // Find large transactions in recent block
            return blockTxs.filter((tx: any) => {
              const totalValue = tx.vout?.reduce((sum: number, out: any) => sum + (out.value || 0), 0) || 0;
              return totalValue > 50000000000; // 500 BTC
            }).slice(0, 5);
          }
        }
      }
      return [];
    }

    // Fetch full transaction details for large txs
    const txDetails = await Promise.all(
      largeTxIds.slice(0, 10).map(async (txid: string) => {
        try {
          const txRes = await fetch(`https://mempool.space/api/tx/${txid}`);
          if (txRes.ok) {
            return txRes.json();
          }
        } catch (e) {
          console.error(`Failed to fetch tx ${txid}:`, e);
        }
        return null;
      })
    );

    return txDetails.filter(Boolean);
  } catch (error) {
    console.error('Failed to fetch mempool transactions:', error);
    return [];
  }
}

// Load existing whale data from GitHub
async function loadExistingData(): Promise<WhaleData | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return null;

  const url = `https://api.github.com/repos/${repo}/contents/static/data/whale-alerts.json`;

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
    console.error('Failed to load existing whale data:', e);
  }

  return null;
}

// Save whale data to GitHub
async function saveToGitHub(data: WhaleData): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'static/data/whale-alerts.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file SHA if exists
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      sha = existingData.sha;
    }

    // Save updated file
    const content = JSON.stringify(data, null, 2);
    const body: any = {
      message: `Whale tracker update: ${data.alerts.length} alerts`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`Whale alerts saved to GitHub: ${data.alerts.length} alerts`);
      return true;
    } else {
      const error = await res.json();
      console.error('GitHub API error:', error);
      return false;
    }
  } catch (error: any) {
    console.error('Failed to save to GitHub:', error.message);
    return false;
  }
}

// Tweet a whale alert immediately
async function tweetWhaleAlert(alert: WhaleAlert): Promise<{ success: boolean; tweetId?: string }> {
  // Use whale account credentials if available, otherwise fall back to main account
  const apiKey = process.env.WHALE_TWITTER_API_KEY || process.env.TWITTER_API_KEY;
  const apiSecret = process.env.WHALE_TWITTER_API_SECRET || process.env.TWITTER_API_SECRET;
  const accessToken = process.env.WHALE_TWITTER_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.WHALE_TWITTER_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('Twitter credentials not configured, skipping tweet');
    return { success: false };
  }

  // Only tweet high/medium confidence alerts
  if (alert.confidence === 'low') {
    console.log('Skipping low confidence alert');
    return { success: false };
  }

  const tweetText = generateSingleWhaleAlert(alert);
  if (!tweetText) {
    return { success: false };
  }

  try {
    const twitterClient = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    const result = await twitterClient.v2.tweet(tweetText);
    console.log(`🐦 Tweeted whale alert: ${alert.amount_btc} BTC - Tweet ID: ${result.data.id}`);
    return { success: true, tweetId: result.data.id };
  } catch (error: any) {
    console.error('Failed to tweet whale alert:', error.message);
    return { success: false };
  }
}

export default async (req: Request, context: Context) => {
  console.log('🐋 Whale Tracker running...');

  // Fetch BTC price first
  btcPriceUSD = await fetchBTCPrice();
  if (!btcPriceUSD) {
    return new Response(JSON.stringify({ success: false, error: 'Could not fetch BTC price' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  console.log(`BTC Price: $${btcPriceUSD.toLocaleString()}`);

  // Load existing data
  const existingData = await loadExistingData();
  const existingAlerts = existingData?.alerts || [];
  const existingTxIds = new Set(existingAlerts.map(a => a.txid));

  // Fetch and analyze mempool transactions
  const transactions = await fetchMempoolTransactions();
  console.log(`Found ${transactions.length} large transactions to analyze`);

  const newAlerts: WhaleAlert[] = [];
  const tweetedAlerts: { alertId: string; tweetId?: string }[] = [];

  for (const tx of transactions) {
    // Skip if we've already processed this tx
    if (existingTxIds.has(tx.txid)) {
      continue;
    }

    const alert = analyzeTransaction(tx);
    if (alert) {
      newAlerts.push(alert);
      console.log(`🚨 New whale alert: ${alert.type} - ${alert.amount_btc} BTC ($${alert.amount_usd.toLocaleString()})`);

      // Tweet immediately for significant alerts (high/medium confidence)
      if (alert.confidence !== 'low') {
        const tweetResult = await tweetWhaleAlert(alert);
        if (tweetResult.success) {
          tweetedAlerts.push({ alertId: alert.id, tweetId: tweetResult.tweetId });
        }
      }
    }
  }

  // Combine with existing alerts, keep last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentAlerts = [...newAlerts, ...existingAlerts]
    .filter(a => a.timestamp > twentyFourHoursAgo)
    .slice(0, 50); // Keep max 50 alerts

  // Calculate 24h stats
  const stats = {
    totalTracked24h: recentAlerts.length,
    largestTx24h: Math.max(...recentAlerts.map(a => a.amount_btc), 0),
    exchangeInflow24h: recentAlerts
      .filter(a => a.type === 'exchange_deposit')
      .reduce((sum, a) => sum + a.amount_btc, 0),
    exchangeOutflow24h: recentAlerts
      .filter(a => a.type === 'exchange_withdrawal')
      .reduce((sum, a) => sum + a.amount_btc, 0),
  };

  const whaleData: WhaleData = {
    lastUpdated: new Date().toISOString(),
    alerts: recentAlerts,
    stats,
  };

  // Save to GitHub
  const saved = await saveToGitHub(whaleData);

  return new Response(JSON.stringify({
    success: true,
    saved,
    newAlerts: newAlerts.length,
    totalAlerts: recentAlerts.length,
    tweetedAlerts: tweetedAlerts.length,
    tweets: tweetedAlerts,
    stats,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Schedule: DISABLED - was running every 5 minutes
// export const config: Config = {
//   schedule: '*/5 * * * *',
// };
