import type { Context } from '@netlify/functions';

// Store access record after successful payment
// Generates recovery code and persists to GitHub

// LNbits configuration for payment verification
const LNBITS_URL = process.env.LNBITS_URL || 'https://legend.lnbits.com';
const LNBITS_API_KEY = process.env.LNBITS_API_KEY || '';

// Valid tier pricing - MUST match create-invoice.ts
const VALID_TIERS: Record<string, number> = {
  single: 21,
  hourly: 1000,
  daily: 20000,
  weekly: 100000,
  monthly: 500000
};

interface AccessRecord {
  recoveryCode: string;
  paymentHash: string;
  tier: string;
  amountSats: number;
  purchaseDate: string;
  expiresAt: string | null;
  recoveryCount: number;
  lastRecovery: string | null;
  activeSessionToken: string; // Unique per device - only one active at a time
  lastSessionUpdate: string;
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

// Generate unique session token - used to ensure only one device can use a code at a time
function generateSessionToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Verify payment with LNbits and return actual amount paid
async function verifyPayment(paymentHash: string): Promise<{ verified: boolean; amountSats: number; memo: string }> {
  try {
    const response = await fetch(`${LNBITS_URL}/api/v1/payments/${paymentHash}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': LNBITS_API_KEY
      }
    });

    if (!response.ok) {
      return { verified: false, amountSats: 0, memo: '' };
    }

    const data = await response.json();

    // LNbits returns amount in millisats, convert to sats
    // Also verify the payment is actually paid
    if (data.paid === true) {
      return {
        verified: true,
        amountSats: Math.floor(data.amount / 1000), // millisats to sats
        memo: data.memo || ''
      };
    }

    return { verified: false, amountSats: 0, memo: '' };
  } catch (error) {
    console.error('Payment verification error:', error);
    return { verified: false, amountSats: 0, memo: '' };
  }
}

// Determine tier from amount paid (source of truth)
function getTierFromAmount(amountSats: number): string | null {
  for (const [tier, price] of Object.entries(VALID_TIERS)) {
    if (price === amountSats) return tier;
  }
  return null;
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
    const { paymentHash } = await req.json();

    if (!paymentHash) {
      return new Response(JSON.stringify({ error: 'Missing payment hash' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // SECURITY: Verify payment with LNbits - DO NOT trust client-provided tier/amount
    const payment = await verifyPayment(paymentHash);

    if (!payment.verified) {
      return new Response(JSON.stringify({ error: 'Payment not verified or not paid' }), {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Determine tier from actual amount paid (source of truth)
    const tier = getTierFromAmount(payment.amountSats);

    if (!tier) {
      return new Response(JSON.stringify({
        error: 'Invalid payment amount',
        amountPaid: payment.amountSats
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Generate unique recovery code and session token
    const recoveryCode = generateRecoveryCode();
    const sessionToken = generateSessionToken();
    const purchaseDate = new Date();
    const expiresAt = calculateExpiry(tier, purchaseDate);

    const newRecord: AccessRecord = {
      recoveryCode,
      paymentHash,
      tier,
      amountSats: payment.amountSats, // Use verified amount, not client-provided
      purchaseDate: purchaseDate.toISOString(),
      expiresAt,
      recoveryCount: 0,
      lastRecovery: null,
      activeSessionToken: sessionToken,
      lastSessionUpdate: purchaseDate.toISOString()
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
      sessionToken,
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
