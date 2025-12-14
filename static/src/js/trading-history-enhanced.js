// BTC Signal AI - Trading History Enhanced
// Advanced filtering, sorting, search, pagination, and analytics for trading history
(function() {
  'use strict';

  /**
   * TradingHistoryEnhanced Module
   * Provides advanced data manipulation and analytics for trade journal entries
   */

  let allEntries = [];
  let filteredEntries = [];
  let currentSort = { field: 'date', direction: 'desc' };
  let currentFilters = {};
  let currentSearchQuery = '';

  /**
   * Initialize the module with trade entries
   * @param {Array<Object>} entries - Array of trade entries from TradeJournal
   */
  function init(entries) {
    allEntries = entries || [];
    filteredEntries = [...allEntries];
    return allEntries.length;
  }

  /**
   * Reset all filters and return to original dataset
   */
  function reset() {
    filteredEntries = [...allEntries];
    currentFilters = {};
    currentSearchQuery = '';
    currentSort = { field: 'date', direction: 'desc' };
  }

  /**
   * Advanced filtering with multiple criteria
   * @param {Object} criteria - Filter criteria object
   * @param {Object} criteria.dateRange - { start: ISO date string, end: ISO date string }
   * @param {string} criteria.type - 'long' | 'short' | 'all'
   * @param {string} criteria.status - 'open' | 'closed' | 'all'
   * @param {Object} criteria.pnlRange - { min: number, max: number }
   * @param {Object} criteria.pnlPercentRange - { min: number, max: number }
   * @param {Array<string>} criteria.tags - Array of tags to filter by
   * @param {string} criteria.outcome - 'win' | 'loss' | 'breakeven' | 'all'
   * @param {string} criteria.timeframe - Timeframe to filter by
   * @param {Object} criteria.sizeRange - { min: number, max: number }
   * @param {Object} criteria.aiScoreRange - { min: number, max: number }
   * @returns {Array<Object>} - Filtered entries
   */
  function filter(criteria) {
    currentFilters = criteria || {};
    let results = [...allEntries];

    // Date range filter
    if (criteria.dateRange) {
      if (criteria.dateRange.start) {
        const startDate = new Date(criteria.dateRange.start);
        results = results.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= startDate;
        });
      }
      if (criteria.dateRange.end) {
        const endDate = new Date(criteria.dateRange.end);
        // Set to end of day
        endDate.setHours(23, 59, 59, 999);
        results = results.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate <= endDate;
        });
      }
    }

    // Type filter (direction)
    if (criteria.type && criteria.type !== 'all') {
      results = results.filter(entry => entry.direction === criteria.type);
    }

    // Status filter
    if (criteria.status && criteria.status !== 'all') {
      results = results.filter(entry => entry.status === criteria.status);
    }

    // P&L range filter
    if (criteria.pnlRange) {
      if (criteria.pnlRange.min !== undefined && criteria.pnlRange.min !== null) {
        results = results.filter(entry => entry.pnl >= criteria.pnlRange.min);
      }
      if (criteria.pnlRange.max !== undefined && criteria.pnlRange.max !== null) {
        results = results.filter(entry => entry.pnl <= criteria.pnlRange.max);
      }
    }

    // P&L Percent range filter
    if (criteria.pnlPercentRange) {
      if (criteria.pnlPercentRange.min !== undefined && criteria.pnlPercentRange.min !== null) {
        results = results.filter(entry => entry.pnlPercent >= criteria.pnlPercentRange.min);
      }
      if (criteria.pnlPercentRange.max !== undefined && criteria.pnlPercentRange.max !== null) {
        results = results.filter(entry => entry.pnlPercent <= criteria.pnlPercentRange.max);
      }
    }

    // Tags filter (match any tag)
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(entry => {
        if (!entry.tags || !Array.isArray(entry.tags)) return false;
        return criteria.tags.some(tag => entry.tags.includes(tag));
      });
    }

    // Outcome filter
    if (criteria.outcome && criteria.outcome !== 'all') {
      if (criteria.outcome === 'win') {
        results = results.filter(entry => entry.pnl > 0);
      } else if (criteria.outcome === 'loss') {
        results = results.filter(entry => entry.pnl < 0);
      } else if (criteria.outcome === 'breakeven') {
        results = results.filter(entry => entry.pnl === 0);
      }
    }

    // Timeframe filter
    if (criteria.timeframe && criteria.timeframe !== 'all') {
      results = results.filter(entry => entry.timeframe === criteria.timeframe);
    }

    // Size range filter
    if (criteria.sizeRange) {
      if (criteria.sizeRange.min !== undefined && criteria.sizeRange.min !== null) {
        results = results.filter(entry => entry.size >= criteria.sizeRange.min);
      }
      if (criteria.sizeRange.max !== undefined && criteria.sizeRange.max !== null) {
        results = results.filter(entry => entry.size <= criteria.sizeRange.max);
      }
    }

    // AI Score range filter
    if (criteria.aiScoreRange) {
      if (criteria.aiScoreRange.min !== undefined && criteria.aiScoreRange.min !== null) {
        results = results.filter(entry => entry.aiScore !== null && entry.aiScore >= criteria.aiScoreRange.min);
      }
      if (criteria.aiScoreRange.max !== undefined && criteria.aiScoreRange.max !== null) {
        results = results.filter(entry => entry.aiScore !== null && entry.aiScore <= criteria.aiScoreRange.max);
      }
    }

    filteredEntries = results;

    // Re-apply search if active
    if (currentSearchQuery) {
      filteredEntries = performSearch(currentSearchQuery, filteredEntries);
    }

    // Re-apply sort
    if (currentSort.field) {
      filteredEntries = performSort(currentSort.field, currentSort.direction, filteredEntries);
    }

    return filteredEntries;
  }

  /**
   * Sort entries by specified field and direction
   * @param {string} field - Field name to sort by
   * @param {string} direction - 'asc' | 'desc'
   * @param {Array<Object>} entries - Optional entries array (defaults to filteredEntries)
   * @returns {Array<Object>} - Sorted entries
   */
  function performSort(field, direction, entries) {
    const data = entries || [...filteredEntries];
    direction = direction || 'asc';

    data.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle dates
      if (field === 'date' || field === 'entryDate' || field === 'exitDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle strings
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }

  /**
   * Sort entries by specified field and direction
   * @param {string} field - Field name to sort by
   * @param {string} direction - 'asc' | 'desc'
   * @returns {Array<Object>} - Sorted entries
   */
  function sort(field, direction) {
    currentSort = { field, direction: direction || 'asc' };
    filteredEntries = performSort(field, direction);
    return filteredEntries;
  }

  /**
   * Search across all entry fields
   * @param {string} query - Search query string
   * @param {Array<Object>} entries - Optional entries array
   * @returns {Array<Object>} - Matching entries
   */
  function performSearch(query, entries) {
    if (!query || query.trim() === '') {
      return entries || filteredEntries;
    }

    const data = entries || [...filteredEntries];
    const searchLower = query.toLowerCase().trim();

    return data.filter(entry => {
      // Search in string fields
      const searchableFields = [
        entry.direction,
        entry.status,
        entry.notes,
        entry.timeframe,
        entry.id
      ];

      // Search in numeric fields (converted to string)
      const numericFields = [
        entry.entryPrice?.toString(),
        entry.exitPrice?.toString(),
        entry.size?.toString(),
        entry.pnl?.toFixed(2),
        entry.pnlPercent?.toFixed(2),
        entry.stopLoss?.toString(),
        entry.takeProfit?.toString(),
        entry.aiScore?.toString()
      ];

      // Search in date fields (formatted)
      const dateFields = [
        entry.date ? new Date(entry.date).toLocaleDateString() : '',
        entry.entryDate ? new Date(entry.entryDate).toLocaleDateString() : '',
        entry.exitDate ? new Date(entry.exitDate).toLocaleDateString() : ''
      ];

      // Search in tags array
      const tagMatches = entry.tags && Array.isArray(entry.tags)
        ? entry.tags.some(tag => tag.toLowerCase().includes(searchLower))
        : false;

      // Combine all searchable content
      const allContent = [
        ...searchableFields,
        ...numericFields,
        ...dateFields
      ].filter(val => val !== null && val !== undefined);

      // Check if any field matches
      const fieldMatch = allContent.some(val =>
        val.toString().toLowerCase().includes(searchLower)
      );

      return fieldMatch || tagMatches;
    });
  }

  /**
   * Search across all entry fields
   * @param {string} query - Search query string
   * @returns {Array<Object>} - Matching entries
   */
  function search(query) {
    currentSearchQuery = query || '';
    filteredEntries = performSearch(query);
    return filteredEntries;
  }

  /**
   * Get paginated results
   * @param {number} page - Page number (1-based)
   * @param {number} size - Number of items per page
   * @returns {Object} - { data: Array, page: number, size: number, totalPages: number, totalItems: number }
   */
  function getPagedResults(page, size) {
    page = Math.max(1, parseInt(page) || 1);
    size = Math.max(1, parseInt(size) || 10);

    const totalItems = filteredEntries.length;
    const totalPages = Math.ceil(totalItems / size);
    const validPage = Math.min(page, totalPages || 1);
    const startIndex = (validPage - 1) * size;
    const endIndex = startIndex + size;

    const data = filteredEntries.slice(startIndex, endIndex);

    return {
      data: data,
      page: validPage,
      size: size,
      totalPages: totalPages,
      totalItems: totalItems,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, totalItems)
    };
  }

  /**
   * Get aggregate statistics for current filtered dataset
   * @returns {Object} - Comprehensive statistics object
   */
  function getAggregateStats() {
    if (filteredEntries.length === 0) {
      return {
        totalTrades: 0,
        closedTrades: 0,
        openTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakevenTrades: 0,
        winRate: 0,
        lossRate: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        avgPnl: 0,
        avgPnlPercent: 0,
        avgWin: 0,
        avgLoss: 0,
        avgWinPercent: 0,
        avgLossPercent: 0,
        bestTrade: null,
        worstTrade: null,
        profitFactor: 0,
        expectancy: 0,
        sharpeRatio: 0,
        totalVolume: 0,
        avgVolume: 0,
        longTrades: 0,
        shortTrades: 0,
        longWinRate: 0,
        shortWinRate: 0,
        avgHoldTime: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0
      };
    }

    const closedTrades = filteredEntries.filter(e => e.status === 'closed');
    const openTrades = filteredEntries.filter(e => e.status === 'open');
    const winningTrades = filteredEntries.filter(e => e.pnl > 0);
    const losingTrades = filteredEntries.filter(e => e.pnl < 0);
    const breakevenTrades = filteredEntries.filter(e => e.pnl === 0 && e.status === 'closed');

    // Basic counts
    const totalTrades = filteredEntries.length;
    const wins = winningTrades.length;
    const losses = losingTrades.length;

    // P&L calculations
    const totalPnl = filteredEntries.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const totalPnlPercent = filteredEntries.reduce((sum, e) => sum + (e.pnlPercent || 0), 0);
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgPnlPercent = totalTrades > 0 ? totalPnlPercent / totalTrades : 0;

    // Win/Loss averages
    const totalWinAmount = winningTrades.reduce((sum, e) => sum + e.pnl, 0);
    const totalLossAmount = Math.abs(losingTrades.reduce((sum, e) => sum + e.pnl, 0));
    const avgWin = wins > 0 ? totalWinAmount / wins : 0;
    const avgLoss = losses > 0 ? totalLossAmount / losses : 0;

    const totalWinPercent = winningTrades.reduce((sum, e) => sum + e.pnlPercent, 0);
    const totalLossPercent = Math.abs(losingTrades.reduce((sum, e) => sum + e.pnlPercent, 0));
    const avgWinPercent = wins > 0 ? totalWinPercent / wins : 0;
    const avgLossPercent = losses > 0 ? totalLossPercent / losses : 0;

    // Best and worst trades
    const sortedByPnl = [...filteredEntries].sort((a, b) => b.pnl - a.pnl);
    const bestTrade = sortedByPnl[0] || null;
    const worstTrade = sortedByPnl[sortedByPnl.length - 1] || null;

    // Profit factor
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 999 : 0;

    // Expectancy
    const expectancy = avgPnl;

    // Win/Loss rates
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const lossRate = totalTrades > 0 ? (losses / totalTrades) * 100 : 0;

    // Volume statistics
    const totalVolume = filteredEntries.reduce((sum, e) => sum + (e.size || 0), 0);
    const avgVolume = totalTrades > 0 ? totalVolume / totalTrades : 0;

    // Long vs Short performance
    const longTrades = filteredEntries.filter(e => e.direction === 'long');
    const shortTrades = filteredEntries.filter(e => e.direction === 'short');
    const longWins = longTrades.filter(e => e.pnl > 0).length;
    const shortWins = shortTrades.filter(e => e.pnl > 0).length;
    const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
    const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

    // Average hold time
    const tradesWithDates = filteredEntries.filter(e => e.entryDate && e.exitDate);
    const avgHoldTime = tradesWithDates.length > 0
      ? tradesWithDates.reduce((sum, e) => {
          const entry = new Date(e.entryDate);
          const exit = new Date(e.exitDate);
          return sum + (exit - entry);
        }, 0) / tradesWithDates.length
      : 0;

    // Consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    const sortedByDate = [...filteredEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedByDate.forEach(entry => {
      if (entry.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else if (entry.pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });

    // Sharpe Ratio (simplified - assumes risk-free rate of 0)
    let sharpeRatio = 0;
    if (closedTrades.length > 1) {
      const returns = closedTrades.map(e => e.pnlPercent);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) : 0;
    }

    return {
      totalTrades: totalTrades,
      closedTrades: closedTrades.length,
      openTrades: openTrades.length,
      winningTrades: wins,
      losingTrades: losses,
      breakevenTrades: breakevenTrades.length,
      winRate: winRate,
      lossRate: lossRate,
      totalPnl: totalPnl,
      totalPnlPercent: totalPnlPercent,
      avgPnl: avgPnl,
      avgPnlPercent: avgPnlPercent,
      avgWin: avgWin,
      avgLoss: avgLoss,
      avgWinPercent: avgWinPercent,
      avgLossPercent: avgLossPercent,
      bestTrade: bestTrade,
      worstTrade: worstTrade,
      profitFactor: profitFactor,
      expectancy: expectancy,
      sharpeRatio: sharpeRatio,
      totalVolume: totalVolume,
      avgVolume: avgVolume,
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWinRate: longWinRate,
      shortWinRate: shortWinRate,
      avgHoldTime: avgHoldTime,
      avgHoldTimeDays: avgHoldTime / (1000 * 60 * 60 * 24),
      maxConsecutiveWins: maxConsecutiveWins,
      maxConsecutiveLosses: maxConsecutiveLosses
    };
  }

  /**
   * Get P&L calendar heatmap data
   * Organizes trades by date for calendar visualization
   * @param {number} year - Optional year filter (defaults to current year)
   * @returns {Array<Object>} - Array of { date: 'YYYY-MM-DD', pnl: number, count: number, trades: Array }
   */
  function getCalendarData(year) {
    const targetYear = year || new Date().getFullYear();
    const calendarMap = {};

    // Filter entries for the target year
    const yearEntries = filteredEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getFullYear() === targetYear;
    });

    // Group by date
    yearEntries.forEach(entry => {
      const date = new Date(entry.date);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!calendarMap[dateKey]) {
        calendarMap[dateKey] = {
          date: dateKey,
          pnl: 0,
          count: 0,
          trades: []
        };
      }

      calendarMap[dateKey].pnl += entry.pnl || 0;
      calendarMap[dateKey].count++;
      calendarMap[dateKey].trades.push(entry);
    });

    // Convert to array and sort by date
    const calendarData = Object.values(calendarMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate intensity for heatmap (0-1 scale)
    const maxAbsPnl = Math.max(...calendarData.map(d => Math.abs(d.pnl)), 1);
    calendarData.forEach(day => {
      day.intensity = Math.abs(day.pnl) / maxAbsPnl;
      day.isPositive = day.pnl >= 0;
    });

    return calendarData;
  }

  /**
   * Get performance chart data
   * Prepares data for various chart visualizations
   * @param {string} chartType - 'equity' | 'pnl-distribution' | 'monthly-performance' | 'win-loss-ratio' | 'drawdown'
   * @returns {Object} - Chart-ready data object
   */
  function getChartData(chartType) {
    switch (chartType) {
      case 'equity':
        return getEquityCurveData();
      case 'pnl-distribution':
        return getPnlDistributionData();
      case 'monthly-performance':
        return getMonthlyPerformanceData();
      case 'win-loss-ratio':
        return getWinLossRatioData();
      case 'drawdown':
        return getDrawdownData();
      case 'timeframe-performance':
        return getTimeframePerformanceData();
      default:
        return null;
    }
  }

  /**
   * Get equity curve data
   * @private
   */
  function getEquityCurveData() {
    const sortedEntries = [...filteredEntries].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    let runningBalance = 0;
    const equity = sortedEntries.map((entry, index) => {
      runningBalance += entry.pnl || 0;
      return {
        index: index + 1,
        date: entry.date,
        balance: runningBalance,
        pnl: entry.pnl,
        trade: entry
      };
    });

    // Add starting point
    equity.unshift({
      index: 0,
      date: sortedEntries.length > 0 ? sortedEntries[0].date : new Date().toISOString(),
      balance: 0,
      pnl: 0,
      trade: null
    });

    return {
      type: 'equity',
      data: equity,
      labels: equity.map(e => e.index),
      values: equity.map(e => e.balance),
      finalBalance: runningBalance
    };
  }

  /**
   * Get P&L distribution data (histogram)
   * @private
   */
  function getPnlDistributionData() {
    const pnlValues = filteredEntries.map(e => e.pnl || 0);

    if (pnlValues.length === 0) {
      return { type: 'pnl-distribution', bins: [], counts: [] };
    }

    const min = Math.min(...pnlValues);
    const max = Math.max(...pnlValues);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(pnlValues.length)));
    const binSize = (max - min) / binCount;

    const bins = [];
    const counts = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = min + (i * binSize);
      const binEnd = binStart + binSize;
      const binCenter = (binStart + binEnd) / 2;

      const count = pnlValues.filter(v => v >= binStart && v < binEnd).length;

      bins.push({
        start: binStart,
        end: binEnd,
        center: binCenter,
        label: `$${binCenter.toFixed(0)}`
      });
      counts.push(count);
    }

    return {
      type: 'pnl-distribution',
      bins: bins,
      counts: counts,
      labels: bins.map(b => b.label)
    };
  }

  /**
   * Get monthly performance data
   * @private
   */
  function getMonthlyPerformanceData() {
    const monthlyMap = {};

    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0
        };
      }

      monthlyMap[monthKey].pnl += entry.pnl || 0;
      monthlyMap[monthKey].trades++;
      if (entry.pnl > 0) monthlyMap[monthKey].wins++;
      if (entry.pnl < 0) monthlyMap[monthKey].losses++;
    });

    const months = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    return {
      type: 'monthly-performance',
      months: months,
      labels: months.map(m => m.month),
      pnl: months.map(m => m.pnl),
      trades: months.map(m => m.trades),
      winRates: months.map(m => m.trades > 0 ? (m.wins / m.trades) * 100 : 0)
    };
  }

  /**
   * Get win/loss ratio data by various categories
   * @private
   */
  function getWinLossRatioData() {
    const longTrades = filteredEntries.filter(e => e.direction === 'long');
    const shortTrades = filteredEntries.filter(e => e.direction === 'short');

    const categories = [
      {
        label: 'Long',
        total: longTrades.length,
        wins: longTrades.filter(e => e.pnl > 0).length,
        losses: longTrades.filter(e => e.pnl < 0).length
      },
      {
        label: 'Short',
        total: shortTrades.length,
        wins: shortTrades.filter(e => e.pnl > 0).length,
        losses: shortTrades.filter(e => e.pnl < 0).length
      },
      {
        label: 'Overall',
        total: filteredEntries.length,
        wins: filteredEntries.filter(e => e.pnl > 0).length,
        losses: filteredEntries.filter(e => e.pnl < 0).length
      }
    ];

    categories.forEach(cat => {
      cat.winRate = cat.total > 0 ? (cat.wins / cat.total) * 100 : 0;
      cat.lossRate = cat.total > 0 ? (cat.losses / cat.total) * 100 : 0;
    });

    return {
      type: 'win-loss-ratio',
      categories: categories,
      labels: categories.map(c => c.label),
      winRates: categories.map(c => c.winRate),
      lossRates: categories.map(c => c.lossRate)
    };
  }

  /**
   * Get drawdown data
   * @private
   */
  function getDrawdownData() {
    const sortedEntries = [...filteredEntries].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    let runningBalance = 0;
    let peak = 0;
    const drawdowns = [];

    sortedEntries.forEach((entry, index) => {
      runningBalance += entry.pnl || 0;

      if (runningBalance > peak) {
        peak = runningBalance;
      }

      const drawdown = peak > 0 ? ((peak - runningBalance) / peak) * 100 : 0;

      drawdowns.push({
        index: index + 1,
        date: entry.date,
        balance: runningBalance,
        peak: peak,
        drawdown: drawdown,
        drawdownAmount: peak - runningBalance
      });
    });

    const maxDrawdown = drawdowns.length > 0
      ? Math.max(...drawdowns.map(d => d.drawdown))
      : 0;

    return {
      type: 'drawdown',
      data: drawdowns,
      labels: drawdowns.map(d => d.index),
      values: drawdowns.map(d => d.drawdown),
      maxDrawdown: maxDrawdown
    };
  }

  /**
   * Get performance by timeframe
   * @private
   */
  function getTimeframePerformanceData() {
    const timeframeMap = {};

    filteredEntries.forEach(entry => {
      const tf = entry.timeframe || 'Unknown';

      if (!timeframeMap[tf]) {
        timeframeMap[tf] = {
          timeframe: tf,
          trades: 0,
          wins: 0,
          losses: 0,
          totalPnl: 0
        };
      }

      timeframeMap[tf].trades++;
      timeframeMap[tf].totalPnl += entry.pnl || 0;
      if (entry.pnl > 0) timeframeMap[tf].wins++;
      if (entry.pnl < 0) timeframeMap[tf].losses++;
    });

    const timeframes = Object.values(timeframeMap);
    timeframes.forEach(tf => {
      tf.winRate = tf.trades > 0 ? (tf.wins / tf.trades) * 100 : 0;
      tf.avgPnl = tf.trades > 0 ? tf.totalPnl / tf.trades : 0;
    });

    // Sort by total trades
    timeframes.sort((a, b) => b.trades - a.trades);

    return {
      type: 'timeframe-performance',
      timeframes: timeframes,
      labels: timeframes.map(tf => tf.timeframe),
      trades: timeframes.map(tf => tf.trades),
      winRates: timeframes.map(tf => tf.winRate),
      avgPnl: timeframes.map(tf => tf.avgPnl)
    };
  }

  /**
   * Get current filtered entries
   * @returns {Array<Object>}
   */
  function getFilteredEntries() {
    return [...filteredEntries];
  }

  /**
   * Get current filter state
   * @returns {Object}
   */
  function getCurrentFilters() {
    return { ...currentFilters };
  }

  /**
   * Get current sort state
   * @returns {Object}
   */
  function getCurrentSort() {
    return { ...currentSort };
  }

  /**
   * Get current search query
   * @returns {string}
   */
  function getCurrentSearch() {
    return currentSearchQuery;
  }

  /**
   * Export filtered entries to CSV
   * @returns {string} - CSV string
   */
  function exportFilteredToCSV() {
    if (typeof window.TradeJournal !== 'undefined' && window.TradeJournal.export) {
      return window.TradeJournal.export(filteredEntries);
    }
    return '';
  }

  // Public API
  window.TradingHistoryEnhanced = {
    init: init,
    reset: reset,
    filter: filter,
    sort: sort,
    search: search,
    getPagedResults: getPagedResults,
    getAggregateStats: getAggregateStats,
    getCalendarData: getCalendarData,
    getChartData: getChartData,
    getFilteredEntries: getFilteredEntries,
    getCurrentFilters: getCurrentFilters,
    getCurrentSort: getCurrentSort,
    getCurrentSearch: getCurrentSearch,
    exportFilteredToCSV: exportFilteredToCSV
  };

})();
