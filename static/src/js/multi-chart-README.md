# Multi-Chart Layout System

A comprehensive multi-chart layout system for viewing multiple timeframes simultaneously with synced crosshairs. Built on top of TradingView's LightweightCharts library.

## Features

### Layouts
- **Single** (1x1) - One chart occupying the full space
- **Split Horizontal** (1x2) - Two charts side by side
- **Split Vertical** (2x1) - Two charts stacked vertically
- **Quad** (2x2) - Four charts in a 2x2 grid
- **Custom Grid** - Extensible for custom layouts

### Core Features
- **Synced Crosshairs** - Crosshair movement synchronized across all charts
- **Independent Timeframes** - Each chart can display a different timeframe
- **Layout Persistence** - Automatically saves layout preferences to localStorage
- **Responsive Design** - Mobile-friendly layout that adapts to screen size
- **Quick Layout Selector** - Icon-based buttons for instant layout switching
- **Interactive Controls** - Timeframe dropdowns and remove buttons per chart

## Installation

### 1. Include Dependencies

```html
<!-- LightweightCharts Library -->
<script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>

<!-- Multi-Chart Module -->
<script src="/static/src/js/multi-chart.js"></script>
```

### 2. Create Container

```html
<div id="multi-chart-container" style="width: 100%; height: 800px;"></div>
```

### 3. Initialize

```javascript
// Basic initialization
MultiChart.init('multi-chart-container');

// With options
MultiChart.init('multi-chart-container', {
  layout: 'quad',
  crosshairSync: true,
  timeframes: ['15m', '1h', '4h', '1d']
});
```

## API Reference

### Methods

#### `init(container, options)`
Initialize the multi-chart system.

**Parameters:**
- `container` (string|HTMLElement) - Container element or ID
- `options` (Object) - Configuration options
  - `layout` (string) - Initial layout: 'single', 'splitHorizontal', 'splitVertical', 'quad'
  - `crosshairSync` (boolean) - Enable crosshair synchronization (default: true)
  - `timeframes` (Array<string>) - Timeframes for each chart

**Returns:** `boolean` - Success status

**Example:**
```javascript
MultiChart.init('chart-container', {
  layout: 'splitHorizontal',
  crosshairSync: true,
  timeframes: ['1h', '4h']
});
```

---

#### `setLayout(layoutType, timeframes)`
Change the chart layout.

**Parameters:**
- `layoutType` (string) - Layout type: 'single', 'splitHorizontal', 'splitVertical', 'quad'
- `timeframes` (Array<string>) - Optional timeframes for each chart

**Example:**
```javascript
// Use default timeframes for layout
MultiChart.setLayout('quad');

// Specify custom timeframes
MultiChart.setLayout('splitVertical', ['15m', '1d']);
```

---

#### `syncCrosshair(enable)`
Enable or disable crosshair synchronization.

**Parameters:**
- `enable` (boolean) - Enable sync

**Example:**
```javascript
// Enable sync
MultiChart.syncCrosshair(true);

// Disable sync
MultiChart.syncCrosshair(false);
```

---

#### `addChart(config)`
Add a new chart to the layout (custom layouts).

**Parameters:**
- `config` (Object) - Chart configuration
  - `timeframe` (string) - Chart timeframe
  - `position` (Object) - Position in grid (for custom layouts)

**Returns:** `string` - Chart ID

**Note:** Custom layouts are not fully implemented in the current version.

**Example:**
```javascript
const chartId = MultiChart.addChart({
  timeframe: '1h',
  position: { row: 0, col: 0 }
});
```

---

#### `removeChart(chartId)`
Remove a chart from the layout.

**Parameters:**
- `chartId` (string) - Chart identifier

**Example:**
```javascript
MultiChart.removeChart('chart-2');
```

---

#### `getChart(chartId)`
Get a specific chart instance.

**Parameters:**
- `chartId` (string) - Chart identifier

**Returns:** `Object` - Chart object containing:
- `chart` - LightweightCharts instance
- `candleSeries` - Candlestick series
- `container` - DOM container element

**Example:**
```javascript
const chartObj = MultiChart.getChart('chart-1');
if (chartObj) {
  // Access the LightweightCharts instance
  chartObj.chart.timeScale().fitContent();

  // Access the candlestick series
  chartObj.candleSeries.setData(newData);
}
```

---

#### `getAllCharts()`
Get all chart instances.

**Returns:** `Map` - Map of chartId -> chart object

**Example:**
```javascript
const allCharts = MultiChart.getAllCharts();
allCharts.forEach((chartObj, chartId) => {
  console.log(`Chart ${chartId}:`, chartObj);
});
```

---

#### `on(event, callback)`
Subscribe to events.

**Parameters:**
- `event` (string) - Event name
- `callback` (Function) - Callback function

**Events:**
- `layoutChange` - Fired when layout changes
  - Data: `{ layout: string, chartCount: number }`

**Example:**
```javascript
MultiChart.on('layoutChange', (data) => {
  console.log('Layout changed to:', data.layout);
  console.log('Number of charts:', data.chartCount);
});
```

## Timeframes

Supported timeframe values:
- `'1m'` - 1 minute
- `'5m'` - 5 minutes
- `'15m'` - 15 minutes
- `'1h'` - 1 hour
- `'4h'` - 4 hours
- `'1d'` - 1 day
- `'1w'` - 1 week

