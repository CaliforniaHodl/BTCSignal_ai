/**
 * Prediction Analytics - Usage Examples
 * This file demonstrates how to use the PredictionAnalytics module
 */

// Example 1: Track a new prediction
function trackNewPrediction() {
  const signal = {
    signalType: 'technical',
    timeframe: '4h',
    direction: 'bullish',
    confidence: 75,
    entryPrice: 43500,
    targetPrice: 44200,
    stopLoss: 43200,
    timestamp: Date.now(),
    metadata: {
      source: 'rsi_divergence',
      indicators: ['RSI', 'MACD', 'Volume'],
      notes: 'Bullish divergence on 4h timeframe'
    }
  };

  const result = PredictionAnalytics.trackPrediction(signal);

  if (result.success) {
    console.log('Prediction tracked:', result.prediction.id);
  } else {
    console.error('Failed to track prediction:', result.error);
  }

  return result;
}

// Example 2: Update prediction with actual outcome
function resolvePrediction(predictionId) {
  const outcome = {
    actualPrice: 44150,
    timestamp: Date.now()
  };

  const result = PredictionAnalytics.updatePrediction(predictionId, outcome);

  if (result.success) {
    console.log('Prediction resolved:', result.prediction.outcome);
    console.log('P&L:', result.prediction.pnlPercent.toFixed(2) + '%');
  }

  return result;
}

// Example 3: Track and resolve in one call
function trackImmediateSignal() {
  const signal = {
    signalType: 'onchain',
    timeframe: '1d',
    direction: 'bearish',
    confidence: 65,
    entryPrice: 43800,
    targetPrice: 42500,
    stopLoss: 44200
  };

  const outcome = {
    actualPrice: 42800,
    timestamp: Date.now()
  };

  const result = PredictionAnalytics.trackPrediction(signal, outcome);
  console.log('Immediate prediction:', result.prediction.outcome);
  return result;
}

// Example 4: Get accuracy by timeframe
function getTimeframeAccuracy() {
  const accuracy1h = PredictionAnalytics.getAccuracy({ timeframe: '1h' });
  const accuracy4h = PredictionAnalytics.getAccuracy({ timeframe: '4h' });
  const accuracy1d = PredictionAnalytics.getAccuracy({ timeframe: '1d' });

  console.log('1h Accuracy:', accuracy1h.accuracy.toFixed(2) + '%', `(${accuracy1h.total} predictions)`);
  console.log('4h Accuracy:', accuracy4h.accuracy.toFixed(2) + '%', `(${accuracy4h.total} predictions)`);
  console.log('1d Accuracy:', accuracy1d.accuracy.toFixed(2) + '%', `(${accuracy1d.total} predictions)`);

  return { accuracy1h, accuracy4h, accuracy1d };
}

// Example 5: Get accuracy by signal type
function getSignalTypeAccuracy() {
  const technical = PredictionAnalytics.getAccuracy({ signalType: 'technical' });
  const onchain = PredictionAnalytics.getAccuracy({ signalType: 'onchain' });
  const derivatives = PredictionAnalytics.getAccuracy({ signalType: 'derivatives' });

  console.log('Technical:', technical.accuracy.toFixed(2) + '%');
  console.log('On-Chain:', onchain.accuracy.toFixed(2) + '%');
  console.log('Derivatives:', derivatives.accuracy.toFixed(2) + '%');

  return { technical, onchain, derivatives };
}

