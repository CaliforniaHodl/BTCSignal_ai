// Shared authentication utilities for Netlify functions
// Validates session tokens for premium features

// In-memory rate limiting (resets on cold start, but provides protection during warm instances)
// For production, consider using Netlify Blobs or external storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // 30 requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

/**
 * Check rate limit for a given key (e.g., IP or recovery code)
 */
export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

/**
 * Create a rate limited response
 */
export function rateLimitedResponse(): Response {
  return new Response(JSON.stringify({
    error: 'Too many requests. Please try again later.',
    rateLimited: true
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Retry-After': '60'
    }
  });
}

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

interface AuthResult {
  authenticated: boolean;
  tier?: string;
  error?: string;
  expiresAt?: string | null;
}

/**
 * Validate a session token against the access records
 * Returns authenticated:true if the token is valid and not expired
 */
export async function validateAuth(recoveryCode: string, sessionToken: string): Promise<AuthResult> {
  if (!recoveryCode || !sessionToken) {
    return { authenticated: false, error: 'Missing credentials' };
  }

  const records = await fetchRecordsFromGitHub();

  if (!records) {
    // If we can't fetch records, allow access to avoid false denials
    // This should be rare and temporary
    console.warn('Could not fetch records for auth, allowing request');
    return { authenticated: true, tier: 'unknown' };
  }

  const record = records.records.find(
    r => r.recoveryCode.toUpperCase() === recoveryCode.toUpperCase()
  );

  if (!record) {
    return { authenticated: false, error: 'Invalid recovery code' };
  }

  // Check if access has expired
  if (record.expiresAt) {
    const expiry = new Date(record.expiresAt);
    if (expiry < new Date()) {
      return { authenticated: false, error: 'Access expired' };
    }
  }

  // Check if session token matches
  if (record.activeSessionToken !== sessionToken) {
    return { authenticated: false, error: 'Session invalidated - access recovered on another device' };
  }

  return {
    authenticated: true,
    tier: record.tier,
    expiresAt: record.expiresAt
  };
}

/**
 * Extract auth headers from request
 * Expects X-Recovery-Code and X-Session-Token headers
 */
export function extractAuthHeaders(req: Request): { recoveryCode: string | null; sessionToken: string | null } {
  return {
    recoveryCode: req.headers.get('X-Recovery-Code'),
    sessionToken: req.headers.get('X-Session-Token')
  };
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: message, unauthorized: true }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
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
