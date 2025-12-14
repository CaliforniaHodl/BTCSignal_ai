// API endpoint for real Bitcoin node data
// Data source: Personal Raspberry Pi 5 running Bitcoin Knots
// Updated every 15 minutes via cron job

import type { Context } from '@netlify/functions';
import { fetchNodeData, formatHashrate, getMempoolCongestion } from './lib/node-data';

export default async (req: Request, context: Context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const nodeResponse = await fetchNodeData();

  if (!nodeResponse.success || !nodeResponse.data) {
    return new Response(JSON.stringify({
      success: false,
      error: nodeResponse.error || 'Failed to fetch node data',
      source: nodeResponse.source,
    }), {
      status: 503,
      headers: corsHeaders,
    });
  }

  const data = nodeResponse.data;
  const dataAge = Math.round((Date.now() / 1000 - data.timestamp) / 60);

  return new Response(JSON.stringify({
    success: true,
    source: 'personal-node',
    dataAgeMinutes: dataAge,
    node: {
      software: 'Bitcoin Knots 28.1.0',
      hardware: 'Raspberry Pi 5 (4GB)',
      location: 'Personal node',
    },
    data: {
      blockHeight: data.block_height,
      hashrate: data.hashrate,
      hashrateFormatted: formatHashrate(data.hashrate),
      difficulty: data.difficulty,
      mempool: {
        transactions: data.mempool_size,
        sizeBytes: data.mempool_bytes,
        sizeMB: (data.mempool_bytes / 1024 / 1024).toFixed(2),
        totalFeesBTC: data.mempool_fees_btc,
        congestion: getMempoolCongestion(data.mempool_size),
      },
      timestamp: data.timestamp,
      timestampISO: new Date(data.timestamp * 1000).toISOString(),
    },
    _meta: {
      updateFrequency: '15 minutes',
      dataSource: 'bitcoin-cli via JSONBin cache',
    },
  }), {
    status: 200,
    headers: corsHeaders,
  });
};
