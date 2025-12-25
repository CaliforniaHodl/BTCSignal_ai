// Shared data fetching utilities
// Consolidates duplicate fetch logic across functions

/**
 * Fetch with timeout wrapper
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch BTC price from multiple sources with fallback
 */
export async function fetchBTCPrice(): Promise<number> {
  // Try Binance US first (fastest)
  try {
    const res = await fetchWithTimeout(
      'https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT',
      {},
      3000
    );
    if (res.ok) {
      const data = await res.json();
      return parseFloat(data.price);
    }
  } catch (e) {
    console.log('Binance US failed, trying CoinGecko');
  }

  // Fallback to CoinGecko
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      {},
      5000
    );
    if (res.ok) {
      const data = await res.json();
      return data.bitcoin.usd;
    }
  } catch (e) {
    console.error('CoinGecko failed, trying Kraken');
  }

  // Last resort: Kraken
  try {
    const res = await fetchWithTimeout(
      'https://api.kraken.com/0/public/Ticker?pair=XBTUSD',
      {},
      5000
    );
    if (res.ok) {
      const data = await res.json();
      return parseFloat(data.result.XXBTZUSD.c[0]);
    }
  } catch (e) {
    console.error('All price sources failed');
  }

  return 0;
}

/**
 * Fetch BTC market data from CoinGecko
 */
export async function fetchMarketData(): Promise<{
  price: number;
  marketCap: number;
  circulatingSupply: number;
  priceChange24h: number;
  priceChange30d: number;
}> {
  try {
    const res = await fetchWithTimeout(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false',
      {},
      8000
    );

    if (res.ok) {
      const data = await res.json();
      return {
        price: data.market_data.current_price.usd,
        marketCap: data.market_data.market_cap.usd,
        circulatingSupply: data.market_data.circulating_supply,
        priceChange24h: data.market_data.price_change_percentage_24h || 0,
        priceChange30d: data.market_data.price_change_percentage_30d || 0,
      };
    }
  } catch (e) {
    console.error('Failed to fetch market data:', e);
  }

  // Fallback with just price
  const price = await fetchBTCPrice();
  return {
    price,
    marketCap: 0,
    circulatingSupply: 0,
    priceChange24h: 0,
    priceChange30d: 0,
  };
}

/**
 * Fetch BTC price history from CoinGecko
 */
export async function fetchPriceHistory(
  days: number = 30
): Promise<Array<{ timestamp: string; price: number; volume: number }>> {
  try {
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      {},
      10000
    );

    if (res.ok) {
      const data = await res.json();
      const history: Array<{ timestamp: string; price: number; volume: number }> = [];

      if (data.prices && data.total_volumes) {
        for (let i = 0; i < data.prices.length; i++) {
          const [timestamp, price] = data.prices[i];
          const volume = data.total_volumes[i] ? data.total_volumes[i][1] : 0;
          history.push({
            timestamp: new Date(timestamp).toISOString(),
            price,
            volume,
          });
        }
      }
      return history;
    }
  } catch (e) {
    console.error('Failed to fetch price history:', e);
  }

  return [];
}

/**
 * Fetch Fear & Greed Index
 */
export async function fetchFearGreedIndex(): Promise<{
  value: number;
  classification: string;
} | null> {
  try {
    const res = await fetchWithTimeout(
      'https://api.alternative.me/fng/',
      {},
      5000
    );
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data[0]) {
        return {
          value: parseInt(data.data[0].value),
          classification: data.data[0].value_classification,
        };
      }
    }
  } catch (e) {
    console.error('Failed to fetch Fear & Greed:', e);
  }
  return null;
}
