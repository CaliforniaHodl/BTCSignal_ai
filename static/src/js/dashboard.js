// Premium Dashboard JavaScript
// Uses pre-fetched static snapshot for market data
// Requires: shared.js
(function() {
  const GITHUB_POSTS_URL = 'https://api.github.com/repos/CaliforniaHodl/BTCSignal_ai/contents/content/posts';

  // Market snapshot data (use shared loader)
  let marketData = null;

  // Load static market snapshot using shared utility
  async function loadMarketSnapshot() {
    marketData = await BTCSAIShared.loadMarketSnapshot();
  }

  // Check if user has access using shared utility
  function hasAccess() {
    // Use shared access check first
    if (BTCSAIShared.checkAccess()) {
      return true;
    }

    // Fallback: check legacy unlockedPosts
    const unlocked = localStorage.getItem('unlockedPosts');
    if (unlocked) {
      try {
        const posts = JSON.parse(unlocked);
        if (Array.isArray(posts) && posts.length > 0) {
          return true;
        }
      } catch {
        // ignore
      }
    }

    // Also check btcsai_unlocked_posts
    const btcsaiPosts = localStorage.getItem('btcsai_unlocked_posts');
    if (btcsaiPosts) {
      try {
        const posts = JSON.parse(btcsaiPosts);
        if (Array.isArray(posts) && posts.length > 0) {
          return true;
        }
      } catch {
        // ignore
      }
    }

    return false;
  }

  // Initialize dashboard
  function init() {
    const lockedDiv = document.getElementById('dashboard-locked');
    const contentDiv = document.getElementById('dashboard-content');

    if (!lockedDiv || !contentDiv) return;

    if (hasAccess()) {
      lockedDiv.style.display = 'none';
      contentDiv.style.display = 'block';
      loadDashboardData();
    } else {
      lockedDiv.style.display = 'flex';
      contentDiv.style.display = 'none';
    }
  }

  // OHLC candle data for accurate win/loss checking
  let ohlcCandles = [];
  let currentBtcPrice = null;

  // Load all dashboard data
  async function loadDashboardData() {
    // Load static market snapshot first
    await loadMarketSnapshot();

    // Use OHLC candles and price from snapshot if available
    if (marketData && marketData.ohlc && marketData.ohlc.days30) {
      ohlcCandles = marketData.ohlc.days30;
    }
    if (marketData && marketData.btc && marketData.btc.price) {
      currentBtcPrice = marketData.btc.price;
    }

    // Fallback: fetch live price if snapshot doesn't have it
    if (!currentBtcPrice) {
      try {
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const priceData = await priceRes.json();
        currentBtcPrice = priceData.bitcoin?.usd || null;
      } catch (e) {
        console.error('Failed to fetch BTC price:', e);
      }
    }

    await Promise.all([
      loadPerformanceStats(),
      loadCurrentPrice(),
      loadFearGreedIndex(),
      loadFundingRates()
    ]);
  }

  // Load Fear & Greed Index from static snapshot
  function loadFearGreedIndex() {
    const fngValue = document.getElementById('fng-value');
    const fngLabel = document.getElementById('fng-label');
    const fngBar = document.getElementById('fng-bar');

    if (!marketData || !marketData.fearGreed) {
      if (fngValue) fngValue.textContent = '--';
      return;
    }

    const value = marketData.fearGreed.value;
    const classification = marketData.fearGreed.label;

    if (fngValue) fngValue.textContent = value;
    if (fngLabel) fngLabel.textContent = classification;
    if (fngBar) {
      fngBar.style.width = value + '%';
      // Color based on value
      if (value <= 25) {
        fngBar.style.background = '#ef4444'; // Extreme Fear - Red
      } else if (value <= 45) {
        fngBar.style.background = '#f97316'; // Fear - Orange
      } else if (value <= 55) {
        fngBar.style.background = '#eab308'; // Neutral - Yellow
      } else if (value <= 75) {
        fngBar.style.background = '#84cc16'; // Greed - Light Green
      } else {
        fngBar.style.background = '#22c55e'; // Extreme Greed - Green
      }
    }
  }

  // Load Funding Rates from static snapshot
  function loadFundingRates() {
    const fundingEl = document.getElementById('funding-rate');
    const fundingLabel = document.getElementById('funding-label');

    if (!marketData || !marketData.funding) {
      if (fundingEl) fundingEl.textContent = '--';
      return;
    }

    const rate = marketData.funding.ratePercent;

    if (fundingEl) {
      fundingEl.textContent = rate.toFixed(4) + '%';
      fundingEl.className = 'metric-value ' + (rate >= 0 ? 'positive' : 'negative');
    }
    if (fundingLabel) {
      if (rate > 0.01) {
        fundingLabel.textContent = 'Longs pay shorts';
      } else if (rate < -0.01) {
        fundingLabel.textContent = 'Shorts pay longs';
      } else {
        fundingLabel.textContent = 'Neutral';
      }
    }
  }

  // Fetch posts from GitHub and calculate stats
  async function loadPerformanceStats() {
    try {
      const response = await fetch(GITHUB_POSTS_URL);

      if (!response.ok) {
        throw new Error('GitHub API returned ' + response.status);
      }

      const files = await response.json();

      // Check if we got an array (might be rate limited or error)
      if (!Array.isArray(files)) {
        console.error('GitHub API did not return an array:', files);
        displayErrorStats();
        return;
      }

      // Filter markdown files (exclude _index.md)
      const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== '_index.md');

      if (mdFiles.length === 0) {
        console.log('No posts found');
        displayErrorStats();
        return;
      }

      // Fetch content of each file to get frontmatter (parallel fetch for speed)
      const fetchPromises = mdFiles.slice(0, 50).map(async (file) => {
        try {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();
          const frontmatter = parseFrontmatter(content);
          return frontmatter;
        } catch (e) {
          console.error('Error fetching post:', file.name, e);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      const posts = results.filter(p => p !== null);

      if (posts.length === 0) {
        displayErrorStats();
        return;
      }

      // Calculate stats
      const stats = calculateStats(posts);
      displayStats(stats);
      renderCallsTable(posts);
      renderCalendarHeatmap(posts);

      // Calculate and display simulated portfolio
      const portfolioData = calculatePortfolio(posts);
      displayPortfolio(portfolioData);
    } catch (e) {
      console.error('Error loading performance stats:', e);
      displayErrorStats();
    }
  }

  // Display error state for stats
  function displayErrorStats() {
    const elements = ['win-count', 'loss-count', 'win-rate', 'current-streak'];
    elements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });

    // Also update advanced metrics
    const advancedElements = ['avg-r-multiple', 'max-drawdown', 'long-bias'];
    advancedElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });
  }

  // Parse YAML frontmatter from markdown
  function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const data = {};

    yaml.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        // Parse numbers
        if (!isNaN(value) && value !== '') {
          value = parseFloat(value);
        }
        data[key] = value;
      }
    });

    return data;
  }

  // Calculate win/loss stats
  function calculateStats(posts) {
    let wins = 0;
    let losses = 0;
    let currentStreak = 0;
    let streakType = null;

    // Sort by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    posts.forEach((post, index) => {
      const outcome = determineOutcome(post, currentBtcPrice);

      if (outcome === 'win') {
        wins++;
        if (index === 0 || streakType === 'win') {
          currentStreak++;
          streakType = 'win';
        }
      } else if (outcome === 'loss') {
        losses++;
        if (index === 0 || streakType === 'loss') {
          currentStreak++;
          streakType = 'loss';
        }
      }
    });

    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    return {
      wins,
      losses,
      winRate,
      currentStreak,
      streakType,
      posts
    };
  }

  // Check if price touched stop loss or take profit using OHLC candles
  function checkPriceTouched(sinceTimestamp, targetPrice, stopLoss, direction) {
    if (!ohlcCandles || ohlcCandles.length === 0) return 'pending';

    // Filter candles since the signal was made
    // OHLC format: [timestamp, open, high, low, close]
    const relevantCandles = ohlcCandles.filter(c => c[0] >= sinceTimestamp);

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

  // Determine if a call was a win or loss using OHLC candle data
  // Rules:
  // 1. Call stays PENDING for minimum 24 hours
  // 2. EXCEPTION: If stop loss or take profit is touched, resolve immediately
  // 3. After 7 days, force resolve based on current P&L
  function determineOutcome(post, currentPrice) {
    // If explicit result is stored (check both field names), use it
    const storedResult = post.callResult || post.result;
    if (storedResult) {
      const result = storedResult.toLowerCase();
      // Return the stored result (win, loss, or pending)
      // Trust the stored value - it's set by the system when resolving trades
      return result;
    }

    // Use OHLC candle checking for accurate win/loss detection
    if (!post.date || !post.price) return 'pending';

    const entryPrice = post.price;
    const targetPrice = post.targetPrice;
    const direction = (post.direction || post.sentiment || '').toLowerCase();
    const postTimestamp = new Date(post.date).getTime();
    const now = Date.now();
    const timeSinceCall = now - postTimestamp;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Use actual stop loss from post, or default to 2% from entry
    const stopLoss = post.stopLoss || (direction === 'up' || direction === 'bullish'
      ? entryPrice * 0.98
      : entryPrice * 1.02);

    // Check OHLC candles to see if price touched stop loss or target
    const result = checkPriceTouched(postTimestamp, targetPrice, stopLoss, direction);

    // RULE: Stop loss or take profit touched = resolve immediately
    if (result !== 'pending') {
      return result;
    }

    // RULE: Less than 24 hours and no stop/target touched = pending
    if (timeSinceCall < TWENTY_FOUR_HOURS_MS) {
      return 'pending';
    }

    // RULE: After 7 days, force resolve based on current price
    if (timeSinceCall > SEVEN_DAYS_MS && currentPrice) {
      if (direction === 'up' || direction === 'bullish') {
        return currentPrice >= entryPrice ? 'win' : 'loss';
      } else if (direction === 'down' || direction === 'bearish') {
        return currentPrice <= entryPrice ? 'win' : 'loss';
      }
    }

    // Between 24h and 7 days, no stop/target touched = stays pending
    return 'pending';
  }

  // Display stats in the UI
  function displayStats(stats) {
    document.getElementById('win-count').textContent = stats.wins;
    document.getElementById('loss-count').textContent = stats.losses;
    document.getElementById('win-rate').textContent = stats.winRate + '%';

    const streakPrefix = stats.streakType === 'win' ? '🔥 ' : '❄️ ';
    document.getElementById('current-streak').textContent =
      stats.currentStreak > 0 ? streakPrefix + stats.currentStreak : '-';

    // Calculate and display advanced metrics
    displayAdvancedMetrics(stats);
  }

  // Calculate and display advanced metrics
  function displayAdvancedMetrics(stats) {
    const posts = stats.posts || [];

    // Calculate Average R-Multiple (simplified: based on wins/losses)
    // R = reward/risk. For simplicity, win = +1R, loss = -1R
    const rMultiples = posts.map(p => {
      const outcome = determineOutcome(p, currentBtcPrice);
      if (outcome === 'win') return 1.0;
      if (outcome === 'loss') return -1.0;
      return 0;
    }).filter(r => r !== 0);

    const avgR = rMultiples.length > 0
      ? (rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)
      : '--';
    const avgREl = document.getElementById('avg-r-multiple');
    if (avgREl) {
      avgREl.textContent = avgR !== '--' ? avgR + 'R' : '--';
      avgREl.className = 'stat-number ' + (parseFloat(avgR) > 0 ? 'positive' : parseFloat(avgR) < 0 ? 'negative' : '');
    }

    // Calculate Max Drawdown (consecutive losses)
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    posts.forEach(p => {
      const outcome = determineOutcome(p, currentBtcPrice);
      if (outcome === 'loss') {
        currentDrawdown++;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      } else if (outcome === 'win') {
        currentDrawdown = 0;
      }
    });
    const drawdownEl = document.getElementById('max-drawdown');
    if (drawdownEl) {
      drawdownEl.textContent = maxDrawdown > 0 ? maxDrawdown + ' streak' : '0';
    }

    // Calculate Directional Bias (long vs short preference)
    let longCount = 0;
    let shortCount = 0;
    posts.forEach(p => {
      const dir = (p.direction || p.sentiment || '').toLowerCase();
      if (dir === 'up' || dir === 'bullish' || dir === 'long') {
        longCount++;
      } else if (dir === 'down' || dir === 'bearish' || dir === 'short') {
        shortCount++;
      }
    });
    const total = longCount + shortCount;
    const biasEl = document.getElementById('long-bias');
    if (biasEl) {
      if (total > 0) {
        const longPct = ((longCount / total) * 100).toFixed(0);
        if (longCount > shortCount) {
          biasEl.textContent = longPct + '% Long';
          biasEl.className = 'stat-number positive';
        } else if (shortCount > longCount) {
          biasEl.textContent = (100 - parseInt(longPct)) + '% Short';
          biasEl.className = 'stat-number negative';
        } else {
          biasEl.textContent = 'Neutral';
          biasEl.className = 'stat-number';
        }
      } else {
        biasEl.textContent = '--';
      }
    }
  }

  // Charts removed - Win/Loss and Confidence charts no longer displayed

  // Render recent calls table
  function renderCallsTable(posts) {
    const tbody = document.getElementById('calls-table-body');
    if (!tbody) return;

    const recentPosts = posts.slice(0, 10);
    tbody.innerHTML = recentPosts.map(post => {
      const outcome = determineOutcome(post, currentBtcPrice);
      const outcomeClass = outcome === 'win' ? 'win' : outcome === 'loss' ? 'loss' : 'pending';
      const outcomeText = outcome === 'win' ? '✅ Win' : outcome === 'loss' ? '❌ Loss' : '⏳ Pending';
      const direction = post.direction || post.sentiment || '-';
      const directionEmoji = direction === 'up' || direction === 'bullish' ? '📈' :
                            direction === 'down' || direction === 'bearish' ? '📉' : '➡️';

      return '<tr class="' + outcomeClass + '">' +
        '<td>' + formatDate(post.date) + '</td>' +
        '<td>' + directionEmoji + ' ' + (direction.toUpperCase()) + '</td>' +
        '<td>$' + (post.price || '-') + '</td>' +
        '<td>' + (post.confidence || '-') + '%</td>' +
        '<td class="result-' + outcomeClass + '">' + outcomeText + '</td>' +
      '</tr>';
    }).join('');
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Load current BTC price using shared utility
  async function loadCurrentPrice() {
    const price = await BTCSAIShared.fetchBTCPrice();
    const el = document.getElementById('current-btc-price');
    if (el) {
      el.textContent = price ? BTCSAIShared.formatPrice(price) : 'Error';
    }
    if (price) {
      calculateLiquidationLevels(price);
    }
  }

  // Calculate potential liquidation levels based on current price
  function calculateLiquidationLevels(currentPrice) {
    const leverageLevels = [
      { leverage: 100, distance: 0.01 },
      { leverage: 50, distance: 0.02 },
      { leverage: 25, distance: 0.04 },
      { leverage: 10, distance: 0.10 }
    ];

    const longLiquidations = leverageLevels.map(l => ({
      price: currentPrice * (1 - l.distance),
      leverage: l.leverage + 'x',
      distance: (l.distance * 100).toFixed(1) + '%'
    }));

    const shortLiquidations = leverageLevels.map(l => ({
      price: currentPrice * (1 + l.distance),
      leverage: l.leverage + 'x',
      distance: (l.distance * 100).toFixed(1) + '%'
    }));

    const longContainer = document.getElementById('long-liquidations');
    if (longContainer) {
      longContainer.innerHTML = longLiquidations.map(l =>
        '<div class="liq-level">' +
          '<span class="price">$' + l.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</span>' +
          '<span class="leverage">' + l.leverage + '</span>' +
          '<span class="distance">-' + l.distance + '</span>' +
        '</div>'
      ).join('');
    }

    const shortContainer = document.getElementById('short-liquidations');
    if (shortContainer) {
      shortContainer.innerHTML = shortLiquidations.map(l =>
        '<div class="liq-level">' +
          '<span class="price">$' + l.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</span>' +
          '<span class="leverage">' + l.leverage + '</span>' +
          '<span class="distance">+' + l.distance + '</span>' +
        '</div>'
      ).join('');
    }
  }

  // Render calendar heatmap with clickable links to posts
  function renderCalendarHeatmap(posts) {
    const container = document.getElementById('calendar-heatmap');
    if (!container) return;

    // Get last 90 days
    const today = new Date();
    const days = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }

    // Map posts to dates with outcome and URL
    const postsByDate = {};
    posts.forEach(post => {
      if (post.date) {
        const dateKey = post.date.split('T')[0];
        const outcome = determineOutcome(post, currentBtcPrice);
        // Generate post URL from date (format: /posts/YYYY-MM-DD-HHMM-btc-usd/)
        const postDate = new Date(post.date);
        const urlDate = postDate.toISOString().split('T')[0];
        const urlTime = postDate.toISOString().split('T')[1].substring(0, 5).replace(':', '');
        const postUrl = '/posts/' + urlDate + '-' + urlTime + '-btc-usd/';
        postsByDate[dateKey] = { outcome, url: postUrl };
      }
    });

    // Render grid with links
    const html = days.map(day => {
      const postData = postsByDate[day];
      let className = 'cal-day';
      let title = day;
      let linkStart = '';
      let linkEnd = '';

      if (postData) {
        linkStart = '<a href="' + postData.url + '" class="cal-day-link">';
        linkEnd = '</a>';

        if (postData.outcome === 'win') {
          className += ' win';
          title += ' - Win (click to view)';
        } else if (postData.outcome === 'loss') {
          className += ' loss';
          title += ' - Loss (click to view)';
        } else if (postData.outcome === 'pending') {
          className += ' pending';
          title += ' - Pending (click to view)';
        }
      }

      return linkStart + '<div class="' + className + '" title="' + title + '"></div>' + linkEnd;
    }).join('');

    container.innerHTML = html;
  }

  // ========================================
  // SIMULATED PORTFOLIO TRACKER
  // ========================================

  const PORTFOLIO_CONFIG = {
    startingCapital: 10000,
    positionSizePercent: 0.005, // 0.5%
    leverage: 1
  };

  // Calculate simulated portfolio performance from posts
  function calculatePortfolio(posts) {
    const trades = [];
    let balance = PORTFOLIO_CONFIG.startingCapital;
    const equityCurve = [{ date: null, balance: balance }];

    // Sort posts by date (oldest first)
    const sortedPosts = [...posts].sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    sortedPosts.forEach(post => {
      const outcome = determineOutcome(post, currentBtcPrice);

      // Only count resolved trades (not pending)
      if (outcome === 'pending') return;

      const entryPrice = post.price;
      const targetPrice = post.targetPrice;
      const stopLoss = post.stopLoss;
      const direction = (post.direction || post.sentiment || '').toLowerCase();

      if (!entryPrice) return;

      // Calculate position size (0.05% of current balance)
      const positionSize = balance * PORTFOLIO_CONFIG.positionSizePercent;

      // Calculate P&L based on outcome
      let pnl = 0;
      let exitPrice = entryPrice;

      if (outcome === 'win') {
        // Win: price hit target
        if (targetPrice) {
          exitPrice = targetPrice;
          if (direction === 'up' || direction === 'bullish') {
            // Long: profit = (exit - entry) / entry * position
            pnl = ((targetPrice - entryPrice) / entryPrice) * positionSize;
          } else {
            // Short: profit = (entry - exit) / entry * position
            pnl = ((entryPrice - targetPrice) / entryPrice) * positionSize;
          }
        } else {
          // Default 2% gain if no target
          pnl = positionSize * 0.02;
          exitPrice = direction === 'up' || direction === 'bullish'
            ? entryPrice * 1.02
            : entryPrice * 0.98;
        }
      } else if (outcome === 'loss') {
        // Loss: price hit stop
        if (stopLoss) {
          exitPrice = stopLoss;
          if (direction === 'up' || direction === 'bullish') {
            // Long: loss = (stop - entry) / entry * position (negative)
            pnl = ((stopLoss - entryPrice) / entryPrice) * positionSize;
          } else {
            // Short: loss = (entry - stop) / entry * position (negative)
            pnl = ((entryPrice - stopLoss) / entryPrice) * positionSize;
          }
        } else {
          // Default 2% loss if no stop
          pnl = -positionSize * 0.02;
          exitPrice = direction === 'up' || direction === 'bullish'
            ? entryPrice * 0.98
            : entryPrice * 1.02;
        }
      }

      // Update balance
      balance += pnl;

      // Record trade
      trades.push({
        date: post.date,
        direction: direction,
        entry: entryPrice,
        exit: exitPrice,
        pnl: pnl,
        balance: balance,
        outcome: outcome
      });

      // Add to equity curve
      equityCurve.push({
        date: post.date,
        balance: balance
      });
    });

    return { trades, balance, equityCurve };
  }

  // Display portfolio data
  function displayPortfolio(portfolioData) {
    const { trades, balance, equityCurve } = portfolioData;

    // Update balance display
    const balanceEl = document.getElementById('portfolio-balance');
    const changeEl = document.getElementById('portfolio-change');

    if (balanceEl) {
      balanceEl.textContent = '$' + balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      balanceEl.className = 'portfolio-value ' + (balance >= PORTFOLIO_CONFIG.startingCapital ? 'positive' : 'negative');
    }

    if (changeEl) {
      const change = balance - PORTFOLIO_CONFIG.startingCapital;
      const changePercent = (change / PORTFOLIO_CONFIG.startingCapital) * 100;
      const sign = change >= 0 ? '+' : '';
      changeEl.innerHTML =
        '<span class="change-amount ' + (change >= 0 ? 'positive' : 'negative') + '">' + sign + '$' + change.toFixed(2) + '</span>' +
        '<span class="change-percent">(' + sign + changePercent.toFixed(2) + '%)</span>';
    }

    // Calculate stats
    const winningTrades = trades.filter(t => t.outcome === 'win');
    const losingTrades = trades.filter(t => t.outcome === 'loss');
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;
    const bestTrade = trades.length > 0
      ? Math.max(...trades.map(t => t.pnl))
      : 0;

    // Update stats
    const statsMap = {
      'portfolio-total-trades': trades.length,
      'portfolio-winning-trades': winningTrades.length,
      'portfolio-losing-trades': losingTrades.length,
      'portfolio-avg-win': '+$' + avgWin.toFixed(2),
      'portfolio-avg-loss': '$' + avgLoss.toFixed(2),
      'portfolio-best-trade': '+$' + bestTrade.toFixed(2)
    };

    Object.keys(statsMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = statsMap[id];
    });

    // Update risk per trade
    const riskEl = document.getElementById('portfolio-risk-per-trade');
    if (riskEl) {
      const risk = balance * PORTFOLIO_CONFIG.positionSizePercent;
      riskEl.textContent = '$' + risk.toFixed(2);
    }

    // Render trade history table
    renderPortfolioTrades(trades);

    // Render equity curve chart
    renderEquityCurve(equityCurve);
  }

  // Render portfolio trades table
  function renderPortfolioTrades(trades) {
    const tbody = document.getElementById('portfolio-trades-body');
    if (!tbody) return;

    if (trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-trades">No resolved trades yet</td></tr>';
      return;
    }

    // Show most recent first (reverse)
    const recentTrades = [...trades].reverse().slice(0, 20);

    tbody.innerHTML = recentTrades.map(trade => {
      const date = new Date(trade.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dirIcon = trade.direction === 'up' || trade.direction === 'bullish' ? '📈' : '📉';
      const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
      const pnlSign = trade.pnl >= 0 ? '+' : '';

      return '<tr class="' + trade.outcome + '">' +
        '<td>' + dateStr + '</td>' +
        '<td>' + dirIcon + ' ' + (trade.direction === 'up' || trade.direction === 'bullish' ? 'Long' : 'Short') + '</td>' +
        '<td>$' + trade.entry.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td>' +
        '<td>$' + trade.exit.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td>' +
        '<td class="' + pnlClass + '">' + pnlSign + '$' + trade.pnl.toFixed(2) + '</td>' +
        '<td>$' + trade.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
    }).join('');
  }

  // Render equity curve chart
  function renderEquityCurve(equityCurve) {
    const canvas = document.getElementById('equityCurveChart');
    if (!canvas || equityCurve.length < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;
    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get min/max values
    const values = equityCurve.map(p => p.balance);
    const minVal = Math.min(...values) * 0.995;
    const maxVal = Math.max(...values) * 1.005;
    const range = maxVal - minVal;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw starting capital line
    const startY = padding.top + chartHeight - ((PORTFOLIO_CONFIG.startingCapital - minVal) / range) * chartHeight;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, startY);
    ctx.lineTo(width - padding.right, startY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw equity curve
    const isPositive = equityCurve[equityCurve.length - 1].balance >= PORTFOLIO_CONFIG.startingCapital;
    ctx.strokeStyle = isPositive ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    equityCurve.forEach((point, i) => {
      const x = padding.left + (i / (equityCurve.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((point.balance - minVal) / range) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
    ctx.fill();

    // Draw Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = maxVal - (range / 4) * i;
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText('$' + val.toLocaleString(undefined, { maximumFractionDigits: 0 }), padding.left - 5, y + 4);
    }

    // Draw X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Trades', width / 2, height - 5);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
