import type { Context } from '@netlify/functions';
import { validateAuth, extractAuthHeaders, unauthorizedResponse, checkRateLimit, rateLimitedResponse } from './utils/auth';

/**
 * Secure Premium Content API
 *
 * Returns premium post data ONLY after authentication is verified.
 * This prevents client-side CSS bypass attacks - content is never
 * sent to unauthenticated users.
 */

// Premium fields that require authentication
const PREMIUM_FIELDS = [
  'sentiment', 'direction', 'confidence',
  'price', 'priceChange', 'priceChange24h',
  'high24h', 'low24h', 'targetPrice', 'stopLoss',
  'predictedPrice24h', 'rsi', 'fundingRate', 'fundingSignal',
  'openInterest', 'squeezeRisk', 'squeezeProbability',
  'historicalWins', 'historicalLosses', 'historicalWinRate',
  'priceMovement7d', 'daysTracked', 'blockHeight',
  'callResult', 'resultTimestamp',
  'volume24h', 'volumeChange', 'fearGreed',
  'macd', 'macdSignal', 'ema20', 'sma50',
  'bbUpper', 'bbMiddle', 'bbLower'
];

// Content types for different premium features
type ContentType = 'post' | 'smart-chart' | 'trade-coach' | 'pattern-detector' | 'alpha-radar';

interface PremiumContentRequest {
  contentType: ContentType;
  contentId: string;
}

export default async (req: Request, context: Context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Recovery-Code, X-Session-Token'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Extract and validate auth
    const { recoveryCode, sessionToken } = extractAuthHeaders(req);

    if (!recoveryCode || !sessionToken) {
      return unauthorizedResponse('Missing authentication headers. Use X-Recovery-Code and X-Session-Token.');
    }

    // Rate limiting by recovery code
    const rateCheck = checkRateLimit(`premium:${recoveryCode}`);
    if (!rateCheck.allowed) {
      return rateLimitedResponse();
    }

    // Validate authentication
    const auth = await validateAuth(recoveryCode, sessionToken);

    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error || 'Authentication failed');
    }

    // Parse request body
    const body: PremiumContentRequest = await req.json();
    const { contentType, contentId } = body;

    if (!contentType || !contentId) {
      return new Response(JSON.stringify({ error: 'Missing contentType or contentId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch premium content based on type
    let premiumData: Record<string, any> | null = null;

    switch (contentType) {
      case 'post':
        premiumData = await fetchPostPremiumContent(contentId);
        break;
      case 'smart-chart':
      case 'trade-coach':
      case 'pattern-detector':
      case 'alpha-radar':
        // For tools, return access granted flag
        // Tool data is dynamic and fetched from other endpoints
        premiumData = {
          accessGranted: true,
          tier: auth.tier,
          expiresAt: auth.expiresAt
        };
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid content type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (!premiumData) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return premium content
    return new Response(JSON.stringify({
      success: true,
      tier: auth.tier,
      expiresAt: auth.expiresAt,
      data: premiumData
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, max-age=0'
      }
    });

  } catch (error: any) {
    console.error('Premium content error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};

/**
 * Fetch premium content for a specific post from GitHub
 */
async function fetchPostPremiumContent(postId: string): Promise<Record<string, any> | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.error('GitHub credentials not configured');
    return null;
  }

  // Sanitize postId to prevent path traversal
  const sanitizedId = postId.replace(/[^a-zA-Z0-9\-_]/g, '');

  // Try to find the post file
  // PostId could be the filename or a date-based identifier
  const possiblePaths = [
    `content/posts/${sanitizedId}.md`,
    `content/posts/${sanitizedId}-btc-usd.md`
  ];

  for (const path of possiblePaths) {
    try {
      const url = `https://api.github.com/repos/${repo}/contents/${path}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!res.ok) continue;

      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf8');

      // Parse front matter
      const frontMatter = parseFrontMatter(content);

      if (frontMatter) {
        // Only return premium fields
        const premiumContent: Record<string, any> = {};

        for (const field of PREMIUM_FIELDS) {
          if (frontMatter[field] !== undefined) {
            premiumContent[field] = frontMatter[field];
          }
        }

        // Also include markdown body for full content
        premiumContent.markdownBody = extractMarkdownBody(content);

        return premiumContent;
      }
    } catch (error) {
      console.error(`Error fetching ${path}:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Parse YAML front matter from markdown content
 */
function parseFrontMatter(markdown: string): Record<string, any> | null {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);

  if (!match) return null;

  const yaml = match[1];
  const result: Record<string, any> = {};

  // Simple YAML parser for front matter
  const lines = yaml.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value: any = line.substring(colonIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse numbers
    if (!isNaN(parseFloat(value)) && isFinite(value as any)) {
      value = parseFloat(value);
    }

    // Parse booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    result[key] = value;
  }

  return result;
}

/**
 * Extract markdown body (content after front matter)
 */
function extractMarkdownBody(markdown: string): string {
  const match = markdown.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : '';
}
