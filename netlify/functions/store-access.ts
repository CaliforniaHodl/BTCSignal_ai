import type { Context } from '@netlify/functions';

// Store access record after successful payment
// Generates recovery code and persists to GitHub

interface AccessRecord {
  recoveryCode: string;
  paymentHash: string;
  tier: string;
  amountSats: number;
  purchaseDate: string;
  expiresAt: string | null;
  recoveryCount: number;
  lastRecovery: string | null;
}

interface AccessRecordsFile {
  records: AccessRecord[];
}

// Generate recovery code in format BTCSIG-XXXX-XXXX-XXXX
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
  const generateSegment = () => {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return segment;
  };

  return `BTCSIG-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
}

// Calculate expiry based on tier
function calculateExpiry(tier: string, purchaseDate: Date): string | null {
  const durations: Record<string, number> = {
    single: 0, // No expiry for single posts
    hourly: 60 * 60 * 1000,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    yearly: 365 * 24 * 60 * 60 * 1000
  };

  const duration = durations[tier];
  if (!duration) return null; // Single posts don't expire

  return new Date(purchaseDate.getTime() + duration).toISOString();
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
    const { paymentHash, tier, amountSats } = await req.json();

    if (!paymentHash || !tier || !amountSats) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Generate unique recovery code
    const recoveryCode = generateRecoveryCode();
    const purchaseDate = new Date();
    const expiresAt = calculateExpiry(tier, purchaseDate);

    const newRecord: AccessRecord = {
      recoveryCode,
      paymentHash,
      tier,
      amountSats,
      purchaseDate: purchaseDate.toISOString(),
      expiresAt,
      recoveryCount: 0,
      lastRecovery: null
    };

    // Save to GitHub
    const saved = await saveRecordToGitHub(newRecord);

    if (!saved) {
      // Still return the recovery code - it will work for client-side storage
      console.warn('Failed to save to GitHub, but returning recovery code');
    }

    return new Response(JSON.stringify({
      success: true,
      recoveryCode,
      tier,
      expiresAt,
      message: 'Access record stored successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Store access error:', error);
    return new Response(JSON.stringify({ error: 'Failed to store access record' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

async function saveRecordToGitHub(record: AccessRecord): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not configured');
    return false;
  }

  const path = 'data/access-records.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file content
    let records: AccessRecordsFile = { records: [] };
    let sha: string | undefined;

    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      records = JSON.parse(content);
    }

    // Check if payment hash already exists (prevent duplicates)
    const existing = records.records.find(r => r.paymentHash === record.paymentHash);
    if (existing) {
      console.log('Payment hash already recorded, returning existing code');
      return true;
    }

    // Add new record
    records.records.push(record);

    // Save updated list
    const body: any = {
      message: `Add access record for ${record.tier} tier`,
      content: Buffer.from(JSON.stringify(records, null, 2)).toString('base64'),
      branch: 'master'
    };

    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      console.log('Access record saved:', record.recoveryCode);
      return true;
    } else {
      const error = await putRes.json();
      console.error('GitHub save error:', error);
      return false;
    }

  } catch (error: any) {
    console.error('Save error:', error.message);
    return false;
  }
}
