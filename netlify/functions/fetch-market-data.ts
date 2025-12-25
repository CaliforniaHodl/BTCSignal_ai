import type { Config, Context } from '@netlify/functions';
import { saveToBlob } from './lib/shared';
import { fetchNodeData, formatHashrate, getMempoolCongestion } from './lib/node-data';

// Track which data sources succeeded/failed
interface DataSources {
  btcPrice: string;
  fearGreed: string;
  funding: string[];
  openInterest: string[];
  hashrate: string;
  global: string;
}

// Market data snapshot that gets saved to GitHub
interface MarketSnapshot {
  timestamp: string;
  dataSources?: DataSources;
  btc: {
    price: number;
    price24hAgo: number;
    priceChange24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number;
  };
  fearGreed: {
    value: number;
    label: string;
  };
  funding: {
    rate: number;
    ratePercent: number;
    binance?: number;
    bybit?: number;
    exchanges: {
      bybit: { rate: number; ratePercent: number; nextFundingTime: number };
      okx: { rate: number; ratePercent: number; nextFundingTime: number };
      binance: { rate: number; ratePercent: number; nextFundingTime: number };
      dydx: { rate: number; ratePercent: number; nextFundingTime: number };
      bitget: { rate: number; ratePercent: number; nextFundingTime: number };
    };
    history: Array<{ timestamp: number; rate: number }>;
  };
  openInterest: {
    btc: number;
    usd: number;
    change24h: number;
    change24hPercent: number;
    oiMarketCapRatio: number;
    binance?: { btc: number; usd: number };
    bybit?: { btc: number; usd: number };
    history: Array<{ timestamp: number; btc: number; usd: number; price: number }>;
  };
  longShortRatio: {
    ratio: number;
    longPercent: number;
    shortPercent: number;
    source: string;
  };
  dominance: {
    btc: number;
  };
  hashrate: {
    current: number;
    unit: string;
    history: number[][]; // [timestamp, hashrate in EH/s]
  };
  // Data from personal Bitcoin node
  network: {
    blockHeight: number;
    difficulty: number;
    mempool: {
      size: number;        // Number of transactions
      bytes: number;       // Size in bytes
      feesBTC: number;     // Total fees in BTC
      congestion: 'low' | 'medium' | 'high' | 'extreme';
    };
  };
  ohlc: {
    days7: number[][];  // [timestamp, open, high, low, close]
    days30: number[][];
  };
  global: {
    totalMarketCap: number;
    total24hVolume: number;
  };
  liquidation: {
    levels: LiquidationLevel[];
    stats24h: {
      total: number;
      long: number;
      short: number;
      ratio: number;
    };
  };
}

interface LiquidationLevel {
  price: number;
  type: 'long' | 'short';
  leverage: number;
  intensity: number;
  estimatedValue: number;
  exchange: string;
}

