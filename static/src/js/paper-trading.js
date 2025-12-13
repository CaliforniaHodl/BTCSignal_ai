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

    // 4. Check consecutive losses
    const recentTrades = trades.slice(-settings.maxConsecutiveLosses);
    const consecutiveLosses = recentTrades.filter(t => t.result === 'loss').length;
    if (consecutiveLosses >= settings.maxConsecutiveLosses) {
      warnings.push(`${consecutiveLosses} consecutive losses - consider taking a break`);
    }

    // 5. Check daily loss
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.exitTime).toDateString() === today);
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const dailyLossPercent = -todayPnL / settings.startingCapital;

    if (dailyLossPercent >= settings.maxDailyLoss) {
      errors.push(`Daily loss limit reached (${(dailyLossPercent * 100).toFixed(1)}%) - no more trades today`);
    }

    // 6. Check max drawdown
    if (stats.maxDrawdown >= settings.maxDrawdown) {
      errors.push(`Max drawdown reached (${(stats.maxDrawdown * 100).toFixed(1)}%) - re-evaluate strategy`);
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

  // Public API
  window.BTCSAIPaperTrading = {
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
  };

  console.log('Paper Trading Journal loaded. Use BTCSAIPaperTrading.addTrade() to log trades.');
})();
