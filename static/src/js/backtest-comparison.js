// Backtest Comparison Tool
// Compare backtest results before and after bug fixes

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_backtest_history';

  // Get saved backtest results
  function getHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Save backtest result for comparison
  function saveResult(result) {
    const history = getHistory();

    const entry = {
      id: `bt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      strategy: result.strategy || 'Unknown',
      version: result.version || 'post-fix', // 'pre-fix' or 'post-fix'
      settings: {
        timeframe: result.timeframe,
        period: result.period,
        capital: result.capital,
        slippage: result.slippage,
        fee: result.fee,
      },
      stats: {
        totalReturn: result.totalReturn,
        winRate: result.winRate,
        totalTrades: result.totalTrades,
        profitFactor: result.profitFactor,
        maxDrawdown: result.maxDrawdown,
        sharpeRatio: result.sharpeRatio,
      },
      monteCarlo: result.monteCarlo ? {
        median: result.monteCarlo.median,
        p5: result.monteCarlo.p5,
        p95: result.monteCarlo.p95,
        profitProbability: result.monteCarlo.profitProbability,
        ruinProbability: result.monteCarlo.ruinProbability,
      } : null,
      notes: result.notes || '',
    };

    history.push(entry);

    // Keep last 50 results
    if (history.length > 50) {
      history.shift();
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      return { success: true, entry };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Compare two backtest results
  function compareResults(id1, id2) {
    const history = getHistory();
    const result1 = history.find(r => r.id === id1);
    const result2 = history.find(r => r.id === id2);

    if (!result1 || !result2) {
      return { error: 'One or both results not found' };
    }

    const comparison = {
      result1: result1,
      result2: result2,
      differences: {},
    };

    // Calculate differences
    const metrics = ['totalReturn', 'winRate', 'totalTrades', 'profitFactor', 'maxDrawdown', 'sharpeRatio'];

    metrics.forEach(metric => {
      const v1 = result1.stats[metric] || 0;
      const v2 = result2.stats[metric] || 0;
      const diff = v2 - v1;
      const pctChange = v1 !== 0 ? ((v2 - v1) / Math.abs(v1)) * 100 : (v2 !== 0 ? 100 : 0);

      comparison.differences[metric] = {
        before: v1,
        after: v2,
        change: diff,
        percentChange: pctChange,
        improved: metric === 'maxDrawdown' ? diff < 0 : diff > 0, // Lower drawdown is better
      };
    });

    // Monte Carlo comparison if available
    if (result1.monteCarlo && result2.monteCarlo) {
      comparison.monteCarloDiff = {
        medianChange: result2.monteCarlo.median - result1.monteCarlo.median,
        profitProbChange: result2.monteCarlo.profitProbability - result1.monteCarlo.profitProbability,
        ruinProbChange: result2.monteCarlo.ruinProbability - result1.monteCarlo.ruinProbability,
      };
    }

    return comparison;
  }

  // Generate comparison report
  function generateReport(id1, id2) {
    const comp = compareResults(id1, id2);

    if (comp.error) {
      return comp.error;
    }

    let report = '=== BACKTEST COMPARISON REPORT ===\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '--- BEFORE (Pre-Fix) ---\n';
    report += `Strategy: ${comp.result1.strategy}\n`;
    report += `Date: ${comp.result1.timestamp}\n`;
    report += `Version: ${comp.result1.version}\n\n`;

    report += '--- AFTER (Post-Fix) ---\n';
    report += `Strategy: ${comp.result2.strategy}\n`;
    report += `Date: ${comp.result2.timestamp}\n`;
    report += `Version: ${comp.result2.version}\n\n`;

    report += '--- METRIC CHANGES ---\n';

    Object.entries(comp.differences).forEach(([metric, data]) => {
      const arrow = data.improved ? '↑' : (data.change === 0 ? '→' : '↓');
      const sign = data.change >= 0 ? '+' : '';
      report += `${metric}: ${data.before.toFixed(2)} → ${data.after.toFixed(2)} (${sign}${data.change.toFixed(2)}, ${sign}${data.percentChange.toFixed(1)}%) ${arrow}\n`;
    });

    if (comp.monteCarloDiff) {
      report += '\n--- MONTE CARLO CHANGES ---\n';
      report += `Median Return: ${comp.monteCarloDiff.medianChange >= 0 ? '+' : ''}${comp.monteCarloDiff.medianChange.toFixed(2)}%\n`;
      report += `Profit Probability: ${comp.monteCarloDiff.profitProbChange >= 0 ? '+' : ''}${comp.monteCarloDiff.profitProbChange.toFixed(1)}%\n`;
      report += `Ruin Probability: ${comp.monteCarloDiff.ruinProbChange >= 0 ? '+' : ''}${comp.monteCarloDiff.ruinProbChange.toFixed(1)}%\n`;
    }

    report += '\n--- ANALYSIS ---\n';

    // Analyze if results are more realistic
    const returnDiff = comp.differences.totalReturn;
    const winRateDiff = comp.differences.winRate;

    if (returnDiff.change < 0 && winRateDiff.change < 0) {
      report += 'Results are LOWER after bug fixes - this is expected and indicates more realistic numbers.\n';
      report += 'The previous results were likely inflated by bugs.\n';
    } else if (returnDiff.change > 0) {
      report += 'Results are HIGHER after fixes - trailing stops may now be working correctly.\n';
    } else {
      report += 'Results are similar - the bugs may not have significantly affected this strategy.\n';
    }

    return report;
  }

  // Get latest pre-fix and post-fix results
  function getLatestComparison() {
    const history = getHistory();
    const preFix = history.filter(r => r.version === 'pre-fix').pop();
    const postFix = history.filter(r => r.version === 'post-fix').pop();

    if (!preFix || !postFix) {
      return {
        available: false,
        message: 'Need both pre-fix and post-fix results for comparison',
        hasPreFix: !!preFix,
        hasPostFix: !!postFix,
      };
    }

    return {
      available: true,
      comparison: compareResults(preFix.id, postFix.id),
      report: generateReport(preFix.id, postFix.id),
    };
  }

  // Clear history
  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }

  // Public API
  window.BTCSAIBacktestCompare = {
    getHistory,
    saveResult,
    compareResults,
    generateReport,
    getLatestComparison,
    clearHistory,
  };

  console.log('Backtest Comparison Tool loaded. Use BTCSAIBacktestCompare.saveResult() after backtests.');
})();
