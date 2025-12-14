/**
 * Prediction Analytics - Track and analyze signal prediction accuracy
 * Provides comprehensive analytics on prediction performance with filtering,
 * statistics, confusion matrices, and visualization helpers.
 */

const PredictionAnalytics = (function() {
  'use strict';

  // Constants
  const STORAGE_KEY = 'btcsignal_prediction_analytics';
  const MAX_PREDICTIONS = 1000; // Reasonable storage limit
  const VERSION = '1.0.0';

  // Timeframe definitions (in seconds)
  const TIMEFRAMES = {
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '3d': 259200,
    '1w': 604800
  };

  // Signal types
  const SIGNAL_TYPES = [
    'technical',
    'onchain',
    'derivatives',
    'sentiment',
    'composite',
    'price_model',
    'custom'
  ];

  /**
   * Prediction Entry Structure:
   * {
   *   id: string (unique identifier),
   *   timestamp: number (unix timestamp),
   *   signalType: string (type of signal),
   *   timeframe: string (prediction timeframe),
   *   direction: 'bullish'|'bearish'|'neutral',
   *   confidence: number (0-100),
   *   entryPrice: number (price at signal),
   *   targetPrice: number (predicted price),
   *   stopLoss: number|null,
   *   actualPrice: number|null (actual price at timeframe end),
   *   outcome: 'win'|'loss'|'neutral'|'pending',
   *   pnlPercent: number|null (percentage change),
   *   metadata: object (additional info),
   *   resolvedAt: number|null (timestamp when resolved)
   * }
   */

  // State
  let predictions = [];
  let statsCache = null;
  let lastCacheUpdate = 0;
  const CACHE_DURATION = 5000; // 5 seconds

  /**
   * Initialize the analytics system
   */
  function init() {
    loadPredictions();
    console.log(`Prediction Analytics v${VERSION} initialized with ${predictions.length} predictions`);
    return {
      version: VERSION,
      predictions: predictions.length,
      loaded: true
    };
  }

  /**
   * Load predictions from localStorage
   */
  function loadPredictions() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        predictions = [];
        return;
      }

      const data = JSON.parse(stored);

      // Validate version and data structure
      if (data.version !== VERSION) {
        console.warn('Prediction data version mismatch, migrating...');
        predictions = migratePredictions(data.predictions || []);
      } else {
        predictions = Array.isArray(data.predictions) ? data.predictions : [];
      }

      // Clean up old pending predictions (older than 1 week)
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      predictions = predictions.filter(p => {
        if (p.outcome === 'pending' && p.timestamp < oneWeekAgo) {
          return false;
        }
        return true;
      });

    } catch (e) {
      console.error('Failed to load predictions:', e);
      predictions = [];
    }
  }

  /**
   * Save predictions to localStorage
   */
  function savePredictions() {
    try {
      // Keep only the most recent MAX_PREDICTIONS
      const toSave = predictions.slice(0, MAX_PREDICTIONS);

      const data = {
        version: VERSION,
        predictions: toSave,
        lastUpdated: Date.now()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Invalidate cache
      statsCache = null;

      return true;
    } catch (e) {
      console.error('Failed to save predictions:', e);

      // If storage is full, remove oldest half and try again
      if (e.name === 'QuotaExceededError') {
        predictions = predictions.slice(0, Math.floor(MAX_PREDICTIONS / 2));
        return savePredictions();
      }

      return false;
    }
  }

  /**
   * Migrate predictions from older versions
   */
  function migratePredictions(oldPredictions) {
    // Add any necessary migration logic here
    return oldPredictions.map(p => ({
      ...p,
      metadata: p.metadata || {}
    }));
  }

  /**
   * Track a new prediction
   * @param {Object} signal - Signal object with prediction details
   * @param {Object} outcome - Optional outcome if already known
   * @returns {Object} - Result with success status and prediction
   */
  function trackPrediction(signal, outcome = null) {
    try {
      // Validate required fields
      if (!signal.direction || !signal.entryPrice || !signal.timeframe) {
        return {
          success: false,
          error: 'Missing required fields: direction, entryPrice, timeframe'
        };
      }

      // Calculate target price if not provided
      let targetPrice = signal.targetPrice;
      if (!targetPrice && signal.targetPercent) {
        const multiplier = signal.direction === 'bullish' ? 1 : -1;
        targetPrice = signal.entryPrice * (1 + (signal.targetPercent / 100) * multiplier);
      }

      const prediction = {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: signal.timestamp || Date.now(),
        signalType: signal.signalType || 'composite',
        timeframe: signal.timeframe,
        direction: signal.direction,
        confidence: signal.confidence || 50,
        entryPrice: parseFloat(signal.entryPrice),
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopLoss: signal.stopLoss ? parseFloat(signal.stopLoss) : null,
        actualPrice: null,
        outcome: 'pending',
        pnlPercent: null,
        metadata: {
          source: signal.source || 'manual',
          indicators: signal.indicators || [],
          notes: signal.notes || '',
          ...(signal.metadata || {})
        },
        resolvedAt: null
      };

      // If outcome is provided, resolve immediately
      if (outcome) {
        resolvePredictionInternal(prediction, outcome);
      }

      predictions.unshift(prediction);

      if (savePredictions()) {
        return { success: true, prediction };
      } else {
        return { success: false, error: 'Failed to save prediction' };
      }

    } catch (e) {
      console.error('Failed to track prediction:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Update a prediction with actual outcome
   * @param {string} predictionId - ID of the prediction to update
   * @param {Object} outcome - Outcome data
   * @returns {Object} - Result with success status
   */
  function updatePrediction(predictionId, outcome) {
    try {
      const index = predictions.findIndex(p => p.id === predictionId);

      if (index === -1) {
        return { success: false, error: 'Prediction not found' };
      }

      const prediction = predictions[index];

      resolvePredictionInternal(prediction, outcome);

      if (savePredictions()) {
        return { success: true, prediction };
      } else {
        return { success: false, error: 'Failed to save update' };
      }

    } catch (e) {
      console.error('Failed to update prediction:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Internal function to resolve a prediction
   */
  function resolvePredictionInternal(prediction, outcome) {
    prediction.actualPrice = parseFloat(outcome.actualPrice);
    prediction.resolvedAt = outcome.timestamp || Date.now();

    // Calculate P&L percentage
    const priceChange = prediction.actualPrice - prediction.entryPrice;
    prediction.pnlPercent = (priceChange / prediction.entryPrice) * 100;

    // Determine outcome based on direction
    if (prediction.direction === 'bullish') {
      if (prediction.actualPrice > prediction.entryPrice) {
        prediction.outcome = 'win';
      } else if (prediction.actualPrice < prediction.entryPrice) {
        prediction.outcome = 'loss';
      } else {
        prediction.outcome = 'neutral';
      }
    } else if (prediction.direction === 'bearish') {
      if (prediction.actualPrice < prediction.entryPrice) {
        prediction.outcome = 'win';
      } else if (prediction.actualPrice > prediction.entryPrice) {
        prediction.outcome = 'loss';
      } else {
        prediction.outcome = 'neutral';
      }
    } else {
      prediction.outcome = 'neutral';
    }

    // Check if target was hit
    if (prediction.targetPrice) {
      if (prediction.direction === 'bullish' && prediction.actualPrice >= prediction.targetPrice) {
        prediction.metadata.targetHit = true;
      } else if (prediction.direction === 'bearish' && prediction.actualPrice <= prediction.targetPrice) {
        prediction.metadata.targetHit = true;
      } else {
        prediction.metadata.targetHit = false;
      }
    }

    // Check if stop loss was hit
    if (prediction.stopLoss) {
      if (prediction.direction === 'bullish' && prediction.actualPrice <= prediction.stopLoss) {
        prediction.metadata.stopLossHit = true;
        prediction.outcome = 'loss';
      } else if (prediction.direction === 'bearish' && prediction.actualPrice >= prediction.stopLoss) {
        prediction.metadata.stopLossHit = true;
        prediction.outcome = 'loss';
      }
    }
  }

  /**
   * Get accuracy statistics with optional filters
   * @param {Object} filters - Filter options
   * @returns {Object} - Accuracy statistics
   */
  function getAccuracy(filters = {}) {
    const filtered = filterPredictions(filters);
    const resolved = filtered.filter(p => p.outcome !== 'pending');

    if (resolved.length === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        neutral: 0,
        accuracy: 0,
        winRate: 0,
        avgPnl: 0,
        filters: filters
      };
    }

    const wins = resolved.filter(p => p.outcome === 'win').length;
    const losses = resolved.filter(p => p.outcome === 'loss').length;
    const neutral = resolved.filter(p => p.outcome === 'neutral').length;

    const totalPnl = resolved
      .filter(p => p.pnlPercent !== null)
      .reduce((sum, p) => sum + p.pnlPercent, 0);

    const avgPnl = resolved.length > 0 ? totalPnl / resolved.length : 0;

    return {
      total: resolved.length,
      wins,
      losses,
      neutral,
      accuracy: resolved.length > 0 ? (wins / resolved.length) * 100 : 0,
      winRate: (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0,
      avgPnl,
      totalPnl,
      filters
    };
  }

  /**
   * Filter predictions based on criteria
   */
  function filterPredictions(filters) {
    let filtered = [...predictions];

    if (filters.timeframe) {
      filtered = filtered.filter(p => p.timeframe === filters.timeframe);
    }

    if (filters.signalType) {
      filtered = filtered.filter(p => p.signalType === filters.signalType);
    }

    if (filters.direction) {
      filtered = filtered.filter(p => p.direction === filters.direction);
    }

    if (filters.outcome) {
      filtered = filtered.filter(p => p.outcome === filters.outcome);
    }

    if (filters.minConfidence !== undefined) {
      filtered = filtered.filter(p => p.confidence >= filters.minConfidence);
    }

    if (filters.dateFrom) {
      const fromTimestamp = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter(p => p.timestamp >= fromTimestamp);
    }

    if (filters.dateTo) {
      const toTimestamp = new Date(filters.dateTo).getTime();
      filtered = filtered.filter(p => p.timestamp <= toTimestamp);
    }

    return filtered;
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} - Complete statistics object
   */
  function getStats() {
    // Return cached stats if recent
    if (statsCache && (Date.now() - lastCacheUpdate) < CACHE_DURATION) {
      return statsCache;
    }

    const resolved = predictions.filter(p => p.outcome !== 'pending');
    const pending = predictions.filter(p => p.outcome === 'pending');

    const stats = {
      overview: {
        total: predictions.length,
        resolved: resolved.length,
        pending: pending.length,
        wins: resolved.filter(p => p.outcome === 'win').length,
        losses: resolved.filter(p => p.outcome === 'loss').length,
        neutral: resolved.filter(p => p.outcome === 'neutral').length
      },
      accuracy: {},
      byTimeframe: {},
      bySignalType: {},
      byDirection: {},
      streaks: calculateStreaks(),
      profitFactor: calculateProfitFactor(),
      confusionMatrix: calculateConfusionMatrix(),
      confidenceAnalysis: analyzeConfidence(),
      performance: calculatePerformanceMetrics()
    };

    // Overall accuracy
    stats.accuracy.overall = resolved.length > 0
      ? (stats.overview.wins / resolved.length) * 100
      : 0;

    // Accuracy by timeframe
    Object.keys(TIMEFRAMES).forEach(tf => {
      stats.byTimeframe[tf] = getAccuracy({ timeframe: tf });
    });

    // Accuracy by signal type
    SIGNAL_TYPES.forEach(type => {
      const typeStats = getAccuracy({ signalType: type });
      if (typeStats.total > 0) {
        stats.bySignalType[type] = typeStats;
      }
    });

    // Accuracy by direction
    ['bullish', 'bearish', 'neutral'].forEach(dir => {
      stats.byDirection[dir] = getAccuracy({ direction: dir });
    });

    // Cache the results
    statsCache = stats;
    lastCacheUpdate = Date.now();

    return stats;
  }

  /**
   * Calculate win/loss streaks
   */
  function calculateStreaks() {
    const resolved = predictions
      .filter(p => p.outcome !== 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);

    if (resolved.length === 0) {
      return {
        currentStreak: 0,
        currentType: null,
        longestWinStreak: 0,
        longestLossStreak: 0,
        streakHistory: []
      };
    }

    let currentStreak = 0;
    let currentType = null;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let streakHistory = [];

    for (let i = 0; i < resolved.length; i++) {
      const prediction = resolved[i];

      if (prediction.outcome === 'neutral') continue;

      if (prediction.outcome === currentType) {
        currentStreak++;
      } else {
        if (currentType !== null) {
          streakHistory.push({
            type: currentType,
            length: currentStreak,
            endedAt: resolved[i - 1].timestamp
          });

          if (currentType === 'win' && currentStreak > longestWinStreak) {
            longestWinStreak = currentStreak;
          } else if (currentType === 'loss' && currentStreak > longestLossStreak) {
            longestLossStreak = currentStreak;
          }
        }
        currentType = prediction.outcome;
        currentStreak = 1;
      }
    }

    // Add final streak
    if (currentType !== null) {
      if (currentType === 'win' && currentStreak > longestWinStreak) {
        longestWinStreak = currentStreak;
      } else if (currentType === 'loss' && currentStreak > longestLossStreak) {
        longestLossStreak = currentStreak;
      }
    }

    return {
      currentStreak,
      currentType,
      longestWinStreak,
      longestLossStreak,
      streakHistory: streakHistory.slice(-10) // Keep last 10 streaks
    };
  }

  /**
   * Calculate profit factor (gross profit / gross loss)
   */
  function calculateProfitFactor() {
    const resolved = predictions.filter(p =>
      p.outcome !== 'pending' && p.pnlPercent !== null
    );

    const grossProfit = resolved
      .filter(p => p.pnlPercent > 0)
      .reduce((sum, p) => sum + p.pnlPercent, 0);

    const grossLoss = Math.abs(resolved
      .filter(p => p.pnlPercent < 0)
      .reduce((sum, p) => sum + p.pnlPercent, 0));

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    return {
      profitFactor,
      grossProfit,
      grossLoss,
      netProfit: grossProfit - grossLoss,
      avgWin: resolved.filter(p => p.pnlPercent > 0).length > 0
        ? grossProfit / resolved.filter(p => p.pnlPercent > 0).length
        : 0,
      avgLoss: resolved.filter(p => p.pnlPercent < 0).length > 0
        ? grossLoss / resolved.filter(p => p.pnlPercent < 0).length
        : 0
    };
  }

  /**
   * Calculate confusion matrix data
   * Predicted direction vs actual outcome
   */
  function calculateConfusionMatrix() {
    const resolved = predictions.filter(p => p.outcome !== 'pending');

    const matrix = {
      bullish: { win: 0, loss: 0, neutral: 0 },
      bearish: { win: 0, loss: 0, neutral: 0 },
      neutral: { win: 0, loss: 0, neutral: 0 }
    };

    resolved.forEach(p => {
      if (matrix[p.direction]) {
        matrix[p.direction][p.outcome]++;
      }
    });

    // Calculate precision and recall for each direction
    const metrics = {};
    ['bullish', 'bearish'].forEach(dir => {
      const tp = matrix[dir].win; // True positives
      const fp = matrix[dir].loss; // False positives
      const fn = (dir === 'bullish' ? matrix.bearish.win : matrix.bullish.win); // False negatives

      const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
      const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
      const f1Score = (precision + recall) > 0
        ? 2 * (precision * recall) / (precision + recall)
        : 0;

      metrics[dir] = {
        precision: precision * 100,
        recall: recall * 100,
        f1Score: f1Score * 100
      };
    });

    return {
      matrix,
      metrics
    };
  }

  /**
   * Analyze prediction confidence vs actual accuracy
   */
  function analyzeConfidence() {
    const resolved = predictions.filter(p => p.outcome !== 'pending');

    const ranges = [
      { min: 0, max: 25, label: '0-25%' },
      { min: 25, max: 50, label: '25-50%' },
      { min: 50, max: 75, label: '50-75%' },
      { min: 75, max: 100, label: '75-100%' }
    ];

    const analysis = ranges.map(range => {
      const inRange = resolved.filter(p =>
        p.confidence >= range.min && p.confidence < range.max
      );

      const wins = inRange.filter(p => p.outcome === 'win').length;
      const accuracy = inRange.length > 0 ? (wins / inRange.length) * 100 : 0;
      const avgConfidence = inRange.length > 0
        ? inRange.reduce((sum, p) => sum + p.confidence, 0) / inRange.length
        : 0;

      return {
        range: range.label,
        count: inRange.length,
        wins,
        accuracy,
        avgConfidence,
        calibration: accuracy - avgConfidence // Positive = overconfident, Negative = underconfident
      };
    });

    return analysis;
  }

  /**
   * Calculate performance metrics over time
   */
  function calculatePerformanceMetrics() {
    const resolved = predictions
      .filter(p => p.outcome !== 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);

    if (resolved.length === 0) {
      return {
        cumulative: [],
        rolling: {},
        sharpeRatio: 0,
        maxDrawdown: 0
      };
    }

    // Cumulative P&L
    let cumPnl = 0;
    const cumulative = resolved.map(p => {
      cumPnl += p.pnlPercent || 0;
      return {
        timestamp: p.timestamp,
        pnl: cumPnl,
        prediction: p.id
      };
    });

    // Rolling accuracy (last 10, 20, 50 predictions)
    const rolling = {
      last10: calculateRollingAccuracy(resolved, 10),
      last20: calculateRollingAccuracy(resolved, 20),
      last50: calculateRollingAccuracy(resolved, 50)
    };

    // Sharpe Ratio (annualized)
    const returns = resolved
      .filter(p => p.pnlPercent !== null)
      .map(p => p.pnlPercent);

    const avgReturn = returns.length > 0
      ? returns.reduce((sum, r) => sum + r, 0) / returns.length
      : 0;

    const stdDev = calculateStdDev(returns, avgReturn);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Assuming daily predictions

    // Max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    cumulative.forEach(point => {
      if (point.pnl > peak) {
        peak = point.pnl;
      }
      const drawdown = peak - point.pnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return {
      cumulative,
      rolling,
      sharpeRatio,
      maxDrawdown,
      avgReturn,
      stdDev
    };
  }

  /**
   * Calculate rolling accuracy for last N predictions
   */
  function calculateRollingAccuracy(predictions, n) {
    const recent = predictions.slice(-n);
    const wins = recent.filter(p => p.outcome === 'win').length;
    return recent.length > 0 ? (wins / recent.length) * 100 : 0;
  }

  /**
   * Calculate standard deviation
   */
  function calculateStdDev(values, mean) {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Get visualization helper data for charts
   * @param {string} chartType - Type of chart (timeline, heatmap, distribution, etc.)
   * @param {Object} options - Chart options
   * @returns {Object} - Chart data
   */
  function getChartData(chartType, options = {}) {
    switch (chartType) {
      case 'timeline':
        return getTimelineData(options);
      case 'heatmap':
        return getHeatmapData(options);
      case 'distribution':
        return getDistributionData(options);
      case 'confidence':
        return getConfidenceChartData(options);
      case 'cumulative':
        return getCumulativeData(options);
      default:
        return null;
    }
  }

  /**
   * Get timeline data for accuracy over time
   */
  function getTimelineData(options) {
    const resolved = predictions
      .filter(p => p.outcome !== 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);

    const windowSize = options.windowSize || 10;
    const dataPoints = [];

    for (let i = windowSize - 1; i < resolved.length; i++) {
      const window = resolved.slice(i - windowSize + 1, i + 1);
      const wins = window.filter(p => p.outcome === 'win').length;
      const accuracy = (wins / window.length) * 100;

      dataPoints.push({
        timestamp: resolved[i].timestamp,
        date: new Date(resolved[i].timestamp),
        accuracy,
        predictions: windowSize
      });
    }

    return dataPoints;
  }

  /**
   * Get heatmap data (timeframe vs signal type)
   */
  function getHeatmapData(options) {
    const data = [];

    Object.keys(TIMEFRAMES).forEach(timeframe => {
      SIGNAL_TYPES.forEach(signalType => {
        const stats = getAccuracy({ timeframe, signalType });
        if (stats.total > 0) {
          data.push({
            timeframe,
            signalType,
            accuracy: stats.accuracy,
            total: stats.total,
            wins: stats.wins
          });
        }
      });
    });

    return data;
  }

  /**
   * Get distribution data for P&L
   */
  function getDistributionData(options) {
    const resolved = predictions.filter(p =>
      p.outcome !== 'pending' && p.pnlPercent !== null
    );

    const binSize = options.binSize || 1; // 1% bins
    const bins = {};

    resolved.forEach(p => {
      const bin = Math.floor(p.pnlPercent / binSize) * binSize;
      bins[bin] = (bins[bin] || 0) + 1;
    });

    return Object.entries(bins)
      .map(([bin, count]) => ({
        bin: parseFloat(bin),
        count,
        percentage: (count / resolved.length) * 100
      }))
      .sort((a, b) => a.bin - b.bin);
  }

  /**
   * Get confidence calibration chart data
   */
  function getConfidenceChartData(options) {
    const analysis = analyzeConfidence();
    return analysis.map(item => ({
      range: item.range,
      predicted: item.avgConfidence,
      actual: item.accuracy,
      count: item.count,
      calibration: item.calibration
    }));
  }

  /**
   * Get cumulative P&L data
   */
  function getCumulativeData(options) {
    const stats = getStats();
    return stats.performance.cumulative;
  }

  /**
   * Export report as JSON
   * @param {Object} options - Export options
   * @returns {Object} - Report data
   */
  function exportReport(options = {}) {
    const stats = getStats();
    const filters = options.filters || {};
    const includeRawData = options.includeRawData || false;

    const report = {
      generatedAt: new Date().toISOString(),
      version: VERSION,
      summary: {
        total: stats.overview.total,
        resolved: stats.overview.resolved,
        accuracy: stats.accuracy.overall,
        profitFactor: stats.profitFactor.profitFactor,
        currentStreak: stats.streaks.currentStreak,
        currentStreakType: stats.streaks.currentType
      },
      statistics: stats,
      filters: filters
    };

    if (includeRawData) {
      report.predictions = filterPredictions(filters);
    }

    return report;
  }

  /**
   * Export report as CSV
   */
  function exportCSV(options = {}) {
    const filtered = filterPredictions(options.filters || {});

    const headers = [
      'ID',
      'Timestamp',
      'Date',
      'Signal Type',
      'Timeframe',
      'Direction',
      'Confidence',
      'Entry Price',
      'Target Price',
      'Actual Price',
      'Outcome',
      'P&L %',
      'Resolved At'
    ];

    const rows = filtered.map(p => [
      p.id,
      p.timestamp,
      new Date(p.timestamp).toISOString(),
      p.signalType,
      p.timeframe,
      p.direction,
      p.confidence,
      p.entryPrice,
      p.targetPrice || '',
      p.actualPrice || '',
      p.outcome,
      p.pnlPercent !== null ? p.pnlPercent.toFixed(2) : '',
      p.resolvedAt ? new Date(p.resolvedAt).toISOString() : ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Delete a prediction
   */
  function deletePrediction(predictionId) {
    const index = predictions.findIndex(p => p.id === predictionId);

    if (index === -1) {
      return { success: false, error: 'Prediction not found' };
    }

    predictions.splice(index, 1);

    if (savePredictions()) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save changes' };
    }
  }

  /**
   * Clear all predictions (with confirmation)
   */
  function clearAll(confirm = false) {
    if (!confirm) {
      return {
        success: false,
        error: 'Confirmation required. Call with confirm=true to proceed.'
      };
    }

    predictions = [];
    statsCache = null;

    try {
      localStorage.removeItem(STORAGE_KEY);
      return { success: true, message: 'All predictions cleared' };
    } catch (e) {
      return { success: false, error: 'Failed to clear storage' };
    }
  }

  /**
   * Get all predictions
   */
  function getAllPredictions(filters = {}) {
    return filterPredictions(filters);
  }

  /**
   * Get single prediction by ID
   */
  function getPrediction(predictionId) {
    return predictions.find(p => p.id === predictionId) || null;
  }

  // Public API
  return {
    // Core functions
    init,
    trackPrediction,
    updatePrediction,

    // Query functions
    getAccuracy,
    getStats,
    getAllPredictions,
    getPrediction,

    // Export functions
    exportReport,
    exportCSV,

    // Visualization helpers
    getChartData,

    // Utility functions
    deletePrediction,
    clearAll,

    // Constants
    TIMEFRAMES,
    SIGNAL_TYPES,
    VERSION
  };
})();

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
  window.PredictionAnalytics = PredictionAnalytics;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PredictionAnalytics.init();
    });
  } else {
    PredictionAnalytics.init();
  }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictionAnalytics;
}
