import type { Context } from '@netlify/functions';

// Simple page view counter using Netlify Blobs
// No rebuilds, no IP addresses - just page: count pairs

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

  // Get the blob store from context
  const store = context.blobs("page-views");

  // GET = return current stats
  if (req.method === 'GET') {
    try {
      const data = await store.get("counts");
      const stats = data ? JSON.parse(data) : {};
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

      // Sanitize page name: /about/ -> about, / -> home
      const pageName = sanitizePageName(page);

      // Get current stats
      let stats: Record<string, number> = {};
      try {
        const data = await store.get("counts");
        stats = data ? JSON.parse(data) : {};
      } catch (e) {
        stats = {};
      }

      // Increment
      stats[pageName] = (stats[pageName] || 0) + 1;

      // Save
      await store.set("counts", JSON.stringify(stats));

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

function sanitizePageName(page: string): string {
  let name = page.replace(/^\/+|\/+$/g, '');
  if (!name) return 'home';
  name = name.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  return name || 'unknown';
}
