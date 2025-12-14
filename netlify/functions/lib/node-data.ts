// Fetch real Bitcoin data from personal node via JSONBin
// Data pushed every 15 minutes from Raspberry Pi 5 running Bitcoin Knots

const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/693e4065d0ea881f4027feac/latest';

export interface NodeData {
  timestamp: number;
  block_height: number;
  mempool_size: number;
  mempool_bytes: number;
  mempool_fees_btc: number;
  hashrate: number;
  difficulty: number;
  utxo?: {
    total_supply: number;
    txout_count: number;
    disk_size: number;
    last_updated: number;
  };
}

export interface NodeDataResponse {
  success: boolean;
  data: NodeData | null;
  source: 'personal-node' | 'fallback';
  error?: string;
}

// Cache to avoid hammering JSONBin
let cachedData: NodeData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

export async function fetchNodeData(): Promise<NodeDataResponse> {
  // Return cached data if fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return {
      success: true,
      data: cachedData,
      source: 'personal-node',
    };
  }

  try {
    const res = await fetch(JSONBIN_URL, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`JSONBin returned ${res.status}`);
    }

    const json = await res.json();
    const data = json.record as NodeData;

    // Validate the data isn't too stale (more than 30 minutes old)
    const dataAge = Date.now() / 1000 - data.timestamp;
    if (dataAge > 30 * 60) {
      console.warn(`Node data is ${Math.round(dataAge / 60)} minutes old`);
    }

    // Update cache
    cachedData = data;
    cacheTimestamp = Date.now();

    return {
      success: true,
      data,
      source: 'personal-node',
    };
  } catch (error: any) {
    console.error('Failed to fetch node data:', error.message);
    return {
      success: false,
      data: cachedData, // Return stale cache if available
      source: 'fallback',
      error: error.message,
    };
  }
}

// Format hashrate for display (e.g., "945.5 EH/s")
export function formatHashrate(hashrate: number): string {
  if (hashrate >= 1e21) {
    return `${(hashrate / 1e21).toFixed(2)} ZH/s`;
  } else if (hashrate >= 1e18) {
    return `${(hashrate / 1e18).toFixed(2)} EH/s`;
  } else if (hashrate >= 1e15) {
    return `${(hashrate / 1e15).toFixed(2)} PH/s`;
  } else if (hashrate >= 1e12) {
    return `${(hashrate / 1e12).toFixed(2)} TH/s`;
  }
  return `${hashrate.toFixed(0)} H/s`;
}

// Format mempool fees (e.g., "0.0123 BTC")
export function formatMempoolFees(btc: number): string {
  return `${btc.toFixed(4)} BTC`;
}

// Get mempool congestion level
export function getMempoolCongestion(size: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (size < 5000) return 'low';
  if (size < 20000) return 'medium';
  if (size < 50000) return 'high';
  return 'extreme';
}
