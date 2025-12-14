/**
 * BTC Signal AI - On-Chain Metrics Module
 * Fetches and calculates on-chain analytics from free APIs
 *
 * Data Sources:
 * - PERSONAL NODE: Bitcoin Knots on Raspberry Pi 5 (REAL data!)
 * - Blockchain.info (hash rate, difficulty, miner revenue, tx count)
 * - Mempool.space (mempool, fees, lightning network)
 * - Alternative.me (Fear & Greed Index)
 * - CoinGecko (market cap, volume, supply)
 */

const BTCSAIOnChain = (function() {
  'use strict';

  // Cache configuration
  const CACHE_TTL = {
    short: 60000,      // 1 minute
    medium: 300000,    // 5 minutes
    long: 3600000,     // 1 hour
    daily: 86400000    // 24 hours
  };

  // ==================== PERSONAL NODE DATA ====================
  // Real Bitcoin data from personal Raspberry Pi 5 running Bitcoin Knots
  // Updated every 15 minutes via cron job

  /**
   * Fetch data from personal Bitcoin node
   * @returns {Promise<Object>}
   */
  async function fetchPersonalNodeData() {
    const cacheKey = 'personal_node_data';
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Try the Netlify function first
      let response = await fetch('/.netlify/functions/api-node-data');

      if (!response.ok) {
        // Fallback: fetch directly from JSONBin
        response = await fetch('https://api.jsonbin.io/v3/b/693e4065d0ea881f4027feac/latest');
      }

      const json = await response.json();
      const data = json.data || json.record;

      // Calculate data age
      const timestamp = data.timestamp || data.blockHeight;
      const dataAge = Math.round((Date.now() / 1000 - timestamp) / 60);

      const result = {
        source: 'personal-node',
        isReal: true,
        dataAgeMinutes: dataAge,
        blockHeight: data.blockHeight || data.block_height,
        hashrate: data.hashrate,
        hashrateFormatted: formatHashrateLocal(data.hashrate),
        difficulty: data.difficulty,
        mempool: {
          transactions: data.mempool?.transactions || data.mempool_size,
          sizeBytes: data.mempool?.sizeBytes || data.mempool_bytes,
          totalFeesBTC: data.mempool?.totalFeesBTC || data.mempool_fees_btc,
          congestion: getMempoolCongestionLevel(data.mempool?.transactions || data.mempool_size)
        },
        timestamp: timestamp,
        lastUpdate: new Date(timestamp * 1000).toLocaleString()
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.short);
      return result;
    } catch (error) {
      console.error('Personal node data fetch error:', error);
      return null;
    }
  }

  /**
   * Format hashrate for display
   */
  function formatHashrateLocal(hashrate) {
    if (!hashrate) return 'N/A';
    if (hashrate >= 1e21) return (hashrate / 1e21).toFixed(2) + ' ZH/s';
    if (hashrate >= 1e18) return (hashrate / 1e18).toFixed(2) + ' EH/s';
    if (hashrate >= 1e15) return (hashrate / 1e15).toFixed(2) + ' PH/s';
    if (hashrate >= 1e12) return (hashrate / 1e12).toFixed(2) + ' TH/s';
    return hashrate.toFixed(0) + ' H/s';
  }

  /**
   * Get mempool congestion level
   */
  function getMempoolCongestionLevel(size) {
    if (!size) return 'unknown';
    if (size < 5000) return 'low';
    if (size < 20000) return 'medium';
    if (size < 50000) return 'high';
    return 'extreme';
  }

  // ==================== BLOCKCHAIN.INFO API ====================

  /**
   * Fetch hash rate data
   * @param {string} timespan - '30days', '60days', '180days', '1year', '2years', 'all'
   * @returns {Promise<Object>}
   */
  async function fetchHashRate(timespan = '180days') {
    const cacheKey = `hashrate_${timespan}`;
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.blockchain.info/charts/hash-rate?timespan=${timespan}&format=json&cors=true`
      );
      const data = await response.json();

      const result = {
        name: 'Hash Rate',
        unit: 'TH/s',
        values: data.values.map(v => ({
          time: v.x * 1000,
          value: v.y
        })),
        current: data.values[data.values.length - 1].y,
        change24h: calculateChange(data.values, 1),
        change7d: calculateChange(data.values, 7),
        change30d: calculateChange(data.values, 30)
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.medium);
      return result;
    } catch (error) {
      console.error('Hash rate fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch mining difficulty
   * @param {string} timespan
   * @returns {Promise<Object>}
   */
  async function fetchDifficulty(timespan = '180days') {
    const cacheKey = `difficulty_${timespan}`;
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.blockchain.info/charts/difficulty?timespan=${timespan}&format=json&cors=true`
      );
      const data = await response.json();

      const result = {
        name: 'Mining Difficulty',
        unit: 'T',
        values: data.values.map(v => ({
          time: v.x * 1000,
          value: v.y
        })),
        current: data.values[data.values.length - 1].y,
        change30d: calculateChange(data.values, 30)
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.long);
      return result;
    } catch (error) {
      console.error('Difficulty fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch miner revenue (USD)
   * @param {string} timespan
   * @returns {Promise<Object>}
   */
  async function fetchMinerRevenue(timespan = '1year') {
    const cacheKey = `miner_revenue_${timespan}`;
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.blockchain.info/charts/miners-revenue?timespan=${timespan}&format=json&cors=true`
      );
      const data = await response.json();

      const values = data.values.map(v => ({
        time: v.x * 1000,
        value: v.y
      }));

      // Calculate Puell Multiple (daily revenue / 365-day MA)
      const puellMultiple = calculatePuellMultiple(values);

      const result = {
        name: 'Miner Revenue',
        unit: 'USD',
        values,
        current: values[values.length - 1].value,
        puellMultiple,
        change30d: calculateChange(data.values, 30)
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.medium);
      return result;
    } catch (error) {
      console.error('Miner revenue fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch transaction count
   * @param {string} timespan
   * @returns {Promise<Object>}
   */
  async function fetchTransactionCount(timespan = '180days') {
    const cacheKey = `tx_count_${timespan}`;
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.blockchain.info/charts/n-transactions?timespan=${timespan}&format=json&cors=true`
      );
      const data = await response.json();

      const result = {
        name: 'Daily Transactions',
        unit: 'txs',
        values: data.values.map(v => ({
          time: v.x * 1000,
          value: v.y
        })),
        current: data.values[data.values.length - 1].y,
        change7d: calculateChange(data.values, 7),
        change30d: calculateChange(data.values, 30)
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.medium);
      return result;
    } catch (error) {
      console.error('Transaction count fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch total BTC in circulation
   * @returns {Promise<Object>}
   */
  async function fetchTotalBTC() {
    const cacheKey = 'total_btc';
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        'https://api.blockchain.info/charts/total-bitcoins?timespan=all&format=json&cors=true'
      );
      const data = await response.json();

      const result = {
        name: 'Total BTC Supply',
        unit: 'BTC',
        current: data.values[data.values.length - 1].y,
        maxSupply: 21000000,
        percentMined: (data.values[data.values.length - 1].y / 21000000) * 100
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.daily);
      return result;
    } catch (error) {
      console.error('Total BTC fetch error:', error);
      return null;
    }
  }

  // ==================== MEMPOOL.SPACE API ====================

  /**
   * Fetch mempool statistics
   * @returns {Promise<Object>}
   */
  async function fetchMempoolStats() {
    const cacheKey = 'mempool_stats';
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://mempool.space/api/mempool');
      const data = await response.json();

      const result = {
        count: data.count,
        vsize: data.vsize,
        totalFee: data.total_fee,
        feeHistogram: data.fee_histogram
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.short);
      return result;
    } catch (error) {
      console.error('Mempool stats fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch recommended fees
   * @returns {Promise<Object>}
   */
  async function fetchRecommendedFees() {
    const cacheKey = 'recommended_fees';
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      const data = await response.json();

      const result = {
        fastest: data.fastestFee,
        halfHour: data.halfHourFee,
        hour: data.hourFee,
        economy: data.economyFee,
        minimum: data.minimumFee
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.short);
      return result;
    } catch (error) {
      console.error('Fees fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch Lightning Network statistics
   * @returns {Promise<Object>}
   */
  async function fetchLightningStats() {
    const cacheKey = 'lightning_stats';
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://mempool.space/api/v1/lightning/statistics/latest');
      const data = await response.json();

      const result = {
        channelCount: data.latest.channel_count,
        nodeCount: data.latest.node_count,
        totalCapacity: data.latest.total_capacity,
        avgChannelSize: data.latest.avg_capacity,
        medianBaseFee: data.latest.med_base_fee_mtokens,
        medianFeeRate: data.latest.med_fee_rate
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.medium);
      return result;
    } catch (error) {
      console.error('Lightning stats fetch error:', error);
      return null;
    }
  }

  // ==================== ALTERNATIVE.ME API ====================

  /**
   * Fetch Fear & Greed Index
   * @param {number} limit - Number of days to fetch
   * @returns {Promise<Object>}
   */
  async function fetchFearGreedIndex(limit = 30) {
    const cacheKey = `fear_greed_${limit}`;
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`https://api.alternative.me/fng/?limit=${limit}`);
      const data = await response.json();

      const values = data.data.map(d => ({
        time: parseInt(d.timestamp) * 1000,
        value: parseInt(d.value),
        classification: d.value_classification
      })).reverse();

      const result = {
        name: 'Fear & Greed Index',
        current: values[values.length - 1].value,
        classification: values[values.length - 1].classification,
        values,
        change7d: values.length >= 7 ?
          values[values.length - 1].value - values[values.length - 7].value : null
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.medium);
      return result;
    } catch (error) {
      console.error('Fear & Greed fetch error:', error);
      return null;
    }
  }

  // ==================== COINGECKO API ====================

  /**
   * Fetch market data from CoinGecko
   * @returns {Promise<Object>}
   */
  async function fetchMarketData() {
    const cacheKey = 'market_data';
    const cached = BTCSAIShared.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false'
      );
      const data = await response.json();

      const result = {
        price: data.market_data.current_price.usd,
        marketCap: data.market_data.market_cap.usd,
        volume24h: data.market_data.total_volume.usd,
        circulatingSupply: data.market_data.circulating_supply,
        ath: data.market_data.ath.usd,
        athDate: data.market_data.ath_date.usd,
        athChangePercent: data.market_data.ath_change_percentage.usd,
        change24h: data.market_data.price_change_percentage_24h,
        change7d: data.market_data.price_change_percentage_7d,
        change30d: data.market_data.price_change_percentage_30d
      };

      BTCSAIShared.setCache(cacheKey, result, CACHE_TTL.short);
      return result;
    } catch (error) {
      console.error('Market data fetch error:', error);
      return null;
    }
  }

  // ==================== CALCULATED METRICS ====================

  /**
   * Calculate NVT Ratio (Network Value to Transactions)
   * @param {Object} marketData - From fetchMarketData
   * @param {Object} txData - From fetchTransactionCount
   * @returns {Object}
   */
  function calculateNVT(marketData, txData) {
    if (!marketData || !txData) return null;

    // Simple NVT = Market Cap / (Tx Count * Avg Tx Value)
    // For simplicity, use Market Cap / Daily Volume
    const nvt = marketData.marketCap / marketData.volume24h;

    // NVT interpretation
    let signal = 'neutral';
    if (nvt > 150) signal = 'overvalued';
    else if (nvt < 50) signal = 'undervalued';

    return {
      value: nvt,
      signal,
      interpretation: nvt > 150 ?
        'Network may be overvalued relative to transaction activity' :
        nvt < 50 ?
          'Network may be undervalued relative to transaction activity' :
          'NVT in normal range'
    };
  }

  /**
   * Calculate Puell Multiple
   * @param {Array} revenueData - Daily miner revenue data
   * @returns {Object}
   */
  function calculatePuellMultiple(revenueData) {
    if (!revenueData || revenueData.length < 365) return null;

    const lastValue = revenueData[revenueData.length - 1].value;

    // Calculate 365-day MA
    let sum = 0;
    for (let i = revenueData.length - 365; i < revenueData.length; i++) {
      sum += revenueData[i].value;
    }
    const ma365 = sum / 365;

    const puell = lastValue / ma365;

    // Puell interpretation
    let signal = 'neutral';
    let zone = 'normal';
    if (puell > 4) {
      signal = 'sell';
      zone = 'extreme_greed';
    } else if (puell > 2) {
      signal = 'caution';
      zone = 'elevated';
    } else if (puell < 0.5) {
      signal = 'buy';
      zone = 'extreme_fear';
    } else if (puell < 0.7) {
      signal = 'accumulate';
      zone = 'opportunity';
    }

    return {
      value: puell,
      signal,
      zone,
      interpretation: puell > 2 ?
        'Miners earning significantly above average - historical sell zone' :
        puell < 0.5 ?
          'Miners earning well below average - historical buy zone' :
          'Miner revenue in normal range'
    };
  }

  /**
   * Calculate Hash Ribbons
   * @param {Array} hashRateData - Hash rate time series
   * @returns {Object}
   */
  function calculateHashRibbons(hashRateData) {
    if (!hashRateData || hashRateData.length < 60) return null;

    const values = hashRateData.map(d => d.value);

    // Calculate 30-day and 60-day SMAs
    const sma30 = BTCSAIIndicators ? BTCSAIIndicators.SMA(values, 30) : [];
    const sma60 = BTCSAIIndicators ? BTCSAIIndicators.SMA(values, 60) : [];

    const current30 = sma30[sma30.length - 1];
    const current60 = sma60[sma60.length - 1];
    const prev30 = sma30[sma30.length - 2];
    const prev60 = sma60[sma60.length - 2];

    // Detect capitulation (30 SMA crosses below 60 SMA)
    const inCapitulation = current30 < current60;
    const wasCapitulation = prev30 < prev60;
    const capitulationEnd = wasCapitulation && !inCapitulation;

    // Buy signal = end of capitulation
    let signal = 'neutral';
    if (capitulationEnd) {
      signal = 'buy';
    } else if (inCapitulation) {
      signal = 'capitulation';
    }

    return {
      sma30: current30,
      sma60: current60,
      inCapitulation,
      capitulationEnd,
      signal,
      interpretation: capitulationEnd ?
        'Miner capitulation ending - historically strong buy signal' :
        inCapitulation ?
          'Miners capitulating - wait for recovery' :
          'Hash rate healthy'
    };
  }

  // ==================== DASHBOARD / SUMMARY ====================

  /**
   * Fetch all on-chain metrics for dashboard
   * @returns {Promise<Object>}
   */
  async function fetchDashboard() {
    const [
      personalNode,
      hashRate,
      difficulty,
      minerRevenue,
      txCount,
      totalBTC,
      mempool,
      fees,
      lightning,
      fearGreed,
      marketData
    ] = await Promise.all([
      fetchPersonalNodeData(),
      fetchHashRate(),
      fetchDifficulty(),
      fetchMinerRevenue(),
      fetchTransactionCount(),
      fetchTotalBTC(),
      fetchMempoolStats(),
      fetchRecommendedFees(),
      fetchLightningStats(),
      fetchFearGreedIndex(),
      fetchMarketData()
    ]);

    // Calculate derived metrics
    const nvt = calculateNVT(marketData, txCount);
    const hashRibbons = hashRate ? calculateHashRibbons(hashRate.values) : null;

    return {
      // NEW: Real data from personal Bitcoin node
      personalNode,
      network: {
        // Use personal node data for hashrate/difficulty if available
        hashRate: personalNode ? {
          ...hashRate,
          current: personalNode.hashrate,
          currentFormatted: personalNode.hashrateFormatted,
          source: 'personal-node'
        } : hashRate,
        difficulty: personalNode ? {
          ...difficulty,
          current: personalNode.difficulty,
          source: 'personal-node'
        } : difficulty,
        blockHeight: personalNode?.blockHeight,
        minerRevenue,
        txCount,
        totalBTC
      },
      mempool: {
        // Use personal node mempool data if available
        stats: personalNode ? {
          count: personalNode.mempool.transactions,
          vsize: personalNode.mempool.sizeBytes,
          totalFee: personalNode.mempool.totalFeesBTC * 100000000, // Convert to sats
          congestion: personalNode.mempool.congestion,
          source: 'personal-node'
        } : mempool,
        fees
      },
      lightning,
      sentiment: {
        fearGreed
      },
      market: marketData,
      metrics: {
        nvt,
        puellMultiple: minerRevenue?.puellMultiple,
        hashRibbons
      },
      timestamp: Date.now(),
      dataSource: personalNode ? 'personal-node' : 'public-apis'
    };
  }

  // ==================== HELPER FUNCTIONS ====================

  function calculateChange(values, days) {
    if (!values || values.length < days) return null;
    const current = values[values.length - 1].y;
    const previous = values[values.length - 1 - days].y;
    return ((current - previous) / previous) * 100;
  }

  // ==================== PUBLIC API ====================

  return {
    // Personal Bitcoin Node (REAL DATA!)
    fetchPersonalNodeData,

    // Blockchain.info
    fetchHashRate,
    fetchDifficulty,
    fetchMinerRevenue,
    fetchTransactionCount,
    fetchTotalBTC,

    // Mempool.space
    fetchMempoolStats,
    fetchRecommendedFees,
    fetchLightningStats,

    // Alternative.me
    fetchFearGreedIndex,

    // CoinGecko
    fetchMarketData,

    // Calculated metrics
    calculateNVT,
    calculatePuellMultiple,
    calculateHashRibbons,

    // Dashboard
    fetchDashboard
  };
})();

// Export for global use
if (typeof window !== 'undefined') {
  window.BTCSAIOnChain = BTCSAIOnChain;
}
