import type { Context } from '@netlify/functions';
import { validateAuth, extractAuthHeaders, unauthorizedResponse, checkRateLimit, rateLimitedResponse } from './utils/auth';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are an expert technical analyst specializing in cryptocurrency trading charts.
Analyze the provided trading chart image and provide detailed technical analysis.

Focus on:
1. **Trend Analysis**: Current trend direction, strength, and potential reversals
2. **Key Levels**: Support and resistance levels visible on the chart
3. **Patterns**: Any chart patterns (triangles, wedges, head & shoulders, flags, etc.)
4. **Trade Setup**: Potential entry, stop loss, and target levels based on the analysis

Be specific with price levels when visible. If the chart quality is poor or unclear, mention what you can and cannot determine.
Keep analysis professional and actionable for traders.`;

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Recovery-Code, X-Session-Token'
      }
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // SECURITY: Validate session before allowing Claude API usage
  const { recoveryCode, sessionToken } = extractAuthHeaders(req);
  if (recoveryCode && sessionToken) {
    const auth = await validateAuth(recoveryCode, sessionToken);
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error || 'Unauthorized');
    }

    // Rate limit by recovery code (30 requests/minute)
    const rateCheck = checkRateLimit(`analyze-chart:${recoveryCode}`);
    if (!rateCheck.allowed) {
      return rateLimitedResponse();
    }
  } else {
    return unauthorizedResponse('Authentication required. Please purchase access.');
  }

  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing image data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(JSON.stringify({ error: 'API configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Claude API with vision
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Analyze this trading chart and provide your technical analysis.

Please structure your response with these exact sections:
1. TREND: [Your trend analysis]
2. LEVELS: [Key support/resistance levels]
3. PATTERNS: [Any patterns detected]
4. SETUP: [Recommended trade setup if any]
5. FULL: [Detailed overall analysis]`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return new Response(JSON.stringify({ error: 'Analysis service error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const analysisText = data.content[0].text;

    // Parse the structured response
    const result = parseAnalysis(analysisText);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Parse the structured analysis response
function parseAnalysis(text: string): {
  trend: string;
  levels: string;
  patterns: string;
  setup: string;
  fullAnalysis: string;
} {
  const sections: Record<string, string> = {
    trend: '',
    levels: '',
    patterns: '',
    setup: '',
    fullAnalysis: '',
  };

  // Try to extract sections
  const trendMatch = text.match(/1\.\s*TREND:?\s*([\s\S]*?)(?=2\.\s*LEVELS|$)/i);
  const levelsMatch = text.match(/2\.\s*LEVELS:?\s*([\s\S]*?)(?=3\.\s*PATTERNS|$)/i);
  const patternsMatch = text.match(/3\.\s*PATTERNS:?\s*([\s\S]*?)(?=4\.\s*SETUP|$)/i);
  const setupMatch = text.match(/4\.\s*SETUP:?\s*([\s\S]*?)(?=5\.\s*FULL|$)/i);
  const fullMatch = text.match(/5\.\s*FULL:?\s*([\s\S]*?)$/i);

  if (trendMatch) sections.trend = trendMatch[1].trim();
  if (levelsMatch) sections.levels = levelsMatch[1].trim();
  if (patternsMatch) sections.patterns = patternsMatch[1].trim();
  if (setupMatch) sections.setup = setupMatch[1].trim();
  if (fullMatch) sections.fullAnalysis = fullMatch[1].trim();

  // If parsing failed, use the full text
  if (!sections.trend && !sections.levels) {
    sections.fullAnalysis = text;
    sections.trend = 'See detailed analysis below';
    sections.levels = 'See detailed analysis below';
    sections.patterns = 'See detailed analysis below';
    sections.setup = 'See detailed analysis below';
  }

  return sections;
}
