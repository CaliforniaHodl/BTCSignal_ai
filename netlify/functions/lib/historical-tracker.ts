import { HistoricalCall } from './blog-generator';
import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';

interface OHLCCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export class HistoricalTracker {
  private clientId: string;
  private clientSecret: string;
  private repo: string;
  private dataPath: string = 'data/historical-calls.json';

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    this.repo = process.env.GITHUB_REPO || '';
  }

  /**
   * Fetch OHLC candles from CoinGecko for the last N days
   */
  async fetchOHLCCandles(days: number = 7): Promise<OHLCCandle[]> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=${days}`
      );

      if (response.data && Array.isArray(response.data)) {
        return response.data.map((candle: number[]) => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
        }));
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch OHLC candles:', error.message);
      return [];
    }
  }

  /**
   * Check if price touched a level at any point since a given timestamp
   */
  checkPriceTouched(
    candles: OHLCCandle[],
    sinceTimestamp: number,
    targetPrice: number,
    stopLoss: number,
    direction: 'up' | 'down' | 'sideways' | 'mixed'
  ): { result: 'win' | 'loss' | 'pending'; touchedAt?: number; price?: number } {
    // Filter candles since the signal was made
    const relevantCandles = candles.filter(c => c.timestamp >= sinceTimestamp);

    for (const candle of relevantCandles) {
      if (direction === 'up') {
        // For bullish calls: check if high touched target (win) or low touched stop (loss)
        // Check stop loss FIRST - if both hit in same candle, stop loss takes priority
        if (stopLoss && candle.low <= stopLoss) {
          return { result: 'loss', touchedAt: candle.timestamp, price: stopLoss };
        }
        if (targetPrice && candle.high >= targetPrice) {
          return { result: 'win', touchedAt: candle.timestamp, price: targetPrice };
        }
      } else if (direction === 'down') {
        // For bearish calls: check if low touched target (win) or high touched stop (loss)
        // Check stop loss FIRST
        if (stopLoss && candle.high >= stopLoss) {
          return { result: 'loss', touchedAt: candle.timestamp, price: stopLoss };
        }
        if (targetPrice && candle.low <= targetPrice) {
          return { result: 'win', touchedAt: candle.timestamp, price: targetPrice };
        }
      }
    }

    return { result: 'pending' };
  }

  /**
   * Get Basic Auth header using OAuth Client ID and Secret
   */
  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
  }

  /**
   * Fetch historical calls from GitHub
   */
  async getHistoricalCalls(): Promise<HistoricalCall[]> {
    if (!this.clientId || !this.clientSecret || !this.repo) {
      console.log('GitHub credentials not set, returning empty history');
      return [];
    }

    try {
      const url = `${GITHUB_API_BASE}/repos/${this.repo}/contents/${this.dataPath}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Historical calls file not found, will create on first save');
          return [];
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content) as HistoricalCall[];
    } catch (error: any) {
      console.error('Failed to fetch historical calls:', error.message);
      return [];
    }
  }

  /**
   * Save historical calls to GitHub
   */
  async saveHistoricalCalls(calls: HistoricalCall[]): Promise<boolean> {
    if (!this.clientId || !this.clientSecret || !this.repo) {
      console.log('GitHub credentials not set, skipping save');
      return false;
    }

    try {
      // Get current file SHA if it exists
      let sha: string | undefined;
      const getUrl = `${GITHUB_API_BASE}/repos/${this.repo}/contents/${this.dataPath}`;
      const getResponse = await fetch(getUrl, {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (getResponse.ok) {
        const existingData = await getResponse.json();
        sha = existingData.sha;
      }

      // Save updated file
      const content = JSON.stringify(calls, null, 2);
      const body: any = {
        message: 'Update historical trading calls',
        content: Buffer.from(content).toString('base64'),
        branch: 'main',
      };

      if (sha) {
        body.sha = sha;
      }

      const putResponse = await fetch(getUrl, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });

      if (putResponse.ok) {
        console.log('Historical calls saved to GitHub');
        return true;
      } else {
        const error = await putResponse.json();
        console.error('GitHub API error:', error);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to save historical calls:', error.message);
      return false;
    }
  }

  /**
   * Add a new call to history
   */
  async addCall(call: HistoricalCall): Promise<HistoricalCall[]> {
    const calls = await this.getHistoricalCalls();
    calls.push(call);

    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filtered = calls.filter(c => new Date(c.date) >= thirtyDaysAgo);

    await this.saveHistoricalCalls(filtered);
    return filtered;
  }

  /**
   * Update pending calls with actual results using OHLC candle data
   *
   * Rules:
   * 1. Call stays PENDING for minimum 24 hours
   * 2. EXCEPTION: If stop loss or take profit is touched, resolve immediately
   * 3. After 24 hours, if no stop/target touched, mark based on current P&L
   * 4. After 7 days, force resolve based on current P&L
   */
  async updatePendingCalls(currentPrice: number): Promise<HistoricalCall[]> {
    const calls = await this.getHistoricalCalls();
    let updated = false;

    // Fetch OHLC candles for the last 30 days to check all pending calls
    const candles = await this.fetchOHLCCandles(30);
    console.log(`Fetched ${candles.length} OHLC candles for win/loss checking`);

    const now = new Date();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    for (const call of calls) {
      if (call.actualResult === 'pending') {
        const callTimestamp = new Date(call.date).getTime();
        const hoursSinceCall = (now.getTime() - callTimestamp) / (1000 * 60 * 60);
        const daysSinceCall = hoursSinceCall / 24;

        // Use actual stop loss from call if available, otherwise use 2% below entry
        const stopLoss = call.stopLoss || (call.direction === 'up'
          ? call.entryPrice * 0.98
          : call.entryPrice * 1.02);

        // Check OHLC candles to see if stop loss or target was touched
        const touchResult = this.checkPriceTouched(
          candles,
          callTimestamp,
          call.targetPrice,
          stopLoss,
          call.direction
        );

        // RULE: Stop loss or take profit touched = resolve immediately (regardless of time)
        if (touchResult.result !== 'pending') {
          call.actualResult = touchResult.result;

          // Calculate PnL based on what was touched
          if (touchResult.result === 'win') {
            call.pnlPercent = call.direction === 'up'
              ? ((call.targetPrice - call.entryPrice) / call.entryPrice) * 100
              : ((call.entryPrice - call.targetPrice) / call.entryPrice) * 100;
          } else {
            call.pnlPercent = call.direction === 'up'
              ? ((stopLoss - call.entryPrice) / call.entryPrice) * 100
              : ((call.entryPrice - stopLoss) / call.entryPrice) * 100;
          }

          console.log(`Call ${call.date}: ${call.direction.toUpperCase()} → ${touchResult.result.toUpperCase()} (touched ${touchResult.price} at ${new Date(touchResult.touchedAt!).toISOString()})`);
          updated = true;
        }
        // RULE: If older than 7 days and no stop/target touched, force resolve
        else if (daysSinceCall > 7) {
          const pnl = call.direction === 'up'
            ? ((currentPrice - call.entryPrice) / call.entryPrice) * 100
            : ((call.entryPrice - currentPrice) / call.entryPrice) * 100;

          call.actualResult = pnl >= 0 ? 'win' : 'loss';
          call.pnlPercent = parseFloat(pnl.toFixed(2));
          console.log(`Call ${call.date}: Expired after 7 days → ${call.actualResult.toUpperCase()} (${pnl.toFixed(2)}%)`);
          updated = true;
        }
        // RULE: Less than 24 hours = stay pending (no action needed)
        else if (hoursSinceCall < 24) {
          console.log(`Call ${call.date}: Still pending (${hoursSinceCall.toFixed(1)}h < 24h minimum)`);
          // No update - stays pending
        }
        // RULE: Between 24h and 7 days, no stop/target touched = stays pending
        else {
          console.log(`Call ${call.date}: Pending (${daysSinceCall.toFixed(1)} days, no stop/target touched yet)`);
          // No update - stays pending until stop/target hit or 7 day expiry
        }
      }
    }

    if (updated) {
      await this.saveHistoricalCalls(calls);
    }

    return calls;
  }

  /**
   * Get calls from last 30 days
   */
  async getLast30DaysCalls(): Promise<HistoricalCall[]> {
    const calls = await this.getHistoricalCalls();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return calls.filter(c => new Date(c.date) >= thirtyDaysAgo);
  }

  /**
   * Create a new historical call from analysis
   */
  createCallFromAnalysis(
    timestamp: Date,
    direction: 'up' | 'down' | 'sideways' | 'mixed',
    confidence: number,
    entryPrice: number,
    targetPrice: number,
    stopLoss?: number
  ): HistoricalCall {
    return {
      date: timestamp.toISOString(),
      direction,
      confidence,
      entryPrice,
      targetPrice,
      stopLoss,
      actualResult: 'pending',
      pnlPercent: null,
    };
  }
}
