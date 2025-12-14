# Prediction Analytics Module

A comprehensive prediction accuracy tracking and analytics system for BTCSignal.ai.

## Overview

The Prediction Analytics module provides sophisticated tracking and analysis of trading signal predictions. It calculates accuracy metrics, tracks performance over time, analyzes confidence calibration, and provides rich visualization data.

## Features

### 1. Prediction Tracking
- Track individual signal predictions with outcomes
- Support for multiple timeframes (1h, 4h, 1d, 3d, 1w)
- Support for multiple signal types (technical, onchain, derivatives, sentiment, etc.)
- Automatic P&L calculation
- Win/loss determination based on direction

### 2. Accuracy Analytics
- Overall accuracy percentage
- Accuracy by timeframe
- Accuracy by signal type
- Accuracy by direction (bullish/bearish/neutral)
- Win rate and loss rate
- Filtered accuracy queries

### 3. Performance Metrics
- **Profit Factor**: Gross profit divided by gross loss
- **Sharpe Ratio**: Risk-adjusted returns
- **Max Drawdown**: Largest peak-to-trough decline
- **Rolling Accuracy**: Last 10, 20, 50 predictions
- **Cumulative P&L**: Running profit/loss over time

### 4. Streak Analysis
- Current win/loss streak tracking
- Longest win streak
- Longest loss streak
- Streak history (last 10 streaks)

### 5. Confusion Matrix
- Predicted direction vs actual outcome
- Precision and recall metrics
- F1 scores for each direction

### 6. Confidence Analysis
- Confidence calibration (predicted vs actual)
- Accuracy by confidence ranges
- Overconfidence/underconfidence detection

### 7. Visualization Helpers
- Timeline data (accuracy over time)
- Heatmap data (timeframe vs signal type)
- Distribution data (P&L histogram)
- Confidence calibration charts
- Cumulative P&L charts

### 8. Export & Reporting
- JSON export with full statistics
- CSV export for spreadsheet analysis
- Customizable filters
- Optional raw data inclusion

## Installation

Include the script in your HTML:

```html
<script src="/static/src/js/prediction-analytics.js"></script>
```

The module is automatically initialized and exposed as `window.PredictionAnalytics`.

## Usage

### Basic Usage

#### Track a New Prediction

```javascript
const signal = {
  signalType: 'technical',
  timeframe: '4h',
  direction: 'bullish',
  confidence: 75,
  entryPrice: 43500,
  targetPrice: 44200,
  stopLoss: 43200,
  metadata: {
    source: 'rsi_divergence',
    indicators: ['RSI', 'MACD'],
    notes: 'Bullish divergence detected'
  }
};

const result = PredictionAnalytics.trackPrediction(signal);
console.log(result.prediction.id); // Save this ID for later updates
```

#### Resolve a Prediction

```javascript
const outcome = {
  actualPrice: 44150,
  timestamp: Date.now()
};

PredictionAnalytics.updatePrediction(predictionId, outcome);
```

#### Track and Resolve Immediately

```javascript
const signal = { /* ... */ };
const outcome = { actualPrice: 44150 };

PredictionAnalytics.trackPrediction(signal, outcome);
```

### Getting Statistics

#### Overall Accuracy

```javascript
const stats = PredictionAnalytics.getStats();
console.log('Overall Accuracy:', stats.accuracy.overall.toFixed(2) + '%');
console.log('Total Predictions:', stats.overview.total);
console.log('Win Rate:', stats.overview.wins / stats.overview.resolved);
```

#### Accuracy by Timeframe

```javascript
const accuracy4h = PredictionAnalytics.getAccuracy({ timeframe: '4h' });
console.log('4h Accuracy:', accuracy4h.accuracy.toFixed(2) + '%');
console.log('4h Predictions:', accuracy4h.total);
```

#### Accuracy by Signal Type

```javascript
const techAccuracy = PredictionAnalytics.getAccuracy({ signalType: 'technical' });
const onchainAccuracy = PredictionAnalytics.getAccuracy({ signalType: 'onchain' });
```

#### Advanced Filtering

```javascript
// High confidence bullish signals from last 30 days
const filtered = PredictionAnalytics.getAccuracy({
  direction: 'bullish',
  minConfidence: 70,
  dateFrom: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
  outcome: 'win' // Only winners
});
```

### Performance Metrics

```javascript
const stats = PredictionAnalytics.getStats();

// Profit Factor (should be > 1.0)
console.log('Profit Factor:', stats.profitFactor.profitFactor);

// Sharpe Ratio (higher is better)
console.log('Sharpe Ratio:', stats.performance.sharpeRatio);

// Max Drawdown (lower is better)
console.log('Max Drawdown:', stats.performance.maxDrawdown + '%');

// Rolling Accuracy
console.log('Last 10:', stats.performance.rolling.last10 + '%');
console.log('Last 20:', stats.performance.rolling.last20 + '%');
console.log('Last 50:', stats.performance.rolling.last50 + '%');
```

