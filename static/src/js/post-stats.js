// Real-time Historical Performance Calculator with OHLC candle checks
(function() {
  const GITHUB_POSTS_URL = 'https://api.github.com/repos/CaliforniaHodl/BTCSignal_ai/contents/content/posts';

  async function calculateRealTimeStats() {
    try {
      // Fetch OHLC candles for the last 30 days to check stop loss/take profit hits
      const ohlcRes = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30');
      const ohlcData = await ohlcRes.json();

      // Get current BTC price
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const priceData = await priceRes.json();
      const currentPrice = priceData.bitcoin.usd;

      // Fetch all posts from GitHub
      const postsRes = await fetch(GITHUB_POSTS_URL);
      const files = await postsRes.json();

      if (!Array.isArray(files)) return;

      // Filter markdown files
      const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== '_index.md');

      // Fetch and parse each post (limit to last 30 for performance)
      const postPromises = mdFiles.slice(0, 30).map(async (file) => {
        try {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();
          return parseFrontmatter(content);
        } catch (e) {
          return null;
        }
      });

      const posts = (await Promise.all(postPromises)).filter(p => p !== null);

      // Calculate wins/losses by checking if stop loss or take profit was touched
      // Rules:
      // 1. Call stays PENDING for minimum 24 hours
      // 2. EXCEPTION: If stop loss or take profit is touched, resolve immediately
      // 3. After 7 days, force resolve based on current P&L
      let wins = 0;
      let losses = 0;
      let pending = 0;

      const now = Date.now();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      posts.forEach(post => {
        if (!post.direction || !post.price || !post.date) return;

        const entryPrice = post.price;
        const targetPrice = post.targetPrice;
        const direction = post.direction.toLowerCase();

        // Use actual stop loss from post, or default to 2% from entry
        const stopLoss = post.stopLoss || (direction === 'up' || direction === 'bullish'
          ? entryPrice * 0.98
          : entryPrice * 1.02);

        const postTimestamp = new Date(post.date).getTime();
        const timeSinceCall = now - postTimestamp;

        // Check OHLC candles to see if price touched stop loss or target
        const result = checkPriceTouched(ohlcData, postTimestamp, targetPrice, stopLoss, direction);

        // RULE: Stop loss or take profit touched = resolve immediately
        if (result === 'win') {
          wins++;
        } else if (result === 'loss') {
          losses++;
        }
        // RULE: Less than 24 hours and no stop/target touched = pending
        else if (timeSinceCall < TWENTY_FOUR_HOURS_MS) {
          pending++;
        }
        // RULE: After 7 days, force resolve based on current price
        else if (timeSinceCall > SEVEN_DAYS_MS) {
          if (direction === 'up' || direction === 'bullish') {
            if (currentPrice >= entryPrice) {
              wins++;
            } else {
              losses++;
            }
          } else if (direction === 'down' || direction === 'bearish') {
            if (currentPrice <= entryPrice) {
              wins++;
            } else {
              losses++;
            }
          }
        }
        // RULE: Between 24h and 7 days, no stop/target touched = stays pending
        else {
          pending++;
        }
      });

      const total = wins + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      // Update the display
      updateStatsDisplay(wins, losses, winRate, total);

    } catch (e) {
      console.error('Failed to calculate real-time stats:', e);
    }
  }

  // Check if price touched stop loss or take profit at any point since the signal
  function checkPriceTouched(ohlcData, sinceTimestamp, targetPrice, stopLoss, direction) {
    // Filter candles since the signal was made
    // OHLC format: [timestamp, open, high, low, close]
    const relevantCandles = ohlcData.filter(c => c[0] >= sinceTimestamp);

    for (const candle of relevantCandles) {
      const high = candle[2];
      const low = candle[3];

      if (direction === 'up' || direction === 'bullish') {
        // For bullish calls: check if low touched stop (loss) or high touched target (win)
        // Check stop loss FIRST - if both hit in same candle, stop loss takes priority
        if (stopLoss && low <= stopLoss) {
          return 'loss';
        }
        if (targetPrice && high >= targetPrice) {
          return 'win';
        }
      } else if (direction === 'down' || direction === 'bearish') {
        // For bearish calls: check if high touched stop (loss) or low touched target (win)
        // Check stop loss FIRST
        if (stopLoss && high >= stopLoss) {
          return 'loss';
        }
        if (targetPrice && low <= targetPrice) {
          return 'win';
        }
      }
    }

    return 'pending';
  }

  function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const data = {};

    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Remove quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        // Parse numbers
        if (!isNaN(parseFloat(value)) && value !== 'null') {
          data[key] = parseFloat(value);
        } else if (value === 'null') {
          data[key] = null;
        } else {
          data[key] = value;
        }
      }
    });

    return data;
  }

  function updateStatsDisplay(wins, losses, winRate, total) {
    // Update Track Record table in audit section
    const trackRecordCells = document.querySelectorAll('.audit-table td');
    trackRecordCells.forEach((cell, index) => {
      const prevCell = trackRecordCells[index - 1];
      if (prevCell && prevCell.textContent === 'Historical Wins') {
        cell.textContent = wins;
      } else if (prevCell && prevCell.textContent === 'Historical Losses') {
        cell.textContent = losses;
      } else if (prevCell && prevCell.textContent === 'Win Rate') {
        cell.textContent = winRate + '%';
      }
    });

    // Update Historical Performance section
    const backtestStats = document.querySelectorAll('.backtest-stat .backtest-value');
    backtestStats.forEach(stat => {
      const label = stat.previousElementSibling;
      if (label && label.textContent.includes('Sample Size')) {
        stat.textContent = total + ' signals';
      } else if (label && label.textContent.includes('Win Rate')) {
        stat.textContent = winRate + '%';
      }
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', calculateRealTimeStats);
  } else {
    calculateRealTimeStats();
  }
})();
