import axios from 'axios';

// ========== INTERFACES ==========

export interface FundingRateData {
  exchange: string;
  rate: number;
  timestamp: number;
  annualized: number;
}

export interface AggregateFundingRate {
  weightedAverage: number;
  exchanges: FundingRateData[];
  trend: 'rising' | 'falling' | 'stable';
  signal: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
}

export interface OpenInterestData {
  exchange: string;
  openInterest: number; // in BTC
  openInterestUSD: number;
  timestamp: number;
}

export interface AggregateOpenInterest {
  totalBTC: number;
  totalUSD: number;
  exchanges: OpenInterestData[];
  change24h: number;
  changePercent24h: number;
  timestamp: number;
}

export interface LongShortRatio {
  ratio: number; // long / short
  longPercent: number;
  shortPercent: number;
  exchange: string;
  timestamp: number;
}

export interface AggregateLongShortRatio {
  weightedRatio: number;
  averageLongPercent: number;
  averageShortPercent: number;
  exchanges: LongShortRatio[];
  signal: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
}

export interface Liquidation {
  side: 'long' | 'short';
  price: number;
  quantity: number;
  value: number;
  timestamp: number;
}

export interface LiquidationData {
  totalLongLiquidations: number;
  totalShortLiquidations: number;
  netLiquidations: number;
  largeLiquidations: Liquidation[]; // > $1M
  signal: 'bullish' | 'bearish' | 'neutral';
  timestamp: number;
}

export interface FundingRateAnalysis {
  current: number;
  average24h: number;
  trend: 'rising' | 'falling' | 'stable';
  extremeLevel: 'extreme_positive' | 'high_positive' | 'neutral' | 'high_negative' | 'extreme_negative';
  signal: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
}

export interface OIDeltaAnalysis {
  currentOI: number;
  previousOI: number;
  delta: number;
  deltaPercent: number;
  priceChange: number;
  pattern: 'bullish_trend' | 'bearish_trend' | 'bull_trap' | 'bear_trap' | 'neutral';
  signal: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
}

export interface MaxPainData {
  maxPainPrice: number;
  currentPrice: number;
  deviation: number;
  deviationPercent: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  totalOI: number;
  callOI: number;
  putOI: number;
}

export interface ImpliedVolatility {
  ivIndex: number;
  level: 'very_low' | 'low' | 'normal' | 'high' | 'very_high';
  signal: 'expect_calm' | 'expect_movement' | 'neutral';
  atmIV: number;
  ivRank: number;
}

export interface DerivativesAdvancedData {
  fundingRate: AggregateFundingRate;
  openInterest: AggregateOpenInterest;
  longShortRatio: AggregateLongShortRatio;
  liquidations: LiquidationData;
  fundingRateAnalysis: FundingRateAnalysis;
  oiDeltaAnalysis: OIDeltaAnalysis;
  maxPain: MaxPainData | null;
  impliedVolatility: ImpliedVolatility | null;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
  timestamp: number;
}

// ========== DERIVATIVES ADVANCED ANALYZER CLASS ==========

export class DerivativesAdvancedAnalyzer {
  private previousOI: number | null = null;