### Streak Analysis

```javascript
const stats = PredictionAnalytics.getStats();
const streaks = stats.streaks;

console.log('Current Streak:', streaks.currentStreak, streaks.currentType);
console.log('Longest Win Streak:', streaks.longestWinStreak);
console.log('Longest Loss Streak:', streaks.longestLossStreak);
```

### Confusion Matrix

```javascript
const stats = PredictionAnalytics.getStats();
const matrix = stats.confusionMatrix;

// Raw counts
console.log('Bullish → Win:', matrix.matrix.bullish.win);
console.log('Bullish → Loss:', matrix.matrix.bullish.loss);
console.log('Bearish → Win:', matrix.matrix.bearish.win);
console.log('Bearish → Loss:', matrix.matrix.bearish.loss);

// Metrics
console.log('Bullish Precision:', matrix.metrics.bullish.precision + '%');
console.log('Bullish Recall:', matrix.metrics.bullish.recall + '%');
console.log('Bullish F1 Score:', matrix.metrics.bullish.f1Score + '%');
```

### Confidence Analysis

```javascript
const stats = PredictionAnalytics.getStats();

stats.confidenceAnalysis.forEach(range => {
  console.log(`${range.range}: ${range.count} predictions`);
  console.log(`  Avg Confidence: ${range.avgConfidence.toFixed(1)}%`);
  console.log(`  Actual Accuracy: ${range.accuracy.toFixed(1)}%`);
  console.log(`  Calibration: ${range.calibration.toFixed(1)}%`);
});
```

### Visualization Data

```javascript
// Timeline chart (rolling accuracy)
const timeline = PredictionAnalytics.getChartData('timeline', {
  windowSize: 20 // 20-prediction rolling window
});

// Heatmap (timeframe vs signal type)
const heatmap = PredictionAnalytics.getChartData('heatmap');

// P&L distribution
const distribution = PredictionAnalytics.getChartData('distribution', {
  binSize: 2 // 2% bins
});

// Confidence calibration
const confidence = PredictionAnalytics.getChartData('confidence');

// Cumulative P&L
const cumulative = PredictionAnalytics.getChartData('cumulative');
```

### Export & Reporting

#### Export JSON Report

```javascript
const report = PredictionAnalytics.exportReport({
  filters: {
    dateFrom: '2024-01-01',
    signalType: 'technical'
  },
  includeRawData: true // Include all prediction data
});

// Download as file
const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'prediction-report.json';
a.click();
```

#### Export CSV

```javascript
const csv = PredictionAnalytics.exportCSV({
  filters: {
    outcome: 'win'
  }
});

// Download CSV
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'predictions.csv';
a.click();
```

## API Reference

### Core Functions

#### `trackPrediction(signal, outcome?)`
Track a new prediction.

**Parameters:**
- `signal` (Object): Signal configuration
  - `signalType` (string): Type of signal
  - `timeframe` (string): Prediction timeframe
  - `direction` (string): 'bullish', 'bearish', or 'neutral'
  - `confidence` (number): 0-100
  - `entryPrice` (number): Price at signal
  - `targetPrice` (number): Predicted target price
  - `stopLoss` (number, optional): Stop loss price
  - `metadata` (Object, optional): Additional data
- `outcome` (Object, optional): Immediate outcome

**Returns:** `{ success: boolean, prediction?: Object, error?: string }`

#### `updatePrediction(predictionId, outcome)`
Update a prediction with actual outcome.

**Parameters:**
- `predictionId` (string): Prediction ID
- `outcome` (Object): Outcome data
  - `actualPrice` (number): Actual price at resolution
  - `timestamp` (number, optional): Resolution timestamp

**Returns:** `{ success: boolean, prediction?: Object, error?: string }`

#### `getAccuracy(filters?)`
Get accuracy statistics with optional filters.

**Parameters:**
- `filters` (Object, optional):
  - `timeframe` (string): Filter by timeframe
  - `signalType` (string): Filter by signal type
  - `direction` (string): Filter by direction
  - `outcome` (string): Filter by outcome
  - `minConfidence` (number): Minimum confidence
  - `dateFrom` (string): Start date (ISO)
  - `dateTo` (string): End date (ISO)

**Returns:** Object with accuracy stats

#### `getStats()`
Get comprehensive statistics (cached for 5 seconds).

**Returns:** Complete statistics object including:
- `overview`: Total, wins, losses, etc.
- `accuracy`: Overall and by category
- `byTimeframe`: Accuracy for each timeframe
- `bySignalType`: Accuracy for each signal type
- `streaks`: Win/loss streak information
- `profitFactor`: Profit factor metrics
- `confusionMatrix`: Confusion matrix data
- `confidenceAnalysis`: Confidence calibration
- `performance`: Performance metrics over time

#### `getChartData(chartType, options?)`
Get visualization-ready data.