// Example 6: Get comprehensive statistics
function getCompleteStats() {
  const stats = PredictionAnalytics.getStats();

  console.log('=== Overview ===');
  console.log('Total predictions:', stats.overview.total);
  console.log('Resolved:', stats.overview.resolved);
  console.log('Pending:', stats.overview.pending);
  console.log('Overall accuracy:', stats.accuracy.overall.toFixed(2) + '%');

  console.log('\n=== Streaks ===');
  console.log('Current streak:', stats.streaks.currentStreak, stats.streaks.currentType);
  console.log('Longest win streak:', stats.streaks.longestWinStreak);
  console.log('Longest loss streak:', stats.streaks.longestLossStreak);

  console.log('\n=== Profit Factor ===');
  console.log('Profit Factor:', stats.profitFactor.profitFactor.toFixed(2));
  console.log('Gross Profit:', stats.profitFactor.grossProfit.toFixed(2) + '%');
  console.log('Gross Loss:', stats.profitFactor.grossLoss.toFixed(2) + '%');
  console.log('Net Profit:', stats.profitFactor.netProfit.toFixed(2) + '%');

  console.log('\n=== Performance ===');
  console.log('Sharpe Ratio:', stats.performance.sharpeRatio.toFixed(2));
  console.log('Max Drawdown:', stats.performance.maxDrawdown.toFixed(2) + '%');
  console.log('Rolling 10:', stats.performance.rolling.last10.toFixed(2) + '%');
  console.log('Rolling 20:', stats.performance.rolling.last20.toFixed(2) + '%');

  return stats;
}

// Example 7: Advanced filtering
function getFilteredAccuracy() {
  // High confidence bullish signals in last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const filtered = PredictionAnalytics.getAccuracy({
    direction: 'bullish',
    minConfidence: 70,
    dateFrom: new Date(thirtyDaysAgo).toISOString()
  });

  console.log('High confidence bullish (30d):', filtered.accuracy.toFixed(2) + '%');
  console.log('Total:', filtered.total);
  console.log('Wins:', filtered.wins);

  return filtered;
}

// Example 8: Get chart data for visualization
function getVisualizationData() {
  // Timeline chart (rolling accuracy over time)
  const timelineData = PredictionAnalytics.getChartData('timeline', {
    windowSize: 20
  });

  // Heatmap (timeframe vs signal type)
  const heatmapData = PredictionAnalytics.getChartData('heatmap');

  // P&L distribution
  const distributionData = PredictionAnalytics.getChartData('distribution', {
    binSize: 2 // 2% bins
  });

  // Confidence calibration
  const confidenceData = PredictionAnalytics.getChartData('confidence');

  // Cumulative P&L
  const cumulativeData = PredictionAnalytics.getChartData('cumulative');

  console.log('Timeline points:', timelineData.length);
  console.log('Heatmap cells:', heatmapData.length);
  console.log('Distribution bins:', distributionData.length);

  return {
    timeline: timelineData,
    heatmap: heatmapData,
    distribution: distributionData,
    confidence: confidenceData,
    cumulative: cumulativeData
  };
}

