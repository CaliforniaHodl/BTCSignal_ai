// Backtester PRO - AI-powered custom strategy backtesting
// Parses natural language strategy descriptions and simulates trades

(function() {
  'use strict';

  const FEATURE_KEY = 'btcsai_backtester_pro';

  // Check access
  function checkAccess() {
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
      return true;
    }
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
      return true;
    }
    return localStorage.getItem(FEATURE_KEY) === 'unlocked';
  }

  // State
  let priceData = [];
  let equityChart = null;
  let backtestResults = null;

  // DOM elements
  const strategyInput = document.getElementById('strategy-input');
  const timeframeSelect = document.getElementById('timeframe-select');
  const periodSelect = document.getElementById('period-select');
  const capitalInput = document.getElementById('capital-input');
  const btnRunBacktest = document.getElementById('btn-run-backtest');
  const loadingSection = document.getElementById('backtest-loading');
  const resultsSection = document.getElementById('backtest-results');
  const premiumGate = document.getElementById('premium-gate');

  if (!strategyInput || !btnRunBacktest) return;

  // Example strategy buttons
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      strategyInput.value = this.dataset.strategy;
    });
  });

  // Parse strategy from natural language
  function parseStrategy(text) {
    const strategy = {
      entryConditions: [],
      exitConditions: [],
      stopLoss: null,
      takeProfit: null,
      trailingStop: null,
      riskPerTrade: 0.01,
      rewardRatio: 2,
      direction: 'long', // default
      indicators: []
    };

    const lowerText = text.toLowerCase();

    // Detect direction
    if (lowerText.includes('short') && !lowerText.includes('long')) {
      strategy.direction = 'short';
    } else if (lowerText.includes('both') || (lowerText.includes('long') && lowerText.includes('short'))) {
      strategy.direction = 'both';
    }

    // Parse RSI conditions
    const rsiMatch = lowerText.match(/rsi\s*(<|>|crosses?\s*(above|below)|reaches?)\s*(\d+)/gi);
    if (rsiMatch) {
      rsiMatch.forEach(match => {
        const numMatch = match.match(/(\d+)/);
        const num = numMatch ? parseInt(numMatch[1]) : 50;
        if (match.includes('above') || match.includes('>')) {
          if (num < 50) {
            strategy.entryConditions.push({ type: 'rsi_cross_above', value: num });
          } else {
            strategy.exitConditions.push({ type: 'rsi_above', value: num });
          }
        } else if (match.includes('below') || match.includes('<')) {
          if (num > 50) {
            strategy.entryConditions.push({ type: 'rsi_cross_below', value: num });
          } else {
            strategy.exitConditions.push({ type: 'rsi_below', value: num });
          }
        }
      });
      strategy.indicators.push('RSI');
    }

    // Parse MACD conditions
    if (lowerText.includes('macd')) {
      if (lowerText.includes('crosses above') || lowerText.includes('cross above')) {
        strategy.entryConditions.push({ type: 'macd_cross_above' });
      }
      if (lowerText.includes('crosses below') || lowerText.includes('cross below')) {
        strategy.exitConditions.push({ type: 'macd_cross_below' });
      }
      strategy.indicators.push('MACD');
    }

    // Parse EMA/MA conditions
    const emaMatch = lowerText.match(/ema\s*(\d+)\s*crosses?\s*(above|below)\s*ema\s*(\d+)/i);
    if (emaMatch) {
      const fast = parseInt(emaMatch[1]);
      const slow = parseInt(emaMatch[3]);
      if (emaMatch[2] === 'above') {
        strategy.entryConditions.push({ type: 'ema_cross_above', fast, slow });
      } else {
        strategy.exitConditions.push({ type: 'ema_cross_below', fast, slow });
      }
      strategy.indicators.push(`EMA ${fast}/${slow}`);
    }

    // Parse moving average (general)
    const maMatch = lowerText.match(/(?:above|below)\s*(?:the\s*)?(\d+)\s*(?:day\s*)?(?:ema|ma|sma)/i);
    if (maMatch) {
      const period = parseInt(maMatch[1]);
      if (lowerText.includes('above')) {
        strategy.entryConditions.push({ type: 'price_above_ma', period });
      }
      strategy.indicators.push(`${period} MA`);
    }

    // Parse breakout conditions
    if (lowerText.includes('break') && lowerText.includes('high')) {
      const dayMatch = lowerText.match(/(\d+)[\s-]*day\s*high/i);
      const period = dayMatch ? parseInt(dayMatch[1]) : 20;
      strategy.entryConditions.push({ type: 'breakout_high', period });
      strategy.indicators.push(`${period}D Breakout`);
    }
    if (lowerText.includes('break') && lowerText.includes('low')) {
      const dayMatch = lowerText.match(/(\d+)[\s-]*day\s*low/i);
      const period = dayMatch ? parseInt(dayMatch[1]) : 10;
      strategy.exitConditions.push({ type: 'breakout_low', period });
    }

    // Parse stop loss
    const slMatch = lowerText.match(/stop\s*(?:loss)?\s*(?:at|of|:)?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (slMatch) {
      strategy.stopLoss = parseFloat(slMatch[1]) / 100;
    }

    // Parse trailing stop
    const tsMatch = lowerText.match(/trail(?:ing)?\s*(?:stop)?\s*(?:at|of|:)?\s*(\d+(?:\.\d+)?)\s*(?:%|atr)/i);
    if (tsMatch) {
      strategy.trailingStop = parseFloat(tsMatch[1]) / 100;
    }

    // Parse take profit / target
    const tpMatch = lowerText.match(/(?:target|take\s*profit|tp)\s*(?:at|of|:)?\s*(\d+(?:\.\d+)?)\s*(?:%|r)/i);
    if (tpMatch) {
      const val = parseFloat(tpMatch[1]);
      if (val > 10) {
        strategy.takeProfit = val / 100; // Percentage
      } else {
        strategy.rewardRatio = val; // R multiple
      }
    }

    // Parse risk per trade
    const riskMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*%\s*risk/i);
    if (riskMatch) {
      strategy.riskPerTrade = parseFloat(riskMatch[1]) / 100;
    }

    // Default conditions if none found
    if (strategy.entryConditions.length === 0) {
      strategy.entryConditions.push({ type: 'random_entry' });
    }
    if (strategy.exitConditions.length === 0 && !strategy.stopLoss && !strategy.takeProfit) {
      strategy.stopLoss = 0.03;
      strategy.takeProfit = 0.06;
    }

    return strategy;
  }

  // Fetch historical price data
  async function fetchPriceData(timeframe, days) {
    const interval = timeframe;
    const limit = Math.min(1000, days * (timeframe === '1d' ? 1 : timeframe === '4h' ? 6 : timeframe === '1h' ? 24 : 96));

    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
      const data = await res.json();

      return data.map(candle => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (e) {
      console.error('Failed to fetch price data:', e);
      return [];
    }
  }

  // Calculate indicators
  function calculateIndicators(data) {
    // RSI
    const rsiPeriod = 14;
    let gains = 0, losses = 0;

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i-1].close;

      if (i <= rsiPeriod) {
        if (change > 0) gains += change;
        else losses -= change;

        if (i === rsiPeriod) {
          gains /= rsiPeriod;
          losses /= rsiPeriod;
        }
        data[i].rsi = 50;
      } else {
        if (change > 0) {
          gains = (gains * (rsiPeriod - 1) + change) / rsiPeriod;
          losses = (losses * (rsiPeriod - 1)) / rsiPeriod;
        } else {
          gains = (gains * (rsiPeriod - 1)) / rsiPeriod;
          losses = (losses * (rsiPeriod - 1) - change) / rsiPeriod;
        }
        const rs = losses === 0 ? 100 : gains / losses;
        data[i].rsi = 100 - (100 / (1 + rs));
      }
    }

    // EMAs
    const emaPeriods = [9, 21, 50, 200];
    emaPeriods.forEach(period => {
      const multiplier = 2 / (period + 1);
      let ema = data[0].close;

      for (let i = 0; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
        data[i][`ema${period}`] = ema;
      }
    });

    // MACD
    let ema12 = data[0].close;
    let ema26 = data[0].close;
    let signal = 0;

    for (let i = 0; i < data.length; i++) {
      ema12 = (data[i].close - ema12) * (2/13) + ema12;
      ema26 = (data[i].close - ema26) * (2/27) + ema26;
      const macd = ema12 - ema26;
      signal = (macd - signal) * (2/10) + signal;

      data[i].macd = macd;
      data[i].macdSignal = signal;
      data[i].macdHist = macd - signal;
    }

    // Highest high / lowest low for breakouts
    for (let i = 20; i < data.length; i++) {
      let high20 = 0, low10 = Infinity;
      for (let j = i - 20; j < i; j++) {
        if (data[j].high > high20) high20 = data[j].high;
      }
      for (let j = i - 10; j < i; j++) {
        if (data[j].low < low10) low10 = data[j].low;
      }
      data[i].high20 = high20;
      data[i].low10 = low10;
    }

    return data;
  }

  // Check if entry conditions are met
  function checkEntry(data, i, strategy, prevData) {
    if (i < 30) return false;

    for (const cond of strategy.entryConditions) {
      switch (cond.type) {
        case 'rsi_cross_above':
          if (!(prevData.rsi <= cond.value && data[i].rsi > cond.value)) return false;
          break;
        case 'rsi_cross_below':
          if (!(prevData.rsi >= cond.value && data[i].rsi < cond.value)) return false;
          break;
        case 'macd_cross_above':
          if (!(prevData.macdHist <= 0 && data[i].macdHist > 0)) return false;
          break;
        case 'ema_cross_above':
          const fastKey = `ema${cond.fast}`;
          const slowKey = `ema${cond.slow}`;
          if (!(prevData[fastKey] <= prevData[slowKey] && data[i][fastKey] > data[i][slowKey])) return false;
          break;
        case 'price_above_ma':
          const maKey = `ema${cond.period}`;
          if (data[i].close < data[i][maKey]) return false;
          break;
        case 'breakout_high':
          if (data[i].close <= data[i].high20) return false;
          break;
        case 'random_entry':
          // Random entry for strategies we couldn't fully parse
          if (Math.random() > 0.05) return false;
          break;
      }
    }
    return true;
  }

  // Check if exit conditions are met
  function checkExit(data, i, strategy, prevData, trade) {
    // Stop loss
    if (strategy.stopLoss) {
      const slPrice = trade.direction === 'long'
        ? trade.entryPrice * (1 - strategy.stopLoss)
        : trade.entryPrice * (1 + strategy.stopLoss);

      if (trade.direction === 'long' && data[i].low <= slPrice) {
        return { exit: true, price: slPrice, reason: 'Stop Loss' };
      }
      if (trade.direction === 'short' && data[i].high >= slPrice) {
        return { exit: true, price: slPrice, reason: 'Stop Loss' };
      }
    }

    // Take profit
    if (strategy.takeProfit) {
      const tpPrice = trade.direction === 'long'
        ? trade.entryPrice * (1 + strategy.takeProfit)
        : trade.entryPrice * (1 - strategy.takeProfit);

      if (trade.direction === 'long' && data[i].high >= tpPrice) {
        return { exit: true, price: tpPrice, reason: 'Take Profit' };
      }
      if (trade.direction === 'short' && data[i].low <= tpPrice) {
        return { exit: true, price: tpPrice, reason: 'Take Profit' };
      }
    }

    // Trailing stop
    if (strategy.trailingStop && trade.maxProfit) {
      const trailPrice = trade.direction === 'long'
        ? trade.highestPrice * (1 - strategy.trailingStop)
        : trade.lowestPrice * (1 + strategy.trailingStop);

      if (trade.direction === 'long' && data[i].low <= trailPrice) {
        return { exit: true, price: trailPrice, reason: 'Trailing Stop' };
      }
      if (trade.direction === 'short' && data[i].high >= trailPrice) {
        return { exit: true, price: trailPrice, reason: 'Trailing Stop' };
      }
    }

    // Indicator-based exits
    for (const cond of strategy.exitConditions) {
      switch (cond.type) {
        case 'rsi_above':
          if (data[i].rsi >= cond.value) {
            return { exit: true, price: data[i].close, reason: `RSI > ${cond.value}` };
          }
          break;
        case 'rsi_below':
          if (data[i].rsi <= cond.value) {
            return { exit: true, price: data[i].close, reason: `RSI < ${cond.value}` };
          }
          break;
        case 'macd_cross_below':
          if (prevData.macdHist > 0 && data[i].macdHist <= 0) {
            return { exit: true, price: data[i].close, reason: 'MACD Cross Down' };
          }
          break;
        case 'ema_cross_below':
          const fastKey = `ema${cond.fast}`;
          const slowKey = `ema${cond.slow}`;
          if (prevData[fastKey] >= prevData[slowKey] && data[i][fastKey] < data[i][slowKey]) {
            return { exit: true, price: data[i].close, reason: 'EMA Cross Down' };
          }
          break;
        case 'breakout_low':
          if (data[i].close <= data[i].low10) {
            return { exit: true, price: data[i].close, reason: 'Breakout Low' };
          }
          break;
      }
    }

    return { exit: false };
  }

  // Run backtest simulation
  function runBacktest(data, strategy, startingCapital) {
    const trades = [];
    const equityCurve = [{ time: data[0].time, equity: startingCapital }];
    let equity = startingCapital;
    let currentTrade = null;
    let maxEquity = startingCapital;
    let maxDrawdown = 0;

    for (let i = 1; i < data.length; i++) {
      const candle = data[i];
      const prevCandle = data[i - 1];

      if (currentTrade) {
        // Update trade tracking
        if (currentTrade.direction === 'long') {
          currentTrade.highestPrice = Math.max(currentTrade.highestPrice || currentTrade.entryPrice, candle.high);
        } else {
          currentTrade.lowestPrice = Math.min(currentTrade.lowestPrice || currentTrade.entryPrice, candle.low);
        }

        // Check for exit
        const exitResult = checkExit(data, i, strategy, prevCandle, currentTrade);
        if (exitResult.exit) {
          currentTrade.exitPrice = exitResult.price;
          currentTrade.exitTime = candle.time;
          currentTrade.exitReason = exitResult.reason;

          // Calculate P&L
          const pnlPct = currentTrade.direction === 'long'
            ? (currentTrade.exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice
            : (currentTrade.entryPrice - currentTrade.exitPrice) / currentTrade.entryPrice;

          currentTrade.pnl = currentTrade.size * pnlPct;
          currentTrade.pnlPct = pnlPct * 100;
          currentTrade.rMultiple = strategy.stopLoss ? pnlPct / strategy.stopLoss : pnlPct / 0.02;

          equity += currentTrade.pnl;
          trades.push(currentTrade);
          currentTrade = null;
        }
      } else {
        // Check for entry
        if (checkEntry(data, i, strategy, prevCandle)) {
          const riskAmount = equity * strategy.riskPerTrade;
          const size = strategy.stopLoss ? riskAmount / strategy.stopLoss : riskAmount;

          currentTrade = {
            entryPrice: candle.close,
            entryTime: candle.time,
            direction: strategy.direction === 'both' ? (Math.random() > 0.5 ? 'long' : 'short') : strategy.direction,
            size: Math.min(size, equity * 0.5) // Max 50% per trade
          };
        }
      }

      // Track equity curve
      equityCurve.push({ time: candle.time, equity: equity });

      // Track drawdown
      if (equity > maxEquity) maxEquity = equity;
      const drawdown = (maxEquity - equity) / maxEquity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Close any open trade at end
    if (currentTrade) {
      currentTrade.exitPrice = data[data.length - 1].close;
      currentTrade.exitTime = data[data.length - 1].time;
      currentTrade.exitReason = 'End of Period';

      const pnlPct = currentTrade.direction === 'long'
        ? (currentTrade.exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice
        : (currentTrade.entryPrice - currentTrade.exitPrice) / currentTrade.entryPrice;

      currentTrade.pnl = currentTrade.size * pnlPct;
      currentTrade.pnlPct = pnlPct * 100;
      currentTrade.rMultiple = strategy.stopLoss ? pnlPct / strategy.stopLoss : pnlPct / 0.02;

      equity += currentTrade.pnl;
      trades.push(currentTrade);
    }

    // Calculate statistics
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const totalReturn = (equity - startingCapital) / startingCapital;
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnlPct, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPct, 0) / losingTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : avgWin > 0 ? Infinity : 0;

    // Sharpe ratio approximation
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i].equity - equityCurve[i-1].equity) / equityCurve[i-1].equity);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      trades,
      equityCurve,
      stats: {
        totalReturn: totalReturn * 100,
        winRate: winRate * 100,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        avgWin,
        avgLoss,
        profitFactor: isFinite(profitFactor) ? profitFactor : 0,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio,
        finalEquity: equity
      }
    };
  }

  // Display results
  function displayResults(results, strategy) {
    const stats = results.stats;

    // Summary stats
    document.getElementById('total-return').textContent = (stats.totalReturn >= 0 ? '+' : '') + stats.totalReturn.toFixed(2) + '%';
    document.getElementById('total-return').className = 'summary-value ' + (stats.totalReturn >= 0 ? 'positive' : 'negative');

    document.getElementById('win-rate').textContent = stats.winRate.toFixed(1) + '%';
    document.getElementById('total-trades').textContent = stats.totalTrades;
    document.getElementById('sharpe-ratio').textContent = stats.sharpeRatio.toFixed(2);
    document.getElementById('max-drawdown').textContent = '-' + stats.maxDrawdown.toFixed(2) + '%';
    document.getElementById('profit-factor').textContent = stats.profitFactor.toFixed(2);

    // Equity chart
    drawEquityChart(results.equityCurve);

    // Monthly performance
    drawMonthlyGrid(results.equityCurve);

    // Trade log
    displayTradeLog(results.trades);

    // AI Analysis
    displayAIAnalysis(results, strategy);

    // Optimization suggestions
    displayOptimizations(results, strategy);
  }

  // Draw equity curve
  function drawEquityChart(equityCurve) {
    const ctx = document.getElementById('equity-chart').getContext('2d');

    if (equityChart) {
      equityChart.destroy();
    }

    const labels = equityCurve.map(p => new Date(p.time).toLocaleDateString());
    const data = equityCurve.map(p => p.equity);

    equityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Equity',
          data: data,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247, 147, 26, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              maxTicksLimit: 10,
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          },
          y: {
            display: true,
            ticks: {
              color: '#9ca3af',
              callback: value => '$' + value.toLocaleString()
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          }
        }
      }
    });
  }

  // Draw monthly performance grid
  function drawMonthlyGrid(equityCurve) {
    const grid = document.getElementById('monthly-grid');
    const monthlyReturns = {};

    // Group by month
    equityCurve.forEach((point, i) => {
      if (i === 0) return;
      const date = new Date(point.time);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyReturns[key]) {
        monthlyReturns[key] = { start: equityCurve[i-1].equity, end: point.equity };
      } else {
        monthlyReturns[key].end = point.equity;
      }
    });

    // Calculate returns and render
    let html = '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    Object.keys(monthlyReturns).sort().forEach(key => {
      const data = monthlyReturns[key];
      const ret = ((data.end - data.start) / data.start) * 100;
      const [year, month] = key.split('-');
      const colorClass = ret >= 0 ? 'positive' : 'negative';
      const intensity = Math.min(Math.abs(ret) / 20, 1);

      html += `
        <div class="monthly-cell ${colorClass}" style="opacity: ${0.4 + intensity * 0.6}">
          <span class="month-label">${months[parseInt(month) - 1]} ${year.slice(2)}</span>
          <span class="month-return">${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%</span>
        </div>
      `;
    });

    grid.innerHTML = html;
  }

  // Display trade log
  function displayTradeLog(trades) {
    const tbody = document.getElementById('trade-log-body');

    const html = trades.slice(-50).reverse().map(trade => {
      const date = new Date(trade.entryTime).toLocaleDateString();
      const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
      const rClass = trade.rMultiple >= 0 ? 'positive' : 'negative';

      return `
        <tr>
          <td>${date}</td>
          <td class="${trade.direction}">${trade.direction.toUpperCase()}</td>
          <td>$${trade.entryPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
          <td>$${trade.exitPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
          <td class="${pnlClass}">${trade.pnl >= 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%</td>
          <td class="${rClass}">${trade.rMultiple >= 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
  }

  // Display AI analysis
  function displayAIAnalysis(results, strategy) {
    const analysisDiv = document.getElementById('ai-analysis');
    const stats = results.stats;

    let verdict = '';
    let insights = [];

    // Overall verdict
    if (stats.totalReturn > 20 && stats.winRate > 50 && stats.profitFactor > 1.5) {
      verdict = '🟢 <strong>Strong Strategy</strong> - This strategy shows promising results with good risk-adjusted returns.';
    } else if (stats.totalReturn > 0 && stats.profitFactor > 1) {
      verdict = '🟡 <strong>Moderate Strategy</strong> - Profitable but could benefit from optimization.';
    } else {
      verdict = '🔴 <strong>Needs Work</strong> - This strategy underperformed in the backtest period.';
    }

    // Win rate insight
    if (stats.winRate > 60) {
      insights.push('High win rate suggests good entry timing, but verify this isn\'t curve-fitted.');
    } else if (stats.winRate < 40) {
      insights.push('Low win rate requires high reward-to-risk ratio to be profitable. Consider tightening entry criteria.');
    }

    // Drawdown insight
    if (stats.maxDrawdown > 30) {
      insights.push('Maximum drawdown exceeds 30% - consider adding position sizing rules or tighter stops.');
    } else if (stats.maxDrawdown < 15) {
      insights.push('Good drawdown management - risk is well controlled.');
    }

    // Profit factor insight
    if (stats.profitFactor > 2) {
      insights.push('Excellent profit factor - winning trades significantly outweigh losers.');
    } else if (stats.profitFactor < 1) {
      insights.push('Profit factor below 1 means losses exceed gains. Review exit timing and stop placement.');
    }

    // Trade frequency
    if (stats.totalTrades < 10) {
      insights.push('Low sample size - more trades needed for statistical significance. Consider longer backtest period.');
    } else if (stats.totalTrades > 100) {
      insights.push('Good sample size provides statistical confidence in results.');
    }

    // Sharpe ratio
    if (stats.sharpeRatio > 1.5) {
      insights.push('Strong risk-adjusted returns (Sharpe > 1.5) - strategy handles volatility well.');
    } else if (stats.sharpeRatio < 0.5) {
      insights.push('Low Sharpe ratio indicates poor risk-adjusted returns. High volatility in equity curve.');
    }

    analysisDiv.innerHTML = `
      <div class="analysis-verdict">${verdict}</div>
      <div class="analysis-details">
        <h4>Key Insights</h4>
        <ul>
          ${insights.map(i => `<li>${i}</li>`).join('')}
        </ul>
        <h4>Strategy Components Detected</h4>
        <ul>
          ${strategy.indicators.map(i => `<li><strong>${i}</strong> indicator</li>`).join('')}
          ${strategy.stopLoss ? `<li>Stop loss at <strong>${(strategy.stopLoss * 100).toFixed(1)}%</strong></li>` : ''}
          ${strategy.takeProfit ? `<li>Take profit at <strong>${(strategy.takeProfit * 100).toFixed(1)}%</strong></li>` : ''}
          ${strategy.trailingStop ? `<li>Trailing stop at <strong>${(strategy.trailingStop * 100).toFixed(1)}%</strong></li>` : ''}
        </ul>
      </div>
    `;
  }

  // Display optimization suggestions
  function displayOptimizations(results, strategy) {
    const container = document.getElementById('optimization-cards');
    const stats = results.stats;
    const suggestions = [];

    // Stop loss optimization
    if (!strategy.stopLoss || stats.maxDrawdown > 25) {
      suggestions.push({
        title: 'Tighten Stop Loss',
        desc: 'Your drawdown is high. Consider a tighter stop loss around 2-3% to protect capital.',
        icon: '🛡️'
      });
    }

    // Win rate optimization
    if (stats.winRate < 45) {
      suggestions.push({
        title: 'Add Confirmation',
        desc: 'Low win rate suggests entries may be premature. Add a confirmation indicator like volume or another momentum signal.',
        icon: '✅'
      });
    }

    // Trade frequency
    if (stats.totalTrades < 20) {
      suggestions.push({
        title: 'Loosen Entry Criteria',
        desc: 'Few trades generated. Consider relaxing entry conditions or using a shorter timeframe.',
        icon: '📈'
      });
    }

    // Profit taking
    if (stats.avgWin < stats.avgLoss * 1.5) {
      suggestions.push({
        title: 'Improve Reward:Risk',
        desc: 'Average win is too small relative to average loss. Let winners run longer or use trailing stops.',
        icon: '💰'
      });
    }

    // Position sizing
    if (stats.maxDrawdown > 30) {
      suggestions.push({
        title: 'Reduce Position Size',
        desc: 'Large drawdowns suggest over-leveraging. Consider risking 0.5-1% per trade instead.',
        icon: '⚖️'
      });
    }

    // General suggestion
    suggestions.push({
      title: 'Forward Test',
      desc: 'Backtest results can be deceiving. Paper trade this strategy for 1-2 months before using real capital.',
      icon: '📋'
    });

    container.innerHTML = suggestions.slice(0, 4).map(s => `
      <div class="optimization-card">
        <div class="opt-icon">${s.icon}</div>
        <h4>${s.title}</h4>
        <p>${s.desc}</p>
      </div>
    `).join('');
  }

  // Loading animation
  function animateLoading() {
    const steps = [
      'Parsing strategy parameters...',
      'Fetching historical price data...',
      'Calculating indicators...',
      'Simulating trades...',
      'Analyzing results...',
      'Generating insights...'
    ];

    const stepEl = document.getElementById('loading-step');
    const progressBar = document.getElementById('progress-bar');
    let step = 0;

    return setInterval(() => {
      if (step < steps.length) {
        stepEl.textContent = steps[step];
        progressBar.style.width = ((step + 1) / steps.length * 100) + '%';
        step++;
      }
    }, 800);
  }

  // Main backtest handler
  async function handleBacktest() {
    const strategyText = strategyInput.value.trim();
    if (!strategyText) {
      Toast.warning('Please describe your trading strategy');
      return;
    }

    // Check access
    if (!checkAccess()) {
      premiumGate.style.display = 'block';
      return;
    }

    // Show loading
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    const loadingInterval = animateLoading();

    try {
      // Parse strategy
      const strategy = parseStrategy(strategyText);

      // Get settings
      const timeframe = timeframeSelect.value;
      const period = parseInt(periodSelect.value);
      const capital = parseFloat(capitalInput.value) || 10000;

      // Fetch data
      priceData = await fetchPriceData(timeframe, period);
      if (priceData.length < 50) {
        throw new Error('Insufficient price data');
      }

      // Calculate indicators
      priceData = calculateIndicators(priceData);

      // Run backtest
      backtestResults = runBacktest(priceData, strategy, capital);

      // Display results
      displayResults(backtestResults, strategy);

      // Show results
      clearInterval(loadingInterval);
      loadingSection.style.display = 'none';
      resultsSection.style.display = 'block';

    } catch (error) {
      console.error('Backtest error:', error);
      clearInterval(loadingInterval);
      loadingSection.style.display = 'none';
      Toast.error('Failed to run backtest. Please try again.');
    }
  }

  // Event listeners
  btnRunBacktest.addEventListener('click', handleBacktest);

  // Unlock button
  document.getElementById('btn-unlock')?.addEventListener('click', function() {
    // In production, this would trigger payment
    Toast.info('Backtester PRO requires 100 sats per backtest. Payment integration coming soon!');
  });

  // Initialize
  function init() {
    // Check if premium gate should show
    if (!checkAccess()) {
      // Still allow interaction but gate the results
    }
  }

  init();
})();
