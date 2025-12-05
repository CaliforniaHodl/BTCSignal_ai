// Trading History Page JavaScript
(function() {
  const GITHUB_POSTS_URL = 'https://api.github.com/repos/CaliforniaHodl/BTCSignal_ai/contents/content/posts';

  const PORTFOLIO_CONFIG = {
    startingCapital: 10000,
    positionSizePercent: 0.005, // 0.5%
    leverage: 1
  };

  let ohlcCandles = [];
  let currentBtcPrice = null;
  let marketData = null;

  async function init() {
    // Load market data for OHLC candles
    await loadMarketData();
    // Load and process trades
    await loadTradingHistory();
  }

  async function loadMarketData() {
    try {
      if (typeof BTCSAIShared !== 'undefined' && BTCSAIShared.loadMarketSnapshot) {
        marketData = await BTCSAIShared.loadMarketSnapshot();
        if (marketData && marketData.ohlc && marketData.ohlc.days30) {
          ohlcCandles = marketData.ohlc.days30;
        }
        if (marketData && marketData.btc && marketData.btc.price) {
          currentBtcPrice = marketData.btc.price;
        }
      }
    } catch (e) {
      console.error('Failed to load market data:', e);
    }
  }

  async function loadTradingHistory() {
    try {
      const response = await fetch(GITHUB_POSTS_URL);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const files = await response.json();
      if (!Array.isArray(files)) {
        displayError();
        return;
      }

      const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== '_index.md');

      // Fetch content of each file
      const fetchPromises = mdFiles.slice(0, 100).map(async (file) => {
        try {
          const contentRes = await fetch(file.download_url);
          const content = await contentRes.text();
          return parseFrontmatter(content);
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      const posts = results.filter(p => p !== null);

      // Calculate portfolio
      const portfolioData = calculatePortfolio(posts);

      // Display everything
      displaySummary(portfolioData);
      displayStats(portfolioData);
      displayTradeHistory(portfolioData.trades);
      renderEquityCurve(portfolioData.equityCurve);
    } catch (e) {
      console.error('Error loading trading history:', e);
      displayError();
    }
  }

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
        value = value.replace(/^["']|["']$/g, '');
        if (!isNaN(value) && value !== '') {
          value = parseFloat(value);
        }
        data[key] = value;
      }
    });

    return data;
  }

  function checkPriceTouched(sinceTimestamp, targetPrice, stopLoss, direction) {
    if (!ohlcCandles || ohlcCandles.length === 0) return 'pending';

    const relevantCandles = ohlcCandles.filter(c => c[0] >= sinceTimestamp);

    for (const candle of relevantCandles) {
      const high = candle[2];
      const low = candle[3];

      if (direction === 'up' || direction === 'bullish') {
        if (stopLoss && low <= stopLoss) return 'loss';
        if (targetPrice && high >= targetPrice) return 'win';
      } else if (direction === 'down' || direction === 'bearish') {
        if (stopLoss && high >= stopLoss) return 'loss';
        if (targetPrice && low <= targetPrice) return 'win';
      }
    }

    return 'pending';
  }

  function determineOutcome(post, currentPrice) {
    const storedResult = post.callResult || post.result;
    if (storedResult) {
      return storedResult.toLowerCase();
    }

    if (!post.date || !post.price) return 'pending';

    const entryPrice = post.price;
    const targetPrice = post.targetPrice;
    const direction = (post.direction || post.sentiment || '').toLowerCase();
    const postTimestamp = new Date(post.date).getTime();
    const now = Date.now();
    const timeSinceCall = now - postTimestamp;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const stopLoss = post.stopLoss || (direction === 'up' || direction === 'bullish'
      ? entryPrice * 0.98
      : entryPrice * 1.02);

    const result = checkPriceTouched(postTimestamp, targetPrice, stopLoss, direction);

    if (result !== 'pending') return result;
    if (timeSinceCall < TWENTY_FOUR_HOURS_MS) return 'pending';

    if (timeSinceCall > SEVEN_DAYS_MS && currentPrice) {
      if (direction === 'up' || direction === 'bullish') {
        return currentPrice >= entryPrice ? 'win' : 'loss';
      } else if (direction === 'down' || direction === 'bearish') {
        return currentPrice <= entryPrice ? 'win' : 'loss';
      }
    }

    return 'pending';
  }

  function calculatePortfolio(posts) {
    const trades = [];
    let balance = PORTFOLIO_CONFIG.startingCapital;
    const equityCurve = [{ date: null, balance: balance }];
    let peakBalance = balance;
    let maxDrawdown = 0;

    const sortedPosts = [...posts].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedPosts.forEach(post => {
      const outcome = determineOutcome(post, currentBtcPrice);
      if (outcome === 'pending') return;

      const entryPrice = post.price;
      const targetPrice = post.targetPrice;
      const stopLoss = post.stopLoss;
      const direction = (post.direction || post.sentiment || '').toLowerCase();

      if (!entryPrice) return;

      const positionSize = balance * PORTFOLIO_CONFIG.positionSizePercent;
      let pnl = 0;
      let exitPrice = entryPrice;

      if (outcome === 'win') {
        if (targetPrice) {
          exitPrice = targetPrice;
          if (direction === 'up' || direction === 'bullish') {
            pnl = ((targetPrice - entryPrice) / entryPrice) * positionSize;
          } else {
            pnl = ((entryPrice - targetPrice) / entryPrice) * positionSize;
          }
        } else {
          pnl = positionSize * 0.02;
          exitPrice = direction === 'up' || direction === 'bullish' ? entryPrice * 1.02 : entryPrice * 0.98;
        }
      } else if (outcome === 'loss') {
        if (stopLoss) {
          exitPrice = stopLoss;
          if (direction === 'up' || direction === 'bullish') {
            pnl = ((stopLoss - entryPrice) / entryPrice) * positionSize;
          } else {
            pnl = ((entryPrice - stopLoss) / entryPrice) * positionSize;
          }
        } else {
          pnl = -positionSize * 0.02;
          exitPrice = direction === 'up' || direction === 'bullish' ? entryPrice * 0.98 : entryPrice * 1.02;
        }
      }

      balance += pnl;

      // Track max drawdown
      if (balance > peakBalance) {
        peakBalance = balance;
      }
      const drawdown = ((peakBalance - balance) / peakBalance) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      trades.push({
        date: post.date,
        direction: direction,
        entry: entryPrice,
        target: targetPrice,
        stop: stopLoss,
        exit: exitPrice,
        pnl: pnl,
        balance: balance,
        outcome: outcome
      });

      equityCurve.push({ date: post.date, balance: balance });
    });

    return { trades, balance, equityCurve, maxDrawdown };
  }

  function displaySummary(data) {
    const { trades, balance } = data;
    const totalPnl = balance - PORTFOLIO_CONFIG.startingCapital;
    const returnPct = (totalPnl / PORTFOLIO_CONFIG.startingCapital) * 100;
    const winningTrades = trades.filter(t => t.outcome === 'win');
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const balanceEl = document.getElementById('th-balance');
    if (balanceEl) {
      balanceEl.textContent = '$' + balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      balanceEl.className = 'summary-value ' + (totalPnl >= 0 ? 'positive' : 'negative');
    }

    const pnlEl = document.getElementById('th-total-pnl');
    if (pnlEl) {
      const sign = totalPnl >= 0 ? '+' : '';
      pnlEl.textContent = sign + '$' + totalPnl.toFixed(2);
      pnlEl.className = 'summary-value ' + (totalPnl >= 0 ? 'positive' : 'negative');
    }

    const returnEl = document.getElementById('th-return');
    if (returnEl) {
      const sign = returnPct >= 0 ? '+' : '';
      returnEl.textContent = sign + returnPct.toFixed(2) + '%';
      returnEl.className = 'summary-value ' + (returnPct >= 0 ? 'positive' : 'negative');
    }

    const totalEl = document.getElementById('th-total-trades');
    if (totalEl) totalEl.textContent = trades.length;

    const winRateEl = document.getElementById('th-win-rate');
    if (winRateEl) winRateEl.textContent = winRate.toFixed(1) + '%';
  }

  function displayStats(data) {
    const { trades, maxDrawdown } = data;
    const winningTrades = trades.filter(t => t.outcome === 'win');
    const losingTrades = trades.filter(t => t.outcome === 'loss');

    document.getElementById('th-winning-trades').textContent = winningTrades.length;
    document.getElementById('th-losing-trades').textContent = losingTrades.length;

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    document.getElementById('th-avg-win').textContent = '+$' + avgWin.toFixed(2);

    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;
    document.getElementById('th-avg-loss').textContent = '$' + avgLoss.toFixed(2);

    const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnl)) : 0;
    document.getElementById('th-best-trade').textContent = '+$' + bestTrade.toFixed(2);

    const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnl)) : 0;
    document.getElementById('th-worst-trade').textContent = '$' + worstTrade.toFixed(2);

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? (totalWins / totalLosses) : totalWins > 0 ? 999 : 0;
    document.getElementById('th-profit-factor').textContent = profitFactor.toFixed(2);

    document.getElementById('th-max-drawdown').textContent = maxDrawdown.toFixed(2) + '%';
  }

  function displayTradeHistory(trades) {
    const tbody = document.getElementById('trade-history-body');
    if (!tbody) return;

    if (trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-trades">No resolved trades yet</td></tr>';
      return;
    }

    const recentTrades = [...trades].reverse();

    tbody.innerHTML = recentTrades.map(trade => {
      const date = new Date(trade.date);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      const dirIcon = trade.direction === 'up' || trade.direction === 'bullish' ? '📈' : '📉';
      const dirLabel = trade.direction === 'up' || trade.direction === 'bullish' ? 'Long' : 'Short';
      const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
      const pnlSign = trade.pnl >= 0 ? '+' : '';
      const resultClass = trade.outcome === 'win' ? 'result-win' : 'result-loss';
      const resultLabel = trade.outcome === 'win' ? 'Win' : 'Loss';

      return '<tr class="' + trade.outcome + '">' +
        '<td>' + dateStr + '</td>' +
        '<td>' + dirIcon + ' ' + dirLabel + '</td>' +
        '<td>$' + trade.entry.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td>' +
        '<td>' + (trade.target ? '$' + trade.target.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-') + '</td>' +
        '<td>' + (trade.stop ? '$' + trade.stop.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-') + '</td>' +
        '<td>$' + trade.exit.toLocaleString(undefined, { maximumFractionDigits: 0 }) + '</td>' +
        '<td class="' + resultClass + '">' + resultLabel + '</td>' +
        '<td class="' + pnlClass + '">' + pnlSign + '$' + trade.pnl.toFixed(2) + '</td>' +
        '<td>$' + trade.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderEquityCurve(equityCurve) {
    const canvas = document.getElementById('equityCurveChart');
    if (!canvas || equityCurve.length < 2) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = equityCurve.map(p => p.balance);
    const minVal = Math.min(...values) * 0.995;
    const maxVal = Math.max(...values) * 1.005;
    const range = maxVal - minVal;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
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
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
    ctx.fill();

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const val = maxVal - (range / 5) * i;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText('$' + val.toLocaleString(undefined, { maximumFractionDigits: 0 }), padding.left - 8, y + 4);
    }

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Trade Number', width / 2, height - 8);
  }

  function displayError() {
    const tbody = document.getElementById('trade-history-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="no-trades">Failed to load trading history</td></tr>';
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
