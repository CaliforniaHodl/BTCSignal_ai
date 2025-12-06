import type { Context } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { validateAuth, extractAuthHeaders, unauthorizedResponse, checkRateLimit, rateLimitedResponse } from './utils/auth';

interface TradeData {
  direction: 'long' | 'short';
  timeframe: string;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  positionSize: number | null;
  outcome: string;
  reasoning: string;
  notes: string;
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
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
    const rateCheck = checkRateLimit(`trade-coach:${recoveryCode}`);
    if (!rateCheck.allowed) {
      return rateLimitedResponse();
    }
  } else {
    // Require auth headers - no anonymous Claude API access
    return unauthorizedResponse('Authentication required. Please purchase access.');
  }

  try {
    const trade: TradeData = await req.json();

    // Calculate R:R if possible
    let riskReward = 'N/A';
    if (trade.stopLoss && trade.takeProfit) {
      if (trade.direction === 'long') {
        const risk = trade.entryPrice - trade.stopLoss;
        const reward = trade.takeProfit - trade.entryPrice;
        riskReward = (reward / risk).toFixed(2) + ':1';
      } else {
        const risk = trade.stopLoss - trade.entryPrice;
        const reward = trade.entryPrice - trade.takeProfit;
        riskReward = (reward / risk).toFixed(2) + ':1';
      }
    }

    const client = new Anthropic();

    const prompt = `You are an expert trading coach analyzing a Bitcoin trade. Evaluate this trade and provide detailed feedback.

Trade Details:
- Direction: ${trade.direction.toUpperCase()}
- Timeframe: ${trade.timeframe}
- Entry Price: $${trade.entryPrice.toLocaleString()}
- Stop Loss: ${trade.stopLoss ? '$' + trade.stopLoss.toLocaleString() : 'Not set'}
- Take Profit: ${trade.takeProfit ? '$' + trade.takeProfit.toLocaleString() : 'Not set'}
- Risk/Reward: ${riskReward}
- Position Size: ${trade.positionSize ? trade.positionSize + '%' : 'Not specified'}
- Outcome: ${trade.outcome}
- Trader's Reasoning: "${trade.reasoning || 'None provided'}"
- Additional Notes: "${trade.notes || 'None'}"

Provide your analysis in this exact JSON format:
{
  "overallScore": [0-100 number],
  "entryScore": [0-100],
  "riskScore": [0-100],
  "logicScore": [0-100],
  "sizingScore": [0-100],
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "psychology": "2-3 sentences analyzing the psychological aspects of this trade",
  "alternatives": "2-3 sentences suggesting alternative entry/exit strategies",
  "takeaways": ["key takeaway 1", "key takeaway 2", "key takeaway 3"]
}

Scoring guidelines:
- Entry: Consider market structure, timing, confirmation
- Risk: Stop loss placement, R:R ratio, invalidation logic
- Logic: Quality of reasoning, confluence factors, thesis clarity
- Sizing: Position size relative to risk tolerance (1-5% is good)

Be constructive but honest. Focus on helping the trader improve.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
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

    throw new Error('Failed to parse AI response');

  } catch (error: any) {
    console.error('Trade coach error:', error);

    // Return a basic fallback analysis
    return new Response(JSON.stringify({
      overallScore: 60,
      entryScore: 60,
      riskScore: 50,
      logicScore: 60,
      sizingScore: 70,
      strengths: ['Trade documented for review', 'Learning from trades is key to improvement'],
      improvements: ['Ensure stop loss is always defined', 'Document your reasoning in more detail'],
      psychology: 'Unable to fully analyze psychology without AI. Review your emotional state when entering trades.',
      alternatives: 'Consider waiting for pullbacks to key levels for better entries.',
      takeaways: ['Always define risk before entry', 'Journal every trade', 'Review trades weekly']
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