  /**
   * Fetch funding rate from OKX
   */
  async getOKXFundingRate(): Promise<FundingRateData | null> {
    try {
      const response = await axios.get('https://www.okx.com/api/v5/public/funding-rate', {
        params: { instId: 'BTC-USDT-SWAP' },
        timeout: 5000
      });

      if (response.data?.data?.[0]) {
        const data = response.data.data[0];
        const rate = parseFloat(data.fundingRate);
        return {
          exchange: 'OKX',
          rate,
          timestamp: parseInt(data.fundingTime),
          annualized: rate * 3 * 365 * 100 // 3 times per day
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch OKX funding rate:', error.message);
      return null;
    }
  }

  /**
   * Fetch funding rate from Bybit
   */
  async getBybitFundingRate(): Promise<FundingRateData | null> {
    try {
      const response = await axios.get('https://api.bybit.com/v5/market/tickers', {
        params: { category: 'linear', symbol: 'BTCUSDT' },
        timeout: 5000
      });

      if (response.data?.result?.list?.[0]) {
        const data = response.data.result.list[0];
        const rate = parseFloat(data.fundingRate || '0');
        return {
          exchange: 'Bybit',
          rate,
          timestamp: Date.now(),
          annualized: rate * 3 * 365 * 100
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch Bybit funding rate:', error.message);
      return null;
    }
  }

  /**
   * Aggregate funding rates from multiple exchanges
   */
  async getAggregateFundingRate(previousRate?: number): Promise<AggregateFundingRate> {
    const [okx, bybit] = await Promise.all([
      this.getOKXFundingRate(),
      this.getBybitFundingRate()
    ]);

    const exchanges = [okx, bybit].filter(Boolean) as FundingRateData[];

    if (exchanges.length === 0) {
      return {
        weightedAverage: 0,
        exchanges: [],
        trend: 'stable',
        signal: 'neutral',
        timestamp: Date.now()
      };
    }

    // Simple average (could weight by volume in production)
    const weightedAverage = exchanges.reduce((sum, e) => sum + e.rate, 0) / exchanges.length;

    // Determine trend
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (previousRate !== undefined) {
      const change = weightedAverage - previousRate;
      if (Math.abs(change) > 0.0001) {
        trend = change > 0 ? 'rising' : 'falling';
      }
    }

    // Determine signal (contrarian)
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (weightedAverage > 0.01) signal = 'bearish'; // Extreme positive = bearish
    else if (weightedAverage > 0.005) signal = 'bearish';
    else if (weightedAverage < -0.01) signal = 'bullish'; // Extreme negative = bullish
    else if (weightedAverage < -0.005) signal = 'bullish';

    return {
      weightedAverage,
      exchanges,
      trend,
      signal,
      timestamp: Date.now()
    };
  }

  /**
   * Fetch open interest from OKX
   */
  async getOKXOpenInterest(currentPrice: number): Promise<OpenInterestData | null> {
    try {
      const response = await axios.get('https://www.okx.com/api/v5/public/open-interest', {
        params: { instType: 'SWAP', instId: 'BTC-USDT-SWAP' },
        timeout: 5000
      });

      if (response.data?.data?.[0]) {
        const data = response.data.data[0];
        const oiCcy = parseFloat(data.oiCcy || data.oi || '0');
        return {
          exchange: 'OKX',
          openInterest: oiCcy,
          openInterestUSD: oiCcy * currentPrice,
          timestamp: Date.now()
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch OKX OI:', error.message);
      return null;
    }
  }

  /**
   * Fetch open interest from Bybit
   */
  async getBybitOpenInterest(currentPrice: number): Promise<OpenInterestData | null> {
    try {
      const response = await axios.get('https://api.bybit.com/v5/market/open-interest', {
        params: { category: 'linear', symbol: 'BTCUSDT', intervalTime: '5min' },
        timeout: 5000
      });

      if (response.data?.result?.list?.[0]) {
        const data = response.data.result.list[0];
        const oiValue = parseFloat(data.openInterest || '0');
        // Bybit returns OI in USD value
        const oiBTC = oiValue / currentPrice;
        return {
          exchange: 'Bybit',
          openInterest: oiBTC,
          openInterestUSD: oiValue,
          timestamp: Date.now()
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch Bybit OI:', error.message);
      return null;
    }
  }

  /**
   * Aggregate open interest from multiple exchanges
   */
  async getAggregateOpenInterest(currentPrice: number, previousTotal?: number): Promise<AggregateOpenInterest> {
    const [okx, bybit] = await Promise.all([
      this.getOKXOpenInterest(currentPrice),
      this.getBybitOpenInterest(currentPrice)
    ]);

    const exchanges = [okx, bybit].filter(Boolean) as OpenInterestData[];

    const totalBTC = exchanges.reduce((sum, e) => sum + e.openInterest, 0);
    const totalUSD = exchanges.reduce((sum, e) => sum + e.openInterestUSD, 0);

    let change24h = 0;
    let changePercent24h = 0;
    if (previousTotal !== undefined && previousTotal > 0) {
      change24h = totalUSD - previousTotal;
      changePercent24h = (change24h / previousTotal) * 100;
    }

    return {
      totalBTC,
      totalUSD,
      exchanges,
      change24h,
      changePercent24h,
      timestamp: Date.now()
    };
  }

  /**
   * Fetch long/short ratio from Bybit
   */
  async getBybitLongShortRatio(): Promise<LongShortRatio | null> {
    try {
      const response = await axios.get('https://api.bybit.com/v5/market/account-ratio', {
        params: { category: 'linear', symbol: 'BTCUSDT', period: '1h' },
        timeout: 5000
      });

      if (response.data?.result?.list?.[0]) {
        const data = response.data.result.list[0];
        const buyRatio = parseFloat(data.buyRatio || '0.5');
        const sellRatio = parseFloat(data.sellRatio || '0.5');
        const ratio = buyRatio / sellRatio;

        return {
          ratio,
          longPercent: buyRatio * 100,
          shortPercent: sellRatio * 100,
          exchange: 'Bybit',
          timestamp: Date.now()
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch Bybit long/short ratio:', error.message);
      return null;
    }
  }

  /**
   * Fetch long/short ratio from OKX
   */
  async getOKXLongShortRatio(): Promise<LongShortRatio | null> {
    try {
      const response = await axios.get('https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio', {
        params: { ccy: 'BTC', period: '1H' },
        timeout: 5000
      });

      if (response.data?.data?.[0]) {
        const data = response.data.data[0];
        const longRatio = parseFloat(data.longAccountRatio || '0.5');
        const shortRatio = parseFloat(data.shortAccountRatio || '0.5');
        const ratio = longRatio / shortRatio;

        return {
          ratio,
          longPercent: longRatio * 100,
          shortPercent: shortRatio * 100,
          exchange: 'OKX',
          timestamp: Date.now()
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch OKX long/short ratio:', error.message);
      return null;
    }
  }

  /**
   * Aggregate long/short ratios
   */
  async getAggregateLongShortRatio(): Promise<AggregateLongShortRatio> {
    const [bybit, okx] = await Promise.all([
      this.getBybitLongShortRatio(),
      this.getOKXLongShortRatio()
    ]);

    const exchanges = [bybit, okx].filter(Boolean) as LongShortRatio[];

    if (exchanges.length === 0) {
      return {
        weightedRatio: 1.0,
        averageLongPercent: 50,
        averageShortPercent: 50,
        exchanges: [],
        signal: 'neutral',
        timestamp: Date.now()
      };
    }

    const weightedRatio = exchanges.reduce((sum, e) => sum + e.ratio, 0) / exchanges.length;
    const averageLongPercent = exchanges.reduce((sum, e) => sum + e.longPercent, 0) / exchanges.length;
    const averageShortPercent = exchanges.reduce((sum, e) => sum + e.shortPercent, 0) / exchanges.length;

    // Signal: extreme ratios can be contrarian
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (weightedRatio > 2.0) signal = 'bearish'; // Too many longs = bearish (contrarian)
    else if (weightedRatio > 1.5) signal = 'bearish';
    else if (weightedRatio < 0.5) signal = 'bullish'; // Too many shorts = bullish
    else if (weightedRatio < 0.67) signal = 'bullish';

    return {
      weightedRatio,
      averageLongPercent,
      averageShortPercent,
      exchanges,
      signal,
      timestamp: Date.now()
    };
  }

  /**
   * Track liquidations from Bybit recent trades
   */
  async getLiquidationData(): Promise<LiquidationData> {
    try {
      const response = await axios.get('https://api.bybit.com/v5/market/recent-trade', {
        params: { category: 'linear', symbol: 'BTCUSDT', limit: 50 },
        timeout: 5000
      });

      let totalLongLiquidations = 0;
      let totalShortLiquidations = 0;
      const largeLiquidations: Liquidation[] = [];

      if (response.data?.result?.list) {
        const trades = response.data.result.list;

        // Note: Bybit doesn't explicitly mark liquidations in public trades
        // In production, you'd use a liquidation-specific endpoint or WebSocket
        // For now, we'll estimate based on large trades
        trades.forEach((trade: any) => {
          const price = parseFloat(trade.price);
          const quantity = parseFloat(trade.size) / price; // Convert to BTC
          const value = parseFloat(trade.size);
          const side = trade.side === 'Buy' ? 'short' : 'long'; // Liquidation side is opposite

          // Consider trades > $100k as potential liquidations
          if (value > 100000) {
            if (side === 'long') totalLongLiquidations += value;
            else totalShortLiquidations += value;

            if (value > 1000000) {
              largeLiquidations.push({
                side,
                price,
                quantity,
                value,
                timestamp: parseInt(trade.time)
              });
            }
          }
        });
      }

      const netLiquidations = totalShortLiquidations - totalLongLiquidations;

      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (Math.abs(netLiquidations) > 10000000) {
        signal = netLiquidations > 0 ? 'bullish' : 'bearish';
      }

      return {
        totalLongLiquidations,
        totalShortLiquidations,
        netLiquidations,
        largeLiquidations,
        signal,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.log('Failed to fetch liquidation data:', error.message);
      return {
        totalLongLiquidations: 0,
        totalShortLiquidations: 0,
        netLiquidations: 0,
        largeLiquidations: [],
        signal: 'neutral',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyze funding rate trends
   */
  analyzeFundingRate(fundingRate: AggregateFundingRate, historicalRates: number[]): FundingRateAnalysis {
    const current = fundingRate.weightedAverage;
    const average24h = historicalRates.length > 0
      ? historicalRates.reduce((sum, r) => sum + r, 0) / historicalRates.length
      : current;

    const trend = fundingRate.trend;

    let extremeLevel: FundingRateAnalysis['extremeLevel'] = 'neutral';
    if (current > 0.01) extremeLevel = 'extreme_positive';
    else if (current > 0.005) extremeLevel = 'high_positive';
    else if (current < -0.01) extremeLevel = 'extreme_negative';
    else if (current < -0.005) extremeLevel = 'high_negative';

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let reasoning = '';

    if (extremeLevel === 'extreme_positive') {
      signal = 'bearish';
      reasoning = 'Extreme positive funding suggests overleveraged longs, contrarian bearish';
    } else if (extremeLevel === 'high_positive') {
      signal = 'bearish';
      reasoning = 'High positive funding indicates crowded long positions';
    } else if (extremeLevel === 'extreme_negative') {
      signal = 'bullish';
      reasoning = 'Extreme negative funding suggests overleveraged shorts, contrarian bullish';
    } else if (extremeLevel === 'high_negative') {
      signal = 'bullish';
      reasoning = 'Negative funding indicates crowded short positions';
    } else {
      reasoning = 'Funding rate in normal range';
    }

    return {
      current,
      average24h,
      trend,
      extremeLevel,
      signal,
      reasoning
    };
  }

  /**
   * Analyze OI delta patterns
   */
  analyzeOIDelta(
    currentOI: AggregateOpenInterest,
    previousOIValue: number,
    priceChange: number
  ): OIDeltaAnalysis {
    const delta = currentOI.totalUSD - previousOIValue;
    const deltaPercent = previousOIValue > 0 ? (delta / previousOIValue) * 100 : 0;

    let pattern: OIDeltaAnalysis['pattern'] = 'neutral';
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let reasoning = '';

    const oiIncreasing = deltaPercent > 2;
    const oiDecreasing = deltaPercent < -2;
    const priceUp = priceChange > 1;
    const priceDown = priceChange < -1;

    if (oiIncreasing && priceUp) {
      pattern = 'bullish_trend';
      signal = 'bullish';
      reasoning = 'Rising OI + rising price = strong bullish trend with new money';
    } else if (oiIncreasing && priceDown) {
      pattern = 'bearish_trend';
      signal = 'bearish';
      reasoning = 'Rising OI + falling price = strong bearish trend with new shorts';
    } else if (oiDecreasing && priceUp) {
      pattern = 'bull_trap';
      signal = 'bearish';
      reasoning = 'Falling OI + rising price = short covering, weak rally';
    } else if (oiDecreasing && priceDown) {
      pattern = 'bear_trap';
      signal = 'bullish';
      reasoning = 'Falling OI + falling price = long unwinding, weak selloff';
    } else {
      reasoning = 'OI and price changes not significant';
    }

    return {
      currentOI: currentOI.totalUSD,
      previousOI: previousOIValue,
      delta,
      deltaPercent,
      priceChange,
      pattern,
      signal,
      reasoning
    };
  }

  /**
   * Calculate max pain from Deribit options data
   */
  async calculateMaxPain(currentPrice: number): Promise<MaxPainData | null> {
    try {
      const response = await axios.get('https://www.deribit.com/api/v2/public/get_instruments', {
        params: { currency: 'BTC', kind: 'option', expired: false },
        timeout: 10000
      });

      if (!response.data?.result) return null;

      const instruments = response.data.result;
      const strikeMap = new Map<number, { callOI: number; putOI: number }>();

      // Find nearest expiry
      const now = Date.now();
      let nearestExpiry = Infinity;
      instruments.forEach((inst: any) => {
        const expiry = inst.expiration_timestamp;
        if (expiry > now && expiry < nearestExpiry) {
          nearestExpiry = expiry;
        }
      });

      // Aggregate OI by strike for nearest expiry
      instruments.forEach((inst: any) => {
        if (inst.expiration_timestamp !== nearestExpiry) return;

        const strike = inst.strike;
        const oi = inst.open_interest || 0;

        if (!strikeMap.has(strike)) {
          strikeMap.set(strike, { callOI: 0, putOI: 0 });
        }

        const data = strikeMap.get(strike)!;
        if (inst.option_type === 'call') {
          data.callOI += oi;
        } else {
          data.putOI += oi;
        }
      });

      // Calculate max pain (strike with maximum total loss for option holders)
      let maxPainPrice = currentPrice;
      let maxLoss = 0;

      strikeMap.forEach((data, strike) => {
        let totalLoss = 0;

        // For each strike, calculate total option value if price settles there
        strikeMap.forEach((otherData, otherStrike) => {
          // Call value = max(strike - settlement, 0)
          if (otherStrike < strike) {
            totalLoss += otherData.callOI * (strike - otherStrike);
          }
          // Put value = max(settlement - strike, 0)
          if (otherStrike > strike) {
            totalLoss += otherData.putOI * (otherStrike - strike);
          }
        });

        if (totalLoss > maxLoss) {
          maxLoss = totalLoss;
          maxPainPrice = strike;
        }
      });

      const totalCallOI = Array.from(strikeMap.values()).reduce((sum, d) => sum + d.callOI, 0);
      const totalPutOI = Array.from(strikeMap.values()).reduce((sum, d) => sum + d.putOI, 0);
      const totalOI = totalCallOI + totalPutOI;

      const deviation = currentPrice - maxPainPrice;
      const deviationPercent = (deviation / maxPainPrice) * 100;

      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (Math.abs(deviationPercent) > 5) {
        signal = deviationPercent > 0 ? 'bearish' : 'bullish';
      }

      return {
        maxPainPrice,
        currentPrice,
        deviation,
        deviationPercent,
        signal,
        totalOI,
        callOI: totalCallOI,
        putOI: totalPutOI
      };
    } catch (error: any) {
      console.log('Failed to calculate max pain:', error.message);
      return null;
    }
  }

  /**
   * Calculate implied volatility index from Deribit ATM options
   */
  async calculateImpliedVolatility(currentPrice: number): Promise<ImpliedVolatility | null> {
    try {
      const response = await axios.get('https://www.deribit.com/api/v2/public/get_instruments', {
        params: { currency: 'BTC', kind: 'option', expired: false },
        timeout: 10000
      });

      if (!response.data?.result) return null;

      const instruments = response.data.result;
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      // Find ATM options expiring within 30 days
      const atmOptions = instruments.filter((inst: any) => {
        const expiry = inst.expiration_timestamp;
        const daysToExpiry = (expiry - now) / (24 * 60 * 60 * 1000);
        const strike = inst.strike;
        const isATM = Math.abs(strike - currentPrice) / currentPrice < 0.05; // Within 5%
        return daysToExpiry > 0 && daysToExpiry <= 30 && isATM;
      });

      if (atmOptions.length === 0) return null;

      // Average the mark_iv from ATM options
      let totalIV = 0;
      let count = 0;
      atmOptions.forEach((opt: any) => {
        if (opt.mark_iv) {
          totalIV += opt.mark_iv;
          count++;
        }
      });

      if (count === 0) return null;

      const ivIndex = totalIV / count;
      const atmIV = ivIndex;

      // IV rank (simplified - would need historical data in production)
      const ivRank = Math.min(100, Math.max(0, (ivIndex - 40) * 2));

      let level: ImpliedVolatility['level'] = 'normal';
      let signal: ImpliedVolatility['signal'] = 'neutral';

      if (ivIndex < 40) {
        level = 'very_low';
        signal = 'expect_movement';
      } else if (ivIndex < 60) {
        level = 'low';
        signal = 'expect_calm';
      } else if (ivIndex < 80) {
        level = 'normal';
        signal = 'neutral';
      } else if (ivIndex < 100) {
        level = 'high';
        signal = 'expect_movement';
      } else {
        level = 'very_high';
        signal = 'expect_movement';
      }

      return {
        ivIndex,
        level,
        signal,
        atmIV,
        ivRank
      };
    } catch (error: any) {
      console.log('Failed to calculate IV:', error.message);
      return null;
    }
  }

  /**
   * Get comprehensive derivatives analysis
   */
  async getAdvancedDerivativesData(
    currentPrice: number,
    priceChange24h: number,
    previousOIValue?: number,
    previousFundingRate?: number,
    historicalFundingRates: number[] = []
  ): Promise<DerivativesAdvancedData> {
    // Fetch all data in parallel
    const [
      fundingRate,
      openInterest,
      longShortRatio,
      liquidations,
      maxPain,
      impliedVolatility
    ] = await Promise.all([
      this.getAggregateFundingRate(previousFundingRate),
      this.getAggregateOpenInterest(currentPrice, previousOIValue),
      this.getAggregateLongShortRatio(),
      this.getLiquidationData(),
      this.calculateMaxPain(currentPrice),
      this.calculateImpliedVolatility(currentPrice)
    ]);

    // Perform analyses
    const fundingRateAnalysis = this.analyzeFundingRate(fundingRate, historicalFundingRates);
    const oiDeltaAnalysis = this.analyzeOIDelta(
      openInterest,
      previousOIValue || openInterest.totalUSD,
      priceChange24h
    );

    // Calculate overall sentiment
    const signals = [
      fundingRate.signal,
      longShortRatio.signal,
      liquidations.signal,
      fundingRateAnalysis.signal,
      oiDeltaAnalysis.signal,
      maxPain?.signal || 'neutral'
    ];

    const bullishCount = signals.filter(s => s === 'bullish').length;
    const bearishCount = signals.filter(s => s === 'bearish').length;

    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullishCount > bearishCount + 1) overallSentiment = 'bullish';
    else if (bearishCount > bullishCount + 1) overallSentiment = 'bearish';

    const confidenceScore = Math.abs(bullishCount - bearishCount) / signals.length;

    return {
      fundingRate,
      openInterest,
      longShortRatio,
      liquidations,
      fundingRateAnalysis,
      oiDeltaAnalysis,
      maxPain,
      impliedVolatility,
      overallSentiment,
      confidenceScore,
      timestamp: Date.now()
    };
  }
}
