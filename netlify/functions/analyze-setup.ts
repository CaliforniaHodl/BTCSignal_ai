import type { Context } from '@netlify/functions';
import { validateAuth, extractAuthHeaders, unauthorizedResponse, checkRateLimit, rateLimitedResponse } from './utils/auth';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Internal screenshot service - no external APIs needed
async function screenshotUrl(url: string, userId: string): Promise<{ base64: string; mimeType: string; remaining: number } | { error: string; status: number }> {
  // Validate it's a TradingView URL
  const tvPattern = /^https?:\/\/(www\.)?tradingview\.com\/(chart|x)\//;
  if (!tvPattern.test(url)) {
    return { error: 'Invalid TradingView URL', status: 400 };
  }

  try {
    // Call our own screenshot function
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const response = await fetch(`${baseUrl}/.netlify/functions/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, userId })
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Screenshot failed', status: response.status };
    }

    return {
      base64: data.image,
      mimeType: data.mimeType,
      remaining: data.remaining
    };
  } catch (error: any) {
    console.error('Screenshot service error:', error);
    return { error: 'Screenshot service unavailable', status: 500 };
  }
}

// Timeframe context for multi-timeframe analysis
const TIMEFRAME_CONTEXT: Record<string, { higher: string; lower: string; description: string }> = {
  '15M': { higher: '1H', lower: '5M', description: 'scalping/intraday' },
  '1H': { higher: '4H', lower: '15M', description: 'intraday swing' },
  '4H': { higher: '1D', lower: '1H', description: 'swing trading' },
  '1D': { higher: '1W', lower: '4H', description: 'position trading' },
  '1W': { higher: '1M', lower: '1D', description: 'long-term investing' },
};

function getSystemPrompt(timeframe: string, bias?: string): string {
  const tf = TIMEFRAME_CONTEXT[timeframe] || TIMEFRAME_CONTEXT['4H'];
  const biasText = bias ? `The trader's bias is ${bias.toUpperCase()}.` : 'The trader has not specified a bias.';

  return `You are a professional Bitcoin trading coach who grades chart setups with brutal honesty.
You specialize in multi-timeframe analysis and helping traders avoid bad entries.

The trader is analyzing a ${timeframe} timeframe chart for ${tf.description}.
${biasText}

Your job is to score this setup objectively and provide actionable feedback.

SCORING CRITERIA (each 0-20 points, total 0-100):

1. TREND_CLARITY: Is the trend direction obvious or is price choppy/ranging?
   - 18-20: Crystal clear trend, obvious direction
   - 14-17: Clear trend with minor noise
   - 10-13: Trend visible but some chop
   - 5-9: Unclear, ranging, or conflicting signals
   - 0-4: Complete chop, no tradeable trend

2. KEY_LEVELS: Is price respecting important support/resistance?
   - 18-20: Price at major level with clear reaction
   - 14-17: Near significant level, good structure
   - 10-13: Some levels visible, moderate significance
   - 5-9: Weak levels or price in no-man's land
   - 0-4: No clear levels or price ignoring them

3. PATTERN_QUALITY: Are there clean, high-probability patterns?
   - 18-20: Textbook pattern with high confluence
   - 14-17: Good pattern, multiple confirmations
   - 10-13: Pattern present but not ideal
   - 5-9: Weak or ambiguous pattern
   - 0-4: No pattern or pattern failure likely

4. RISK_REWARD: Does this setup offer good R:R potential?
   - 18-20: 3R+ with clear invalidation
   - 14-17: 2-3R with logical stop
   - 10-13: 1.5-2R, acceptable but not great
   - 5-9: Less than 1.5R or unclear targets
   - 0-4: Poor R:R or no clear stop level

5. ENTRY_TIMING: Is this the optimal moment to enter?
   - 18-20: Perfect entry zone, immediate
   - 14-17: Good timing, minor optimization possible
   - 10-13: Acceptable but could wait for better
   - 5-9: Premature or late entry
   - 0-4: Terrible timing, chasing or too early

MULTI-TIMEFRAME ANALYSIS:
- Higher timeframe (${tf.higher}): Does the bigger picture support this trade?
- Lower timeframe (${tf.lower}): Is entry timing precise?

RESPONSE FORMAT:
You MUST respond with valid JSON only, no markdown, no explanation outside JSON:
{
  "score": <0-100>,
  "grade": "<A+/A/B+/B/C+/C/D/F>",
  "breakdown": {
    "trend_clarity": <0-20>,
    "key_levels": <0-20>,
    "pattern_quality": <0-20>,
    "risk_reward": <0-20>,
    "entry_timing": <0-20>
  },
  "higher_tf": {
    "alignment": "<SUPPORTS|NEUTRAL|CONFLICTS>",
    "score": <0-100>,
    "note": "<one sentence about higher TF context>"
  },
  "lower_tf": {
    "alignment": "<SUPPORTS|NEUTRAL|CONFLICTS>",
    "score": <0-100>,
    "note": "<one sentence about entry precision>"
  },
  "bias_check": {
    "user_bias": "<long|short|neutral|none>",
    "chart_bias": "<long|short|neutral>",
    "aligned": <true|false>,
    "warning": "<null or warning if bias conflicts with chart>"
  },
  "verdict": "<2-3 sentence honest assessment>",
  "actionable": "<WAIT|ENTER|SKIP>",
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "invalidation": "<price level that invalidates this setup>"
}

GRADING SCALE:
- A+ (95-100): Textbook setup, high conviction
- A (85-94): Excellent setup, minor imperfections
- B+ (75-84): Good setup, trade with caution
- B (65-74): Decent setup, size down
- C+ (55-64): Marginal setup, only for experienced traders
- C (45-54): Poor setup, consider skipping
- D (35-44): Bad setup, likely to fail
- F (0-34): Do not trade this

Be honest. Most setups are B or C grade. Only give A grades to truly exceptional setups.
If the chart is unclear or low quality, say so and reduce scores accordingly.`;
}

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

    // Rate limit by recovery code (20 requests/minute for this expensive endpoint)
    const rateCheck = checkRateLimit(`analyze-setup:${recoveryCode}`, 20, 60000);
    if (!rateCheck.allowed) {
      return rateLimitedResponse();
    }
  } else {
    return unauthorizedResponse('Authentication required. Please purchase access.');
  }

  try {
    const { image, mimeType, timeframe, bias, url } = await req.json();

    let imageData = image;
    let imageMimeType = mimeType;

    // If URL provided, screenshot it using our internal service
    if (url && !image) {
      const screenshot = await screenshotUrl(url, recoveryCode || 'anonymous');

      // Check if error response
      if ('error' in screenshot) {
        return new Response(JSON.stringify({
          error: screenshot.error,
          hint: 'Try uploading a screenshot manually instead.'
        }), {
          status: screenshot.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      imageData = screenshot.base64;
      imageMimeType = screenshot.mimeType;
      console.log(`Screenshot captured, ${screenshot.remaining} URL captures remaining for user`);
    }

    if (!imageData || !imageMimeType) {
      return new Response(JSON.stringify({ error: 'Missing image data or URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate timeframe
    const validTimeframes = ['15M', '1H', '4H', '1D', '1W'];
    const tf = validTimeframes.includes(timeframe) ? timeframe : '4H';

    // Validate bias
    const validBiases = ['long', 'short', 'neutral', null, undefined, ''];
    const userBias = validBiases.includes(bias) ? bias : null;

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
        system: getSystemPrompt(tf, userBias),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMimeType,
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: `Grade this ${tf} chart setup. ${userBias ? `My bias is ${userBias}.` : 'I have no directional bias yet.'} Give me your honest assessment as JSON.`,
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

    // Parse JSON response from Claude
    let result;
    try {
      // Try to extract JSON from the response (Claude sometimes adds backticks)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', analysisText);
      // Return a fallback structure
      result = {
        score: 50,
        grade: 'C',
        breakdown: {
          trend_clarity: 10,
          key_levels: 10,
          pattern_quality: 10,
          risk_reward: 10,
          entry_timing: 10
        },
        higher_tf: { alignment: 'NEUTRAL', score: 50, note: 'Unable to fully analyze higher timeframe' },
        lower_tf: { alignment: 'NEUTRAL', score: 50, note: 'Unable to fully analyze lower timeframe' },
        bias_check: { user_bias: userBias || 'none', chart_bias: 'neutral', aligned: true, warning: null },
        verdict: 'Analysis completed but response parsing had issues. Please try again with a clearer chart image.',
        actionable: 'WAIT',
        improvements: ['Upload a clearer chart image', 'Ensure key levels are visible', 'Include recent price action'],
        invalidation: 'Unable to determine',
        raw_analysis: analysisText
      };
    }

    // Add metadata
    result.timeframe = tf;
    result.analyzed_at = new Date().toISOString();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });

  } catch (error: any) {
    console.error('Setup analysis error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
