// Historical Learner
// Tracks prediction outcomes and learns from past accuracy
// "Even though 17 != 22 != 25... there is always a pattern"

import { loadFromBlob, saveToBlob } from './shared';
import { PatternMatch } from './pattern-recognizer';

export interface SignalOutcome {
  id: string;
  timestamp: number;
  priceAtSignal: number;
  direction: 'up' | 'down' | 'sideways' | 'mixed';
  confidence: number;
  patterns: string[]; // Pattern names that were active

  // Targets
  target24h?: number;
  target48h?: number;
  target72h?: number;

  // Outcomes (filled in later)
  price24h?: number;
  price48h?: number;
  price72h?: number;
  outcome24h?: 'correct' | 'incorrect' | 'neutral';
  outcome48h?: 'correct' | 'incorrect' | 'neutral';
  outcome72h?: 'correct' | 'incorrect' | 'neutral';
  checkedAt?: number;
}

export interface PatternStats {
  pattern: string;
  totalSignals: number;
  correct24h: number;
  correct48h: number;
  correct72h: number;
  accuracy24h: number;
  accuracy48h: number;
  accuracy72h: number;
  avgReturn24h: number;
  avgReturn48h: number;
  avgReturn72h: number;
  lastUpdated: number;
}

export interface LearningData {
  lastUpdated: string;
  signals: SignalOutcome[];
  patternStats: PatternStats[];
  overallStats: {
    totalSignals: number;
    accuracy24h: number;
    accuracy48h: number;
    accuracy72h: number;
    currentStreak: number;
    bestStreak: number;
    avgConfidence: number;
  };
}

const BLOB_KEY = 'signal-history' as const;

export class HistoricalLearner {
  private data: LearningData | null = null;

  /**
   * Load learning data from Blob storage
   */
  async loadData(): Promise<LearningData> {
    if (this.data) return this.data;

    const loaded = await loadFromBlob<LearningData>(BLOB_KEY);

    if (loaded) {
      this.data = loaded;
    } else {
      // Initialize empty learning data
      this.data = {
        lastUpdated: new Date().toISOString(),
        signals: [],
        patternStats: [],
        overallStats: {
          totalSignals: 0,
          accuracy24h: 0.5,
          accuracy48h: 0.5,
          accuracy72h: 0.5,
          currentStreak: 0,
          bestStreak: 0,
          avgConfidence: 0.5,
        },
      };
    }

    return this.data;
  }

  /**
   * Save learning data to Blob storage
   */
  async saveData(): Promise<boolean> {
    if (!this.data) return false;
    this.data.lastUpdated = new Date().toISOString();
    return saveToBlob(BLOB_KEY, this.data);
  }

  /**
   * Log a new signal with its patterns
   */
  async logSignal(
    price: number,
    direction: 'up' | 'down' | 'sideways' | 'mixed',
    confidence: number,
    patterns: PatternMatch[],
    targets?: { h24?: number; h48?: number; h72?: number }
  ): Promise<string> {
    await this.loadData();
    if (!this.data) throw new Error('Failed to load learning data');

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const signal: SignalOutcome = {
      id,
      timestamp: Date.now(),
      priceAtSignal: price,
      direction,
      confidence,
      patterns: patterns.map(p => p.pattern),
      target24h: targets?.h24,
      target48h: targets?.h48,
      target72h: targets?.h72,
    };

    this.data.signals.push(signal);

    // Keep only last 500 signals
    if (this.data.signals.length > 500) {
      this.data.signals = this.data.signals.slice(-500);
    }

    await this.saveData();
    console.log(`[HistoricalLearner] Logged signal ${id}: ${direction} @ $${price}`);

    return id;
  }

  /**
   * Check and update outcomes for pending signals
   * Call this regularly to track what actually happened
   */
  async checkOutcomes(currentPrice: number): Promise<number> {
    await this.loadData();
    if (!this.data) return 0;

    const now = Date.now();
    let updated = 0;

    for (const signal of this.data.signals) {
      // Check 24h outcome
      if (!signal.outcome24h && now - signal.timestamp >= 24 * 60 * 60 * 1000) {
        signal.price24h = currentPrice;
        signal.outcome24h = this.evaluateOutcome(signal, currentPrice, '24h');
        updated++;
      }

      // Check 48h outcome
      if (!signal.outcome48h && now - signal.timestamp >= 48 * 60 * 60 * 1000) {
        signal.price48h = currentPrice;
        signal.outcome48h = this.evaluateOutcome(signal, currentPrice, '48h');
        updated++;
      }

      // Check 72h outcome
      if (!signal.outcome72h && now - signal.timestamp >= 72 * 60 * 60 * 1000) {
        signal.price72h = currentPrice;
        signal.outcome72h = this.evaluateOutcome(signal, currentPrice, '72h');
        signal.checkedAt = now;
        updated++;
      }
    }

    if (updated > 0) {
      this.recalculateStats();
      await this.saveData();
      console.log(`[HistoricalLearner] Updated ${updated} outcomes`);
    }

    return updated;
  }