// Calculate liquidation levels from price, OI, and funding rate
function calculateLiquidationLevels(price: number, openInterest: number, fundingRate: number): LiquidationLevel[] {
  const leverageLevels = [10, 25, 50, 100];
  const liquidations: LiquidationLevel[] = [];

  leverageLevels.forEach(leverage => {
    // Liquidation price calculation:
    // Longs: entry * (1 - 0.9/leverage)
    // Shorts: entry * (1 + 0.9/leverage)
    const longLiqMultiplier = 1 - (0.9 / leverage);
    const shortLiqMultiplier = 1 + (0.9 / leverage);

    const longLiqPrice = price * longLiqMultiplier;
    const shortLiqPrice = price * shortLiqMultiplier;

    // Estimate OI distribution by leverage
    // Lower leverage = more OI typically
    const leverageShare = leverage <= 10 ? 0.4 : leverage <= 25 ? 0.3 : leverage <= 50 ? 0.2 : 0.1;
    const estimatedValue = openInterest * leverageShare * price;

    // Intensity based on leverage and funding rate bias
    // Positive funding = more longs, negative = more shorts
    const fundingBias = fundingRate > 0 ? 1.2 : 0.8;

    liquidations.push({
      price: longLiqPrice,
      type: 'long',
      leverage,
      intensity: Math.min(1, (leverageShare * 2) * (fundingRate > 0 ? fundingBias : 1)),
      estimatedValue: estimatedValue * (fundingRate > 0 ? fundingBias : 1),
      exchange: 'aggregate',
    });

    liquidations.push({
      price: shortLiqPrice,
      type: 'short',
      leverage,
      intensity: Math.min(1, (leverageShare * 2) * (fundingRate < 0 ? fundingBias : 1)),
      estimatedValue: estimatedValue * (fundingRate < 0 ? fundingBias : 1),
      exchange: 'aggregate',
    });
  });

  // Add some variation clusters around key levels
  const range = price * 0.15;
  for (let i = 0; i < 10; i++) {
    const randomOffset = (Math.random() - 0.5) * range;
    const level = price + randomOffset;
    const type: 'long' | 'short' = level > price ? 'short' : 'long';
    liquidations.push({
      price: level,
      type,
      leverage: leverageLevels[Math.floor(Math.random() * leverageLevels.length)],
      intensity: Math.random() * 0.5 + 0.2,
      estimatedValue: Math.floor(Math.random() * 50 + 5) * 1000000,
      exchange: 'aggregate',
    });
  }

  return liquidations.sort((a, b) => b.price - a.price);
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Save snapshot to Netlify Blob storage (no GitHub commits = no build triggers!)
async function saveToBlobStorage(snapshot: MarketSnapshot): Promise<boolean> {
  return saveToBlob('market-snapshot', snapshot);
}

export default async (req: Request, context: Context) => {
  console.log('Fetching market data snapshot...');

  // Track data sources for debugging and UI display
  const dataSources: DataSources = {
    btcPrice: 'none',
    fearGreed: 'none',
    funding: [],
    openInterest: [],
    hashrate: 'none',
    global: 'none',
  };

  const snapshot: MarketSnapshot = {
    timestamp: new Date().toISOString(),
    dataSources: dataSources,
    btc: { price: 0, price24hAgo: 0, priceChange24h: 0, high24h: 0, low24h: 0, volume24h: 0, marketCap: 0 },
    fearGreed: { value: 50, label: 'Neutral' },
    funding: {
      rate: 0,
      ratePercent: 0,
      exchanges: {
        bybit: { rate: 0, ratePercent: 0, nextFundingTime: 0 },
        okx: { rate: 0, ratePercent: 0, nextFundingTime: 0 },
        binance: { rate: 0, ratePercent: 0, nextFundingTime: 0 },
        dydx: { rate: 0, ratePercent: 0, nextFundingTime: 0 },
        bitget: { rate: 0, ratePercent: 0, nextFundingTime: 0 },
      },
      history: [],
    },
    openInterest: { btc: 0, usd: 0, change24h: 0, change24hPercent: 0, oiMarketCapRatio: 0, history: [] },
    longShortRatio: { ratio: 1, longPercent: 50, shortPercent: 50, source: 'okx' },
    dominance: { btc: 0 },
    hashrate: { current: 0, unit: 'EH/s', history: [] },
    network: {
      blockHeight: 0,
      difficulty: 0,
      mempool: { size: 0, bytes: 0, feesBTC: 0, congestion: 'low' as const },
    },
    ohlc: { days7: [], days30: [] },
    global: { totalMarketCap: 0, total24hVolume: 0 },
    liquidation: { levels: [], stats24h: { total: 0, long: 0, short: 0, ratio: 1 } },
  };

  try {
    // Fetch all data in parallel
    // Fetch hashrate from personal node (separate from parallel API calls)
    const nodeDataResponse = await fetchNodeData();

    const [
      btcDataRes,
      fearGreedRes,
      fundingRes,
      oiRes,
      longShortRes,
      globalRes,
      // hashrateRes removed - now using personal node
      ohlc7Res,
      ohlc30Res,
      // Bybit API for additional derivatives data
      bybitOiRes,
      bybitFundingRes,
      // Additional exchange funding rates for Phase 6
      bybitLongShortRes,
      bitgetFundingRes,
      dydxFundingRes,
      binanceFundingRes,
      // Get existing snapshot for funding history
      existingSnapshotRes,
    ] = await Promise.allSettled([
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false'),
      fetchWithTimeout('https://api.alternative.me/fng/?limit=1'),
      fetchWithTimeout('https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP'),
      fetchWithTimeout('https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP'),
      fetchWithTimeout('https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?instId=BTC&period=5m'),
      fetchWithTimeout('https://api.coingecko.com/api/v3/global'),
      // Hashrate now comes from personal node - removed mempool.space call
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=7'),
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30'),
      // Bybit derivatives data
      fetchWithTimeout('https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=1'),
      fetchWithTimeout('https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1'),
      // Phase 6: Multi-exchange data
      fetchWithTimeout('https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=1'),
      fetchWithTimeout('https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=BTCUSDT&productType=USDT-FUTURES'),
      fetchWithTimeout('https://indexer.dydx.trade/v4/perpetualMarkets?ticker=BTC-USD'),
      fetchWithTimeout('https://fapi.binance.us/fapi/v1/premiumIndex?symbol=BTCUSDT'),
      // Fetch existing snapshot to preserve funding history
      fetchWithTimeout(`https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'jasonsutter87/BTCSignal_ai'}/master/static/data/market-snapshot.json`),
    ]);

    // Process BTC data from CoinGecko
    if (btcDataRes.status === 'fulfilled' && btcDataRes.value.ok) {
      const data = await btcDataRes.value.json();
      const md = data?.market_data;
      if (md?.current_price?.usd) {
        snapshot.btc = {
          price: md.current_price.usd,
          price24hAgo: md.current_price.usd / (1 + (md.price_change_percentage_24h || 0) / 100),
          priceChange24h: md.price_change_percentage_24h || 0,
          high24h: md.high_24h?.usd || 0,
          low24h: md.low_24h?.usd || 0,
          volume24h: md.total_volume?.usd || 0,
          marketCap: md.market_cap?.usd || 0,
        };
        dataSources.btcPrice = 'coingecko';
      } else {
        console.log('CoinGecko response missing market_data:', JSON.stringify(data).slice(0, 200));
      }
    } else if (btcDataRes.status === 'fulfilled') {
      console.log('CoinGecko API error, status:', btcDataRes.value.status);
    }

    // Fallback 1: Kraken API (more reliable than CoinCap)
    if (snapshot.btc.price === 0) {
      console.log('Trying Kraken fallback first...');
      try {
        const krakenRes = await fetchWithTimeout('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
        if (krakenRes.ok) {
          const data = await krakenRes.json();
          if (data.result && data.result.XXBTZUSD) {
            const ticker = data.result.XXBTZUSD;
            const price = parseFloat(ticker.c[0]);
            const open24h = parseFloat(ticker.o);
            const change24h = ((price - open24h) / open24h) * 100;
            snapshot.btc = {
              price: price,
              price24hAgo: open24h,
              priceChange24h: change24h,
              high24h: parseFloat(ticker.h[1]) || 0,
              low24h: parseFloat(ticker.l[1]) || 0,
              volume24h: parseFloat(ticker.v[1]) * price || 0,
              marketCap: 0,
            };
            dataSources.btcPrice = 'kraken';
            console.log('Kraken fallback succeeded, price:', price);
          }
        }
      } catch (e: any) {
        console.log('Kraken fallback failed:', e.message);
      }
    }

    // Fallback 2: Binance US API
    if (snapshot.btc.price === 0) {
      console.log('Trying Binance US fallback...');
      try {
        const binanceRes = await fetchWithTimeout('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT');
        if (binanceRes.ok) {
          const data = await binanceRes.json();
          const price = parseFloat(data.lastPrice);
          snapshot.btc = {
            price: price,
            price24hAgo: parseFloat(data.openPrice) || price,
            priceChange24h: parseFloat(data.priceChangePercent) || 0,
            high24h: parseFloat(data.highPrice) || 0,
            low24h: parseFloat(data.lowPrice) || 0,
            volume24h: parseFloat(data.quoteVolume) || 0,
            marketCap: 0,
          };
          dataSources.btcPrice = 'binance';
          console.log('Binance US fallback succeeded');
        }
      } catch (e) {
        console.log('Binance US fallback failed');
      }
    }
    console.log('BTC data:', snapshot.btc.price > 0 ? `OK (${dataSources.btcPrice})` : 'FAILED');

    // Process Fear & Greed
    if (fearGreedRes.status === 'fulfilled' && fearGreedRes.value.ok) {
      const data = await fearGreedRes.value.json();
      if (data && data.data && data.data[0]) {
        snapshot.fearGreed = {
          value: parseInt(data.data[0].value),
          label: data.data[0].value_classification,
        };
        dataSources.fearGreed = 'alternative.me';
      }
    }

    // Fallback: Calculate Fear & Greed from price action if API failed
    if (snapshot.fearGreed.value === 50 && snapshot.fearGreed.label === 'Neutral' && dataSources.fearGreed === 'none') {
      console.log('Fear & Greed API failed, calculating from price action...');
      const priceChange = snapshot.btc.priceChange24h || 0;
      // Map price change to Fear & Greed scale (roughly)
      // -10% change = 10 (extreme fear), +10% = 90 (extreme greed)
      const calculatedFng = Math.max(0, Math.min(100, 50 + (priceChange * 4)));
      let label = 'Neutral';
      if (calculatedFng <= 25) label = 'Extreme Fear';
      else if (calculatedFng <= 45) label = 'Fear';
      else if (calculatedFng <= 55) label = 'Neutral';
      else if (calculatedFng <= 75) label = 'Greed';
      else label = 'Extreme Greed';

      snapshot.fearGreed = {
        value: Math.round(calculatedFng),
        label: label,
      };
      dataSources.fearGreed = 'calculated';
      console.log('Calculated Fear & Greed:', snapshot.fearGreed.value, snapshot.fearGreed.label);
    }
    console.log('Fear & Greed:', snapshot.fearGreed.value, `(${dataSources.fearGreed})`);

    // Process Funding Rate from OKX
    if (fundingRes.status === 'fulfilled' && fundingRes.value.ok) {
      const data = await fundingRes.value.json();
      if (data && data.data && data.data[0]) {
        const rate = parseFloat(data.data[0].fundingRate);
        snapshot.funding = {
          rate: rate,
          ratePercent: rate * 100,
        };
        dataSources.funding.push('okx');
      }
    }
    console.log('Funding rate:', snapshot.funding.ratePercent.toFixed(4) + '%');

    // Process Open Interest from OKX
    if (oiRes.status === 'fulfilled' && oiRes.value.ok) {
      const data = await oiRes.value.json();
      if (data && data.data && data.data[0]) {
        const oiBtc = parseFloat(data.data[0].oiCcy || data.data[0].oi);
        snapshot.openInterest = {
          btc: oiBtc,
          usd: oiBtc * snapshot.btc.price,
        };
        dataSources.openInterest.push('okx');
      }
    }
    console.log('Open Interest:', snapshot.openInterest.btc.toFixed(0) + ' BTC');

    // Process Long/Short Ratio from OKX
    if (longShortRes.status === 'fulfilled' && longShortRes.value.ok) {
      const data = await longShortRes.value.json();
      if (data && data.data && data.data[0]) {
        const ratio = parseFloat(data.data[0][1]);
        const longPct = (ratio / (1 + ratio)) * 100;
        snapshot.longShortRatio = {
          ratio: ratio,
          longPercent: longPct,
          shortPercent: 100 - longPct,
        };
      }
    }
    console.log('Long/Short Ratio:', snapshot.longShortRatio.ratio.toFixed(2));

    // Process Global data (dominance, total market cap)
    if (globalRes.status === 'fulfilled' && globalRes.value.ok) {
      const data = await globalRes.value.json();
      const gd = data?.data;
      if (gd?.market_cap_percentage?.btc) {
        snapshot.dominance = {
          btc: gd.market_cap_percentage.btc,
        };
        snapshot.global = {
          totalMarketCap: gd.total_market_cap?.usd || 0,
          total24hVolume: gd.total_24h_volume?.usd || 0,
        };
        dataSources.global = 'coingecko';
      }
    }
    console.log('BTC Dominance:', snapshot.dominance.btc > 0 ? snapshot.dominance.btc.toFixed(1) + '%' : 'FAILED');

    // Process data from personal Bitcoin node
    if (nodeDataResponse.success && nodeDataResponse.data) {
      const nodeData = nodeDataResponse.data;

      // Hashrate
      snapshot.hashrate.current = nodeData.hashrate / 1e18; // Convert to EH/s
      snapshot.hashrate.unit = 'EH/s';
      dataSources.hashrate = 'personal-node';

      // Network stats
      snapshot.network = {
        blockHeight: nodeData.block_height,
        difficulty: nodeData.difficulty,
        mempool: {
          size: nodeData.mempool_size,
          bytes: nodeData.mempool_bytes,
          feesBTC: nodeData.mempool_fees_btc,
          congestion: getMempoolCongestion(nodeData.mempool_size),
        },
      };

      console.log('Node data: Block', nodeData.block_height, '| Hashrate:', snapshot.hashrate.current.toFixed(1), 'EH/s');
      console.log('Mempool:', nodeData.mempool_size, 'txs |', (nodeData.mempool_bytes / 1e6).toFixed(2), 'MB |', snapshot.network.mempool.congestion);
    } else {
      console.log('Node data: Failed to fetch from personal node');
    }

    // Process OHLC data
    if (ohlc7Res.status === 'fulfilled' && ohlc7Res.value.ok) {
      snapshot.ohlc.days7 = await ohlc7Res.value.json();
    }
    console.log('OHLC 7d:', snapshot.ohlc.days7.length + ' candles');

    if (ohlc30Res.status === 'fulfilled' && ohlc30Res.value.ok) {
      snapshot.ohlc.days30 = await ohlc30Res.value.json();
    }
    console.log('OHLC 30d:', snapshot.ohlc.days30.length + ' candles');

    // Process Bybit Open Interest (additional source)
    let bybitOI = 0;
    if (bybitOiRes.status === 'fulfilled' && bybitOiRes.value.ok) {
      const data = await bybitOiRes.value.json();
      if (data.retCode === 0 && data.result?.list?.[0]) {
        bybitOI = parseFloat(data.result.list[0].openInterest);
        // Add Bybit OI to existing OI if we want per-exchange breakdown
        snapshot.openInterest.bybit = {
          btc: bybitOI,
          usd: bybitOI * snapshot.btc.price,
        };
        dataSources.openInterest.push('bybit');
      }
    }
    console.log('Bybit OI:', bybitOI.toFixed(0) + ' BTC');

    // Process Bybit Funding Rate
    let bybitFunding = 0;
    if (bybitFundingRes.status === 'fulfilled' && bybitFundingRes.value.ok) {
      const data = await bybitFundingRes.value.json();
      if (data.retCode === 0 && data.result?.list?.[0]) {
        bybitFunding = parseFloat(data.result.list[0].fundingRate);
        snapshot.funding.bybit = bybitFunding;
        snapshot.funding.exchanges.bybit = {
          rate: bybitFunding,
          ratePercent: bybitFunding * 100,
          nextFundingTime: parseInt(data.result.list[0].fundingRateTimestamp) || 0,
        };
        dataSources.funding.push('bybit');
      }
    }
    console.log('Bybit Funding:', (bybitFunding * 100).toFixed(4) + '%');

    // Phase 6: Process Bybit Long/Short Ratio (more accurate than OKX)
    if (bybitLongShortRes.status === 'fulfilled' && bybitLongShortRes.value.ok) {
      const data = await bybitLongShortRes.value.json();
      if (data.retCode === 0 && data.result?.list?.[0]) {
        const buyRatio = parseFloat(data.result.list[0].buyRatio);
        const sellRatio = parseFloat(data.result.list[0].sellRatio);
        const ratio = sellRatio > 0 ? buyRatio / sellRatio : 1;
        snapshot.longShortRatio = {
          ratio: ratio,
          longPercent: buyRatio * 100,
          shortPercent: sellRatio * 100,
          source: 'bybit',
        };
        console.log('Bybit L/S Ratio:', ratio.toFixed(2), `(${(buyRatio * 100).toFixed(1)}% Long)`);
      }
    }

    // Phase 6: Process Bitget Funding Rate
    if (bitgetFundingRes.status === 'fulfilled' && bitgetFundingRes.value.ok) {
      const data = await bitgetFundingRes.value.json();
      if (data.code === '00000' && data.data) {
        const rate = parseFloat(data.data.fundingRate);
        snapshot.funding.exchanges.bitget = {
          rate: rate,
          ratePercent: rate * 100,
          nextFundingTime: 0,
        };
        console.log('Bitget Funding:', (rate * 100).toFixed(4) + '%');
      }
    }

    // Phase 6: Process dYdX Funding Rate
    if (dydxFundingRes.status === 'fulfilled' && dydxFundingRes.value.ok) {
      const data = await dydxFundingRes.value.json();
      if (data.markets && data.markets['BTC-USD']) {
        const market = data.markets['BTC-USD'];
        const rate = parseFloat(market.nextFundingRate || '0');
        snapshot.funding.exchanges.dydx = {
          rate: rate,
          ratePercent: rate * 100,
          nextFundingTime: 0,
        };
        console.log('dYdX Funding:', (rate * 100).toFixed(4) + '%');
      }
    }

    // Phase 6: Process Binance Funding Rate (may fail in US)
    if (binanceFundingRes.status === 'fulfilled' && binanceFundingRes.value.ok) {
      const data = await binanceFundingRes.value.json();
      if (data.lastFundingRate) {
        const rate = parseFloat(data.lastFundingRate);
        snapshot.funding.exchanges.binance = {
          rate: rate,
          ratePercent: rate * 100,
          nextFundingTime: data.nextFundingTime || 0,
        };
        snapshot.funding.binance = rate;
        console.log('Binance Funding:', (rate * 100).toFixed(4) + '%');
      }
    }

    // Update OKX in exchanges object from earlier fetch
    snapshot.funding.exchanges.okx = {
      rate: snapshot.funding.rate,
      ratePercent: snapshot.funding.ratePercent,
      nextFundingTime: 0,
    };

    // Phase 6: Update Funding History (rolling 30 days)
    let existingHistory: Array<{ timestamp: number; rate: number }> = [];
    if (existingSnapshotRes.status === 'fulfilled' && existingSnapshotRes.value.ok) {
      try {
        const existingSnapshot = await existingSnapshotRes.value.json();
        if (existingSnapshot.funding?.history) {
          existingHistory = existingSnapshot.funding.history;
        }
      } catch (e) {
        console.log('Could not parse existing snapshot for history');
      }
    }

    // Calculate average funding rate across all exchanges
    const allRates = [
      snapshot.funding.exchanges.bybit.ratePercent,
      snapshot.funding.exchanges.okx.ratePercent,
      snapshot.funding.exchanges.bitget.ratePercent,
      snapshot.funding.exchanges.dydx.ratePercent,
      snapshot.funding.exchanges.binance.ratePercent,
    ].filter(r => r !== 0);
    const avgRate = allRates.length > 0 ? allRates.reduce((a, b) => a + b, 0) / allRates.length : snapshot.funding.ratePercent;

    // Add new data point
    const now = Date.now();
    existingHistory.push({ timestamp: now, rate: avgRate });

    // Keep only last 30 days (180 data points at 4-hour intervals)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    snapshot.funding.history = existingHistory.filter(h => h.timestamp > thirtyDaysAgo);
    console.log('Funding history points:', snapshot.funding.history.length);

    // Phase 6 Sprint 2: Open Interest History Tracking
    let existingOiHistory: Array<{ timestamp: number; btc: number; usd: number; price: number }> = [];
    if (existingSnapshotRes.status === 'fulfilled' && existingSnapshotRes.value.ok) {
      try {
        // Need to re-fetch since we already consumed the response for funding history
        const existingSnapshotRes2 = await fetchWithTimeout(`https://raw.githubusercontent.com/${process.env.GITHUB_REPO || 'jasonsutter87/BTCSignal_ai'}/master/static/data/market-snapshot.json`);
        if (existingSnapshotRes2.ok) {
          const existingSnapshot = await existingSnapshotRes2.json();
          if (existingSnapshot.openInterest?.history) {
            existingOiHistory = existingSnapshot.openInterest.history;
          }
        }
      } catch (e) {
        console.log('Could not parse existing snapshot for OI history');
      }
    }

    // Calculate total OI (OKX + Bybit)
    const totalOiBtc = snapshot.openInterest.btc + bybitOI;
    const totalOiUsd = totalOiBtc * snapshot.btc.price;

    // Add new OI data point
    existingOiHistory.push({
      timestamp: now,
      btc: totalOiBtc,
      usd: totalOiUsd,
      price: snapshot.btc.price
    });

    // Keep only last 30 days
    snapshot.openInterest.history = existingOiHistory.filter(h => h.timestamp > thirtyDaysAgo);
    console.log('OI history points:', snapshot.openInterest.history.length);

    // Calculate 24h OI change
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const oi24hAgo = existingOiHistory.find(h => h.timestamp <= twentyFourHoursAgo);
    if (oi24hAgo) {
      snapshot.openInterest.change24h = totalOiBtc - oi24hAgo.btc;
      snapshot.openInterest.change24hPercent = ((totalOiBtc - oi24hAgo.btc) / oi24hAgo.btc) * 100;
    }

    // Calculate OI/Market Cap ratio
    if (snapshot.btc.marketCap > 0) {
      snapshot.openInterest.oiMarketCapRatio = (totalOiUsd / snapshot.btc.marketCap) * 100;
    }
    console.log('OI change 24h:', snapshot.openInterest.change24hPercent.toFixed(2) + '%');

    // Calculate liquidation levels based on OI and funding data
    const price = snapshot.btc.price;
    const totalOI = snapshot.openInterest.btc + bybitOI; // Combine OKX + Bybit OI
    const avgFunding = (snapshot.funding.rate + bybitFunding) / 2;

    if (price > 0 && totalOI > 0) {
      snapshot.liquidation.levels = calculateLiquidationLevels(price, totalOI, avgFunding);
      console.log('Liquidation levels generated:', snapshot.liquidation.levels.length);

      // Generate 24h stats (estimated from OI and funding bias)
      const fundingBias = avgFunding > 0 ? 0.6 : 0.4; // More longs if positive funding
      const totalLiqUsd = totalOI * price * 0.05; // Estimate 5% of OI liquidated daily
      snapshot.liquidation.stats24h = {
        total: totalLiqUsd,
        long: totalLiqUsd * fundingBias,
        short: totalLiqUsd * (1 - fundingBias),
        ratio: fundingBias / (1 - fundingBias),
      };
    }

    // Save to GitHub (triggers rebuild)
    const saved = await saveToBlobStorage(snapshot);

    return new Response(JSON.stringify({
      success: true,
      saved: saved,
      snapshot: snapshot,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Market data fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Note: Schedule removed - data now saved to Blob storage on-demand
