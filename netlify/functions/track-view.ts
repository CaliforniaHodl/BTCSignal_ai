import type { Context } from '@netlify/functions';

// Simple page view counter - stores counts in GitHub as JSON
// No IP addresses, no user data - just page: count pairs

export default async (req: Request, context: Context) => {
  // Allow both GET (for stats) and POST (for tracking)
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

  // GET = return current stats
  if (req.method === 'GET') {
    const stats = await getStats();
    return new Response(JSON.stringify(stats), { status: 200, headers });
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

      const success = await incrementView(pageName);

      return new Response(JSON.stringify({ success, page: pageName }), {
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
  // Remove leading/trailing slashes and convert to snake_case
  let name = page.replace(/^\/+|\/+$/g, '');

  // Handle homepage
  if (!name) return 'home';

  // Convert slashes to underscores, remove special chars
  name = name.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

  return name || 'unknown';
}

async function getStats(): Promise<Record<string, number>> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set');
    return {};
  }

  const path = 'data/page-views.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      return JSON.parse(content);
    }

    return {};
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {};
  }
}

async function incrementView(pageName: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set');
    return false;
  }

  const path = 'data/page-views.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current stats
    let stats: Record<string, number> = {};
    let sha: string | undefined;

    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      stats = JSON.parse(content);
    }

    // Increment the page count
    stats[pageName] = (stats[pageName] || 0) + 1;

    // Save updated stats
    const body: any = {
      message: `Update page views`,
      content: Buffer.from(JSON.stringify(stats, null, 2)).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    if (putRes.ok) {
      return true;
    } else {
      const error = await putRes.json();
      console.error('GitHub save error:', error);
      return false;
    }

  } catch (error: any) {
    console.error('Increment error:', error.message);
    return false;
  }
}