// Example 9: Export report
function exportAnalyticsReport() {
  // Export summary report
  const report = PredictionAnalytics.exportReport({
    filters: {
      dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // Last 90 days
    },
    includeRawData: false
  });

  console.log('Report generated at:', report.generatedAt);
  console.log('Summary:', report.summary);

  // Download as JSON
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prediction-analytics-${Date.now()}.json`;
  a.click();

  return report;
}

// Example 10: Export CSV
function exportCSVReport() {
  const csv = PredictionAnalytics.exportCSV({
    filters: {
      outcome: 'win' // Only winning predictions
    }
  });

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `predictions-${Date.now()}.csv`;
  a.click();

  console.log('CSV exported');
  return csv;
}

// Example 11: Display confusion matrix
function displayConfusionMatrix() {
  const stats = PredictionAnalytics.getStats();
  const matrix = stats.confusionMatrix;

  console.log('=== Confusion Matrix ===');
  console.log('Predicted Bullish -> Win:', matrix.matrix.bullish.win);
  console.log('Predicted Bullish -> Loss:', matrix.matrix.bullish.loss);
  console.log('Predicted Bearish -> Win:', matrix.matrix.bearish.win);
  console.log('Predicted Bearish -> Loss:', matrix.matrix.bearish.loss);

  console.log('\n=== Metrics ===');
  console.log('Bullish Precision:', matrix.metrics.bullish.precision.toFixed(2) + '%');
  console.log('Bullish Recall:', matrix.metrics.bullish.recall.toFixed(2) + '%');
  console.log('Bullish F1 Score:', matrix.metrics.bullish.f1Score.toFixed(2) + '%');

  return matrix;
}

// Example 12: Display confidence analysis
function displayConfidenceAnalysis() {
  const stats = PredictionAnalytics.getStats();
  const analysis = stats.confidenceAnalysis;

  console.log('=== Confidence Calibration ===');
  analysis.forEach(item => {
    console.log(`${item.range}: ${item.count} predictions`);
    console.log(`  Predicted: ${item.avgConfidence.toFixed(1)}%`);
    console.log(`  Actual: ${item.accuracy.toFixed(1)}%`);
    console.log(`  Calibration: ${item.calibration > 0 ? '+' : ''}${item.calibration.toFixed(1)}% ${item.calibration > 0 ? '(overconfident)' : '(underconfident)'}`);
  });

  return analysis;
}

// Example 13: Real-time dashboard update
function updateDashboard() {
  const stats = PredictionAnalytics.getStats();

  // Update DOM elements (assuming they exist)
  const updateElement = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  updateElement('total-predictions', stats.overview.total);
  updateElement('overall-accuracy', stats.accuracy.overall.toFixed(1) + '%');
  updateElement('current-streak', `${stats.streaks.currentStreak} ${stats.streaks.currentType || ''}`);
  updateElement('profit-factor', stats.profitFactor.profitFactor.toFixed(2));
  updateElement('sharpe-ratio', stats.performance.sharpeRatio.toFixed(2));

  // Update accuracy by timeframe
  Object.entries(stats.byTimeframe).forEach(([tf, data]) => {
    updateElement(`accuracy-${tf}`, data.accuracy.toFixed(1) + '%');
    updateElement(`count-${tf}`, data.total);
  });

  console.log('Dashboard updated');
}

// Example 14: Batch import predictions
function importPredictions(predictionsArray) {
  let successCount = 0;
  let failCount = 0;

  predictionsArray.forEach(pred => {
    const result = PredictionAnalytics.trackPrediction(pred.signal, pred.outcome);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  });

  console.log(`Imported ${successCount} predictions, ${failCount} failed`);
  return { success: successCount, failed: failCount };
}

// Example 15: Monitor prediction performance
function monitorPerformance() {
  const stats = PredictionAnalytics.getStats();

  // Check if we're in a losing streak
  if (stats.streaks.currentType === 'loss' && stats.streaks.currentStreak >= 3) {
    console.warn('WARNING: 3+ consecutive losses. Consider reviewing strategy.');
  }

  // Check if accuracy is declining
  if (stats.performance.rolling.last10 < stats.performance.rolling.last50 - 10) {
    console.warn('WARNING: Recent accuracy declining. Last 10: ' +
      stats.performance.rolling.last10.toFixed(1) + '% vs Last 50: ' +
      stats.performance.rolling.last50.toFixed(1) + '%');
  }

  // Check profit factor
  if (stats.profitFactor.profitFactor < 1.0) {
    console.warn('WARNING: Profit factor below 1.0. Losing more than winning.');
  }

  // Check max drawdown
  if (stats.performance.maxDrawdown > 20) {
    console.error('ALERT: Max drawdown exceeds 20%. Risk management needed.');
  }

  return {
    streak: stats.streaks,
    profitFactor: stats.profitFactor.profitFactor,
    drawdown: stats.performance.maxDrawdown
  };
}

// Make examples available globally
if (typeof window !== 'undefined') {
  window.PredictionAnalyticsExamples = {
    trackNewPrediction,
    resolvePrediction,
    trackImmediateSignal,
    getTimeframeAccuracy,
    getSignalTypeAccuracy,
    getCompleteStats,
    getFilteredAccuracy,
    getVisualizationData,
    exportAnalyticsReport,
    exportCSVReport,
    displayConfusionMatrix,
    displayConfidenceAnalysis,
    updateDashboard,
    importPredictions,
    monitorPerformance
  };
}
