import axios from 'axios';

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
}

export interface OpenInterest {
  symbol: string;
  openInterest: number;
  openInterestValue: number;
}

export interface OptionsExpiry {
  expiryDate: Date;
  daysUntilExpiry: number;
  totalOI: number;
  maxPain: number | null;
  callOI: number;
  putOI: number;
  putCallRatio: number;
}

export interface SqueezeAlert {
  type: 'long_squeeze' | 'short_squeeze' | 'none';
  probability: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export interface DerivativesData {
  fundingRate: FundingRate | null;
  openInterest: OpenInterest | null;
  optionsExpiry: OptionsExpiry | null;
  squeezeAlert: SqueezeAlert;
}

export class DerivativesAnalyzer {
  /**
   * Get funding rate from Binance Futures
   */
  async getFundingRate(): Promise<FundingRate | null> {
    try {
      const response = await axios.get('https://fapi.binance.com/fapi/v1/fundingRate', {
        params: { symbol: 'BTCUSDT', limit: 1 }
      });

      if (response.data && response.data.length > 0) {
        const data = response.data[0];
        return {
          symbol: data.symbol,
          fundingRate: parseFloat(data.fundingRate),
          fundingTime: data.fundingTime,
          markPrice: parseFloat(data.markPrice || '0'),
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch funding rate:', error.message);
      return null;
    }
  }

  /**
   * Get open interest from Binance Futures
   */
  async getOpenInterest(): Promise<OpenInterest | null> {
    try {
      const response = await axios.get('https://fapi.binance.com/fapi/v1/openInterest', {
        params: { symbol: 'BTCUSDT' }
      });

      if (response.data) {
        // Get mark price for value calculation
        const priceResponse = await axios.get('https://fapi.binance.com/fapi/v1/ticker/price', {
          params: { symbol: 'BTCUSDT' }
        });
        const price = parseFloat(priceResponse.data.price);
        const oi = parseFloat(response.data.openInterest);

        return {
          symbol: response.data.symbol,
          openInterest: oi,
          openInterestValue: oi * price,
        };
      }
      return null;
    } catch (error: any) {
      console.log('Failed to fetch open interest:', error.message);
      return null;
    }
  }

  /**
   * Get next major options expiry from Deribit
   */
  async getOptionsExpiry(): Promise<OptionsExpiry | null> {
    try {
      // Get all BTC instruments
      const response = await axios.get('https://www.deribit.com/api/v2/public/get_instruments', {
        params: { currency: 'BTC', kind: 'option', expired: false }
      });

      if (!response.data || !response.data.result) {
        return null;
      }

      const now = new Date();
      const instruments = response.data.result;

      // Find unique expiry dates
      const expiryMap = new Map<number, { calls: any[], puts: any[] }>();

      instruments.forEach((inst: any) => {
        const expiry = inst.expiration_timestamp;
        if (!expiryMap.has(expiry)) {
          expiryMap.set(expiry, { calls: [], puts: [] });
        }
        if (inst.option_type === 'call') {
          expiryMap.get(expiry)!.calls.push(inst);
        } else {
          expiryMap.get(expiry)!.puts.push(inst);
        }
      });

      // Find next significant expiry (within 7 days with significant OI)
      let nextExpiry: OptionsExpiry | null = null;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      for (const [timestamp, data] of Array.from(expiryMap.entries()).sort((a, b) => a[0] - b[0])) {
        const expiryDate = new Date(timestamp);
        const daysUntilExpiry = Math.ceil((timestamp - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
          // This is a significant upcoming expiry
          const callOI = data.calls.reduce((sum: number, c: any) => sum + (c.open_interest || 0), 0);
          const putOI = data.puts.reduce((sum: number, p: any) => sum + (p.open_interest || 0), 0);
          const totalOI = callOI + putOI;

          // Only report if significant OI (> 1000 BTC equivalent)
          if (totalOI > 1000) {
            nextExpiry = {
              expiryDate,
              daysUntilExpiry,
              totalOI,
              maxPain: null, // Would need more complex calculation
              callOI,
              putOI,
              putCallRatio: callOI > 0 ? putOI / callOI : 0,
            };
            break;
          }
        }
      }

      return nextExpiry;
    } catch (error: any) {
      console.log('Failed to fetch options data:', error.message);
      return null;
    }
  }

  /**
   * Analyze for potential squeeze conditions
   */
  analyzeSqueezeRisk(
    fundingRate: FundingRate | null,
    openInterest: OpenInterest | null,
    currentPrice: number,
    priceChange24h: number
  ): SqueezeAlert {
    const reasoning: string[] = [];
    let longSqueezeScore = 0;
    let shortSqueezeScore = 0;

    // Analyze funding rate
    if (fundingRate) {
      const rate = fundingRate.fundingRate;
      const ratePercent = rate * 100;

      if (rate > 0.001) {
        // High positive funding = longs paying shorts = potential long squeeze
        longSqueezeScore += 2;
        reasoning.push(`High funding rate (${ratePercent.toFixed(3)}%) - longs overleveraged`);
      } else if (rate > 0.0005) {
        longSqueezeScore += 1;
        reasoning.push(`Elevated funding rate (${ratePercent.toFixed(3)}%)`);
      } else if (rate < -0.001) {
        // High negative funding = shorts paying longs = potential short squeeze
        shortSqueezeScore += 2;
        reasoning.push(`Negative funding rate (${ratePercent.toFixed(3)}%) - shorts overleveraged`);
      } else if (rate < -0.0005) {
        shortSqueezeScore += 1;
        reasoning.push(`Below-average funding rate (${ratePercent.toFixed(3)}%)`);
      }
    }

    // Analyze price action for squeeze setup
    if (priceChange24h > 5) {
      // Strong up move after shorts built up = short squeeze in progress
      shortSqueezeScore += 1;
      reasoning.push(`Strong rally (+${priceChange24h.toFixed(1)}%) may trigger short liquidations`);
    } else if (priceChange24h < -5) {
      // Strong down move after longs built up = long squeeze in progress
      longSqueezeScore += 1;
      reasoning.push(`Sharp drop (${priceChange24h.toFixed(1)}%) may trigger long liquidations`);
    }

    // High OI increases squeeze potential
    if (openInterest && openInterest.openInterestValue > 20000000000) {
      // > $20B OI is very high
      const oiBillions = (openInterest.openInterestValue / 1000000000).toFixed(1);
      reasoning.push(`High open interest ($${oiBillions}B) increases squeeze potential`);
      if (longSqueezeScore > shortSqueezeScore) {
        longSqueezeScore += 1;
      } else if (shortSqueezeScore > longSqueezeScore) {
        shortSqueezeScore += 1;
      }
    }

    // Determine squeeze type and probability
    let type: 'long_squeeze' | 'short_squeeze' | 'none' = 'none';
    let probability: 'high' | 'medium' | 'low' = 'low';

    if (longSqueezeScore >= 3) {
      type = 'long_squeeze';
      probability = 'high';
    } else if (longSqueezeScore >= 2) {
      type = 'long_squeeze';
      probability = 'medium';
    } else if (shortSqueezeScore >= 3) {
      type = 'short_squeeze';
      probability = 'high';
    } else if (shortSqueezeScore >= 2) {
      type = 'short_squeeze';
      probability = 'medium';
    } else if (longSqueezeScore >= 1) {
      type = 'long_squeeze';
      probability = 'low';
    } else if (shortSqueezeScore >= 1) {
      type = 'short_squeeze';
      probability = 'low';
    }

    return { type, probability, reasoning };
  }

  /**
   * Get all derivatives data
   */
  async getDerivativesData(currentPrice: number, priceChange24h: number): Promise<DerivativesData> {
    const [fundingRate, openInterest, optionsExpiry] = await Promise.all([
      this.getFundingRate(),
      this.getOpenInterest(),
      this.getOptionsExpiry(),
    ]);

    const squeezeAlert = this.analyzeSqueezeRisk(fundingRate, openInterest, currentPrice, priceChange24h);

    return {
      fundingRate,
      openInterest,
      optionsExpiry,
      squeezeAlert,
    };
  }

  /**
   * Generate squeeze alert tweet (separate from main thread)
   * Uses 🚨 police siren emoji for liquidation risk
   */
  generateSqueezeAlert(data: DerivativesData, currentPrice: number): string | null {
    if (data.squeezeAlert.type === 'none' || data.squeezeAlert.probability === 'low') {
      return null;
    }

    const squeezeType = data.squeezeAlert.type === 'long_squeeze' ? 'LONG' : 'SHORT';
    const direction = data.squeezeAlert.type === 'long_squeeze' ? '📉' : '📈';
    const prob = data.squeezeAlert.probability === 'high' ? 'HIGH' : 'MED';

    const oiText = data.openInterest
      ? ` | OI: $${(data.openInterest.openInterestValue / 1000000000).toFixed(1)}B`
      : '';

    const fundingText = data.fundingRate
      ? ` | FR: ${(data.fundingRate.fundingRate * 100).toFixed(3)}%`
      : '';

    // Just show first reason to keep it short
    const reason = data.squeezeAlert.reasoning[0] || '';

    return `🚨 ${squeezeType} SQUEEZE ALERT ${direction}
${prob} RISK

#Bitcoin $${currentPrice.toLocaleString()}${oiText}${fundingText}

${reason}

⚠️ Elevated liquidation risk!

#BTC #Crypto

Not financial advice.`;
  }

  /**
   * Generate options expiry alert tweet (separate from main thread)
   * Uses 🔔 bell emoji for options alerts
   */
  generateOptionsAlert(data: DerivativesData, currentPrice: number): string | null {
    if (!data.optionsExpiry || data.optionsExpiry.daysUntilExpiry > 3) {
      return null;
    }

    const expiry = data.optionsExpiry;
    const notionalUSD = (expiry.totalOI * currentPrice / 1000000000).toFixed(1);
    const expiryDate = expiry.expiryDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const pcRatio = expiry.putCallRatio.toFixed(2);
    const sentiment = expiry.putCallRatio > 1 ? 'bearish bias' : expiry.putCallRatio < 0.7 ? 'bullish bias' : 'neutral';

    return `🔔 MAJOR OPTIONS EXPIRY ALERT

#Bitcoin options expiring ${expiryDate} (${expiry.daysUntilExpiry}d)

💰 ~$${notionalUSD}B notional value
📊 Put/Call Ratio: ${pcRatio} (${sentiment})
📈 Calls: ${expiry.callOI.toLocaleString()} BTC
📉 Puts: ${expiry.putOI.toLocaleString()} BTC

Expect increased volatility around expiry!

#BTC #Crypto #Options

Not financial advice.`;
  }

  /**
   * Check if any derivatives alerts should be fired
   */
  shouldAlert(data: DerivativesData): { squeeze: boolean; options: boolean } {
    const squeeze = data.squeezeAlert.type !== 'none' && data.squeezeAlert.probability !== 'low';
    const options = data.optionsExpiry !== null && data.optionsExpiry.daysUntilExpiry <= 3;
    return { squeeze, options };
  }
}
