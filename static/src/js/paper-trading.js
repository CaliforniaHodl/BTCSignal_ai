// Paper Trading Journal - Personal Trade Tracker
// For tracking your personal paper trades before going live

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_paper_trades';
  const SETTINGS_KEY = 'btcsai_paper_settings';

  // Default settings based on BEFORE_TRADING_REAL_MONEY.md recommendations
  const DEFAULT_SETTINGS = {
    startingCapital: 100,           // $100 experiment
    maxRiskPerTrade: 0.02,          // 2% max risk per trade
    maxDailyLoss: 0.05,             // 5% max daily loss
    maxDrawdown: 0.20,              // 20% max drawdown
    maxConsecutiveLosses: 3,        // Stop after 3 losses in a row
    requireStopLoss: true,          // Must set SL before entry
    maxPositionSize: 0.50,          // Max 50% of capital per trade
  };

  // Get settings
  function getSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  // Save settings
  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving settings:', e);
      return false;
    }
  }

  // Get all paper trades
  function getTrades() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Save trades
  function saveTrades(trades) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
      return true;
    } catch (e) {
      console.error('Error saving trades:', e);
      return false;
    }
  }

  // Risk management validation
  function validateTrade(trade) {
    const settings = getSettings();
    const trades = getTrades();
    const stats = calculateStats();
    const errors = [];
    const warnings = [];

    // 1. Check if stop loss is set
    if (settings.requireStopLoss && !trade.stopLoss) {
      errors.push('Stop loss is required before entering a trade');
    }

    // 2. Check position size vs max risk
    if (trade.positionSize && stats.currentCapital) {
      const positionRatio = trade.positionSize / stats.currentCapital;
      if (positionRatio > settings.maxPositionSize) {
        errors.push(`Position size (${(positionRatio * 100).toFixed(1)}%) exceeds max allowed (${settings.maxPositionSize * 100}%)`);
      }
    }

    // 3. Check risk per trade
    if (trade.entryPrice && trade.stopLoss && trade.positionSize) {
      const riskPercent = Math.abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice;
      const dollarRisk = trade.positionSize * riskPercent;
      const accountRisk = dollarRisk / stats.currentCapital;

      if (accountRisk > settings.maxRiskPerTrade) {
        errors.push(`Risk per trade (${(accountRisk * 100).toFixed(1)}%) exceeds max allowed (${settings.maxRiskPerTrade * 100}%)`);
      }
    }

    // 4. Check consecutive losses - FIX: Count actual streak from most recent trade
    let consecutiveLosses = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].result === 'loss') {
        consecutiveLosses++;
      } else {
        break; // Stop counting when we hit a non-loss
      }
    }
    if (consecutiveLosses >= settings.maxConsecutiveLosses) {
      warnings.push(`${consecutiveLosses} consecutive losses - consider taking a break`);
    }

    // 5. Check daily loss - FIX: Use current equity, not starting capital
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.exitTime).toDateString() === today);
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    // FIX: Calculate daily loss relative to equity at start of day (approximate with current - today's P&L)
    const equityAtDayStart = stats.currentEquity - todayPnL;
    const dailyLossPercent = equityAtDayStart > 0 ? -todayPnL / equityAtDayStart : 0;

    if (dailyLossPercent >= settings.maxDailyLoss) {
      errors.push(`Daily loss limit reached (${(dailyLossPercent * 100).toFixed(1)}%) - no more trades today`);
    }

    // 6. Check max drawdown - FIX: Use strict greater than at limit
    if (stats.maxDrawdown > settings.maxDrawdown) {
      errors.push(`Max drawdown exceeded (${(stats.maxDrawdown * 100).toFixed(1)}%) - re-evaluate strategy`);
    } else if (stats.maxDrawdown >= settings.maxDrawdown * 0.9) {
      // Warn when approaching limit (90% of max)
      warnings.push(`Approaching max drawdown limit (${(stats.maxDrawdown * 100).toFixed(1)}%)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        consecutiveLosses,
        dailyLossPercent,
        currentDrawdown: stats.drawdown,
      }
    };
  }

  // Add new trade
  function addTrade(trade) {
    const validation = validateTrade(trade);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    const trades = getTrades();
    const newTrade = {
      id: `paper_${Date.now()}`,
      entryTime: trade.entryTime || new Date().toISOString(),
      exitTime: null,
      direction: trade.direction || 'long',
      entryPrice: trade.entryPrice,
      targetPrice: trade.targetPrice,
      stopLoss: trade.stopLoss,
      exitPrice: null,
      positionSize: trade.positionSize,
      notes: trade.notes || '',
      strategy: trade.strategy || '',
      confidence: trade.confidence,
      result: 'open',
      pnl: null,
      pnlPercent: null,
    };

    trades.push(newTrade);
    saveTrades(trades);

    return {
      success: true,
      trade: newTrade,
      warnings: validation.warnings,
    };
  }

  // Close trade
  function closeTrade(tradeId, exitPrice, exitReason) {
    const trades = getTrades();
    const tradeIndex = trades.findIndex(t => t.id === tradeId);

    if (tradeIndex === -1) {
      return { success: false, error: 'Trade not found' };
    }

    const trade = trades[tradeIndex];
    trade.exitTime = new Date().toISOString();
    trade.exitPrice = exitPrice;
    trade.exitReason = exitReason || 'manual';

    // Calculate P&L
    if (trade.direction === 'long') {
      trade.pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else {
      trade.pnlPercent = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
    }
    trade.pnl = trade.positionSize * (trade.pnlPercent / 100);
    trade.result = trade.pnl >= 0 ? 'win' : 'loss';

    trades[tradeIndex] = trade;
    saveTrades(trades);

    return { success: true, trade };
  }

  // Calculate statistics
  function calculateStats() {
    const settings = getSettings();
    const trades = getTrades();
    const closedTrades = trades.filter(t => t.result !== 'open');

    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        openTrades: trades.filter(t => t.result === 'open').length,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnL: 0,
        totalReturn: 0,
        currentCapital: settings.startingCapital,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        drawdown: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgHoldTime: 0,
      };
    }

    const wins = closedTrades.filter(t => t.result === 'win');
    const losses = closedTrades.filter(t => t.result === 'loss');
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const currentCapital = settings.startingCapital + totalPnL;

    // Calculate drawdown
    let peak = settings.startingCapital;
    let maxDrawdown = 0;
    let runningCapital = settings.startingCapital;

    closedTrades.forEach(t => {
      runningCapital += t.pnl || 0;
      if (runningCapital > peak) peak = runningCapital;
      const dd = (peak - runningCapital) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    const currentDrawdown = (peak - currentCapital) / peak;

    // Avg win/loss
    const avgWin = wins.length > 0
      ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
      : 0;
    const avgLoss = losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length)
      : 0;

    // Profit factor
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Best/worst trade
    const allPnL = closedTrades.map(t => t.pnl || 0);
    const bestTrade = Math.max(...allPnL);
    const worstTrade = Math.min(...allPnL);

    // Avg hold time
    const holdTimes = closedTrades.map(t => {
      const entry = new Date(t.entryTime);
      const exit = new Date(t.exitTime);
      return (exit - entry) / (1000 * 60 * 60); // hours
    });
    const avgHoldTime = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length;

    return {
      totalTrades: closedTrades.length,
      openTrades: trades.filter(t => t.result === 'open').length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / closedTrades.length) * 100,
      totalPnL,
      totalReturn: (totalPnL / settings.startingCapital) * 100,
      currentCapital,
      avgWin,
      avgLoss,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      maxDrawdown: maxDrawdown * 100,
      drawdown: currentDrawdown * 100,
      bestTrade,
      worstTrade,
      avgHoldTime,
    };
  }

  // Export trades to CSV
  function exportToCSV() {
    const trades = getTrades();
    const settings = getSettings();
    const stats = calculateStats();

    let csv = 'PAPER TRADING JOURNAL\n';
    csv += `Generated,${new Date().toISOString()}\n`;
    csv += `Starting Capital,$${settings.startingCapital}\n`;
    csv += `Current Capital,$${stats.currentCapital.toFixed(2)}\n`;
    csv += `Total Return,${stats.totalReturn.toFixed(2)}%\n`;
    csv += `Win Rate,${stats.winRate.toFixed(1)}%\n\n`;

    csv += 'TRADE LOG\n';
    csv += 'ID,Entry Time,Exit Time,Direction,Entry Price,Exit Price,Stop Loss,Target,Position Size,P&L,P&L %,Result,Notes\n';

    trades.forEach(t => {
      csv += `${t.id},`;
      csv += `${t.entryTime},`;
      csv += `${t.exitTime || ''},`;
      csv += `${t.direction},`;
      csv += `${t.entryPrice},`;
      csv += `${t.exitPrice || ''},`;
      csv += `${t.stopLoss || ''},`;
      csv += `${t.targetPrice || ''},`;
      csv += `${t.positionSize || ''},`;
      csv += `${t.pnl !== null ? t.pnl.toFixed(2) : ''},`;
      csv += `${t.pnlPercent !== null ? t.pnlPercent.toFixed(2) + '%' : ''},`;
      csv += `${t.result},`;
      csv += `"${(t.notes || '').replace(/"/g, '""')}"\n`;
    });

    return csv;
  }

  // Export to JSON
  function exportToJSON() {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      settings: getSettings(),
      stats: calculateStats(),
      trades: getTrades(),
    }, null, 2);
  }

  // Clear all trades (with confirmation)
  function clearAllTrades() {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }

  // ==================== LIVE FEED INTEGRATION ====================

  let liveFeedConnected = false;
  let autoExecutionEnabled = false;
  let unsubscribeFns = [];

  /**
   * Connect to live price feed for auto-execution
   * Requires BTCSAILiveFeed module
   */
  function connectLiveFeed() {
    if (typeof BTCSAILiveFeed === 'undefined') {
      console.warn('[PaperTrading] Live feed module not loaded');
      return false;
    }

    if (liveFeedConnected) {
      console.log('[PaperTrading] Already connected to live feed');
      return true;
    }

    // Connect to WebSocket
    BTCSAILiveFeed.connect();

    // Subscribe to trade executions (SL/TP hits)
    const unsubTrades = BTCSAILiveFeed.subscribeToTrades((execution) => {
      handleAutoExecution(execution);
    });
    unsubscribeFns.push(unsubTrades);

    // Subscribe to connection status
    const unsubStatus = BTCSAILiveFeed.subscribeToStatus((status) => {
      liveFeedConnected = status === 'connected';
      console.log('[PaperTrading] Live feed status:', status);

      // Emit custom event for UI updates
      window.dispatchEvent(new CustomEvent('btcsai:livefeed:status', {
        detail: { status, connected: liveFeedConnected }
      }));
    });
    unsubscribeFns.push(unsubStatus);

    liveFeedConnected = true;
    return true;
  }

  /**
   * Disconnect from live feed
   */
  function disconnectLiveFeed() {
    if (typeof BTCSAILiveFeed !== 'undefined') {
      BTCSAILiveFeed.disconnect();
    }
    unsubscribeFns.forEach(fn => fn());
    unsubscribeFns = [];
    liveFeedConnected = false;
  }

  /**
   * Enable auto-execution mode
   * Open trades will be tracked and closed automatically on SL/TP
   */
  function enableAutoExecution() {
    if (!liveFeedConnected) {
      connectLiveFeed();
    }

    autoExecutionEnabled = true;

    // Register all open trades with live feed
    const trades = getTrades();
    trades.forEach(trade => {
      if (trade.result === 'open') {
        registerTradeWithLiveFeed(trade);
      }
    });

    console.log('[PaperTrading] Auto-execution enabled');
    return true;
  }

  /**
   * Disable auto-execution mode
   */
  function disableAutoExecution() {
    autoExecutionEnabled = false;

    // Remove all positions from live feed tracking
    if (typeof BTCSAILiveFeed !== 'undefined') {
      const openPositions = BTCSAILiveFeed.getOpenPositions();
      openPositions.forEach(pos => {
        BTCSAILiveFeed.closePosition(pos.id);
      });
    }

    console.log('[PaperTrading] Auto-execution disabled');
  }

  /**
   * Register a trade with the live feed for tracking
   * @param {Object} trade
   */
  function registerTradeWithLiveFeed(trade) {
    if (typeof BTCSAILiveFeed === 'undefined' || !autoExecutionEnabled) return;

    // Convert paper trade format to live feed format
    const position = {
      id: trade.id,
      entryPrice: trade.entryPrice,
      direction: trade.direction,
      size: trade.positionSize,
      stopLoss: trade.stopLoss
        ? Math.abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice
        : null,
      takeProfit: trade.targetPrice
        ? Math.abs(trade.targetPrice - trade.entryPrice) / trade.entryPrice
        : null,
      trailingStop: trade.trailingStop || null,
      trailingActivation: trade.trailingActivation || 0.01
    };

    BTCSAILiveFeed.trackPosition(position);
    console.log('[PaperTrading] Registered trade with live feed:', trade.id);
  }

  /**
   * Handle auto-execution event from live feed
   * @param {Object} execution
   */
  function handleAutoExecution(execution) {
    if (!autoExecutionEnabled) return;

    const { position, exitPrice, reason, pnlPercent, pnlAmount } = execution;

    // Close the paper trade
    const result = closeTrade(position.id, exitPrice, reason);

    if (result.success) {
      console.log(`[PaperTrading] Auto-closed: ${position.id} @ $${exitPrice.toFixed(2)} (${reason})`);

      // Emit event for UI notification
      window.dispatchEvent(new CustomEvent('btcsai:trade:autoclosed', {
        detail: {
          trade: result.trade,
          reason,
          pnlPercent,
          pnlAmount
        }
      }));

      // Play sound notification if available
      playTradeSound(result.trade.result === 'win');
    }
  }

  /**
   * Play sound on trade close
   * @param {boolean} isWin
   */
  function playTradeSound(isWin) {
    try {
      // Use Web Audio API for simple beep
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = isWin ? 800 : 400;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Audio not supported, ignore
    }
  }

  /**
   * Add trade with auto-execution support
   * Overrides the base addTrade to register with live feed
   * @param {Object} trade
   * @returns {Object}
   */
  const baseAddTrade = addTrade;
  addTrade = function(trade) {
    const result = baseAddTrade(trade);

    if (result.success && autoExecutionEnabled) {
      registerTradeWithLiveFeed(result.trade);
    }

    return result;
  };

  /**
   * Get current live price
   * @returns {number|null}
   */
  function getLivePrice() {
    if (typeof BTCSAILiveFeed === 'undefined') return null;
    return BTCSAILiveFeed.getCurrentPrice();
  }

  /**
   * Check if live feed is connected
   * @returns {boolean}
   */
  function isLiveFeedConnected() {
    return liveFeedConnected;
  }

  /**
   * Check if auto-execution is enabled
   * @returns {boolean}
   */
  function isAutoExecutionEnabled() {
    return autoExecutionEnabled;
  }

  /**
   * Subscribe to price updates
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  function subscribeToPrices(callback) {
    if (typeof BTCSAILiveFeed === 'undefined') {
      console.warn('[PaperTrading] Live feed not available');
      return () => {};
    }

    if (!liveFeedConnected) {
      connectLiveFeed();
    }

    return BTCSAILiveFeed.subscribeToPrices(callback);
  }

  /**
   * Calculate unrealized P&L for open positions
   * @param {number} currentPrice
   * @returns {Object}
   */
  function calculateUnrealizedPnL(currentPrice) {
    const trades = getTrades().filter(t => t.result === 'open');

    let totalUnrealized = 0;
    const positions = [];

    trades.forEach(trade => {
      let unrealizedPnL;
      if (trade.direction === 'long') {
        unrealizedPnL = ((currentPrice - trade.entryPrice) / trade.entryPrice) * trade.positionSize;
      } else {
        unrealizedPnL = ((trade.entryPrice - currentPrice) / trade.entryPrice) * trade.positionSize;
      }

      totalUnrealized += unrealizedPnL;
      positions.push({
        id: trade.id,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        currentPrice,
        unrealizedPnL,
        unrealizedPercent: trade.direction === 'long'
          ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
          : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100
      });
    });

    return {
      totalUnrealized,
      positions,
      positionCount: positions.length
    };
  }

  // Public API
  window.BTCSAIPaperTrading = {
    // Core functions
    getSettings,
    saveSettings,
    getTrades,
    addTrade,
    closeTrade,
    validateTrade,
    calculateStats,
    exportToCSV,
    exportToJSON,
    clearAllTrades,
    DEFAULT_SETTINGS,

    // Live feed integration
    connectLiveFeed,
    disconnectLiveFeed,
    enableAutoExecution,
    disableAutoExecution,
    isLiveFeedConnected,
    isAutoExecutionEnabled,
    getLivePrice,
    subscribeToPrices,
    calculateUnrealizedPnL
  };

  console.log('Paper Trading Journal loaded with live feed support.');
})();
