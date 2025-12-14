# MultiChart Quick Reference Card

## Installation (30 seconds)

```html
<!-- 1. Add LightweightCharts -->
<script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>

<!-- 2. Add MultiChart -->
<script src="/static/src/js/multi-chart.js"></script>

<!-- 3. Create container -->
<div id="my-charts" style="width: 100%; height: 800px;"></div>

<!-- 4. Initialize -->
<script>
  MultiChart.init('my-charts');
</script>
```

## API Cheat Sheet

### Initialize
```javascript
// Basic
MultiChart.init('container-id');

// With options
MultiChart.init('container-id', {
  layout: 'quad',              // 'single', 'splitHorizontal', 'splitVertical', 'quad'
  crosshairSync: true,         // Enable crosshair sync
  timeframes: ['15m', '1h', '4h', '1d']
});
```

### Change Layout
```javascript
MultiChart.setLayout('quad');
MultiChart.setLayout('splitHorizontal', ['1h', '4h']);
```

### Toggle Crosshair Sync
```javascript
MultiChart.syncCrosshair(true);   // Enable
MultiChart.syncCrosshair(false);  // Disable
```

### Access Charts
```javascript
// Get one chart
const chart = MultiChart.getChart('chart-1');
chart.chart.timeScale().fitContent();

// Get all charts
MultiChart.getAllCharts().forEach((chartObj, id) => {
  console.log(id, chartObj);
});
```

### Events
```javascript
MultiChart.on('layoutChange', (data) => {
  console.log('Layout:', data.layout);
  console.log('Charts:', data.chartCount);
});
```

## Layouts

| Layout | Code | Charts | Grid |
|--------|------|--------|------|
| Single | `'single'` | 1 | 1x1 |
| Split H | `'splitHorizontal'` | 2 | 1x2 |
| Split V | `'splitVertical'` | 2 | 2x1 |
| Quad | `'quad'` | 4 | 2x2 |

## Timeframes

```
'1m'  - 1 minute
'5m'  - 5 minutes
'15m' - 15 minutes
'1h'  - 1 hour
'4h'  - 4 hours
'1d'  - 1 day
'1w'  - 1 week
```

## Common Tasks

### 1. Quad Layout with Custom Timeframes
```javascript
MultiChart.init('charts', {
  layout: 'quad',
  timeframes: ['5m', '15m', '1h', '4h']
});
```

### 2. Switch Layouts on Button Click
```javascript
document.getElementById('btn-quad').onclick = () => {
  MultiChart.setLayout('quad');
};
```

### 3. Get Current Layout
```javascript
const currentLayout = MultiChart._state.currentLayout;
console.log('Current:', currentLayout);
```

### 4. Check if Sync Enabled
```javascript
const isSynced = MultiChart._state.crosshairSync;
console.log('Sync enabled:', isSynced);
```

### 5. Count Charts
```javascript
const chartCount = MultiChart._state.charts.size;
console.log('Number of charts:', chartCount);
```

### 6. Fit All Charts to Content
```javascript
MultiChart.getAllCharts().forEach(chartObj => {
  chartObj.chart.timeScale().fitContent();
});
```

### 7. Add Indicator to All Charts
```javascript
MultiChart.getAllCharts().forEach(chartObj => {
  const ema = chartObj.chart.addLineSeries({
    color: '#f59e0b',
    lineWidth: 2
  });
  // ema.setData(yourData);
});
```

### 8. Clear All Charts
```javascript
MultiChart._state.charts.forEach((chartObj) => {
  chartObj.chart.remove();
});
MultiChart._state.charts.clear();
```

### 9. Keyboard Shortcuts
```javascript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case '1': MultiChart.setLayout('single'); break;
      case '2': MultiChart.setLayout('splitHorizontal'); break;
      case '3': MultiChart.setLayout('splitVertical'); break;
      case '4': MultiChart.setLayout('quad'); break;
      case 's': MultiChart.syncCrosshair(!MultiChart._state.crosshairSync); break;
    }
  }
});
```

### 10. Save/Load Custom Config
```javascript
// Save
function saveMyConfig() {
  localStorage.setItem('my_config', JSON.stringify({
    layout: MultiChart._state.currentLayout,
    sync: MultiChart._state.crosshairSync
  }));
}

// Load
function loadMyConfig() {
  const config = JSON.parse(localStorage.getItem('my_config'));
  if (config) {
    MultiChart.setLayout(config.layout);
    MultiChart.syncCrosshair(config.sync);
  }
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Charts not showing | Check container has explicit height |
| LightweightCharts error | Include library before multi-chart.js |
| Sync not working | Ensure multiple charts exist |
| Layout not saving | Check localStorage enabled |
| Mobile layout broken | All layouts auto-collapse on mobile (<768px) |

## Files

| File | Purpose |
|------|---------|
| `multi-chart.js` | Core module |
| `multi-chart-demo.html` | Demo page |
| `multi-chart-README.md` | Full documentation |
| `multi-chart-integration-example.js` | Code examples |
| `multi-chart.test.html` | Test suite |

## Chart Object Structure

```javascript
const chartObj = MultiChart.getChart('chart-1');

// Structure:
{
  chart: LightweightCharts.IChartApi,
  candleSeries: ISeriesApi,
  container: HTMLElement
}
```

## Default Timeframes per Layout

```javascript
const defaults = {
  single: ['4h'],
  splitHorizontal: ['1h', '4h'],
  splitVertical: ['15m', '4h'],
  quad: ['15m', '1h', '4h', '1d']
};
```

## Color Theme

```javascript
const theme = {
  background: '#0d1117',
  grid: '#21262d',
  text: '#8d96a0',
  crosshair: '#58a6ff',
  bullish: '#3fb950',
  bearish: '#f85149'
};
```

## Performance Tips

1. **Limit to 4 charts** - More may cause lag
2. **Limit data points** - Keep to 200-500 candles
3. **Disable sync** - If experiencing lag
4. **Use ResizeObserver** - Already built-in
5. **Clean up old charts** - Charts auto-cleaned on layout change

## Mobile Behavior

- All layouts collapse to single column
- Minimum chart height: 300px
- Touch-friendly controls
- Vertical toolbar stacking
- Preserved functionality

## Events

| Event | Data | When |
|-------|------|------|
| `layoutChange` | `{layout, chartCount}` | Layout changes |

## Browser Requirements

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- ES6 support
- ResizeObserver
- localStorage

## One-Liners

```javascript
// Quick quad setup
MultiChart.init('c', {layout: 'quad'});

// Toggle sync
MultiChart.syncCrosshair(!MultiChart._state.crosshairSync);

// Chart count
MultiChart._state.charts.size;

// Current layout
MultiChart._state.currentLayout;

// Fit all
MultiChart.getAllCharts().forEach(c => c.chart.timeScale().fitContent());
```

## Links

- Demo: `/static/multi-chart-demo.html`
- Docs: `/static/src/js/multi-chart-README.md`
- Tests: `/static/src/js/multi-chart.test.html`
- Examples: `/static/src/js/multi-chart-integration-example.js`

---

**Version:** 1.0
**Last Updated:** 2025-12-13
**Status:** Production Ready
