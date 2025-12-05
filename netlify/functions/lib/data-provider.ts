import axios from 'axios';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  timeframe: string;
  data: OHLCV[];
}

export class DataProvider {
  /**
   * Fetch Bitcoin data from Coinbase API (FREE, no key needed)
   */
  async fetchCoinbaseData(symbol: string, timeframe: string, limit: number = 100): Promise<MarketData> {
    try {
      const granularity = this.convertToCoinbaseGranularity(timeframe);
      const productId = 'BTC-USD';

      // Calculate start and end times
      const end = new Date();
      const start = new Date(end.getTime() - (limit * granularity * 1000));

      const url = `https://api.exchange.coinbase.com/products/${productId}/candles`;

      const response = await axios.get(url, {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
          granularity,
        },
        headers: {
          'Accept': 'application/json',
        },
      });

      // Coinbase returns [timestamp, low, high, open, close, volume] in reverse order (newest first)
      const data: OHLCV[] = response.data
        .reverse()
        .map((candle: any[]) => ({
          timestamp: candle[0] * 1000, // Convert to milliseconds
          open: candle[3],
          high: candle[2],
          low: candle[1],
          close: candle[4],
          volume: candle[5],
        }));

      return { symbol, timeframe, data };
    } catch (error: any) {
      throw new Error(`Failed to fetch Coinbase data: ${error.message}`);
    }
  }

  private convertToCoinbaseGranularity(timeframe: string): number {
    // Coinbase granularity in seconds
    const map: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400,
    };
    return map[timeframe] || 3600;
  }

  // Keep Binance as backup
  async fetchBinanceData(symbol: string, timeframe: string, limit: number = 100): Promise<MarketData> {
    try {
      const interval = this.convertToBinanceInterval(timeframe);
      const url = `https://api.binance.us/api/v3/klines`;

      const response = await axios.get(url, {
        params: {
          symbol: symbol.toUpperCase(),
          interval,
          limit,
        },
      });

      const data: OHLCV[] = response.data.map((candle: any[]) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));

      return { symbol, timeframe, data };
    } catch (error: any) {
      throw new Error(`Failed to fetch Binance data: ${error.message}`);
    }
  }

  private convertToBinanceInterval(timeframe: string): string {
    const map: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
    };
    return map[timeframe] || '1h';
  }
}
