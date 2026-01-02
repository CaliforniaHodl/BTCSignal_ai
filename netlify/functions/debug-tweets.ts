// Debug function to test imports one by one
console.log('[DEBUG] Step 1: Starting');

import type { Context } from '@netlify/functions';
console.log('[DEBUG] Step 2: @netlify/functions imported');

import { TwitterApi } from 'twitter-api-v2';
console.log('[DEBUG] Step 3: twitter-api-v2 imported');

import { generateTradingBotTweets } from './lib/tweet-generator';
console.log('[DEBUG] Step 4: tweet-generator imported');

import { DataProvider } from './lib/data-provider';
console.log('[DEBUG] Step 5: data-provider imported');

export default async (req: Request, context: Context) => {
  console.log('[DEBUG] Handler called');
  return new Response(JSON.stringify({ success: true, message: 'All imports OK' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
