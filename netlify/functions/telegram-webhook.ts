// Telegram Bot Webhook Handler
// Phase 6 Sprint 3: Telegram Alert Integration
import type { Config, Context } from '@netlify/functions';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
}

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

// Save subscribers to GitHub
async function saveSubscribers(data: SubscriberData): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return false;

  const path = 'data/telegram-subscribers.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const content = JSON.stringify(data, null, 2);
    const body: any = {
      message: `Update Telegram subscribers: ${data.subscribers.length} total`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    return res.ok;
  } catch (e) {
    console.error('Failed to save subscribers:', e);
    return false;
  }
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
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to send Telegram message:', e);
    return false;
  }
}

export default async (req: Request, context: Context) => {
  // Check if Telegram bot is configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.log('Telegram bot not configured - TELEGRAM_BOT_TOKEN not set');
    return new Response(JSON.stringify({
      success: true,
      skipped: true,
      message: 'Telegram bot not configured',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Handle webhook from Telegram
  if (req.method === 'POST') {
    try {
      const update: TelegramUpdate = await req.json();
      console.log('Telegram update:', JSON.stringify(update));

      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.toLowerCase().trim();
        const firstName = update.message.from.first_name;
        const username = update.message.from.username;

        const subscriberData = await loadSubscribers();

        if (text === '/start' || text === '/subscribe') {
          // Subscribe user
          const existingIndex = subscriberData.subscribers.findIndex(s => s.chatId === chatId);

          if (existingIndex >= 0) {
            subscriberData.subscribers[existingIndex].active = true;
            await sendTelegramMessage(chatId,
              `Welcome back, ${firstName}! 🎉\n\nYou're already subscribed to BTC Signal AI alerts.\n\nCommands:\n/status - Check subscription\n/alerts - Manage alert types\n/stop - Unsubscribe`
            );
          } else {
            subscriberData.subscribers.push({
              chatId,
              username,
              firstName,
              subscribedAt: new Date().toISOString(),
              alertTypes: ['signals', 'funding_spike', 'squeeze'],
              active: true,
            });
            await sendTelegramMessage(chatId,
              `Welcome to BTC Signal AI, ${firstName}! 🚀\n\nYou'll now receive:\n• Daily trading signals\n• Funding rate spikes (>0.05%)\n• Squeeze risk alerts\n\nCommands:\n/status - Check subscription\n/alerts - Manage alert types\n/stop - Unsubscribe`
            );
          }

          subscriberData.lastUpdated = new Date().toISOString();
          await saveSubscribers(subscriberData);

        } else if (text === '/stop' || text === '/unsubscribe') {
          // Unsubscribe user
          const existingIndex = subscriberData.subscribers.findIndex(s => s.chatId === chatId);
          if (existingIndex >= 0) {
            subscriberData.subscribers[existingIndex].active = false;
            subscriberData.lastUpdated = new Date().toISOString();
            await saveSubscribers(subscriberData);
          }
          await sendTelegramMessage(chatId,
            `You've been unsubscribed, ${firstName}. 👋\n\nYou can resubscribe anytime with /start`
          );

        } else if (text === '/status') {
          const subscriber = subscriberData.subscribers.find(s => s.chatId === chatId);
          if (subscriber && subscriber.active) {
            await sendTelegramMessage(chatId,
              `📊 <b>Subscription Status</b>\n\nStatus: ✅ Active\nAlert types: ${subscriber.alertTypes.join(', ')}\nSubscribed: ${new Date(subscriber.subscribedAt).toLocaleDateString()}`
            );
          } else {
            await sendTelegramMessage(chatId,
              `📊 <b>Subscription Status</b>\n\nStatus: ❌ Not subscribed\n\nUse /start to subscribe`
            );
          }

        } else if (text === '/alerts') {
          await sendTelegramMessage(chatId,
            `🔔 <b>Alert Types</b>\n\n• <b>signals</b> - Daily trading signals\n• <b>funding_spike</b> - Funding rate >0.05%\n• <b>squeeze</b> - Squeeze risk alerts\n• <b>price_targets</b> - Price target hits\n\nAll alerts are enabled by default.`
          );

        } else if (text === '/help') {
          await sendTelegramMessage(chatId,
            `🤖 <b>BTC Signal AI Bot</b>\n\nCommands:\n/start - Subscribe to alerts\n/stop - Unsubscribe\n/status - Check subscription\n/alerts - View alert types\n/help - Show this message\n\nVisit: btctradingsignalai.netlify.app`
          );

        } else {
          await sendTelegramMessage(chatId,
            `I didn't understand that command. Type /help for available commands.`
          );
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error: any) {
      console.error('Telegram webhook error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('OK', { status: 200 });
};