## Layouts

### Single (1x1)
```
┌─────────────┐
│             │
│   Chart 1   │
│             │
└─────────────┘
```
Default timeframe: `['4h']`

### Split Horizontal (1x2)
```
┌──────┬──────┐
│      │      │
│ Ch 1 │ Ch 2 │
│      │      │
└──────┴──────┘
```
Default timeframes: `['1h', '4h']`

### Split Vertical (2x1)
```
┌─────────────┐
│   Chart 1   │
├─────────────┤
│   Chart 2   │
└─────────────┘
```
Default timeframes: `['15m', '4h']`

### Quad (2x2)
```
┌──────┬──────┐
│ Ch 1 │ Ch 2 │
├──────┼──────┤
│ Ch 3 │ Ch 4 │
└──────┴──────┘
```
Default timeframes: `['15m', '1h', '4h', '1d']`

## Data Integration

The multi-chart system integrates with your data source in the following order:

1. **BTCSAIShared.fetchOHLCData()** - If available, uses your existing data fetching function
2. **Sample Data Generator** - Falls back to generated sample data for testing

### Custom Data Integration

To use your own data source:

```javascript
// Make sure BTCSAIShared.fetchOHLCData is available
window.BTCSAIShared = window.BTCSAIShared || {};
BTCSAIShared.fetchOHLCData = async function(timeframe, limit) {
  // Fetch from your API
  const response = await fetch(`/api/ohlc?tf=${timeframe}&limit=${limit}`);
  const data = await response.json();

  // Return array of objects with: { time, open, high, low, close }
  return data.map(candle => ({
    time: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  }));
};
```

## Customization

### Theme Colors

Modify the `CHART_THEME` object in the source:

```javascript
const CHART_THEME = {
  background: '#0d1117',      // Chart background
  grid: '#21262d',            // Grid lines
  text: '#8d96a0',            // Text color
  crosshair: '#58a6ff',       // Crosshair color
  borderColor: '#30363d',     // Border color
  bullish: '#3fb950',         // Bullish candle color
  bearish: '#f85149'          // Bearish candle color
};
```

### Chart Options

Each chart is created with LightweightCharts options. Modify the `createChart()` function to customize:

```javascript
const chart = LightweightCharts.createChart(container, {
  // Add your custom options here
  handleScroll: true,
  handleScale: true,
  // ... other options
});
```

## Persistence

Layout preferences are automatically saved to localStorage under the key `btcsai_multichart_layout`.

**Saved data:**
- Current layout type
- Crosshair sync preference
- Timestamp

To disable persistence, you can modify the `saveLayoutPreference()` function to return early.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

Requires:
- ES6+ support
- ResizeObserver API
- localStorage API
- Map/Set data structures

## Mobile Responsiveness

On screens smaller than 768px:
- All layouts collapse to single-column vertical stack
- Each chart maintains minimum height of 300px
- Toolbar controls stack vertically
- Touch-friendly controls

## Performance Considerations

1. **Chart Limit** - Keep total charts ≤ 4 for optimal performance
2. **Data Points** - Limit to 200-500 candles per chart
3. **Sync** - Disable crosshair sync if experiencing lag
4. **Resize** - Uses ResizeObserver for efficient resize handling

## Troubleshooting

### Charts not rendering
- Verify LightweightCharts library is loaded
- Check container has explicit height
- Inspect console for errors

### Crosshair sync not working
- Ensure crosshair sync is enabled
- Verify multiple charts are present
- Check that data is loaded in all charts

### Layout not persisting
- Check localStorage is enabled
- Verify browser doesn't block localStorage
- Clear localStorage and try again

### Performance issues
- Reduce number of charts
- Limit data points per chart
- Disable crosshair sync
- Check browser dev tools for bottlenecks

## Examples

### Basic Usage
```javascript
// Initialize with quad layout
MultiChart.init('container', {
  layout: 'quad',
  timeframes: ['15m', '1h', '4h', '1d']
});
```

### Dynamic Layout Switching
```javascript
// Switch to different layouts based on user preference
document.getElementById('layout-single').addEventListener('click', () => {
  MultiChart.setLayout('single');
});

document.getElementById('layout-quad').addEventListener('click', () => {
  MultiChart.setLayout('quad');
});
```

### Custom Event Handling
```javascript
// Listen for layout changes
MultiChart.on('layoutChange', (data) => {
  // Update UI
  document.getElementById('chart-count').textContent = data.chartCount;

  // Analytics
  gtag('event', 'layout_change', {
    layout: data.layout,
    chart_count: data.chartCount
  });
});
```

### Programmatic Chart Access
```javascript
// Get all charts and fit content
const charts = MultiChart.getAllCharts();
charts.forEach((chartObj) => {
  chartObj.chart.timeScale().fitContent();
});
```

## Future Enhancements

Planned features for future versions:
- [ ] Custom grid layouts with drag-and-drop
- [ ] Chart templates and presets
- [ ] Export/import layout configurations
- [ ] Multiple symbol support per layout
- [ ] Chart linking (sync time ranges, not just crosshair)
- [ ] Save multiple layout configurations
- [ ] Indicator overlays per chart
- [ ] Chart-specific settings panel

## License

This module is part of BTC Signal AI and follows the same license.

## Support

For issues and feature requests, please contact the development team or file an issue in the project repository.