  /**
   * Evaluate if a prediction was correct
   */
  private evaluateOutcome(
    signal: SignalOutcome,
    currentPrice: number,
    timeframe: '24h' | '48h' | '72h'
  ): 'correct' | 'incorrect' | 'neutral' {
    const priceChange = ((currentPrice - signal.priceAtSignal) / signal.priceAtSignal) * 100;

    // Define what "correct" means
    const threshold = 0.5; // 0.5% minimum move to count

    if (signal.direction === 'up') {
      if (priceChange > threshold) return 'correct';
      if (priceChange < -threshold) return 'incorrect';
      return 'neutral';
    }

    if (signal.direction === 'down') {
      if (priceChange < -threshold) return 'correct';
      if (priceChange > threshold) return 'incorrect';
      return 'neutral';
    }

    if (signal.direction === 'sideways' || signal.direction === 'mixed') {
      // Sideways is correct if price stayed within 2%
      if (Math.abs(priceChange) < 2) return 'correct';
      return 'incorrect';
    }

    return 'neutral';
  }

  /**
   * Recalculate all statistics
   */
  private recalculateStats(): void {
    if (!this.data) return;

    // Calculate overall stats
    const checkedSignals = this.data.signals.filter(s => s.outcome24h);

    if (checkedSignals.length > 0) {
      const correct24h = checkedSignals.filter(s => s.outcome24h === 'correct').length;
      const correct48h = checkedSignals.filter(s => s.outcome48h === 'correct').length;
      const correct72h = checkedSignals.filter(s => s.outcome72h === 'correct').length;

      const total24h = checkedSignals.filter(s => s.outcome24h && s.outcome24h !== 'neutral').length;
      const total48h = checkedSignals.filter(s => s.outcome48h && s.outcome48h !== 'neutral').length;
      const total72h = checkedSignals.filter(s => s.outcome72h && s.outcome72h !== 'neutral').length;

      this.data.overallStats.totalSignals = this.data.signals.length;
      this.data.overallStats.accuracy24h = total24h > 0 ? correct24h / total24h : 0.5;
      this.data.overallStats.accuracy48h = total48h > 0 ? correct48h / total48h : 0.5;
      this.data.overallStats.accuracy72h = total72h > 0 ? correct72h / total72h : 0.5;
      this.data.overallStats.avgConfidence =
        checkedSignals.reduce((sum, s) => sum + s.confidence, 0) / checkedSignals.length;

      // Calculate streak
      let streak = 0;
      for (let i = checkedSignals.length - 1; i >= 0; i--) {
        if (checkedSignals[i].outcome24h === 'correct') {
          streak++;
        } else if (checkedSignals[i].outcome24h === 'incorrect') {
          break;
        }
      }
      this.data.overallStats.currentStreak = streak;
      this.data.overallStats.bestStreak = Math.max(
        this.data.overallStats.bestStreak,
        streak
      );
    }

    // Calculate per-pattern stats
    this.recalculatePatternStats();
  }

