// Premium Dashboard JavaScript
(function() {
  const GITHUB_POSTS_URL = 'https://api.github.com/repos/CaliforniaHodl/BTCSignal_ai/contents/content/posts';

  // Check if user has access using BTCSAIAccess system
  function hasAccess() {
    // First check if BTCSAIAccess is available and user is admin
    if (typeof BTCSAIAccess !== 'undefined') {
      if (BTCSAIAccess.isAdmin()) {
        return true;
      }
      if (BTCSAIAccess.hasAllAccess()) {
        return true;
      }
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

  // Load all dashboard data
  async function loadDashboardData() {
    await Promise.all([
      loadPerformanceStats(),
      loadCurrentPrice(),
      loadFearGreedIndex(),
      loadFundingRates()
    ]);
  }

  // Load Fear & Greed Index
  async function loadFearGreedIndex() {
    try {
      const res = await fetch('https://api.alternative.me/fng/');
      const data = await res.json();
      const fng = data.data[0];

      const value = parseInt(fng.value);
      const classification = fng.value_classification;

      // Update UI
      const fngValue = document.getElementById('fng-value');
      const fngLabel = document.getElementById('fng-label');
      const fngBar = document.getElementById('fng-bar');

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
    } catch (e) {
      console.error('Error loading Fear & Greed:', e);
      const fngValue = document.getElementById('fng-value');
      if (fngValue) fngValue.textContent = '--';
    }
  }

  // Load Funding Rates from OKX (works globally)
  async function loadFundingRates() {
    try {
      const res = await fetch('https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP');
      const data = await res.json();

      if (data && data.data && data.data[0]) {
        const rate = parseFloat(data.data[0].fundingRate) * 100;
        const fundingEl = document.getElementById('funding-rate');
        const fundingLabel = document.getElementById('funding-label');

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
    } catch (e) {
      console.error('Error loading funding rates:', e);
      const fundingEl = document.getElementById('funding-rate');
      if (fundingEl) fundingEl.textContent = '--';
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
      const outcome = determineOutcome(post);

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

  // Determine if a call was a win or loss
  function determineOutcome(post) {
    if (post.result) {
      return post.result.toLowerCase();
    }
    if (post.confidence >= 70) {
      return 'win';
    } else if (post.confidence < 50) {
      return 'loss';
    }
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
      const outcome = determineOutcome(p);
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
      const outcome = determineOutcome(p);
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
      const outcome = determineOutcome(post);
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

  // Load current BTC price
  async function loadCurrentPrice() {
    try {
      const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const data = await res.json();
      const price = parseFloat(data.data.amount);
      document.getElementById('current-btc-price').textContent =
        '$' + price.toLocaleString(undefined, { maximumFractionDigits: 0 });

      calculateLiquidationLevels(price);
    } catch (e) {
      document.getElementById('current-btc-price').textContent = 'Error';
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

  // Render calendar heatmap
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

    // Map posts to dates
    const postsByDate = {};
    posts.forEach(post => {
      if (post.date) {
        const dateKey = post.date.split('T')[0];
        const outcome = determineOutcome(post);
        postsByDate[dateKey] = outcome;
      }
    });

    // Render grid
    const html = days.map(day => {
      const outcome = postsByDate[day];
      let className = 'cal-day';
      let title = day;
      if (outcome === 'win') {
        className += ' win';
        title += ' - Win';
      } else if (outcome === 'loss') {
        className += ' loss';
        title += ' - Loss';
      } else if (outcome === 'pending') {
        className += ' pending';
        title += ' - Pending';
      }
      return '<div class="' + className + '" title="' + title + '"></div>';
    }).join('');

    container.innerHTML = html;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
