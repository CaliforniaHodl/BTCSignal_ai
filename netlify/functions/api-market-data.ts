import type { Context } from '@netlify/functions';

// Simple read-only API endpoint for market data
// Returns the latest market snapshot as JSON
// Rate limited by Netlify (125k requests/month on free tier)

interface APIResponse {
  success: boolean;
  timestamp?: string;
  data?: any;
  error?: string;
  _meta?: {
    version: string;
    docs: string;
    rateLimit: string;
  };
}

export default async (req: Request, context: Context) => {
  // CORS headers for public API access
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60', // Cache for 1 minute
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    const response: APIResponse = {
      success: false,
      error: 'Method not allowed. Use GET.',
    };
    return new Response(JSON.stringify(response), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Fetch the static market snapshot
    const snapshotUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'CaliforniaHodl/BTCSignal_ai'}/master/static/data/market-snapshot.json`;

    const snapshotRes = await fetch(snapshotUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!snapshotRes.ok) {
      throw new Error('Failed to fetch market snapshot');
    }

    const snapshot = await snapshotRes.json();

    // Parse query params for filtering
    const url = new URL(req.url);
    const fields = url.searchParams.get('fields');

    let data = snapshot;

    // If specific fields requested, filter response
    if (fields) {
      const requestedFields = fields.split(',').map(f => f.trim());
      data = {};

      for (const field of requestedFields) {
        if (snapshot[field] !== undefined) {
          data[field] = snapshot[field];
        }
      }

      // Always include timestamp
      data.timestamp = snapshot.timestamp;
    }

    const response: APIResponse = {
      success: true,
      timestamp: snapshot.timestamp,
      data: data,
      _meta: {
        version: '1.0',
        docs: 'https://btcsignal.ai/api-docs/',
        rateLimit: 'Netlify free tier: 125k requests/month',
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: any) {
    const response: APIResponse = {
      success: false,
      error: error.message || 'Internal server error',
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

// No schedule - this is an on-demand function
