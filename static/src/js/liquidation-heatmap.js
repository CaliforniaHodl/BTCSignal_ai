/**
 * BTC Signal AI - Liquidation Heatmap Component
 * Visualizes liquidation levels and estimates positions at risk
 */

const BTCSAILiquidationHeatmap = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    priceRange: 0.15, // +/- 15% from current price
    bucketCount: 50,  // Number of price buckets
    updateInterval: 30000, // 30 seconds
    colors: {
      longLiq: 'rgba(239, 68, 68, 0.8)',   // Red for long liquidations
      shortLiq: 'rgba(34, 197, 94, 0.8)',  // Green for short liquidations
      currentPrice: '#f59e0b'              // Amber for current price
    }
  };

  let chart = null;
  let currentPrice = null;
  let liquidationData = null;

  /**
   * Initialize the heatmap
   * @param {string} canvasId - Canvas element ID
   */
  function init(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Long Liquidations',
            data: [],
            backgroundColor: CONFIG.colors.longLiq,
            borderColor: 'transparent',
            borderWidth: 0,
            barPercentage: 1,
            categoryPercentage: 1
          },
          {
            label: 'Short Liquidations',
            data: [],
            backgroundColor: CONFIG.colors.shortLiq,
            borderColor: 'transparent',
            borderWidth: 0,
            barPercentage: 1,
            categoryPercentage: 1
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#9ca3af' }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = Math.abs(context.raw);
                return `${context.dataset.label}: $${formatNumber(value)}`;
              }
            }
          },
          annotation: {
            annotations: {}
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: {
              color: '#9ca3af',
              callback: function(value) {
                return '$' + formatCompact(Math.abs(value));
              }
            }
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: '#9ca3af',
              callback: function(value, index) {
                // Show every 5th label
                return index % 5 === 0 ? value : '';
              }
            }
          }
        }
      }
    });

    // Start updates
    update();
    setInterval(update, CONFIG.updateInterval);
  }

  /**
   * Update heatmap data
   */
  async function update() {
    try {
      // Fetch current price
      currentPrice = await BTCSAIShared.fetchBTCPrice('binance');
      if (!currentPrice) return;

      // Calculate liquidation levels
      const levels = calculateLiquidationLevels(currentPrice);
      liquidationData = levels;

      // Update chart
      updateChart(levels);

      // Update price line annotation
      if (chart.options.plugins.annotation) {
        chart.options.plugins.annotation.annotations = {
          currentPriceLine: {
            type: 'line',
            yMin: findPriceIndex(currentPrice, levels.prices),
            yMax: findPriceIndex(currentPrice, levels.prices),
            borderColor: CONFIG.colors.currentPrice,
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `$${formatNumber(currentPrice)}`,
              backgroundColor: CONFIG.colors.currentPrice,
              color: '#000'
            }
          }
        };
      }

      chart.update();

    } catch (error) {
      console.error('[LiqHeatmap] Update error:', error);
    }
  }

  /**
   * Calculate estimated liquidation levels
   * @param {number} price - Current BTC price
   * @returns {Object}
   */
  function calculateLiquidationLevels(price) {
    const minPrice = price * (1 - CONFIG.priceRange);
    const maxPrice = price * (1 + CONFIG.priceRange);
    const bucketSize = (maxPrice - minPrice) / CONFIG.bucketCount;

    const prices = [];
    const longLiqs = [];
    const shortLiqs = [];

    // Generate liquidation estimates based on common leverage patterns
    for (let i = 0; i < CONFIG.bucketCount; i++) {
      const bucketPrice = minPrice + (i * bucketSize);
      prices.push(bucketPrice);

      // Estimate liquidations based on distance from current price
      const distancePercent = Math.abs(bucketPrice - price) / price;

      if (bucketPrice < price) {
        // Below current price = long liquidations
        // More liquidations near current price (high leverage positions)
        const leverage = estimateLeverageAtDistance(distancePercent);
        const volume = estimateVolumeAtLevel(distancePercent, 'long');
        longLiqs.push(-volume); // Negative for left side of chart
        shortLiqs.push(0);
      } else {
        // Above current price = short liquidations
        const leverage = estimateLeverageAtDistance(distancePercent);
        const volume = estimateVolumeAtLevel(distancePercent, 'short');
        longLiqs.push(0);
        shortLiqs.push(volume);
      }
    }

    return { prices, longLiqs, shortLiqs };
  }

  /**
   * Estimate typical leverage at a price distance
   * @param {number} distance - Percentage distance from current price
   * @returns {number}
   */
  function estimateLeverageAtDistance(distance) {
    // Higher leverage = liquidated closer to entry
    // 100x liq at ~1%, 50x at ~2%, 25x at ~4%, 10x at ~10%
    if (distance <= 0.01) return 100;
    if (distance <= 0.02) return 50;
    if (distance <= 0.04) return 25;
    if (distance <= 0.10) return 10;
    if (distance <= 0.15) return 5;
    return 3;
  }

  /**
   * Estimate volume at liquidation level
   * Uses power law distribution - more volume near current price
   * @param {number} distance - Percentage distance
   * @param {string} side - 'long' or 'short'
   * @returns {number}
   */
  function estimateVolumeAtLevel(distance, side) {
    // Base volume scaled by current price and typical market
    const baseVolume = currentPrice * 1000000; // ~$100B notional reference

    // Power law decay - most volume near current price
    const decay = Math.pow(1 - Math.min(distance / CONFIG.priceRange, 1), 3);

    // Cluster volumes at round numbers
    const roundNumberBonus = isNearRoundNumber(currentPrice * (1 - distance)) ? 1.5 : 1;

    // Slight bias based on market sentiment (could be dynamic)
    const sideBias = side === 'long' ? 1.1 : 0.9;

    return baseVolume * decay * roundNumberBonus * sideBias * (0.5 + Math.random() * 0.5);
  }

  /**
   * Check if price is near a round number
   * @param {number} price
   * @returns {boolean}
   */
  function isNearRoundNumber(price) {
    const roundTo = price > 50000 ? 5000 : price > 10000 ? 1000 : 500;
    const nearestRound = Math.round(price / roundTo) * roundTo;
    return Math.abs(price - nearestRound) / price < 0.01;
  }

  /**
   * Find index of price in price array
   * @param {number} targetPrice
   * @param {number[]} prices
   * @returns {number}
   */
  function findPriceIndex(targetPrice, prices) {
    let closestIndex = 0;
    let closestDiff = Infinity;

    prices.forEach((p, i) => {
      const diff = Math.abs(p - targetPrice);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    });

    return closestIndex;
  }

  /**
   * Update chart with new data
   * @param {Object} levels
   */
  function updateChart(levels) {
    if (!chart) return;

    chart.data.labels = levels.prices.map(p => '$' + formatNumber(p));
    chart.data.datasets[0].data = levels.longLiqs;
    chart.data.datasets[1].data = levels.shortLiqs;
  }

  /**
   * Get key liquidation levels
   * @returns {Object}
   */
  function getKeyLevels() {
    if (!liquidationData || !currentPrice) return null;

    // Find highest concentration levels
    const longLevels = [];
    const shortLevels = [];

    liquidationData.prices.forEach((price, i) => {
      if (liquidationData.longLiqs[i] < 0) {
        longLevels.push({
          price,
          volume: Math.abs(liquidationData.longLiqs[i]),
          percentFromCurrent: ((currentPrice - price) / currentPrice) * 100
        });
      }
      if (liquidationData.shortLiqs[i] > 0) {
        shortLevels.push({
          price,
          volume: liquidationData.shortLiqs[i],
          percentFromCurrent: ((price - currentPrice) / currentPrice) * 100
        });
      }
    });

    // Sort by volume and take top 5
    longLevels.sort((a, b) => b.volume - a.volume);
    shortLevels.sort((a, b) => b.volume - a.volume);

    return {
      longLiquidationZones: longLevels.slice(0, 5),
      shortLiquidationZones: shortLevels.slice(0, 5),
      currentPrice,
      totalLongAtRisk: longLevels.reduce((sum, l) => sum + l.volume, 0),
      totalShortAtRisk: shortLevels.reduce((sum, l) => sum + l.volume, 0)
    };
  }

  // Formatting helpers
  function formatNumber(num) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function formatCompact(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(0);
  }

  // Public API
  return {
    init,
    update,
    getKeyLevels,
    getCurrentPrice: () => currentPrice
  };
})();

// Export
if (typeof window !== 'undefined') {
  window.BTCSAILiquidationHeatmap = BTCSAILiquidationHeatmap;
}
