import type { Context } from '@netlify/functions';

// Validate that a session token is still active
// Returns invalid if someone else has recovered with the same code

interface AccessRecord {
  recoveryCode: string;
  paymentHash: string;
  tier: string;
  amountSats: number;
  purchaseDate: string;
  expiresAt: string | null;
  recoveryCount: number;
  lastRecovery: string | null;
  activeSessionToken: string;
  lastSessionUpdate: string;
}

interface AccessRecordsFile {
  records: AccessRecord[];
}

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { recoveryCode, sessionToken } = await req.json();

    if (!recoveryCode || !sessionToken) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Missing recovery code or session token'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Fetch access records from GitHub
    const records = await fetchRecordsFromGitHub();

    if (!records) {
      // If we can't fetch records, assume valid to avoid false kicks
      return new Response(JSON.stringify({
        valid: true,
        message: 'Unable to verify, assuming valid'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Find the record
    const record = records.records.find(
      r => r.recoveryCode.toUpperCase() === recoveryCode.toUpperCase()
    );

    if (!record) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Recovery code not found',
        kicked: false
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if access has expired
    if (record.expiresAt) {
      const expiry = new Date(record.expiresAt);
      if (expiry < new Date()) {
        return new Response(JSON.stringify({
          valid: false,
          error: 'Access has expired',
          expired: true,
          kicked: false
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Check if session token matches - if not, user was kicked off
    if (record.activeSessionToken !== sessionToken) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Your access was recovered on another device',
        kicked: true,
        lastSessionUpdate: record.lastSessionUpdate
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Session is valid
    return new Response(JSON.stringify({
      valid: true,
      tier: record.tier,
      expiresAt: record.expiresAt
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Validate session error:', error);
    // On error, assume valid to avoid false kicks
    return new Response(JSON.stringify({
      valid: true,
      message: 'Validation error, assuming valid'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

async function fetchRecordsFromGitHub(): Promise<AccessRecordsFile | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not configured');
    return null;
  }

  const path = 'data/access-records.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      console.error('Failed to fetch records:', res.status);
      return null;
    }

    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return JSON.parse(content);

  } catch (error: any) {
    console.error('Fetch error:', error.message);
    return null;
  }
}
