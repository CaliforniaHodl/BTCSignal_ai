import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  try {
    // Fetch current price for context
    const priceRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const priceData = await priceRes.json();
    const currentPrice = parseFloat(priceData.data.amount);

    // Generate contextual notes based on price level
    const notes = generateNotes(currentPrice);

    return new Response(JSON.stringify({ notes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Liquidity notes error:', error);

    return new Response(JSON.stringify({
      notes: 'Market structure analysis temporarily unavailable. Key observations: Watch for equal highs/lows forming, stop losses likely clustered at swing points, and monitor for displacement candles signaling direction.'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

function generateNotes(price: number): string {
  const roundedPrice = Math.round(price / 1000) * 1000;
  const nearestSupport = Math.round(price * 0.97 / 500) * 500;
  const nearestResistance = Math.round(price * 1.03 / 500) * 500;

  const observations = [
    `BTC currently trading near $${roundedPrice.toLocaleString()}. Market makers typically target liquidity resting at swing highs/lows.`,
    `Watch $${nearestResistance.toLocaleString()} resistance zone - equal highs or previous swing highs attract stop hunts.`,
    `Support zone near $${nearestSupport.toLocaleString()} has likely clustered stop losses below.`,
    'Volume profile suggests point of control near current levels - expect volatile moves to sweep both sides.',
    'Look for displacement candles (large body, small wicks) to signal which direction the sweep will occur.',
    'After a liquidity sweep, price often reverses sharply - ideal for entries on the pullback.'
  ];

  return observations.join(' ');
}
