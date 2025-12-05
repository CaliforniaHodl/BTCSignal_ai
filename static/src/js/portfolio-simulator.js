// Portfolio Simulator - Strategy Backtesting Tool with Monte Carlo
(function() {
  const FEATURE_KEY = 'portfolio-simulator-access';
  const HISTORY_KEY = 'portfolio-simulator-history';
  const MC_SIMULATIONS = 1000;
  let priceData = [];
  let equityChart = null;
  let mcChart = null;

  function checkAccess() {
    // Check admin mode first (bypasses all paywalls)
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
      return true;
    }
    // Check all-access subscription
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
      return true;
    }
    // Legacy localStorage check
    return localStorage.getItem(FEATURE_KEY) === 'unlocked';
  }

  function updateUI() {
    const gate = document.getElementById('premium-gate');
    const content = document.getElementById('premium-content');

    if (checkAccess()) {
      if (gate) gate.style.display = 'none';
      if (content) {
        content.style.display = 'block';
        initializeSimulator();
      }
    } else {
      if (gate) gate.style.display = 'flex';
      if (content) content.style.display = 'none';
    }
  }

  // Unlock button
  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', function() {
      // Payment confirmation handled by Toast.confirm
      Toast.confirm('This will cost 50 sats via Lightning. Continue?', function() {
        unlockFeature();
      });
      return;
      const confirmed = true;
      if (confirmed) {
        localStorage.setItem(FEATURE_KEY, 'unlocked');
        updateUI();
      }
    });
  }

  // Check access link
  const checkAccessLink = document.getElementById('check-access');
  if (checkAccessLink) {
    checkAccessLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (checkAccess()) {
        updateUI();
      } else {
        Toast.warning('No active access found. Please unlock to continue.');
      }
    });
  }

  function initializeSimulator() {
    // Set default dates
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('end-date').value = endDate.toISOString().split('T')[0];

    // Load saved simulations
    loadSavedSimulations();

    // Strategy preset change handler
    const presetSelect = document.getElementById('strategy-preset');
    const customOptions = document.getElementById('custom-options');

    presetSelect.addEventListener('change', function() {
      if (this.value === 'custom') {
        customOptions.style.display = 'block';
      } else {
        customOptions.style.display = 'none';
      }
    });

    // Form submission
    const form = document.getElementById('simulator-form');
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      await runSimulation();
    });

    // Toggle trade log
    const toggleLogBtn = document.getElementById('btn-toggle-log');
    const tradeLog = document.getElementById('trade-log');
    toggleLogBtn.addEventListener('click', function() {
      if (tradeLog.style.display === 'none') {
        tradeLog.style.display = 'block';
        this.textContent = 'Hide Trade Log';
      } else {
        tradeLog.style.display = 'none';
        this.textContent = 'Show All Trades';
      }
    });

    // New simulation button
    const newSimBtn = document.getElementById('btn-new-sim');
    newSimBtn.addEventListener('click', function() {
      document.getElementById('simulation-results').style.display = 'none';
      document.querySelector('.strategy-config').style.display = 'block';
      form.reset();
      initializeSimulator();
    });

    // Export button
    const exportBtn = document.getElementById('btn-export');
    exportBtn.addEventListener('click', exportResults);
  }

  async function fetchPriceData(startDate, endDate) {
    // Fetch historical BTC price data from CoinGecko
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    try {
      // Use daily candles
      const response = await fetch(
        `https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${start}&endTime=${end}&limit=1000`
      );
      const data = await response.json();

      return data.map(candle => ({
        date: new Date(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      console.error('Error fetching price data:', error);
      return [];
    }
  }

  function calculateRSI(prices, period = 14) {
    const rsi = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        rsi.push(50); // Default RSI for initial period
        continue;
      }

      let gains = 0;
      let losses = 0;

      for (let j = i - period + 1; j <= i; j++) {
        const change = prices[j].close - prices[j - 1].close;
        if (change > 0) gains += change;
        else losses -= change;
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    return rsi;
  }

  function calculateEMA(prices, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < prices.length; i++) {
      if (i === 0) {
        ema.push(prices[i].close);
      } else {
        ema.push((prices[i].close - ema[i - 1]) * multiplier + ema[i - 1]);
      }
    }
    return ema;
  }

  async function runSimulation() {
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';

    const config = {
      preset: document.getElementById('strategy-preset').value,
      startDate: document.getElementById('start-date').value,
      endDate: document.getElementById('end-date').value,
      initialCapital: parseFloat(document.getElementById('initial-capital').value),
      positionSize: parseFloat(document.getElementById('position-size').value) / 100,
      entryCondition: document.getElementById('entry-condition').value,
      exitCondition: document.getElementById('exit-condition').value,
      takeProfitPct: parseFloat(document.getElementById('take-profit-pct').value) / 100,
      stopLossPct: parseFloat(document.getElementById('stop-loss-pct').value) / 100,
      allowShorts: document.getElementById('allow-shorts').checked,
      compoundGains: document.getElementById('compound-gains').checked
    };

    // Fetch price data
    priceData = await fetchPriceData(config.startDate, config.endDate);

    if (priceData.length === 0) {
      Toast.error('Failed to fetch price data. Please try again.');
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      return;
    }

    // Calculate indicators
    const rsi = calculateRSI(priceData);
    const ema9 = calculateEMA(priceData, 9);
    const ema21 = calculateEMA(priceData, 21);
    const ema50 = calculateEMA(priceData, 50);

    // Run backtest
    const results = runBacktest(config, priceData, { rsi, ema9, ema21, ema50 });

    // Display results
    displayResults(results, config);

    // Run Monte Carlo simulation
    const mcResults = runMonteCarloSimulation(config, priceData, { rsi, ema9, ema21, ema50 });
    displayMonteCarloResults(mcResults);

    // Save simulation
    saveSimulation(config, results);

    // Generate AI insights (include MC results)
    generateInsights(results, config, mcResults);

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  function runBacktest(config, prices, indicators) {
    let capital = config.initialCapital;
    let position = null;
    const trades = [];
    const equityCurve = [{ date: prices[0].date, value: capital }];
    const hodlCurve = [{ date: prices[0].date, value: capital }];
    const initialPrice = prices[0].close;

    for (let i = 1; i < prices.length; i++) {
      const price = prices[i];
      const prevPrice = prices[i - 1];

      // Update HODL curve
      hodlCurve.push({
        date: price.date,
        value: config.initialCapital * (price.close / initialPrice)
      });

      // Check for exit first
      if (position) {
        let exitReason = null;
        let exitPrice = price.close;

        // Check stop loss
        if (position.type === 'long' && price.low <= position.stopLoss) {
          exitReason = 'Stop Loss';
          exitPrice = position.stopLoss;
        } else if (position.type === 'short' && price.high >= position.stopLoss) {
          exitReason = 'Stop Loss';
          exitPrice = position.stopLoss;
        }

        // Check take profit
        if (!exitReason) {
          if (position.type === 'long' && price.high >= position.takeProfit) {
            exitReason = 'Take Profit';
            exitPrice = position.takeProfit;
          } else if (position.type === 'short' && price.low <= position.takeProfit) {
            exitReason = 'Take Profit';
            exitPrice = position.takeProfit;
          }
        }

        // Check indicator-based exits
        if (!exitReason && config.exitCondition === 'rsi-exit') {
          if (position.type === 'long' && indicators.rsi[i] > 70) {
            exitReason = 'RSI Overbought';
          } else if (position.type === 'short' && indicators.rsi[i] < 30) {
            exitReason = 'RSI Oversold';
          }
        }

        if (!exitReason && config.exitCondition === 'ema-exit') {
          if (position.type === 'long' && indicators.ema9[i] < indicators.ema21[i] && indicators.ema9[i - 1] >= indicators.ema21[i - 1]) {
            exitReason = 'EMA Cross Down';
          } else if (position.type === 'short' && indicators.ema9[i] > indicators.ema21[i] && indicators.ema9[i - 1] <= indicators.ema21[i - 1]) {
            exitReason = 'EMA Cross Up';
          }
        }

        if (exitReason) {
          const pnl = position.type === 'long'
            ? (exitPrice - position.entry) * position.size
            : (position.entry - exitPrice) * position.size;

          capital += pnl;

          trades.push({
            entryDate: position.entryDate,
            exitDate: price.date,
            type: position.type,
            entry: position.entry,
            exit: exitPrice,
            pnl: pnl,
            pnlPct: (pnl / position.capitalUsed) * 100,
            reason: exitReason,
            balance: capital
          });

          position = null;
        }
      }

      // Check for entry
      if (!position) {
        let entrySignal = null;

        // Apply strategy based on preset or custom
        if (config.preset === 'dca-weekly') {
          if (price.date.getDay() === 1) entrySignal = 'long';
        } else if (config.preset === 'dca-monthly') {
          if (price.date.getDate() === 1) entrySignal = 'long';
        } else if (config.preset === 'btc-breakout') {
          if (price.close > prevPrice.high && price.close > indicators.ema21[i]) {
            entrySignal = 'long';
          }
        } else if (config.preset === 'btc-dips') {
          if (indicators.rsi[i] < 30) entrySignal = 'long';
        } else if (config.preset === 'ema-cross') {
          if (indicators.ema9[i] > indicators.ema21[i] && indicators.ema9[i - 1] <= indicators.ema21[i - 1]) {
            entrySignal = 'long';
          } else if (config.allowShorts && indicators.ema9[i] < indicators.ema21[i] && indicators.ema9[i - 1] >= indicators.ema21[i - 1]) {
            entrySignal = 'short';
          }
        } else if (config.preset === 'signal-follow') {
          // Random signal simulation for demo
          if (Math.random() > 0.95) {
            entrySignal = Math.random() > 0.5 ? 'long' : (config.allowShorts ? 'short' : 'long');
          }
        } else {
          // Custom strategy
          if (config.entryCondition === 'rsi-oversold' && indicators.rsi[i] < 30) {
            entrySignal = 'long';
          } else if (config.entryCondition === 'rsi-overbought' && indicators.rsi[i] > 70 && config.allowShorts) {
            entrySignal = 'short';
          } else if (config.entryCondition === 'ema-cross-up' && indicators.ema9[i] > indicators.ema21[i] && indicators.ema9[i - 1] <= indicators.ema21[i - 1]) {
            entrySignal = 'long';
          } else if (config.entryCondition === 'ema-cross-down' && indicators.ema9[i] < indicators.ema21[i] && indicators.ema9[i - 1] >= indicators.ema21[i - 1] && config.allowShorts) {
            entrySignal = 'short';
          } else if (config.entryCondition === 'price-above-ema' && price.close > indicators.ema50[i] && prevPrice.close <= indicators.ema50[i - 1]) {
            entrySignal = 'long';
          } else if (config.entryCondition === 'price-below-ema' && price.close < indicators.ema50[i] && prevPrice.close >= indicators.ema50[i - 1] && config.allowShorts) {
            entrySignal = 'short';
          } else if (config.entryCondition === 'weekly-buy' && price.date.getDay() === 1) {
            entrySignal = 'long';
          } else if (config.entryCondition === 'monthly-buy' && price.date.getDate() === 1) {
            entrySignal = 'long';
          }
        }

        if (entrySignal) {
          const capitalToUse = config.compoundGains ? capital : config.initialCapital;
          const positionCapital = capitalToUse * config.positionSize;
          const size = positionCapital / price.close;

          position = {
            type: entrySignal,
            entry: price.close,
            entryDate: price.date,
            size: size,
            capitalUsed: positionCapital,
            stopLoss: entrySignal === 'long'
              ? price.close * (1 - config.stopLossPct)
              : price.close * (1 + config.stopLossPct),
            takeProfit: entrySignal === 'long'
              ? price.close * (1 + config.takeProfitPct)
              : price.close * (1 - config.takeProfitPct)
          };
        }
      }

      // Update equity curve
      let currentEquity = capital;
      if (position) {
        const unrealizedPnl = position.type === 'long'
          ? (price.close - position.entry) * position.size
          : (position.entry - price.close) * position.size;
        currentEquity += unrealizedPnl;
      }
      equityCurve.push({ date: price.date, value: currentEquity });
    }

    // Close any open position at end
    if (position) {
      const lastPrice = prices[prices.length - 1];
      const pnl = position.type === 'long'
        ? (lastPrice.close - position.entry) * position.size
        : (position.entry - lastPrice.close) * position.size;

      capital += pnl;

      trades.push({
        entryDate: position.entryDate,
        exitDate: lastPrice.date,
        type: position.type,
        entry: position.entry,
        exit: lastPrice.close,
        pnl: pnl,
        pnlPct: (pnl / position.capitalUsed) * 100,
        reason: 'End of Period',
        balance: capital
      });
    }

    // Calculate statistics
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    // Calculate max drawdown
    let maxDrawdown = 0;
    let maxDrawdownDate = null;
    let peak = equityCurve[0].value;

    for (const point of equityCurve) {
      if (point.value > peak) peak = point.value;
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDate = point.date;
      }
    }

    // Calculate consecutive wins/losses
    let maxConsecWins = 0, maxConsecLosses = 0;
    let currentWins = 0, currentLosses = 0;

    for (const trade of trades) {
      if (trade.pnl > 0) {
        currentWins++;
        currentLosses = 0;
        if (currentWins > maxConsecWins) maxConsecWins = currentWins;
      } else {
        currentLosses++;
        currentWins = 0;
        if (currentLosses > maxConsecLosses) maxConsecLosses = currentLosses;
      }
    }

    // Calculate Sharpe and Sortino ratios
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const negativeReturns = returns.filter(r => r < 0);
    const downDev = Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length) || 0.0001;

    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0;
    const sortinoRatio = downDev > 0 ? (avgReturn / downDev) * Math.sqrt(365) : 0;

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    return {
      finalCapital: capital,
      totalReturn: capital - config.initialCapital,
      totalReturnPct: ((capital - config.initialCapital) / config.initialCapital) * 100,
      hodlReturn: hodlCurve[hodlCurve.length - 1].value - config.initialCapital,
      hodlReturnPct: ((hodlCurve[hodlCurve.length - 1].value - config.initialCapital) / config.initialCapital) * 100,
      trades: trades,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      maxDrawdown: maxDrawdown * 100,
      maxDrawdownDate: maxDrawdownDate,
      maxConsecWins: maxConsecWins,
      maxConsecLosses: maxConsecLosses,
      sharpeRatio: sharpeRatio,
      sortinoRatio: sortinoRatio,
      profitFactor: profitFactor,
      recoveryFactor: maxDrawdown > 0 ? (capital - config.initialCapital) / (maxDrawdown * config.initialCapital) : 0,
      equityCurve: equityCurve,
      hodlCurve: hodlCurve
    };
  }

  // Monte Carlo Simulation Engine
  function runMonteCarloSimulation(config, prices, indicators) {
    const results = [];
    const drawdowns = [];
    const numSims = MC_SIMULATIONS;

    // Pre-calculate daily returns for resampling
    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
      dailyReturns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
    }

    // Calculate return volatility for noise generation
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const volatility = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length);

    for (let sim = 0; sim < numSims; sim++) {
      // Randomize starting point (within first 20% of data)
      const maxOffset = Math.floor(prices.length * 0.2);
      const startOffset = Math.floor(Math.random() * maxOffset);

      // Create price series with randomized noise
      const noisyPrices = prices.slice(startOffset).map((p, i) => {
        // Add small random noise to prices (simulates slippage/execution variance)
        const noise = 1 + (Math.random() - 0.5) * volatility * 0.5;
        return {
          ...p,
          close: p.close * noise,
          high: p.high * noise,
          low: p.low * noise,
          open: p.open * noise
        };
      });

      if (noisyPrices.length < 30) continue;

      // Recalculate indicators for noisy data
      const noisyRsi = calculateRSI(noisyPrices);
      const noisyEma9 = calculateEMA(noisyPrices, 9);
      const noisyEma21 = calculateEMA(noisyPrices, 21);
      const noisyEma50 = calculateEMA(noisyPrices, 50);

      // Run backtest with noisy data
      const simResult = runBacktest(config, noisyPrices, {
        rsi: noisyRsi,
        ema9: noisyEma9,
        ema21: noisyEma21,
        ema50: noisyEma50
      });

      results.push(simResult.totalReturnPct);
      drawdowns.push(simResult.maxDrawdown);
    }

    // Sort results for percentile calculations
    results.sort((a, b) => a - b);
    drawdowns.sort((a, b) => a - b);

    // Calculate statistics
    const median = results[Math.floor(results.length / 2)];
    const p5 = results[Math.floor(results.length * 0.05)];
    const p25 = results[Math.floor(results.length * 0.25)];
    const p75 = results[Math.floor(results.length * 0.75)];
    const p95 = results[Math.floor(results.length * 0.95)];

    const profitableCount = results.filter(r => r > 0).length;
    const ruinCount = results.filter(r => r < -50).length;

    const avgDrawdown = drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length;

    // Create histogram buckets for distribution chart
    const minReturn = Math.floor(Math.min(...results) / 10) * 10;
    const maxReturn = Math.ceil(Math.max(...results) / 10) * 10;
    const bucketSize = 10;
    const buckets = [];

    for (let i = minReturn; i <= maxReturn; i += bucketSize) {
      const count = results.filter(r => r >= i && r < i + bucketSize).length;
      buckets.push({
        range: `${i}% to ${i + bucketSize}%`,
        label: `${i}%`,
        count: count,
        percentage: (count / results.length) * 100
      });
    }

    return {
      simulations: numSims,
      median: median,
      p5: p5,
      p25: p25,
      p75: p75,
      p95: p95,
      profitProbability: (profitableCount / results.length) * 100,
      ruinProbability: (ruinCount / results.length) * 100,
      avgMaxDrawdown: avgDrawdown,
      distribution: buckets,
      allResults: results
    };
  }

  function displayMonteCarloResults(mcResults) {
    // Update summary cards
    document.getElementById('mc-median').textContent = mcResults.median.toFixed(1) + '%';
    document.getElementById('mc-median').className = 'mc-value ' + (mcResults.median >= 0 ? 'positive' : 'negative');

    document.getElementById('mc-5th').textContent = mcResults.p5.toFixed(1) + '%';
    document.getElementById('mc-95th').textContent = mcResults.p95.toFixed(1) + '%';

    document.getElementById('mc-profit-prob').textContent = mcResults.profitProbability.toFixed(1) + '%';
    document.getElementById('mc-profit-prob').className = 'mc-value ' + (mcResults.profitProbability >= 50 ? 'positive' : 'negative');

    document.getElementById('mc-ruin').textContent = mcResults.ruinProbability.toFixed(1) + '%';
    document.getElementById('mc-ruin').className = 'mc-value ' + (mcResults.ruinProbability <= 5 ? 'positive' : 'negative');

    document.getElementById('mc-drawdown').textContent = '-' + mcResults.avgMaxDrawdown.toFixed(1) + '%';

    document.getElementById('mc-confidence-range').textContent =
      mcResults.p5.toFixed(1) + '% to ' + mcResults.p95.toFixed(1) + '%';

    // Draw distribution chart
    drawMonteCarloChart(mcResults.distribution);
  }

  function drawMonteCarloChart(distribution) {
    const ctx = document.getElementById('mc-canvas').getContext('2d');

    if (mcChart) {
      mcChart.destroy();
    }

    // Color bars based on return (green for positive, red for negative)
    const colors = distribution.map(d => {
      const midPoint = parseInt(d.label);
      if (midPoint >= 0) return 'rgba(34, 197, 94, 0.7)';
      return 'rgba(239, 68, 68, 0.7)';
    });

    const borderColors = distribution.map(d => {
      const midPoint = parseInt(d.label);
      if (midPoint >= 0) return 'rgb(34, 197, 94)';
      return 'rgb(239, 68, 68)';
    });

    mcChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: distribution.map(d => d.label),
        datasets: [{
          label: 'Simulations',
          data: distribution.map(d => d.count),
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return distribution[context[0].dataIndex].range;
              },
              label: function(context) {
                const d = distribution[context.dataIndex];
                return `${d.count} simulations (${d.percentage.toFixed(1)}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Return %',
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9ca3af'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Frequency',
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9ca3af'
            }
          }
        }
      }
    });
  }

  function displayResults(results, config) {
    document.querySelector('.strategy-config').style.display = 'none';
    document.getElementById('simulation-results').style.display = 'block';

    // Summary stats
    document.getElementById('total-return').textContent = formatCurrency(results.totalReturn);
    document.getElementById('total-return').className = 'summary-value ' + (results.totalReturn >= 0 ? 'positive' : 'negative');
    document.getElementById('return-pct').textContent = results.totalReturnPct.toFixed(2) + '%';

    document.getElementById('final-balance').textContent = formatCurrency(results.finalCapital);
    const vsHodl = results.totalReturnPct - results.hodlReturnPct;
    document.getElementById('vs-hodl').textContent = 'vs HODL: ' + (vsHodl >= 0 ? '+' : '') + vsHodl.toFixed(2) + '%';
    document.getElementById('vs-hodl').className = 'summary-detail ' + (vsHodl >= 0 ? 'positive' : 'negative');

    document.getElementById('total-trades').textContent = results.totalTrades;
    document.getElementById('win-rate').textContent = 'Win Rate: ' + results.winRate.toFixed(1) + '%';

    document.getElementById('max-drawdown').textContent = '-' + results.maxDrawdown.toFixed(2) + '%';
    document.getElementById('drawdown-date').textContent = results.maxDrawdownDate ? 'On: ' + results.maxDrawdownDate.toLocaleDateString() : '';

    // Detailed stats
    document.getElementById('sharpe-ratio').textContent = results.sharpeRatio.toFixed(2);
    document.getElementById('sortino-ratio').textContent = results.sortinoRatio.toFixed(2);
    document.getElementById('profit-factor').textContent = isFinite(results.profitFactor) ? results.profitFactor.toFixed(2) : 'N/A';

    const avgDuration = results.trades.length > 0
      ? results.trades.reduce((sum, t) => sum + (t.exitDate - t.entryDate), 0) / results.trades.length / (1000 * 60 * 60 * 24)
      : 0;
    document.getElementById('avg-duration').textContent = avgDuration.toFixed(1) + ' days';

    document.getElementById('winning-trades').textContent = results.winningTrades;
    document.getElementById('losing-trades').textContent = results.losingTrades;
    document.getElementById('avg-win').textContent = formatCurrency(results.avgWin);
    document.getElementById('avg-loss').textContent = formatCurrency(results.avgLoss);
    document.getElementById('largest-win').textContent = formatCurrency(results.largestWin);
    document.getElementById('largest-loss').textContent = formatCurrency(results.largestLoss);

    document.getElementById('max-wins').textContent = results.maxConsecWins;
    document.getElementById('max-losses').textContent = results.maxConsecLosses;
    document.getElementById('recovery-factor').textContent = results.recoveryFactor.toFixed(2);
    document.getElementById('risk-reward').textContent = results.avgLoss !== 0
      ? Math.abs(results.avgWin / results.avgLoss).toFixed(2) + ':1'
      : 'N/A';

    // Trade log
    const tradeLogBody = document.getElementById('trade-log-body');
    tradeLogBody.innerHTML = results.trades.map(trade => `
      <tr class="${trade.pnl >= 0 ? 'winning' : 'losing'}">
        <td>${trade.entryDate.toLocaleDateString()}</td>
        <td class="${trade.type}">${trade.type.toUpperCase()}</td>
        <td>${formatCurrency(trade.entry)}</td>
        <td>${formatCurrency(trade.exit)}</td>
        <td class="${trade.pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(trade.pnl)}</td>
        <td>${formatCurrency(trade.balance)}</td>
      </tr>
    `).join('');

    // Draw equity curve
    drawEquityCurve(results.equityCurve, results.hodlCurve);
  }

  function drawEquityCurve(strategyCurve, hodlCurve) {
    const ctx = document.getElementById('equity-canvas').getContext('2d');

    if (equityChart) {
      equityChart.destroy();
    }

    equityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: strategyCurve.map(p => p.date.toLocaleDateString()),
        datasets: [
          {
            label: 'Your Strategy',
            data: strategyCurve.map(p => p.value),
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 0
          },
          {
            label: 'Buy & Hold',
            data: hodlCurve.map(p => p.value),
            borderColor: '#6e7681',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9ca3af',
              maxTicksLimit: 10
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9ca3af',
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  function generateInsights(results, config, mcResults) {
    const insightsEl = document.getElementById('ai-insights');

    let insights = [];

    // Monte Carlo insights (priority)
    if (mcResults) {
      if (mcResults.profitProbability >= 70) {
        insights.push('<strong>Monte Carlo Analysis:</strong> ' + mcResults.profitProbability.toFixed(0) + '% probability of profit across 1000 simulations. This strategy shows robust performance under varying market conditions.');
      } else if (mcResults.profitProbability >= 50) {
        insights.push('<strong>Monte Carlo Analysis:</strong> ' + mcResults.profitProbability.toFixed(0) + '% probability of profit. The strategy is moderately reliable, but results vary significantly based on timing and market conditions.');
      } else {
        insights.push('<strong>Monte Carlo Analysis:</strong> Only ' + mcResults.profitProbability.toFixed(0) + '% probability of profit. The strategy underperforms more often than not - consider adjusting parameters or using a different approach.');
      }

      if (mcResults.ruinProbability > 10) {
        insights.push('<strong>Risk Warning:</strong> ' + mcResults.ruinProbability.toFixed(1) + '% risk of losing more than 50% of capital. Consider reducing position sizes to lower this risk.');
      } else if (mcResults.ruinProbability < 2) {
        insights.push('<strong>Risk Profile:</strong> Very low ' + mcResults.ruinProbability.toFixed(1) + '% risk of ruin. The strategy has good capital preservation characteristics.');
      }

      const spread = mcResults.p95 - mcResults.p5;
      if (spread > 100) {
        insights.push('Wide outcome range (' + mcResults.p5.toFixed(0) + '% to ' + mcResults.p95.toFixed(0) + '%) indicates high variance. Results are highly dependent on market conditions and timing.');
      } else if (spread < 30) {
        insights.push('Narrow outcome range (' + mcResults.p5.toFixed(0) + '% to ' + mcResults.p95.toFixed(0) + '%) suggests consistent, predictable results regardless of entry timing.');
      }
    }

    // Performance vs HODL
    const vsHodl = results.totalReturnPct - results.hodlReturnPct;
    if (vsHodl > 10) {
      insights.push('Your strategy outperformed buy & hold by ' + vsHodl.toFixed(1) + '%. Active trading added value during this period.');
    } else if (vsHodl < -10) {
      insights.push('Strategy underperformed buy & hold by ' + Math.abs(vsHodl).toFixed(1) + '%. Consider if the complexity is justified.');
    }

    // Win rate analysis
    if (results.winRate > 60) {
      insights.push('Strong ' + results.winRate.toFixed(0) + '% win rate shows consistent execution.');
    } else if (results.winRate < 40 && results.totalReturn > 0) {
      insights.push('Despite ' + results.winRate.toFixed(0) + '% win rate, the strategy profits because winners are larger than losers.');
    }

    // Drawdown analysis
    if (results.maxDrawdown > 30) {
      insights.push('Max drawdown of ' + results.maxDrawdown.toFixed(1) + '% is significant. Consider tighter stops or smaller positions.');
    }

    // Sharpe ratio
    if (results.sharpeRatio > 1) {
      insights.push('Sharpe ratio of ' + results.sharpeRatio.toFixed(2) + ' indicates good risk-adjusted returns.');
    } else if (results.sharpeRatio < 0.5) {
      insights.push('Low Sharpe ratio (' + results.sharpeRatio.toFixed(2) + ') - returns don\'t compensate for the risk.');
    }

    // Trade frequency
    const tradeDays = (new Date(config.endDate) - new Date(config.startDate)) / (1000 * 60 * 60 * 24);
    const tradesPerMonth = (results.totalTrades / tradeDays) * 30;

    if (tradesPerMonth > 20) {
      insights.push('High frequency (' + tradesPerMonth.toFixed(0) + ' trades/month) - factor in fees and slippage for live trading.');
    }

    // Profit factor
    if (results.profitFactor > 2) {
      insights.push('Excellent profit factor of ' + results.profitFactor.toFixed(2) + ' - winners significantly outweigh losses.');
    }

    insightsEl.innerHTML = insights.map(insight => '<p>' + insight + '</p>').join('');
  }

  function saveSimulation(config, results) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      config: config,
      summary: {
        totalReturn: results.totalReturn,
        totalReturnPct: results.totalReturnPct,
        winRate: results.winRate,
        totalTrades: results.totalTrades
      },
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 5); // Keep last 5
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadSavedSimulations();
  }

  function loadSavedSimulations() {
    const container = document.getElementById('simulations-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-simulations">No simulations yet. Run your first strategy above!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const returnClass = item.summary.totalReturnPct >= 0 ? 'positive' : 'negative';

      return `
        <div class="simulation-item">
          <div class="sim-info">
            <span class="sim-preset">${item.config.preset}</span>
            <span class="sim-period">${item.config.startDate} to ${item.config.endDate}</span>
            <span class="sim-date">${date}</span>
          </div>
          <div class="sim-results">
            <span class="sim-return ${returnClass}">${item.summary.totalReturnPct >= 0 ? '+' : ''}${item.summary.totalReturnPct.toFixed(2)}%</span>
            <span class="sim-trades">${item.summary.totalTrades} trades</span>
            <span class="sim-winrate">${item.summary.winRate.toFixed(0)}% win</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function exportResults() {
    const results = document.getElementById('simulation-results');
    const text = results.innerText;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-simulation-' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatCurrency(value) {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Initialize
  updateUI();
})();