  /**
   * Recalculate stats for each pattern
   */
  private recalculatePatternStats(): void {
    if (!this.data) return;

    const patternMap = new Map<string, {
      signals: SignalOutcome[];
      correct24h: number;
      correct48h: number;
      correct72h: number;
      returns24h: number[];
      returns48h: number[];
      returns72h: number[];
    }>();

    // Group signals by pattern
    for (const signal of this.data.signals) {
      if (!signal.outcome24h) continue; // Only count checked signals

      for (const pattern of signal.patterns) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            signals: [],
            correct24h: 0,
            correct48h: 0,
            correct72h: 0,
            returns24h: [],
            returns48h: [],
            returns72h: [],
          });
        }

        const stats = patternMap.get(pattern)!;
        stats.signals.push(signal);

        if (signal.outcome24h === 'correct') stats.correct24h++;
        if (signal.outcome48h === 'correct') stats.correct48h++;
        if (signal.outcome72h === 'correct') stats.correct72h++;

        // Calculate returns
        if (signal.price24h) {
          const return24h = ((signal.price24h - signal.priceAtSignal) / signal.priceAtSignal) * 100;
          stats.returns24h.push(signal.direction === 'down' ? -return24h : return24h);
        }
        if (signal.price48h) {
          const return48h = ((signal.price48h - signal.priceAtSignal) / signal.priceAtSignal) * 100;
          stats.returns48h.push(signal.direction === 'down' ? -return48h : return48h);
        }
        if (signal.price72h) {
          const return72h = ((signal.price72h - signal.priceAtSignal) / signal.priceAtSignal) * 100;
          stats.returns72h.push(signal.direction === 'down' ? -return72h : return72h);
        }
      }
    }

    // Convert to PatternStats array
    this.data.patternStats = Array.from(patternMap.entries()).map(([pattern, stats]) => ({
      pattern,
      totalSignals: stats.signals.length,
      correct24h: stats.correct24h,
      correct48h: stats.correct48h,
      correct72h: stats.correct72h,
      accuracy24h: stats.signals.length > 0 ? stats.correct24h / stats.signals.length : 0.5,
      accuracy48h: stats.signals.length > 0 ? stats.correct48h / stats.signals.length : 0.5,
      accuracy72h: stats.signals.length > 0 ? stats.correct72h / stats.signals.length : 0.5,
      avgReturn24h: stats.returns24h.length > 0
        ? stats.returns24h.reduce((a, b) => a + b, 0) / stats.returns24h.length
        : 0,
      avgReturn48h: stats.returns48h.length > 0
        ? stats.returns48h.reduce((a, b) => a + b, 0) / stats.returns48h.length
        : 0,
      avgReturn72h: stats.returns72h.length > 0
        ? stats.returns72h.reduce((a, b) => a + b, 0) / stats.returns72h.length
        : 0,
      lastUpdated: Date.now(),
    }));
  }

  /**
   * Get accuracy adjustment for a pattern based on historical data
   * Returns a multiplier to apply to the pattern's confidence
   */
  getPatternAccuracyMultiplier(pattern: string, timeframe: '24h' | '48h' | '72h'): number {
    if (!this.data) return 1.0;

    const stats = this.data.patternStats.find(s => s.pattern === pattern);
    if (!stats || stats.totalSignals < 5) {
      // Not enough data, use default
      return 1.0;
    }

    let accuracy: number;
    switch (timeframe) {
      case '24h': accuracy = stats.accuracy24h; break;
      case '48h': accuracy = stats.accuracy48h; break;
      case '72h': accuracy = stats.accuracy72h; break;
    }

    // Convert accuracy to multiplier
    // 50% accuracy = 1.0x (no adjustment)
    // 70% accuracy = 1.4x (boost)
    // 30% accuracy = 0.6x (reduce)
    return accuracy * 2;
  }

  /**
   * Adjust pattern confidence based on historical performance
   */
  adjustPatternConfidence(patterns: PatternMatch[]): PatternMatch[] {
    if (!this.data) return patterns;

    return patterns.map(p => {
      const multiplier = this.getPatternAccuracyMultiplier(p.pattern, p.timeframe);
      const stats = this.data!.patternStats.find(s => s.pattern === p.pattern);

      return {
        ...p,
        confidence: Math.min(0.95, p.confidence * multiplier),
        historicalAccuracy: stats?.accuracy72h ?? p.historicalAccuracy,
      };
    });
  }

  /**
   * Get insights from historical data
   */
  getInsights(): {
    bestPatterns: { pattern: string; accuracy: number; avgReturn: number }[];
    worstPatterns: { pattern: string; accuracy: number; avgReturn: number }[];
    recentPerformance: string;
    streak: string;
  } {
    if (!this.data || this.data.patternStats.length === 0) {
      return {
        bestPatterns: [],
        worstPatterns: [],
        recentPerformance: 'No data yet',
        streak: 'No streak',
      };
    }

    const sortedByAccuracy = [...this.data.patternStats]
      .filter(s => s.totalSignals >= 3)
      .sort((a, b) => b.accuracy72h - a.accuracy72h);

    const bestPatterns = sortedByAccuracy.slice(0, 3).map(s => ({
      pattern: s.pattern,
      accuracy: s.accuracy72h,
      avgReturn: s.avgReturn72h,
    }));

    const worstPatterns = sortedByAccuracy.slice(-3).reverse().map(s => ({
      pattern: s.pattern,
      accuracy: s.accuracy72h,
      avgReturn: s.avgReturn72h,
    }));

    const accuracy = this.data.overallStats.accuracy72h;
    let recentPerformance: string;
    if (accuracy >= 0.7) recentPerformance = 'Excellent - 70%+ accuracy';
    else if (accuracy >= 0.6) recentPerformance = 'Good - 60%+ accuracy';
    else if (accuracy >= 0.5) recentPerformance = 'Fair - around 50%';
    else recentPerformance = 'Below average - review signals';

    const streak = this.data.overallStats.currentStreak > 0
      ? `${this.data.overallStats.currentStreak} correct in a row`
      : 'No active streak';

    return { bestPatterns, worstPatterns, recentPerformance, streak };
  }

  /**
   * Get statistics summary
   */
  getStats(): LearningData['overallStats'] & { patternCount: number } {
    if (!this.data) {
      return {
        totalSignals: 0,
        accuracy24h: 0.5,
        accuracy48h: 0.5,
        accuracy72h: 0.5,
        currentStreak: 0,
        bestStreak: 0,
        avgConfidence: 0.5,
        patternCount: 0,
      };
    }

    return {
      ...this.data.overallStats,
      patternCount: this.data.patternStats.length,
    };
  }
}
