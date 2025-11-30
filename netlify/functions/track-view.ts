import type { Context } from '@netlify/functions';

// Simple page view counter using Netlify Blobs REST API
// No rebuilds, no IP addresses - just page: count pairs

const SITE_ID = process.env.SITE_ID || '';
const NETLIFY_TOKEN = process.env.NETLIFY_API_TOKEN || '';
const STORE_NAME = 'page-views';
const BLOB_KEY = 'counts';

export default async (req: Request, context: Context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (!SITE_ID || !NETLIFY_TOKEN) {
    console.error('Missing SITE_ID or NETLIFY_API_TOKEN');
    return new Response(JSON.stringify({ error: 'Server config error' }), {
      status: 500,
      headers,
    });
  }

  // GET = return current stats
  if (req.method === 'GET') {
    try {
      const stats = await getStats();
      return new Response(JSON.stringify(stats), { status: 200, headers });
    } catch (error) {
      return new Response(JSON.stringify({}), { status: 200, headers });
    }
  }

  // POST = increment page view
  if (req.method === 'POST') {
    try {
      const { page } = await req.json();

      if (!page || typeof page !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid page' }), {
          status: 400,
          headers,
        });
      }

      const pageName = sanitizePageName(page);

      // Get current stats
      let stats = await getStats();

      // Increment
      stats[pageName] = (stats[pageName] || 0) + 1;

      // Save
      await saveStats(stats);

      return new Response(JSON.stringify({ success: true, page: pageName }), {
        status: 200,
        headers,
      });

    } catch (error: any) {
      console.error('Track view error:', error);
      return new Response(JSON.stringify({ error: 'Tracking failed' }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers,
  });
};

async function getStats(): Promise<Record<string, number>> {
  try {
    const url = `https://api.netlify.com/api/v1/blobs/${SITE_ID}/${STORE_NAME}/${BLOB_KEY}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      },
    });

    if (res.ok) {
      return await res.json();
    }
    return {};
  } catch (e) {
    return {};
  }
}

async function saveStats(stats: Record<string, number>): Promise<void> {
  const url = `https://api.netlify.com/api/v1/blobs/${SITE_ID}/${STORE_NAME}/${BLOB_KEY}`;
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stats),
  });
}

function sanitizePageName(page: string): string {
  let name = page.replace(/^\/+|\/+$/g, '');
  if (!name) return 'home';
  name = name.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  return name || 'unknown';
}
