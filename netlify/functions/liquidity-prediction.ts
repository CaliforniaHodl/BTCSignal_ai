import type { Context } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

export default async (req: Request, context: Context) => {
  try {
    // Fetch current price and recent data
    const priceRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.data.amount);

    // Fetch funding rate from Binance (global, not US)
    let fundingRate = 0;
    try {
      const fundingRes = await fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
      if (fundingRes.ok) {
        const fundingData = await fundingRes.json();
        fundingRate = parseFloat(fundingData[0]?.fundingRate || 0);
      }
    } catch (e) {
      console.log('Funding rate fetch failed, using neutral');
    }

    // Calculate key levels
    const topZone = Math.round(currentPrice * 1.025 / 500) * 500;
    const bottomZone = Math.round(currentPrice * 0.975 / 500) * 500;

    // Generate AI prediction
    const client = new Anthropic();

    const prompt = `You are an expert Bitcoin liquidity analyst. Based on the current market data, predict which liquidity zone is more likely to be swept next.

Current Data:
- BTC Price: $${currentPrice.toLocaleString()}
- Funding Rate: ${(fundingRate * 100).toFixed(4)}% (${fundingRate > 0 ? 'longs paying shorts' : 'shorts paying longs'})
- Potential top-side liquidity zone: $${topZone.toLocaleString()}
- Potential bottom-side liquidity zone: $${bottomZone.toLocaleString()}

Respond in this exact JSON format:
{
  "bias": "Bullish" or "Bearish" or "Neutral",
  "topside": {
    "zone": ${topZone},
    "probability": [number 0-100],
    "eta": "[time window like '4-8 hours' or '12-24 hours']",
    "reasoning": "[1-2 sentence explanation]"
  },
  "bottomside": {
    "zone": ${bottomZone},
    "probability": [number 0-100],
    "eta": "[time window]",
    "reasoning": "[1-2 sentence explanation]"
  }
}

The probabilities should add up to roughly 100%. Consider:
- Funding rate direction suggests positioning
- Market makers target liquidity resting above/below
- Higher probability for the less crowded side`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
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

    // Fallback response
    const topsideProb = fundingRate > 0.0001 ? 40 : 55;
    return new Response(JSON.stringify({
      bias: fundingRate > 0.0001 ? 'Bearish' : fundingRate < -0.0001 ? 'Bullish' : 'Neutral',
      topside: {
        zone: topZone,
        probability: topsideProb,
        eta: '12-24 hours',
        reasoning: 'Previous swing highs and clustered stop losses make this zone attractive for a sweep.'
      },
      bottomside: {
        zone: bottomZone,
        probability: 100 - topsideProb,
        eta: '12-24 hours',
        reasoning: 'Stop losses below recent lows create liquidity pool. Market makers may target this first.'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Liquidity prediction error:', error);

    // Return calculated fallback
    return new Response(JSON.stringify({
      bias: 'Neutral',
      topside: {
        zone: 100000,
        probability: 50,
        eta: '12-24 hours',
        reasoning: 'Analysis temporarily unavailable. Using calculated estimates.'
      },
      bottomside: {
        zone: 95000,
        probability: 50,
        eta: '12-24 hours',
        reasoning: 'Analysis temporarily unavailable. Using calculated estimates.'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
