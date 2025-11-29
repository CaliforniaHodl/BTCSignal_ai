import type { Context } from '@netlify/functions';

// Key Level of the Day - Returns a single important price level for BTC
// This calculates dynamic support/resistance based on recent price action

export default async (req: Request, context: Context) => {
  try {
    // Fetch recent BTC data from Coinbase
    const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const data = await res.json();
    const currentPrice = parseFloat(data.data.amount);

    // Calculate key levels based on price (simplified)
    // In production, this would use actual historical data
    const roundNumber = Math.round(currentPrice / 5000) * 5000;
    const nearestSupport = roundNumber - 5000;
    const nearestResistance = roundNumber + 5000;

    // Determine which level is closer/more relevant
    const distanceToSupport = currentPrice - nearestSupport;
    const distanceToResistance = nearestResistance - currentPrice;

    let keyLevel: number;
    let levelType: 'support' | 'resistance';
    let description: string;

    if (distanceToSupport < distanceToResistance) {
      keyLevel = nearestSupport;
      levelType = 'support';
      description = `Major psychological support at $${keyLevel.toLocaleString()}`;
    } else {
      keyLevel = nearestResistance;
      levelType = 'resistance';
      description = `Key resistance at $${keyLevel.toLocaleString()}`;
    }

    // Calculate distance percentage
    const distancePercent = ((Math.abs(currentPrice - keyLevel) / currentPrice) * 100).toFixed(2);

    const result = {
      level: keyLevel,
      type: levelType,
      description,
      currentPrice: Math.round(currentPrice),
      distancePercent,
      updatedAt: new Date().toISOString(),
    };

    // Return JSON or HTML widget based on query param
    const url = new URL(req.url);
    const format = url.searchParams.get('format');

    if (format === 'widget') {
      // Return embeddable HTML widget
      const html = generateWidget(result);
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Key level error:', error);
    return new Response(JSON.stringify({ error: 'Failed to calculate key level' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function generateWidget(data: any): string {
  const levelColor = data.type === 'support' ? '#3fb950' : '#f85149';
  const arrow = data.type === 'support' ? '↓' : '↑';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d1117;
      color: #f0f6fc;
    }
    .widget {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #30363d;
      background: #161b22;
      max-width: 300px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .logo {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #f7931a, #ffb800);
      border-radius: 50%;
    }
    .title {
      font-size: 12px;
      color: #8b949e;
    }
    .level-type {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: ${levelColor}20;
      color: ${levelColor};
      text-transform: uppercase;
      font-weight: 600;
    }
    .level {
      font-size: 28px;
      font-weight: 700;
      color: ${levelColor};
      margin-bottom: 8px;
    }
    .description {
      font-size: 13px;
      color: #8b949e;
      margin-bottom: 8px;
    }
    .current {
      font-size: 12px;
      color: #6e7681;
    }
    .distance {
      color: #f0f6fc;
      font-weight: 600;
    }
    .footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #30363d;
      font-size: 10px;
      color: #6e7681;
    }
    .footer a {
      color: #f7931a;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="widget">
    <div class="header">
      <div class="logo"></div>
      <span class="title">Key Level of the Day</span>
      <span class="level-type">${data.type}</span>
    </div>
    <div class="level">${arrow} $${data.level.toLocaleString()}</div>
    <div class="description">${data.description}</div>
    <div class="current">
      BTC: $${data.currentPrice.toLocaleString()}
      (<span class="distance">${data.distancePercent}% away</span>)
    </div>
    <div class="footer">
      Powered by <a href="https://btctradingsignalai.netlify.app" target="_blank">BTC Signal AI</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
