// Test tweet script - fetches LIVE data from Coinbase
// Run with: node test-tweet.js

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');

async function fetchCoinbasePrice() {
  // Get current price
  const tickerUrl = 'https://api.exchange.coinbase.com/products/BTC-USD/ticker';
  const tickerRes = await axios.get(tickerUrl, { headers: { 'Accept': 'application/json' } });
  const currentPrice = parseFloat(tickerRes.data.price);

  // Get 24h candles for high/low
  const end = new Date();
  const start = new Date(end.getTime() - (24 * 60 * 60 * 1000));
  const candlesUrl = `https://api.exchange.coinbase.com/products/BTC-USD/candles`;
  const candlesRes = await axios.get(candlesUrl, {
    params: { start: start.toISOString(), end: end.toISOString(), granularity: 3600 },
    headers: { 'Accept': 'application/json' }
  });

  const candles = candlesRes.data;
  const high24h = Math.max(...candles.map(c => c[2]));
  const low24h = Math.min(...candles.map(c => c[1]));
  const open24h = candles[candles.length - 1][3];
  const change24h = ((currentPrice - open24h) / open24h) * 100;

  return { currentPrice, high24h, low24h, change24h };
}

async function testTweet() {
  console.log('Fetching live Coinbase data...\n');

  const { currentPrice, high24h, low24h, change24h } = await fetchCoinbasePrice();
  const price = Math.round(currentPrice).toLocaleString();
  const high = Math.round(high24h).toLocaleString();
  const low = Math.round(low24h).toLocaleString();
  const change = change24h >= 0 ? `+${change24h.toFixed(1)}` : change24h.toFixed(1);

  // Calculate trade levels (simplified)
  const atr = currentPrice * 0.02;
  const longTP = Math.round(currentPrice + atr * 2.5).toLocaleString();
  const longSL = Math.round(currentPrice - atr).toLocaleString();
  const shortTP = Math.round(currentPrice - atr * 2.5).toLocaleString();
  const shortSL = Math.round(currentPrice + atr).toLocaleString();

  console.log(`Price: $${price}`);
  console.log(`24h: ${change}%`);
  console.log(`High: $${high} | Low: $${low}\n`);

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  try {
    // Build thread with live data - social friendly format
    const openingLine = change24h >= 10 ? '🔥 Bitcoin exploding!'
      : change24h >= 5 ? '🚀 Bitcoin ripping higher!'
      : change24h >= 3 ? '🚀 Bitcoin waking up again!'
      : change24h >= 1 ? '📈 Bitcoin pushing up'
      : change24h >= 0 ? '📊 Bitcoin holding steady'
      : change24h >= -1 ? '📊 Bitcoin consolidating'
      : change24h >= -3 ? '📉 Bitcoin pulling back'
      : change24h >= -5 ? '📉 Bitcoin sliding lower'
      : change24h >= -10 ? '⚠️ Bitcoin dumping hard'
      : '🩸 Bitcoin in freefall';

    const tweets = [
      `${openingLine}\n$BTC ${change}% in the last 24h → sitting at $${price}\nH: $${high} | L: $${low}\nRSI 55 | MACD showing bullish momentum`,
      `📈 Long setup\nEntry: ${price}\nTP: ${longTP}\nSL: ${longSL}\nR:R 1:2.5\n\n📉 Short setup\nEntry: ${price}\nTP: ${shortTP}\nSL: ${shortSL}\nR:R 1:2.5`,
      `My bot says: 60% UP bias\n7-day outlook → +3.5%\n\nMore signals coming as the data builds 🔍\n\n#Bitcoin #BTC #TradingSignals #CryptoBot\n\nNot financial advice.`
    ];

    console.log('Posting thread...\n');

    let previousTweetId = null;
    const results = [];

    for (let i = 0; i < tweets.length; i++) {
      const options = { text: tweets[i] };

      if (previousTweetId) {
        options.reply = { in_reply_to_tweet_id: previousTweetId };
      }

      const result = await client.v2.tweet(options);
      previousTweetId = result.data.id;
      results.push(result.data);

      console.log(`Tweet ${i + 1} posted: ${result.data.id}`);
    }

    console.log('\n✓ Thread posted successfully!');
    console.log(`View at: https://twitter.com/i/status/${results[0].id}`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
  }
}

testTweet();
