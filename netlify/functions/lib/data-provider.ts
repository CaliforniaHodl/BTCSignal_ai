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
   * Fetch Bitcoin data from Binance API (FREE, no key needed)
   */
  async fetchBinanceData(symbol: string, timeframe: string, limit: number = 100): Promise<MarketData> {
    try {
      const interval = this.convertToBinanceInterval(timeframe);
      const url = `https://api.binance.com/api/v3/klines`;

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
