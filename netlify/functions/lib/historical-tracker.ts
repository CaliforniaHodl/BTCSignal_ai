import { HistoricalCall } from './blog-generator';

const GITHUB_API_BASE = 'https://api.github.com';

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
   * Update pending calls with actual results
   */
  async updatePendingCalls(currentPrice: number): Promise<HistoricalCall[]> {
    const calls = await this.getHistoricalCalls();
    let updated = false;

    for (const call of calls) {
      if (call.actualResult === 'pending') {
        // Check if target or stop loss was hit
        if (call.direction === 'up') {
          if (currentPrice >= call.targetPrice) {
            call.actualResult = 'win';
            call.pnlPercent = ((call.targetPrice - call.entryPrice) / call.entryPrice) * 100;
            updated = true;
          } else if (currentPrice <= call.entryPrice * 0.98) {
            // Assume 2% stop loss for tracking
            call.actualResult = 'loss';
            call.pnlPercent = -2;
            updated = true;
          }
        } else if (call.direction === 'down') {
          if (currentPrice <= call.targetPrice) {
            call.actualResult = 'win';
            call.pnlPercent = ((call.entryPrice - call.targetPrice) / call.entryPrice) * 100;
            updated = true;
          } else if (currentPrice >= call.entryPrice * 1.02) {
            call.actualResult = 'loss';
            call.pnlPercent = -2;
            updated = true;
          }
        }

        // Also mark as loss if older than 24 hours and still pending
        const callDate = new Date(call.date);
        const now = new Date();
        const hoursDiff = (now.getTime() - callDate.getTime()) / (1000 * 60 * 60);
        if (hoursDiff > 24 && call.actualResult === 'pending') {
          const pnl = call.direction === 'up'
            ? ((currentPrice - call.entryPrice) / call.entryPrice) * 100
            : ((call.entryPrice - currentPrice) / call.entryPrice) * 100;

          call.actualResult = pnl >= 0 ? 'win' : 'loss';
          call.pnlPercent = parseFloat(pnl.toFixed(2));
          updated = true;
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
    targetPrice: number
  ): HistoricalCall {
    return {
      date: timestamp.toISOString(),
      direction,
      confidence,
      entryPrice,
      targetPrice,
      actualResult: 'pending',
      pnlPercent: null,
    };
  }
}
