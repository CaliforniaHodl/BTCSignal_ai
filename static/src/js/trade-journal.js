// BTC Signal AI - Trade Journal
// Comprehensive trade journaling system with statistics and export
(function() {
  'use strict';

  const JOURNAL_KEY = 'trade-journal-entries';
  const MAX_ENTRIES = 500;

  /**
   * Trade Entry Structure:
   * {
   *   id: string (timestamp-based unique ID),
   *   date: string (ISO date),
   *   entryPrice: number,
   *   exitPrice: number|null,
   *   size: number (position size in USD),
   *   direction: 'long'|'short',
   *   pnl: number (profit/loss in USD),
   *   pnlPercent: number (profit/loss percentage),
   *   notes: string,
   *   tags: string[] (array of tag strings),
   *   aiScore: number|null (0-100 from trade coach),
   *   screenshot: string|null (base64 encoded image),
   *   status: 'open'|'closed',
   *   entryDate: string (ISO date),
   *   exitDate: string|null (ISO date),
   *   stopLoss: number|null,
   *   takeProfit: number|null,
   *   timeframe: string|null
   * }
   */

  /**
   * Get all journal entries from localStorage
   * @returns {Array<Object>}
   */
  function getAllEntries() {
    try {
      const data = localStorage.getItem(JOURNAL_KEY);
      if (!data) return [];
      const entries = JSON.parse(data);
      return Array.isArray(entries) ? entries : [];
    } catch (e) {
      console.error('Failed to load journal entries:', e);
      return [];
    }
  }

  /**
   * Save entries to localStorage
   * @param {Array<Object>} entries
   */
  function saveEntries(entries) {
    try {
      // Limit to MAX_ENTRIES, keeping most recent
      const limited = entries.slice(0, MAX_ENTRIES);
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(limited));
      return true;
    } catch (e) {
      console.error('Failed to save journal entries:', e);
      return false;
    }
  }

  /**
   * Add a new trade entry
   * @param {Object} entry - Trade entry object
   * @returns {Object|null} - The created entry with ID, or null on failure
   */
  function addEntry(entry) {
    try {
      // Validate required fields
      if (!entry.entryPrice || !entry.direction) {
        throw new Error('Entry price and direction are required');
      }

      // Generate unique ID
      const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

      // Calculate P&L if exitPrice is provided
      let pnl = 0;
      let pnlPercent = 0;
      let status = 'open';

      if (entry.exitPrice && entry.size) {
        status = 'closed';
        if (entry.direction === 'long') {
          pnl = (entry.exitPrice - entry.entryPrice) * (entry.size / entry.entryPrice);
          pnlPercent = ((entry.exitPrice - entry.entryPrice) / entry.entryPrice) * 100;
        } else {
          pnl = (entry.entryPrice - entry.exitPrice) * (entry.size / entry.entryPrice);
          pnlPercent = ((entry.entryPrice - entry.exitPrice) / entry.entryPrice) * 100;
        }
      }

      const newEntry = {
        id: id,
        date: entry.date || new Date().toISOString(),
        entryDate: entry.entryDate || entry.date || new Date().toISOString(),
        exitDate: entry.exitDate || null,
        entryPrice: parseFloat(entry.entryPrice),
        exitPrice: entry.exitPrice ? parseFloat(entry.exitPrice) : null,
        size: entry.size ? parseFloat(entry.size) : 0,
        direction: entry.direction,
        pnl: pnl,
        pnlPercent: pnlPercent,
        notes: entry.notes || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        aiScore: entry.aiScore ? parseFloat(entry.aiScore) : null,
        screenshot: entry.screenshot || null,
        status: status,
        stopLoss: entry.stopLoss ? parseFloat(entry.stopLoss) : null,
        takeProfit: entry.takeProfit ? parseFloat(entry.takeProfit) : null,
        timeframe: entry.timeframe || null
      };

      const entries = getAllEntries();
      entries.unshift(newEntry);

      if (saveEntries(entries)) {
        return newEntry;
      }
      return null;
    } catch (e) {
      console.error('Failed to add entry:', e);
      return null;
    }
  }

  /**
   * Update an existing trade entry
   * @param {string} id - Entry ID
   * @param {Object} updates - Fields to update
   * @returns {boolean} - Success status
   */
  function updateEntry(id, updates) {
    try {
      const entries = getAllEntries();
      const index = entries.findIndex(e => e.id === id);

      if (index === -1) {
        throw new Error('Entry not found');
      }

      // Merge updates
      const entry = entries[index];
      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          entry[key] = updates[key];
        }
      });

      // Recalculate P&L if relevant fields changed
      if (updates.exitPrice || updates.entryPrice || updates.size || updates.direction) {
        if (entry.exitPrice && entry.size && entry.entryPrice) {
          if (entry.direction === 'long') {
            entry.pnl = (entry.exitPrice - entry.entryPrice) * (entry.size / entry.entryPrice);
            entry.pnlPercent = ((entry.exitPrice - entry.entryPrice) / entry.entryPrice) * 100;
          } else {
            entry.pnl = (entry.entryPrice - entry.exitPrice) * (entry.size / entry.entryPrice);
            entry.pnlPercent = ((entry.entryPrice - entry.exitPrice) / entry.entryPrice) * 100;
          }
          entry.status = 'closed';
          if (!entry.exitDate) {
            entry.exitDate = new Date().toISOString();
          }
        } else {
          entry.pnl = 0;
          entry.pnlPercent = 0;
          entry.status = 'open';
          entry.exitDate = null;
        }
      }

      entries[index] = entry;
      return saveEntries(entries);
    } catch (e) {
      console.error('Failed to update entry:', e);
      return false;
    }
  }

  /**
   * Delete a trade entry
   * @param {string} id - Entry ID
   * @returns {boolean} - Success status
   */
  function deleteEntry(id) {
    try {
      const entries = getAllEntries();
      const filtered = entries.filter(e => e.id !== id);
      return saveEntries(filtered);
    } catch (e) {
      console.error('Failed to delete entry:', e);
      return false;
    }
  }

  /**
   * Get a single entry by ID
   * @param {string} id - Entry ID
   * @returns {Object|null}
   */
  function getEntry(id) {
    const entries = getAllEntries();
    return entries.find(e => e.id === id) || null;
  }

  /**
   * Calculate comprehensive trading statistics
   * @param {Array<Object>} entries - Optional subset of entries
   * @returns {Object} - Statistics object
   */
  function getStats(entries) {
    entries = entries || getAllEntries();

    const closedTrades = entries.filter(e => e.status === 'closed' && e.pnl !== 0);
    const openTrades = entries.filter(e => e.status === 'open');

    if (closedTrades.length === 0) {
      return {
        totalTrades: entries.length,
        closedTrades: 0,
        openTrades: openTrades.length,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        bestTrade: null,
        worstTrade: null,
        totalPnl: 0,
        totalPnlPercent: 0,
        avgPnl: 0,
        avgPnlPercent: 0,
        longWinRate: 0,
        shortWinRate: 0,
        avgHoldTime: 0,
        expectancy: 0
      };
    }

    const wins = closedTrades.filter(e => e.pnl > 0);
    const losses = closedTrades.filter(e => e.pnl < 0);

    const totalWins = wins.reduce((sum, e) => sum + e.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, e) => sum + e.pnl, 0));
    const totalPnl = closedTrades.reduce((sum, e) => sum + e.pnl, 0);
    const totalPnlPercent = closedTrades.reduce((sum, e) => sum + e.pnlPercent, 0);

    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
    const winRate = (wins.length / closedTrades.length) * 100;

    // Best and worst trades
    const sortedByPnl = [...closedTrades].sort((a, b) => b.pnl - a.pnl);
    const bestTrade = sortedByPnl[0] || null;
    const worstTrade = sortedByPnl[sortedByPnl.length - 1] || null;

    // Long vs Short performance
    const longTrades = closedTrades.filter(e => e.direction === 'long');
    const shortTrades = closedTrades.filter(e => e.direction === 'short');
    const longWins = longTrades.filter(e => e.pnl > 0).length;
    const shortWins = shortTrades.filter(e => e.pnl > 0).length;
    const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
    const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

    // Average hold time (for closed trades with both dates)
    const tradesWithDates = closedTrades.filter(e => e.entryDate && e.exitDate);
    const avgHoldTime = tradesWithDates.length > 0
      ? tradesWithDates.reduce((sum, e) => {
          const entry = new Date(e.entryDate);
          const exit = new Date(e.exitDate);
          return sum + (exit - entry);
        }, 0) / tradesWithDates.length
      : 0;

    // Expectancy (average $ per trade)
    const expectancy = totalPnl / closedTrades.length;

    return {
      totalTrades: entries.length,
      closedTrades: closedTrades.length,
      openTrades: openTrades.length,
      winRate: winRate,
      avgWin: avgWin,
      avgLoss: avgLoss,
      profitFactor: profitFactor,
      bestTrade: bestTrade,
      worstTrade: worstTrade,
      totalPnl: totalPnl,
      totalPnlPercent: totalPnlPercent,
      avgPnl: totalPnl / closedTrades.length,
      avgPnlPercent: totalPnlPercent / closedTrades.length,
      longWinRate: longWinRate,
      shortWinRate: shortWinRate,
      avgHoldTime: avgHoldTime,
      expectancy: expectancy,
      wins: wins.length,
      losses: losses.length
    };
  }

  /**
   * Export journal entries as CSV
   * @param {Array<Object>} entries - Optional subset of entries
   * @returns {string} - CSV string
   */
  function exportToCSV(entries) {
    entries = entries || getAllEntries();

    if (entries.length === 0) {
      return '';
    }

    const headers = [
      'Date',
      'Direction',
      'Entry Price',
      'Exit Price',
      'Size',
      'P&L ($)',
      'P&L (%)',
      'Status',
      'AI Score',
      'Timeframe',
      'Stop Loss',
      'Take Profit',
      'Tags',
      'Notes'
    ];

    const rows = entries.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.direction,
      e.entryPrice,
      e.exitPrice || '',
      e.size,
      e.pnl.toFixed(2),
      e.pnlPercent.toFixed(2),
      e.status,
      e.aiScore || '',
      e.timeframe || '',
      e.stopLoss || '',
      e.takeProfit || '',
      (e.tags || []).join(';'),
      '"' + (e.notes || '').replace(/"/g, '""') + '"'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   * @param {string} csv - CSV content
   * @param {string} filename - Optional filename
   */
  function downloadCSV(csv, filename) {
    filename = filename || 'trade-journal-' + new Date().toISOString().split('T')[0] + '.csv';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Filter entries by criteria
   * @param {Object} criteria - { tags: [], dateFrom: string, dateTo: string, status: string, direction: string }
   * @returns {Array<Object>}
   */
  function filterEntries(criteria) {
    let entries = getAllEntries();

    if (criteria.tags && criteria.tags.length > 0) {
      entries = entries.filter(e =>
        criteria.tags.some(tag => (e.tags || []).includes(tag))
      );
    }

    if (criteria.dateFrom) {
      const fromDate = new Date(criteria.dateFrom);
      entries = entries.filter(e => new Date(e.date) >= fromDate);
    }

    if (criteria.dateTo) {
      const toDate = new Date(criteria.dateTo);
      entries = entries.filter(e => new Date(e.date) <= toDate);
    }

    if (criteria.status) {
      entries = entries.filter(e => e.status === criteria.status);
    }

    if (criteria.direction) {
      entries = entries.filter(e => e.direction === criteria.direction);
    }

    if (criteria.outcome) {
      if (criteria.outcome === 'win') {
        entries = entries.filter(e => e.pnl > 0);
      } else if (criteria.outcome === 'loss') {
        entries = entries.filter(e => e.pnl < 0);
      } else if (criteria.outcome === 'breakeven') {
        entries = entries.filter(e => e.pnl === 0);
      }
    }

    return entries;
  }

  /**
   * Get all unique tags from entries
   * @returns {Array<string>}
   */
  function getAllTags() {
    const entries = getAllEntries();
    const tagsSet = new Set();

    entries.forEach(e => {
      if (e.tags && Array.isArray(e.tags)) {
        e.tags.forEach(tag => tagsSet.add(tag));
      }
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Get stats grouped by time period
   * @param {string} period - 'week', 'month', 'year'
   * @returns {Array<Object>} - Array of { period: string, stats: Object }
   */
  function getStatsByPeriod(period) {
    const entries = getAllEntries();
    const grouped = {};

    entries.forEach(e => {
      const date = new Date(e.date);
      let key;

      if (period === 'week') {
        const week = getWeekNumber(date);
        key = date.getFullYear() + '-W' + week;
      } else if (period === 'month') {
        key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      } else if (period === 'year') {
        key = String(date.getFullYear());
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(e);
    });

    return Object.keys(grouped).sort().reverse().map(key => ({
      period: key,
      stats: getStats(grouped[key]),
      entries: grouped[key]
    }));
  }

  /**
   * Get ISO week number
   * @param {Date} date
   * @returns {number}
   */
  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Public API
  window.TradeJournal = {
    add: addEntry,
    update: updateEntry,
    delete: deleteEntry,
    get: getEntry,
    getAll: getAllEntries,
    getStats: getStats,
    export: exportToCSV,
    downloadCSV: downloadCSV,
    filter: filterEntries,
    getAllTags: getAllTags,
    getStatsByPeriod: getStatsByPeriod
  };

})();
