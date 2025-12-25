// BTCWhaleWatcher Twitter Posts - @BTCWhaleWatcher
// Posts whale alerts and daily summaries
import type { Config, Context } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';
import {
  generateWhaleWatcherTweets,
  generateSingleWhaleAlert,
  generateWhaleSummaryTweet,
  WhaleAlert
} from './lib/tweet-generator';

interface WhaleData {
  lastUpdated: string;
  alerts: WhaleAlert[];
  stats: {
    totalTracked24h: number;
    largestTx24h: number;
    exchangeInflow24h: number;
    exchangeOutflow24h: number;
  };
}

// Track which alerts we've already tweeted (stored in GitHub)
async function getPostedAlertIds(): Promise<Set<string>> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return new Set();

  const url = `https://api.github.com/repos/${repo}/contents/data/posted-whale-alerts.json`;

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
      const parsed = JSON.parse(content);
      return new Set(parsed.postedIds || []);
    }
  } catch (e) {
    console.error('Failed to load posted alert IDs:', e);
  }

  return new Set();
}

// Save posted alert IDs to GitHub
async function savePostedAlertIds(ids: string[]): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return false;

  const path = 'data/posted-whale-alerts.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file SHA
    let sha: string | undefined;
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // Keep only last 100 IDs to prevent file from growing too large
    const recentIds = ids.slice(-100);

    const content = JSON.stringify({
      lastUpdated: new Date().toISOString(),
      postedIds: recentIds,
    }, null, 2);

    const body: any = {
      message: 'Update posted whale alert IDs',
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

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
    console.error('Failed to save posted alert IDs:', e);
    return false;
  }
}

// Load whale alerts from GitHub
async function loadWhaleAlerts(): Promise<WhaleData | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return null;

  const url = `https://api.github.com/repos/${repo}/contents/static/data/whale-alerts.json`;

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
    console.error('Failed to load whale alerts:', e);
  }

  return null;
}

// Get current BTC price
async function getBTCPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await res.json();
    return parseFloat(data.price) || 95000;
  } catch (e) {
    return 95000; // Fallback
  }
}

export default async (req: Request, context: Context) => {
  console.log('BTCWhaleWatcher: Starting tweet generation...');

  // Check for Twitter credentials (REQUIRES separate WHALE_TWITTER_* env vars - no fallback)
  const apiKey = process.env.WHALE_TWITTER_API_KEY;
  const apiSecret = process.env.WHALE_TWITTER_API_SECRET;
  const accessToken = process.env.WHALE_TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.WHALE_TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('BTCWhaleWatcher: Skipping - WHALE_TWITTER_* credentials not configured');
    return new Response(JSON.stringify({
      success: true,
      skipped: true,
      message: 'Whale Twitter account not configured (WHALE_TWITTER_* env vars required)',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Initialize Twitter client for whale account
    const twitterClient = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    // Load whale data
    const whaleData = await loadWhaleAlerts();
    if (!whaleData || whaleData.alerts.length === 0) {
      console.log('No whale alerts to post');
      return new Response(JSON.stringify({
        success: true,
        message: 'No whale alerts to post',
        tweetsPosted: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Get already posted alert IDs
    const postedIds = await getPostedAlertIds();
    console.log(`Found ${postedIds.size} previously posted alerts`);

    // Filter to only new, high-confidence alerts
    const newAlerts = whaleData.alerts.filter(alert =>
      !postedIds.has(alert.id) &&
      (alert.confidence === 'high' || alert.confidence === 'medium') &&
      alert.amount_btc >= 500
    );

    console.log(`Found ${newAlerts.length} new alerts to post`);

    const postedTweets: { id: string; alertId: string }[] = [];
    const newPostedIds = [...postedIds];

    // Post individual whale alerts (max 5 per run to avoid rate limits)
    for (const alert of newAlerts.slice(0, 5)) {
      const tweetText = generateSingleWhaleAlert(alert);
      if (tweetText) {
        try {
          const result = await twitterClient.v2.tweet(tweetText);
          postedTweets.push({ id: result.data.id, alertId: alert.id });
          newPostedIds.push(alert.id);
          console.log(`Posted alert ${alert.id}: ${alert.amount_btc} BTC`);

          // Small delay between tweets
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (tweetError: any) {
          console.error(`Failed to post alert ${alert.id}:`, tweetError.message);
        }
      }
    }

    // Save updated posted IDs
    await savePostedAlertIds(newPostedIds);

    // Check if we should post a daily summary (once per day at specific hour)
    const currentHour = new Date().getUTCHours();
    const shouldPostSummary = currentHour === 0; // Post at midnight UTC

    let summaryPosted = false;
    if (shouldPostSummary && whaleData.stats.totalTracked24h > 0) {
      const btcPrice = await getBTCPrice();
      const summaryTweet = generateWhaleSummaryTweet(whaleData.stats, btcPrice);
      try {
        await twitterClient.v2.tweet(summaryTweet);
        summaryPosted = true;
        console.log('Posted daily summary');
      } catch (e: any) {
        console.error('Failed to post summary:', e.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      account: 'BTCWhaleWatcher',
      alertsPosted: postedTweets.length,
      tweets: postedTweets,
      summaryPosted,
      stats: whaleData.stats,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('BTCWhaleWatcher error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Note: Schedule removed - run on-demand only