**Chart Types:**
- `'timeline'`: Rolling accuracy over time
- `'heatmap'`: Timeframe vs signal type grid
- `'distribution'`: P&L histogram
- `'confidence'`: Confidence calibration
- `'cumulative'`: Cumulative P&L

**Returns:** Array of data points suitable for charting

#### `exportReport(options?)`
Export comprehensive report as JSON.

**Parameters:**
- `options` (Object, optional):
  - `filters` (Object): Apply filters
  - `includeRawData` (boolean): Include all predictions

**Returns:** Report object

#### `exportCSV(options?)`
Export predictions as CSV.

**Parameters:**
- `options` (Object, optional):
  - `filters` (Object): Apply filters

**Returns:** CSV string

### Utility Functions

#### `getAllPredictions(filters?)`
Get all predictions with optional filtering.

#### `getPrediction(predictionId)`
Get a single prediction by ID.

#### `deletePrediction(predictionId)`
Delete a specific prediction.

#### `clearAll(confirm)`
Clear all predictions (requires `confirm=true`).

## Data Structure

### Prediction Object

```javascript
{
  id: "pred_1234567890_abc123",
  timestamp: 1234567890000,
  signalType: "technical",
  timeframe: "4h",
  direction: "bullish",
  confidence: 75,
  entryPrice: 43500,
  targetPrice: 44200,
  stopLoss: 43200,
  actualPrice: 44150,
  outcome: "win",
  pnlPercent: 1.49,
  metadata: {
    source: "rsi_divergence",
    indicators: ["RSI", "MACD"],
    notes: "Bullish divergence",
    targetHit: true,
    stopLossHit: false
  },
  resolvedAt: 1234567890000
}
```

## Storage

- Uses localStorage with key `btcsignal_prediction_analytics`
- Stores up to 1000 predictions (configurable via `MAX_PREDICTIONS`)
- Automatic cleanup of old pending predictions (> 1 week)
- Version management for data migration
- Automatic quota management (removes oldest 50% if storage full)

## Performance

- Statistics are cached for 5 seconds to reduce computation
- Efficient filtering using native array methods
- Lazy loading of chart data (computed on demand)
- Memory-efficient storage with configurable limits

## Best Practices

1. **Always save prediction IDs** when tracking predictions for later updates
2. **Use filters** to analyze specific segments of your predictions
3. **Monitor streaks** to identify when strategy adjustments are needed
4. **Check confidence calibration** to improve prediction confidence estimates
5. **Export regularly** to backup your prediction history
6. **Review profit factor** to ensure positive expectancy
7. **Track by timeframe** to identify which timeframes work best for your strategy

## Integration Examples

### With Paper Trading

```javascript
// When opening a paper trade
const trade = {
  signalType: 'composite',
  timeframe: '4h',
  direction: position > 0 ? 'bullish' : 'bearish',
  confidence: confidenceScore,
  entryPrice: currentPrice,
  targetPrice: targetPrice,
  stopLoss: stopLossPrice
};

const result = PredictionAnalytics.trackPrediction(trade);
// Store result.prediction.id with your paper trade
```

### With Real-Time Signals

```javascript
// When signal is generated
function onSignalGenerated(signal) {
  const prediction = {
    signalType: signal.category,
    timeframe: signal.timeframe,
    direction: signal.direction,
    confidence: signal.score,
    entryPrice: signal.currentPrice,
    targetPrice: signal.target,
    metadata: {
      source: signal.source,
      indicators: signal.indicators
    }
  };

  PredictionAnalytics.trackPrediction(prediction);
}

// When timeframe expires
function onTimeframeExpired(predictionId, currentPrice) {
  PredictionAnalytics.updatePrediction(predictionId, {
    actualPrice: currentPrice,
    timestamp: Date.now()
  });
}
```

### Dashboard Integration

```javascript
// Update dashboard every 5 seconds
setInterval(() => {
  const stats = PredictionAnalytics.getStats();

  document.getElementById('accuracy').textContent = stats.accuracy.overall.toFixed(1) + '%';
  document.getElementById('profit-factor').textContent = stats.profitFactor.profitFactor.toFixed(2);
  document.getElementById('current-streak').textContent = stats.streaks.currentStreak;

  // Update chart
  const chartData = PredictionAnalytics.getChartData('cumulative');
  updateChart(chartData);
}, 5000);
```

## Troubleshooting

### Predictions not saving
- Check browser console for errors
- Verify localStorage is available and not full
- Try clearing old predictions with `clearAll(true)`

### Statistics seem incorrect
- Ensure predictions are being resolved (check `pending` count)
- Verify outcome data includes valid `actualPrice`
- Check that filters aren't too restrictive

### Performance issues
- Limit the number of stored predictions
- Use filters to reduce dataset size
- Export and archive old predictions

## Version History

- **v1.0.0** (2024-12): Initial release
  - Complete prediction tracking
  - Comprehensive analytics
  - Visualization helpers
  - Export functionality

## License

Part of BTCSignal.ai platform. All rights reserved.
