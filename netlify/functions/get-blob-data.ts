// API endpoint to serve data from Netlify Blob storage
// This replaces static JSON files that were triggering builds
import type { Context } from '@netlify/functions';
import { loadFromBlob, listBlobs, BlobKey } from './lib/blob-storage';

const VALID_KEYS: BlobKey[] = [
  'exchange-flows',
  'cohort-metrics',
  'profitability-metrics',
  'onchain-metrics',
  'onchain-data',
  'market-snapshot',
  'derivatives-advanced',
  'price-models',
  'signal-history',
  'historical-calls',
  'whale-alerts',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60', // Cache for 1 minute
};

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key') as BlobKey | null;

  // List all available keys
  if (!key || key === 'list') {
    const blobs = await listBlobs();
    return new Response(JSON.stringify({
      success: true,
      available: VALID_KEYS,
      stored: blobs,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Validate key
  if (!VALID_KEYS.includes(key)) {
    return new Response(JSON.stringify({
      success: false,
      error: `Invalid key. Valid keys: ${VALID_KEYS.join(', ')}`,
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Load data from blob
  const data = await loadFromBlob(key);

  if (data === null) {
    return new Response(JSON.stringify({
      success: false,
      error: `No data found for key: ${key}`,
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    key,
    data,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
};
