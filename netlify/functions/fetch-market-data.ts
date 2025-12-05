import type { Config, Context } from '@netlify/functions';

// Market data snapshot that gets saved to GitHub
interface MarketSnapshot {
  timestamp: string;
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
  };
  openInterest: {
    btc: number;
    usd: number;
  };
  longShortRatio: {
    ratio: number;
    longPercent: number;
    shortPercent: number;
  };
  dominance: {
    btc: number;
  };
  hashrate: {
    current: number;
    unit: string;
  };
  ohlc: {
    days7: number[][];  // [timestamp, open, high, low, close]
    days30: number[][];
  };
  global: {
    totalMarketCap: number;
    total24hVolume: number;
  };
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

// Save snapshot to GitHub
async function saveToGitHub(snapshot: MarketSnapshot): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log('GitHub credentials not set, skipping save');
    return false;
  }

  const path = 'static/data/market-snapshot.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file SHA if it exists
    let sha: string | undefined;
    const getResponse = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getResponse.ok) {
      const existingData = await getResponse.json();
      sha = existingData.sha;
    }

    // Save updated file
    const content = JSON.stringify(snapshot, null, 2);
    const body: any = {
      message: `Update market snapshot: ${snapshot.timestamp}`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log(`Market snapshot saved to GitHub: ${path}`);
      return true;
    } else {
      const error = await response.json();
      console.error('GitHub API error:', error);
      return false;
    }
  } catch (error: any) {
    console.error('Failed to save to GitHub:', error.message);
    return false;
  }
}

export default async (req: Request, context: Context) => {
  console.log('Fetching market data snapshot...');

  const snapshot: MarketSnapshot = {
    timestamp: new Date().toISOString(),
    btc: { price: 0, price24hAgo: 0, priceChange24h: 0, high24h: 0, low24h: 0, volume24h: 0, marketCap: 0 },
    fearGreed: { value: 50, label: 'Neutral' },
    funding: { rate: 0, ratePercent: 0 },
    openInterest: { btc: 0, usd: 0 },
    longShortRatio: { ratio: 1, longPercent: 50, shortPercent: 50 },
    dominance: { btc: 0 },
    hashrate: { current: 0, unit: 'EH/s' },
    ohlc: { days7: [], days30: [] },
    global: { totalMarketCap: 0, total24hVolume: 0 },
  };

  try {
    // Fetch all data in parallel
    const [
      btcDataRes,
      fearGreedRes,
      fundingRes,
      oiRes,
      longShortRes,
      globalRes,
      hashrateRes,
      ohlc7Res,
      ohlc30Res,
    ] = await Promise.allSettled([
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false'),
      fetchWithTimeout('https://api.alternative.me/fng/?limit=1'),
      fetchWithTimeout('https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP'),
      fetchWithTimeout('https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP'),
      fetchWithTimeout('https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?instId=BTC&period=5m'),
      fetchWithTimeout('https://api.coingecko.com/api/v3/global'),
      fetchWithTimeout('https://mempool.space/api/v1/mining/hashrate/3m'),
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=7'),
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30'),
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
      } else {
        console.log('CoinGecko response missing market_data:', JSON.stringify(data).slice(0, 200));
      }
    } else if (btcDataRes.status === 'fulfilled') {
      console.log('CoinGecko API error, status:', btcDataRes.value.status);
    }

    // Fallback to CoinCap API if CoinGecko failed
    if (snapshot.btc.price === 0) {
      console.log('Trying CoinCap fallback...');
      try {
        const coinCapRes = await fetchWithTimeout('https://api.coincap.io/v2/assets/bitcoin');
        if (coinCapRes.ok) {
          const data = await coinCapRes.json();
          if (data?.data?.priceUsd) {
            const price = parseFloat(data.data.priceUsd);
            const change24h = parseFloat(data.data.changePercent24Hr) || 0;
            snapshot.btc = {
              price: price,
              price24hAgo: price / (1 + change24h / 100),
              priceChange24h: change24h,
              high24h: 0,
              low24h: 0,
              volume24h: parseFloat(data.data.volumeUsd24Hr) || 0,
              marketCap: parseFloat(data.data.marketCapUsd) || 0,
            };
            console.log('CoinCap fallback succeeded');
          }
        }
      } catch (e) {
        console.log('CoinCap fallback also failed');
      }
    }
    console.log('BTC data:', snapshot.btc.price > 0 ? 'OK' : 'FAILED');

    // Process Fear & Greed
    if (fearGreedRes.status === 'fulfilled' && fearGreedRes.value.ok) {
      const data = await fearGreedRes.value.json();
      if (data && data.data && data.data[0]) {
        snapshot.fearGreed = {
          value: parseInt(data.data[0].value),
          label: data.data[0].value_classification,
        };
      }
    }
    console.log('Fear & Greed:', snapshot.fearGreed.value);

    // Process Funding Rate from OKX
    if (fundingRes.status === 'fulfilled' && fundingRes.value.ok) {
      const data = await fundingRes.value.json();
      if (data && data.data && data.data[0]) {
        const rate = parseFloat(data.data[0].fundingRate);
        snapshot.funding = {
          rate: rate,
          ratePercent: rate * 100,
        };
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
      }
    }
    console.log('BTC Dominance:', snapshot.dominance.btc > 0 ? snapshot.dominance.btc.toFixed(1) + '%' : 'FAILED');

    // Process Hashrate from mempool.space
    if (hashrateRes.status === 'fulfilled' && hashrateRes.value.ok) {
      const data = await hashrateRes.value.json();
      if (data && data.currentHashrate) {
        snapshot.hashrate = {
          current: data.currentHashrate / 1e18, // Convert to EH/s
          unit: 'EH/s',
        };
      }
    }
    console.log('Hashrate:', snapshot.hashrate.current.toFixed(1) + ' EH/s');

    // Process OHLC data
    if (ohlc7Res.status === 'fulfilled' && ohlc7Res.value.ok) {
      snapshot.ohlc.days7 = await ohlc7Res.value.json();
    }
    console.log('OHLC 7d:', snapshot.ohlc.days7.length + ' candles');

    if (ohlc30Res.status === 'fulfilled' && ohlc30Res.value.ok) {
      snapshot.ohlc.days30 = await ohlc30Res.value.json();
    }
    console.log('OHLC 30d:', snapshot.ohlc.days30.length + ' candles');

    // Save to GitHub (triggers rebuild)
    const saved = await saveToGitHub(snapshot);

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

// Schedule: runs 6 times daily (every 4 hours)
// 1 AM, 5 AM, 9 AM, 1 PM, 5 PM, 9 PM UTC
export const config: Config = {
  schedule: '0 1,5,9,13,17,21 * * *',
};
