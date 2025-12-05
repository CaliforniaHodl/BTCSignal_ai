// Send Alert to All Telegram Subscribers
// Phase 6 Sprint 3: Telegram Alert Integration
import type { Config, Context } from '@netlify/functions';

interface Subscriber {
  chatId: number;
  username?: string;
  firstName: string;
  subscribedAt: string;
  alertTypes: string[];
  active: boolean;
}

interface SubscriberData {
  lastUpdated: string;
  subscribers: Subscriber[];
}

// Load subscribers from GitHub
async function loadSubscribers(): Promise<SubscriberData> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return { lastUpdated: new Date().toISOString(), subscribers: [] };
  }

  const url = `https://api.github.com/repos/${repo}/contents/data/telegram-subscribers.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to load subscribers:', e);
  }

  return { lastUpdated: new Date().toISOString(), subscribers: [] };
}

// Send message via Telegram Bot API
async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error(`Failed to send to ${chatId}:`, e);
    return false;
  }
}

export default async (req: Request, context: Context) => {
  // Check if Telegram bot is configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.log('Telegram alerts skipped - TELEGRAM_BOT_TOKEN not set');
    return new Response(JSON.stringify({
      success: true,
      skipped: true,
      message: 'Telegram bot not configured',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { alertType, message, data } = body;

    if (!alertType || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing alertType or message',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Load subscribers
    const subscriberData = await loadSubscribers();
    const activeSubscribers = subscriberData.subscribers.filter(
      s => s.active && s.alertTypes.includes(alertType)
    );

    console.log(`Sending ${alertType} alert to ${activeSubscribers.length} subscribers`);

    let sentCount = 0;
    let failedCount = 0;

    // Send to all active subscribers with rate limiting
    for (const subscriber of activeSubscribers) {
      const success = await sendTelegramMessage(subscriber.chatId, message);
      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return new Response(JSON.stringify({
      success: true,
      alertType,
      totalSubscribers: activeSubscribers.length,
      sent: sentCount,
      failed: failedCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Send alert error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Helper function to format signal alerts
export function formatSignalAlert(data: {
  direction: string;
  price: number;
  confidence: number;
  target?: number;
}): string {
  const emoji = data.direction === 'up' ? '🟢' : data.direction === 'down' ? '🔴' : '⚪';
  const directionText = data.direction === 'up' ? 'BULLISH' : data.direction === 'down' ? 'BEARISH' : 'NEUTRAL';

  let message = `${emoji} <b>BTC Signal Alert</b>\n\n`;
  message += `Direction: <b>${directionText}</b>\n`;
  message += `Price: $${data.price.toLocaleString()}\n`;
  message += `Confidence: ${data.confidence}%\n`;
  if (data.target) {
    message += `Target: $${data.target.toLocaleString()}\n`;
  }
  message += `\n📊 btctradingsignalai.netlify.app`;

  return message;
}

export function formatFundingAlert(data: {
  rate: number;
  exchange: string;
}): string {
  const emoji = data.rate > 0 ? '🔥' : '❄️';
  const direction = data.rate > 0 ? 'positive' : 'negative';

  return `${emoji} <b>Funding Rate Spike</b>\n\nRate: ${(data.rate * 100).toFixed(4)}% (${direction})\nExchange: ${data.exchange}\n\nExtreme funding often precedes volatility.\n\n📊 btctradingsignalai.netlify.app`;
}

export function formatSqueezeAlert(data: {
  type: 'long' | 'short';
  riskLevel: string;
}): string {
  const emoji = data.type === 'long' ? '📉' : '📈';
  const typeText = data.type === 'long' ? 'Long Squeeze' : 'Short Squeeze';

  return `${emoji} <b>${typeText} Risk</b>\n\nRisk Level: ${data.riskLevel}\nType: ${data.type.toUpperCase()} positions at risk\n\nConsider reducing leverage.\n\n📊 btctradingsignalai.netlify.app`;
}
