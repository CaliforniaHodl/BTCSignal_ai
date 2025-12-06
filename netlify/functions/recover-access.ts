import type { Context } from '@netlify/functions';

// Recover access using recovery code or payment hash

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

// Generate unique session token - new one kicks off old devices
function generateSessionToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

interface AccessRecordsFile {
  records: AccessRecord[];
}

// Rate limiting: max 10 recovery attempts per hour per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
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

  // Rate limiting
  const clientIP = context.ip || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({
      error: 'Too many recovery attempts. Please try again later.',
      rateLimited: true
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const { recoveryCode, paymentHash } = await req.json();

    if (!recoveryCode && !paymentHash) {
      return new Response(JSON.stringify({
        error: 'Please provide a recovery code or payment hash'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate recovery code format if provided
    if (recoveryCode && !isValidRecoveryCodeFormat(recoveryCode)) {
      return new Response(JSON.stringify({
        error: 'Invalid recovery code format. Expected: BTCSIG-XXXX-XXXX-XXXX'
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
      return new Response(JSON.stringify({
        error: 'Unable to verify access. Please try again later.'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Find matching record
    let matchedRecord: AccessRecord | undefined;

    if (recoveryCode) {
      matchedRecord = records.records.find(
        r => r.recoveryCode.toUpperCase() === recoveryCode.toUpperCase()
      );
    } else if (paymentHash) {
      matchedRecord = records.records.find(r => r.paymentHash === paymentHash);
    }

    if (!matchedRecord) {
      return new Response(JSON.stringify({
        error: recoveryCode
          ? 'Recovery code not found. Please check and try again.'
          : 'Payment hash not found. Please verify your wallet transaction.',
        notFound: true
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if access has expired
    if (matchedRecord.expiresAt) {
      const expiry = new Date(matchedRecord.expiresAt);
      if (expiry < new Date()) {
        return new Response(JSON.stringify({
          error: 'This access has expired.',
          expired: true,
          tier: matchedRecord.tier,
          expiredAt: matchedRecord.expiresAt
        }), {
          status: 410,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Generate new session token - this invalidates any other device using this code
    const newSessionToken = generateSessionToken();

    // Update recovery count and session token (fire and forget - don't block response)
    updateRecoveryAndSession(matchedRecord.recoveryCode, newSessionToken, records).catch(err => {
      console.error('Failed to update recovery record:', err);
    });

    // Calculate remaining time
    let remainingMs = null;
    if (matchedRecord.expiresAt) {
      remainingMs = new Date(matchedRecord.expiresAt).getTime() - Date.now();
    }

    return new Response(JSON.stringify({
      success: true,
      tier: matchedRecord.tier,
      purchaseDate: matchedRecord.purchaseDate,
      expiresAt: matchedRecord.expiresAt,
      remainingMs,
      recoveryCode: matchedRecord.recoveryCode,
      sessionToken: newSessionToken, // New session token - old devices will be kicked off
      message: 'Access recovered successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Recover access error:', error);
    return new Response(JSON.stringify({ error: 'Recovery failed. Please try again.' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

function isValidRecoveryCodeFormat(code: string): boolean {
  // Format: BTCSIG-XXXX-XXXX-XXXX
  const regex = /^BTCSIG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  return regex.test(code);
}

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

async function updateRecoveryAndSession(
  recoveryCode: string,
  newSessionToken: string,
  records: AccessRecordsFile
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return;

  const path = 'data/access-records.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current SHA
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getRes.ok) return;

    const data = await getRes.json();
    const sha = data.sha;

    // Update the matching record
    const recordIndex = records.records.findIndex(
      r => r.recoveryCode.toUpperCase() === recoveryCode.toUpperCase()
    );

    if (recordIndex === -1) return;

    const now = new Date().toISOString();
    records.records[recordIndex].recoveryCount++;
    records.records[recordIndex].lastRecovery = now;
    records.records[recordIndex].activeSessionToken = newSessionToken;
    records.records[recordIndex].lastSessionUpdate = now;

    // Save updated records
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Update session for ${recoveryCode}`,
        content: Buffer.from(JSON.stringify(records, null, 2)).toString('base64'),
        sha,
        branch: 'master'
      })
    });

  } catch (error: any) {
    console.error('Update recovery and session error:', error.message);
  }
}
