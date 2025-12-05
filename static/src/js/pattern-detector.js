// Pattern Detector - AI Chart Pattern Recognition
// Requires: shared.js
(function() {
  const FEATURE_KEY = 'pattern-detector-access';
  let priceChart = null;
  let currentTimeframe = '1h';
  let priceData = [];

  // Use shared access check
  function checkAccess() {
    return BTCSAIShared.checkAccess(FEATURE_KEY);
  }

  function updateAccessUI() {
    BTCSAIShared.updatePremiumUI('premium-gate', 'premium-content', checkAccess(), loadFullAnalysis);
  }

  // Unlock button
  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', function() {
      // Payment confirmation handled by Toast.confirm
      Toast.confirm('This will cost 50 sats via Lightning. Continue?', function() {
        unlockFeature();
      });
      return;
      const confirmed = true;
      if (confirmed) {
        localStorage.setItem(FEATURE_KEY, 'unlocked');
        updateAccessUI();
      }
    });
  }

  // Timeframe selector
  const tfButtons = document.querySelectorAll('.tf-btn');
  tfButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      tfButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentTimeframe = this.dataset.tf;
      loadPatternAnalysis();
    });
  });

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadPatternAnalysis);
  }

  // Initialize
  loadPatternAnalysis();

  async function loadPatternAnalysis() {
    const loading = document.getElementById('chart-loading');
    if (loading) loading.style.display = 'flex';

    try {
      // Fetch price data
      priceData = await fetchPriceData(currentTimeframe);

      if (priceData.length === 0) {
        throw new Error('Failed to fetch price data');
      }

      // Update current price
      const currentPrice = priceData[priceData.length - 1].close;
      const prevPrice = priceData[priceData.length - 2].close;
      const change = ((currentPrice - prevPrice) / prevPrice) * 100;

      document.getElementById('current-price').textContent = '$' + currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 });
      const changeEl = document.getElementById('price-change');
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.className = 'chart-change ' + (change >= 0 ? 'positive' : 'negative');

      // Detect patterns
      const patterns = detectPatterns(priceData);

      // Draw chart with patterns
      drawChart(priceData, patterns);

      // Display main pattern (free preview)
      displayMainPattern(patterns, currentPrice);

      // Update access UI
      updateAccessUI();

      if (loading) loading.style.display = 'none';

    } catch (error) {
      console.error('Pattern analysis error:', error);
      if (loading) loading.style.display = 'none';
    }
  }

  // Use shared OHLC fetcher
  async function fetchPriceData(timeframe) {
    const data = await BTCSAIShared.fetchOHLCData(timeframe, 100);
    // Convert time to Date object for compatibility
    return data.map(candle => ({
      ...candle,
      time: new Date(candle.time)
    }));
  }

  function detectPatterns(data) {
    const patterns = {
      primary: null,
      support: [],
      resistance: [],
      trendlines: [],
      orderBlocks: [],
      fvgs: [],
      secondary: []
    };

    // Find support and resistance levels
    patterns.support = findSupportLevels(data);
    patterns.resistance = findResistanceLevels(data);

    // Detect trendlines
    patterns.trendlines = detectTrendlines(data);

    // Detect order blocks
    patterns.orderBlocks = detectOrderBlocks(data);

    // Detect fair value gaps
    patterns.fvgs = detectFVGs(data);

    // Detect chart patterns
    const chartPatterns = detectChartPatterns(data);
    if (chartPatterns.length > 0) {
      patterns.primary = chartPatterns[0];
      patterns.secondary = chartPatterns.slice(1);
    }

    return patterns;
  }

  function findSupportLevels(data) {
    const levels = [];
    const tolerance = 0.005; // 0.5%

    for (let i = 2; i < data.length - 2; i++) {
      const low = data[i].low;
      // Check if it's a swing low
      if (data[i - 1].low > low && data[i - 2].low > low &&
          data[i + 1].low > low && data[i + 2].low > low) {
        // Check if this level was tested multiple times
        let touches = 0;
        for (const candle of data) {
          if (Math.abs(candle.low - low) / low < tolerance) {
            touches++;
          }
        }
        if (touches >= 2) {
          levels.push({ price: low, touches, type: 'support' });
        }
      }
    }

    // Sort by touches and return top 3
    return levels.sort((a, b) => b.touches - a.touches).slice(0, 3);
  }

  function findResistanceLevels(data) {
    const levels = [];
    const tolerance = 0.005;

    for (let i = 2; i < data.length - 2; i++) {
      const high = data[i].high;
      if (data[i - 1].high < high && data[i - 2].high < high &&
          data[i + 1].high < high && data[i + 2].high < high) {
        let touches = 0;
        for (const candle of data) {
          if (Math.abs(candle.high - high) / high < tolerance) {
            touches++;
          }
        }
        if (touches >= 2) {
          levels.push({ price: high, touches, type: 'resistance' });
        }
      }
    }

    return levels.sort((a, b) => b.touches - a.touches).slice(0, 3);
  }

  function detectTrendlines(data) {
    const trendlines = [];

    // Find swing highs and lows
    const swingHighs = [];
    const swingLows = [];

    for (let i = 2; i < data.length - 2; i++) {
      if (data[i].high > data[i - 1].high && data[i].high > data[i - 2].high &&
          data[i].high > data[i + 1].high && data[i].high > data[i + 2].high) {
        swingHighs.push({ index: i, price: data[i].high, time: data[i].time });
      }
      if (data[i].low < data[i - 1].low && data[i].low < data[i - 2].low &&
          data[i].low < data[i + 1].low && data[i].low < data[i + 2].low) {
        swingLows.push({ index: i, price: data[i].low, time: data[i].time });
      }
    }

    // Descending trendline (connecting swing highs)
    if (swingHighs.length >= 2) {
      const first = swingHighs[0];
      const last = swingHighs[swingHighs.length - 1];
      if (last.price < first.price) {
        trendlines.push({
          type: 'descending',
          start: first,
          end: last,
          touches: swingHighs.length
        });
      }
    }

    // Ascending trendline (connecting swing lows)
    if (swingLows.length >= 2) {
      const first = swingLows[0];
      const last = swingLows[swingLows.length - 1];
      if (last.price > first.price) {
        trendlines.push({
          type: 'ascending',
          start: first,
          end: last,
          touches: swingLows.length
        });
      }
    }

    return trendlines;
  }

  function detectOrderBlocks(data) {
    const orderBlocks = [];

    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];

      // Bullish order block: bearish candle followed by strong bullish move
      if (prev.close < prev.open && // Bearish candle
          next.close > next.open && // Bullish candle
          next.close > prev.high && // Breaks above
          (next.close - next.open) > (prev.open - prev.close) * 1.5) { // Strong move
        orderBlocks.push({
          type: 'bullish',
          high: prev.high,
          low: prev.low,
          time: prev.time,
          index: i - 1
        });
      }

      // Bearish order block: bullish candle followed by strong bearish move
      if (prev.close > prev.open && // Bullish candle
          next.close < next.open && // Bearish candle
          next.close < prev.low && // Breaks below
          (next.open - next.close) > (prev.close - prev.open) * 1.5) { // Strong move
        orderBlocks.push({
          type: 'bearish',
          high: prev.high,
          low: prev.low,
          time: prev.time,
          index: i - 1
        });
      }
    }

    return orderBlocks.slice(-5); // Return last 5
  }

  function detectFVGs(data) {
    const fvgs = [];

    for (let i = 2; i < data.length; i++) {
      const candle1 = data[i - 2];
      const candle3 = data[i];

      // Bullish FVG: gap between candle 1 high and candle 3 low
      if (candle3.low > candle1.high) {
        fvgs.push({
          type: 'bullish',
          top: candle3.low,
          bottom: candle1.high,
          time: data[i - 1].time,
          index: i - 1,
          filled: false
        });
      }

      // Bearish FVG: gap between candle 1 low and candle 3 high
      if (candle3.high < candle1.low) {
        fvgs.push({
          type: 'bearish',
          top: candle1.low,
          bottom: candle3.high,
          time: data[i - 1].time,
          index: i - 1,
          filled: false
        });
      }
    }

    // Check if FVGs are filled
    for (const fvg of fvgs) {
      for (let i = fvg.index + 2; i < data.length; i++) {
        if (fvg.type === 'bullish' && data[i].low <= fvg.bottom) {
          fvg.filled = true;
          break;
        }
        if (fvg.type === 'bearish' && data[i].high >= fvg.top) {
          fvg.filled = true;
          break;
        }
      }
    }

    return fvgs.filter(f => !f.filled).slice(-5); // Return unfilled FVGs
  }

  function detectChartPatterns(data) {
    const patterns = [];
    const currentPrice = data[data.length - 1].close;

    // Get recent highs and lows
    const recentData = data.slice(-30);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);

    // Detect trend
    const ema20 = calculateEMA(data.map(d => d.close), 20);
    const trend = ema20[ema20.length - 1] > ema20[ema20.length - 10] ? 'up' : 'down';

    // Check for consolidation (range)
    const range = (maxHigh - minLow) / currentPrice;
    const isConsolidating = range < 0.05; // Less than 5% range

    // Detect converging pattern (triangle/wedge)
    const highSlope = (highs[highs.length - 1] - highs[0]) / highs.length;
    const lowSlope = (lows[lows.length - 1] - lows[0]) / lows.length;

    if (highSlope < 0 && lowSlope > 0) {
      // Symmetrical triangle
      patterns.push({
        name: 'Symmetrical Triangle',
        icon: '📐',
        confidence: 75,
        bias: 'Neutral - watch for breakout',
        description: 'Price is forming a symmetrical triangle with converging trendlines. This pattern typically breaks in the direction of the prior trend. Volume usually decreases as the pattern develops.',
        target: trend === 'up' ? maxHigh * 1.02 : minLow * 0.98
      });
    } else if (highSlope < 0 && lowSlope >= 0) {
      // Descending triangle
      patterns.push({
        name: 'Descending Triangle',
        icon: '📉',
        confidence: 70,
        bias: 'Bearish - breakdown likely',
        description: 'Lower highs with flat support creates a descending triangle. This pattern has bearish implications, suggesting sellers are becoming more aggressive. Watch for a breakdown below support.',
        target: minLow * 0.97
      });
    } else if (highSlope >= 0 && lowSlope > 0) {
      // Ascending triangle
      patterns.push({
        name: 'Ascending Triangle',
        icon: '📈',
        confidence: 72,
        bias: 'Bullish - breakout likely',
        description: 'Higher lows with flat resistance creates an ascending triangle. This is a bullish continuation pattern, suggesting buyers are becoming more aggressive. Watch for a breakout above resistance.',
        target: maxHigh * 1.03
      });
    } else if (highSlope > 0 && lowSlope > 0 && highSlope > lowSlope) {
      // Rising wedge
      patterns.push({
        name: 'Rising Wedge',
        icon: '⬆️',
        confidence: 68,
        bias: 'Bearish reversal pattern',
        description: 'A rising wedge with converging lines suggests momentum is weakening despite higher prices. This is typically a bearish reversal pattern. Watch for a breakdown below the lower trendline.',
        target: minLow * 0.95
      });
    } else if (highSlope < 0 && lowSlope < 0 && highSlope < lowSlope) {
      // Falling wedge
      patterns.push({
        name: 'Falling Wedge',
        icon: '⬇️',
        confidence: 70,
        bias: 'Bullish reversal pattern',
        description: 'A falling wedge with converging lines suggests selling pressure is weakening. This is typically a bullish reversal pattern. Watch for a breakout above the upper trendline.',
        target: maxHigh * 1.05
      });
    }

    // Check for channel
    if (isConsolidating && Math.abs(highSlope - lowSlope) < 0.001) {
      patterns.push({
        name: 'Horizontal Channel',
        icon: '➡️',
        confidence: 65,
        bias: 'Range-bound - trade the levels',
        description: 'Price is moving within a horizontal channel between support and resistance. Trade the range by buying at support and selling at resistance, or wait for a breakout.',
        target: currentPrice
      });
    }

    // Check for double top/bottom
    const peaks = findPeaks(highs);
    const valleys = findValleys(lows);

    if (peaks.length >= 2) {
      const lastTwo = peaks.slice(-2);
      if (Math.abs(lastTwo[0].value - lastTwo[1].value) / lastTwo[0].value < 0.01) {
        patterns.push({
          name: 'Double Top',
          icon: '🔝',
          confidence: 72,
          bias: 'Bearish reversal signal',
          description: 'Two peaks at similar levels form a double top pattern. This is a bearish reversal signal, especially if price breaks below the neckline (the low between the two peaks).',
          target: minLow * 0.97
        });
      }
    }

    if (valleys.length >= 2) {
      const lastTwo = valleys.slice(-2);
      if (Math.abs(lastTwo[0].value - lastTwo[1].value) / lastTwo[0].value < 0.01) {
        patterns.push({
          name: 'Double Bottom',
          icon: '🔻',
          confidence: 73,
          bias: 'Bullish reversal signal',
          description: 'Two troughs at similar levels form a double bottom pattern. This is a bullish reversal signal, especially if price breaks above the neckline (the high between the two lows).',
          target: maxHigh * 1.03
        });
      }
    }

    // Default pattern if nothing specific detected
    if (patterns.length === 0) {
      if (trend === 'up') {
        patterns.push({
          name: 'Uptrend Continuation',
          icon: '📈',
          confidence: 60,
          bias: 'Bullish - trend intact',
          description: 'Price is in an uptrend with higher highs and higher lows. The trend remains intact. Look for pullbacks to support or moving averages for entry opportunities.',
          target: maxHigh * 1.02
        });
      } else {
        patterns.push({
          name: 'Downtrend Continuation',
          icon: '📉',
          confidence: 60,
          bias: 'Bearish - trend intact',
          description: 'Price is in a downtrend with lower highs and lower lows. The trend remains intact. Look for rallies to resistance for potential short entries.',
          target: minLow * 0.98
        });
      }
    }

    return patterns;
  }

  function findPeaks(data) {
    const peaks = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i - 2] &&
          data[i] > data[i + 1] && data[i] > data[i + 2]) {
        peaks.push({ index: i, value: data[i] });
      }
    }
    return peaks;
  }

  function findValleys(data) {
    const valleys = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (data[i] < data[i - 1] && data[i] < data[i - 2] &&
          data[i] < data[i + 1] && data[i] < data[i + 2]) {
        valleys.push({ index: i, value: data[i] });
      }
    }
    return valleys;
  }

  // Use shared EMA calculator
  function calculateEMA(data, period) {
    return BTCSAIShared.calculateEMA(data, period);
  }

  function drawChart(data, patterns) {
    const ctx = document.getElementById('pattern-chart').getContext('2d');

    if (priceChart) {
      priceChart.destroy();
    }

    const labels = data.map(d => {
      const date = new Date(d.time);
      return currentTimeframe === '1d'
        ? date.toLocaleDateString()
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Build annotations for support/resistance
    const annotations = {};

    // Add support lines
    patterns.support.forEach((level, i) => {
      annotations['support' + i] = {
        type: 'line',
        yMin: level.price,
        yMax: level.price,
        borderColor: 'rgba(74, 222, 128, 0.7)',
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: 'S: $' + level.price.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          position: 'start',
          backgroundColor: 'rgba(74, 222, 128, 0.8)',
          color: '#000'
        }
      };
    });

    // Add resistance lines
    patterns.resistance.forEach((level, i) => {
      annotations['resistance' + i] = {
        type: 'line',
        yMin: level.price,
        yMax: level.price,
        borderColor: 'rgba(248, 113, 113, 0.7)',
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: 'R: $' + level.price.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          position: 'end',
          backgroundColor: 'rgba(248, 113, 113, 0.8)',
          color: '#000'
        }
      };
    });

    priceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'BTC Price',
            data: prices,
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: 'High',
            data: highs,
            borderColor: 'rgba(74, 222, 128, 0.3)',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 1,
            borderDash: [2, 2]
          },
          {
            label: 'Low',
            data: lows,
            borderColor: 'rgba(248, 113, 113, 0.3)',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 1,
            borderDash: [2, 2]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          annotation: {
            annotations: annotations
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#9ca3af',
              maxTicksLimit: 8
            }
          },
          y: {
            display: true,
            position: 'right',
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#9ca3af',
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  function displayMainPattern(patterns, currentPrice) {
    const pattern = patterns.primary;

    if (!pattern) {
      document.getElementById('pattern-name').textContent = 'Analyzing...';
      return;
    }

    document.getElementById('pattern-icon').textContent = pattern.icon;
    document.getElementById('pattern-name').textContent = pattern.name;
    document.getElementById('pattern-tf').textContent = currentTimeframe.toUpperCase();
    document.getElementById('pattern-confidence').textContent = pattern.confidence + '%';
    document.getElementById('pattern-desc').textContent = pattern.description;

    // Display support/resistance
    const mainSupport = patterns.support[0];
    const mainResistance = patterns.resistance[0];

    document.getElementById('support-level').textContent = mainSupport
      ? '$' + mainSupport.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : '--';

    document.getElementById('resistance-level').textContent = mainResistance
      ? '$' + mainResistance.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : '--';
  }

  function loadFullAnalysis() {
    if (!checkAccess()) return;

    const patterns = detectPatterns(priceData);

    // Display secondary patterns
    const fullPatternsEl = document.getElementById('full-patterns');
    if (patterns.secondary.length > 0) {
      fullPatternsEl.innerHTML = patterns.secondary.map(p => `
        <div class="pattern-card">
          <div class="pattern-header">
            <span class="pattern-icon">${p.icon}</span>
            <div class="pattern-title">
              <h3>${p.name}</h3>
              <span class="pattern-timeframe">${currentTimeframe.toUpperCase()}</span>
            </div>
            <span class="pattern-confidence">${p.confidence}%</span>
          </div>
          <div class="pattern-body">
            <p class="pattern-bias">${p.bias}</p>
            <p class="pattern-desc">${p.description}</p>
          </div>
        </div>
      `).join('');
    } else {
      fullPatternsEl.innerHTML = '<p class="no-patterns">No additional patterns detected on this timeframe.</p>';
    }

    // Display trendlines
    const trendlinesEl = document.getElementById('trendlines-grid');
    if (patterns.trendlines.length > 0) {
      trendlinesEl.innerHTML = patterns.trendlines.map(t => `
        <div class="trendline-card ${t.type}">
          <div class="trendline-header">
            <span class="trendline-icon">${t.type === 'ascending' ? '📈' : '📉'}</span>
            <h4>${t.type === 'ascending' ? 'Ascending' : 'Descending'} Trendline</h4>
          </div>
          <div class="trendline-body">
            <div class="trendline-stat">
              <span class="stat-label">Touch Points</span>
              <span class="stat-value">${t.touches}</span>
            </div>
            <div class="trendline-stat">
              <span class="stat-label">Start</span>
              <span class="stat-value">$${t.start.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div class="trendline-stat">
              <span class="stat-label">Current</span>
              <span class="stat-value">$${t.end.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      trendlinesEl.innerHTML = '<p class="no-patterns">No significant trendlines detected.</p>';
    }

    // Display order blocks
    const obEl = document.getElementById('orderblocks-grid');
    if (patterns.orderBlocks.length > 0) {
      obEl.innerHTML = patterns.orderBlocks.map(ob => `
        <div class="ob-card ${ob.type}">
          <div class="ob-header">
            <span class="ob-icon">${ob.type === 'bullish' ? '🟢' : '🔴'}</span>
            <h4>${ob.type === 'bullish' ? 'Bullish' : 'Bearish'} OB</h4>
          </div>
          <div class="ob-body">
            <div class="ob-zone">
              <span>$${ob.low.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${ob.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <p class="ob-note">${ob.type === 'bullish' ? 'Potential buy zone on retest' : 'Potential sell zone on retest'}</p>
          </div>
        </div>
      `).join('');
    } else {
      obEl.innerHTML = '<p class="no-patterns">No recent order blocks detected.</p>';
    }

    // Display FVGs
    const fvgEl = document.getElementById('fvg-grid');
    if (patterns.fvgs.length > 0) {
      fvgEl.innerHTML = patterns.fvgs.map(fvg => `
        <div class="fvg-card ${fvg.type}">
          <div class="fvg-header">
            <span class="fvg-icon">${fvg.type === 'bullish' ? '⬆️' : '⬇️'}</span>
            <h4>${fvg.type === 'bullish' ? 'Bullish' : 'Bearish'} FVG</h4>
          </div>
          <div class="fvg-body">
            <div class="fvg-zone">
              <span>$${fvg.bottom.toLocaleString(undefined, { maximumFractionDigits: 0 })} - $${fvg.top.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <p class="fvg-note">${fvg.type === 'bullish' ? 'Gap may act as support' : 'Gap may act as resistance'}</p>
          </div>
        </div>
      `).join('');
    } else {
      fvgEl.innerHTML = '<p class="no-patterns">No unfilled fair value gaps detected.</p>';
    }

    // Generate AI summary
    generateAISummary(patterns);
  }

  function generateAISummary(patterns) {
    const summaryEl = document.getElementById('ai-summary');
    const currentPrice = priceData[priceData.length - 1].close;

    let summary = [];

    // Primary pattern analysis
    if (patterns.primary) {
      summary.push(`<strong>Primary Pattern:</strong> ${patterns.primary.name} detected with ${patterns.primary.confidence}% confidence. ${patterns.primary.bias}.`);
    }

    // Support/Resistance analysis
    if (patterns.support.length > 0 && patterns.resistance.length > 0) {
      const nearestSupport = patterns.support[0].price;
      const nearestResistance = patterns.resistance[0].price;
      const supportDist = ((currentPrice - nearestSupport) / currentPrice * 100).toFixed(1);
      const resistDist = ((nearestResistance - currentPrice) / currentPrice * 100).toFixed(1);

      summary.push(`<strong>Key Levels:</strong> Price is ${supportDist}% above key support ($${nearestSupport.toLocaleString(undefined, { maximumFractionDigits: 0 })}) and ${resistDist}% below resistance ($${nearestResistance.toLocaleString(undefined, { maximumFractionDigits: 0 })}).`);
    }

    // Order block analysis
    if (patterns.orderBlocks.length > 0) {
      const bullishOBs = patterns.orderBlocks.filter(ob => ob.type === 'bullish').length;
      const bearishOBs = patterns.orderBlocks.filter(ob => ob.type === 'bearish').length;
      summary.push(`<strong>Order Blocks:</strong> ${bullishOBs} bullish and ${bearishOBs} bearish order blocks identified. These represent institutional buying/selling zones.`);
    }

    // FVG analysis
    if (patterns.fvgs.length > 0) {
      const bullishFVGs = patterns.fvgs.filter(f => f.type === 'bullish').length;
      const bearishFVGs = patterns.fvgs.filter(f => f.type === 'bearish').length;
      summary.push(`<strong>Fair Value Gaps:</strong> ${bullishFVGs} bullish and ${bearishFVGs} bearish unfilled gaps. Price tends to revisit these imbalances.`);
    }

    // Trading recommendation
    let recommendation = '';
    if (patterns.primary) {
      if (patterns.primary.bias.toLowerCase().includes('bullish')) {
        recommendation = 'Current analysis suggests bullish bias. Consider longs on pullbacks to support levels or order blocks.';
      } else if (patterns.primary.bias.toLowerCase().includes('bearish')) {
        recommendation = 'Current analysis suggests bearish bias. Consider shorts on rallies to resistance levels or order blocks.';
      } else {
        recommendation = 'Market is neutral/range-bound. Wait for a clear breakout or trade the range boundaries.';
      }
    }

    summary.push(`<strong>Trading Outlook:</strong> ${recommendation}`);

    summaryEl.innerHTML = summary.map(s => `<p>${s}</p>`).join('');
  }
})();
