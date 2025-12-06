import type { Context } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { validateAuth, extractAuthHeaders, unauthorizedResponse, checkRateLimit, rateLimitedResponse } from './utils/auth';

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Recovery-Code, X-Session-Token'
      }
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
    const rateCheck = checkRateLimit(`alpha-radar:${recoveryCode}`);
    if (!rateCheck.allowed) {
      return rateLimitedResponse();
    }
  } else {
    return unauthorizedResponse('Authentication required. Please purchase access.');
  }

  try {
    // Fetch market data
    const [globalRes, fgRes, fundingRes, priceRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/global'),
      fetch('https://api.alternative.me/fng/'),
      fetch('https://fapi.binance.us/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1'),
      fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot')
    ]);

    const globalData = await globalRes.json();
    const fgData = await fgRes.json();
    const fundingData = await fundingRes.json();
    const priceData = await priceRes.json();

    const btcDominance = globalData.data.market_cap_percentage.btc.toFixed(1);
    const fearGreed = fgData.data[0].value;
    const fearGreedLabel = fgData.data[0].value_classification;
    const fundingRate = (parseFloat(fundingData[0].fundingRate) * 100).toFixed(4);
    const currentPrice = parseFloat(priceData.data.amount);

    // Generate AI summary
    const client = new Anthropic();

    const prompt = `You are an expert Bitcoin market analyst. Based on the following current market data, provide a brief 2-3 sentence market summary and identify any alerts worth noting.

Market Data:
- BTC Price: $${currentPrice.toLocaleString()}
- BTC Dominance: ${btcDominance}%
- Fear & Greed Index: ${fearGreed} (${fearGreedLabel})
- Funding Rate: ${fundingRate}%

Provide your response in this JSON format:
{
  "summary": "Your 2-3 sentence market summary here",
  "alert": "Any significant alert or null if nothing noteworthy"
}

Focus on actionable insights for traders. Be concise and direct.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Fallback
    return new Response(JSON.stringify({
      summary: `BTC at $${currentPrice.toLocaleString()} with ${btcDominance}% dominance. Fear & Greed at ${fearGreed} (${fearGreedLabel}). Funding rate ${fundingRate}% suggests ${parseFloat(fundingRate) > 0.01 ? 'long-heavy positioning' : 'balanced market'}.`,
      alert: null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Alpha radar summary error:', error);
    return new Response(JSON.stringify({
      summary: 'Market analysis temporarily unavailable. Check back shortly.',
      alert: null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
