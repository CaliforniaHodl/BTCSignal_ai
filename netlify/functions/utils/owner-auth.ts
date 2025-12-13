// Owner-Only Authentication for Trading Functions
// This provides an additional layer of security for trading operations
// Only the owner (you) should be able to execute trades

/**
 * Validates owner-level access for trading operations
 * Uses a separate secret from regular user auth
 */
export function validateOwnerAuth(req: Request): { valid: boolean; error?: string } {
  // Check for owner secret in header
  const ownerSecret = req.headers.get('X-Owner-Secret');
  const expectedSecret = process.env.OWNER_TRADING_SECRET;

  // If no secret configured, deny all trading
  if (!expectedSecret) {
    console.error('SECURITY: OWNER_TRADING_SECRET not configured - trading disabled');
    return {
      valid: false,
      error: 'Trading not configured. Set OWNER_TRADING_SECRET in environment.',
    };
  }

  // Validate secret
  if (!ownerSecret) {
    return {
      valid: false,
      error: 'Missing owner authentication',
    };
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(ownerSecret, expectedSecret)) {
    console.error('SECURITY: Invalid owner secret attempted');
    return {
      valid: false,
      error: 'Invalid owner authentication',
    };
  }

  // Additional check: IP whitelist (optional)
  const clientIP = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                   req.headers.get('CF-Connecting-IP') ||
                   'unknown';

  const allowedIPs = process.env.OWNER_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];

  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    console.error(`SECURITY: Trading attempted from non-whitelisted IP: ${clientIP}`);
    return {
      valid: false,
      error: 'Access denied from this location',
    };
  }

  console.log(`Owner auth validated from IP: ${clientIP}`);
  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Create unauthorized response for owner endpoints
 */
export function ownerUnauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(JSON.stringify({
    error: message,
    unauthorized: true,
    trading: false,
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Rate limiting for trading operations
 * More strict than regular rate limits
 */
const tradingRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const TRADING_RATE_LIMIT = 5; // 5 trades per window
const TRADING_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

export function checkTradingRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = tradingRateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    tradingRateLimitMap.set(identifier, { count: 1, resetTime: now + TRADING_RATE_WINDOW });
    return { allowed: true, remaining: TRADING_RATE_LIMIT - 1 };
  }

  if (record.count >= TRADING_RATE_LIMIT) {
    console.warn(`Trading rate limit exceeded for: ${identifier}`);
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: TRADING_RATE_LIMIT - record.count };
}

/**
 * Log trading action for audit trail
 */
export async function logTradingAction(action: {
  type: string;
  details: any;
  success: boolean;
  error?: string;
  ip?: string;
}): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...action,
  };

  // Log to console (will appear in Netlify logs)
  console.log('TRADING_AUDIT:', JSON.stringify(logEntry));

  // Optionally save to GitHub for permanent audit trail
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (token && repo) {
    try {
      const path = 'data/trading-audit.json';
      const url = `https://api.github.com/repos/${repo}/contents/${path}`;

      // Get existing audit log
      let auditLog: any[] = [];
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
        auditLog = JSON.parse(Buffer.from(data.content, 'base64').toString());
      }

      // Add new entry, keep last 1000
      auditLog.push(logEntry);
      if (auditLog.length > 1000) {
        auditLog = auditLog.slice(-1000);
      }

      // Save
      const body: any = {
        message: `Trading audit: ${action.type} - ${action.success ? 'success' : 'failed'}`,
        content: Buffer.from(JSON.stringify(auditLog, null, 2)).toString('base64'),
        branch: 'master',
      };

      if (sha) body.sha = sha;

      await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });
    } catch (e: any) {
      console.error('Failed to save trading audit:', e.message);
    }
  }
}
