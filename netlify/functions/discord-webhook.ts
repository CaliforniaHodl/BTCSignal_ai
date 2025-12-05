// Discord Webhook Integration
// Phase 6 Sprint 3: Discord Alert Integration
import type { Config, Context } from '@netlify/functions';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

// Send message to Discord webhook
async function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate webhook URL format
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
        !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      return { success: false, error: 'Invalid Discord webhook URL format' };
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 204) {
      return { success: true };
    } else {
      const error = await res.text();
      return { success: false, error: `Discord API error: ${res.status} - ${error}` };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Color constants for Discord embeds
const COLORS = {
  bullish: 0x3fb950,   // Green
  bearish: 0xf85149,   // Red
  neutral: 0xd29922,   // Yellow
  info: 0x58a6ff,      // Blue
  bitcoin: 0xf7931a,   // Bitcoin orange
};

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { action, webhookUrl, alertType, data } = body;

    // Test webhook action
    if (action === 'test') {
      if (!webhookUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing webhookUrl',
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const testPayload: DiscordWebhookPayload = {
        username: 'BTC Signal AI',
        avatar_url: 'https://btctradingsignalai.netlify.app/images/logo.png',
        embeds: [{
          title: '✅ Webhook Connected!',
          description: 'Your Discord webhook is now connected to BTC Signal AI alerts.',
          color: COLORS.bitcoin,
          fields: [
            { name: 'Status', value: 'Active', inline: true },
            { name: 'Alerts', value: 'Enabled', inline: true },
          ],
          footer: { text: 'BTC Signal AI • btctradingsignalai.netlify.app' },
          timestamp: new Date().toISOString(),
        }],
      };

      const result = await sendDiscordWebhook(webhookUrl, testPayload);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send alert action
    if (action === 'send') {
      if (!webhookUrl || !alertType) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing webhookUrl or alertType',
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let payload: DiscordWebhookPayload;

      switch (alertType) {
        case 'signal':
          payload = formatSignalEmbed(data);
          break;
        case 'funding_spike':
          payload = formatFundingEmbed(data);
          break;
        case 'squeeze':
          payload = formatSqueezeEmbed(data);
          break;
        default:
          payload = {
            username: 'BTC Signal AI',
            content: data?.message || 'Alert from BTC Signal AI',
          };
      }

      const result = await sendDiscordWebhook(webhookUrl, payload);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action. Use "test" or "send"',
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Discord webhook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Format signal alert as Discord embed
function formatSignalEmbed(data: {
  direction: string;
  price: number;
  confidence: number;
  target?: number;
}): DiscordWebhookPayload {
  const color = data.direction === 'up' ? COLORS.bullish : data.direction === 'down' ? COLORS.bearish : COLORS.neutral;
  const emoji = data.direction === 'up' ? '🟢' : data.direction === 'down' ? '🔴' : '⚪';
  const directionText = data.direction === 'up' ? 'BULLISH' : data.direction === 'down' ? 'BEARISH' : 'NEUTRAL';

  return {
    username: 'BTC Signal AI',
    avatar_url: 'https://btctradingsignalai.netlify.app/images/logo.png',
    embeds: [{
      title: `${emoji} BTC Trading Signal`,
      description: `New ${directionText} signal generated`,
      color,
      fields: [
        { name: 'Direction', value: directionText, inline: true },
        { name: 'Price', value: `$${data.price.toLocaleString()}`, inline: true },
        { name: 'Confidence', value: `${data.confidence}%`, inline: true },
        ...(data.target ? [{ name: 'Target', value: `$${data.target.toLocaleString()}`, inline: true }] : []),
      ],
      footer: { text: 'BTC Signal AI • Not financial advice' },
      timestamp: new Date().toISOString(),
    }],
  };
}

// Format funding spike alert as Discord embed
function formatFundingEmbed(data: {
  rate: number;
  exchange: string;
}): DiscordWebhookPayload {
  const isPositive = data.rate > 0;
  const color = isPositive ? COLORS.bullish : COLORS.bearish;
  const emoji = isPositive ? '🔥' : '❄️';

  return {
    username: 'BTC Signal AI',
    avatar_url: 'https://btctradingsignalai.netlify.app/images/logo.png',
    embeds: [{
      title: `${emoji} Funding Rate Spike`,
      description: 'Extreme funding rate detected - volatility likely',
      color,
      fields: [
        { name: 'Rate', value: `${(data.rate * 100).toFixed(4)}%`, inline: true },
        { name: 'Direction', value: isPositive ? 'Positive (Longs pay)' : 'Negative (Shorts pay)', inline: true },
        { name: 'Exchange', value: data.exchange, inline: true },
      ],
      footer: { text: 'BTC Signal AI • Funding rates above 0.05% often precede volatility' },
      timestamp: new Date().toISOString(),
    }],
  };
}

// Format squeeze alert as Discord embed
function formatSqueezeEmbed(data: {
  type: 'long' | 'short';
  riskLevel: string;
}): DiscordWebhookPayload {
  const color = data.type === 'long' ? COLORS.bearish : COLORS.bullish;
  const emoji = data.type === 'long' ? '📉' : '📈';
  const typeText = data.type === 'long' ? 'Long Squeeze' : 'Short Squeeze';

  return {
    username: 'BTC Signal AI',
    avatar_url: 'https://btctradingsignalai.netlify.app/images/logo.png',
    embeds: [{
      title: `${emoji} ${typeText} Risk Alert`,
      description: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} positions may be at risk`,
      color,
      fields: [
        { name: 'Risk Level', value: data.riskLevel, inline: true },
        { name: 'Type', value: typeText, inline: true },
        { name: 'Action', value: 'Consider reducing leverage', inline: true },
      ],
      footer: { text: 'BTC Signal AI • Risk management is key' },
      timestamp: new Date().toISOString(),
    }],
  };
}
