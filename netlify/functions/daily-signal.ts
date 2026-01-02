// BTCTradingBot - Ultra minimal version (no lib imports)
console.log('[daily-signal] Loading - no libs');

import type { Context } from '@netlify/functions';
import { TwitterApi } from 'twitter-api-v2';

export default async (req: Request, context: Context) => {
  console.log('[daily-signal] Handler started');

  if (!process.env.TWITTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'No Twitter credentials' }), { status: 400 });
  }

  try {
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });

    // Just post a test tweet
    const result = await twitterClient.v2.tweet('🔧 Bot test - please ignore');
    console.log('[daily-signal] Posted tweet:', result.data.id);

    return new Response(JSON.stringify({
      success: true,
      tweetId: result.data.id,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[daily-signal] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
