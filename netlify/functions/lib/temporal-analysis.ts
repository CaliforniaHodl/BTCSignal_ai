// Temporal Analysis
// Synthesizes PAST + PRESENT + FUTURE for holistic predictions
// "Past is bullish, 72h might top... weigh it all together"

export interface TemporalSignal {
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string[];
}

export interface TemporalContext {
  past: TemporalSignal;      // What happened (last 24-48h)
  present: TemporalSignal;   // Current state
  future: TemporalSignal;    // 72h projection
}

export interface SynthesizedPrediction {
  direction: 'up' | 'down' | 'sideways' | 'mixed';
  confidence: number;
  isSpeculation: boolean;    // True if confidence < 50%
  timeframe: 'short' | 'medium' | 'extended';

  // Temporal breakdown
  pastBias: 'bullish' | 'bearish' | 'neutral';
  presentBias: 'bullish' | 'bearish' | 'neutral';
  futureBias: 'bullish' | 'bearish' | 'neutral';

  // Conflict detection
  hasConflict: boolean;
  conflictType?: 'past_vs_future' | 'present_vs_future' | 'all_mixed';

  // Final synthesis
  synthesis: string;
  warnings: string[];
  actionableAdvice: string;
}

// Confidence thresholds
const CONFIDENCE_FLOOR = 0.50;        // Below this = speculation
const HIGH_CONFIDENCE = 0.70;          // Strong signal
const SPECULATION_LABEL = 'SPECULATION';

// Temporal weights for synthesis
const WEIGHTS = {
  past: 0.25,      // What happened matters but less than now
  present: 0.45,   // Current state is most important
  future: 0.30,    // 72h projection adds context
};

export class TemporalAnalyzer {

  /**
   * Synthesize past, present, and future into a holistic prediction
   */
  synthesize(context: TemporalContext): SynthesizedPrediction {
    const { past, present, future } = context;

    // Calculate weighted scores
    const bullishScore =
      (past.bias === 'bullish' ? past.confidence * WEIGHTS.past : 0) +
      (present.bias === 'bullish' ? present.confidence * WEIGHTS.present : 0) +
      (future.bias === 'bullish' ? future.confidence * WEIGHTS.future : 0);

    const bearishScore =
      (past.bias === 'bearish' ? past.confidence * WEIGHTS.past : 0) +
      (present.bias === 'bearish' ? present.confidence * WEIGHTS.present : 0) +
      (future.bias === 'bearish' ? future.confidence * WEIGHTS.future : 0);

    // Detect conflicts
    const hasConflict = this.detectConflict(past, present, future);
    const conflictType = this.getConflictType(past, present, future);

    // Calculate final confidence
    let confidence = Math.abs(bullishScore - bearishScore) / (bullishScore + bearishScore + 0.01);

    // Apply conflict penalty
    if (hasConflict) {
      confidence *= 0.75; // Reduce confidence when signals conflict
    }

    // Determine direction
    let direction: 'up' | 'down' | 'sideways' | 'mixed';
    if (Math.abs(bullishScore - bearishScore) < 0.1) {
      direction = hasConflict ? 'mixed' : 'sideways';
    } else if (bullishScore > bearishScore) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    // Check if this is speculation
    const isSpeculation = confidence < CONFIDENCE_FLOOR;

    // Determine timeframe reliability
    let timeframe: 'short' | 'medium' | 'extended';
    if (confidence >= HIGH_CONFIDENCE) {
      timeframe = 'extended'; // Can trust 72h
    } else if (confidence >= CONFIDENCE_FLOOR) {
      timeframe = 'medium';   // Trust 48h
    } else {
      timeframe = 'short';    // Only trust 24h
    }

    // Generate synthesis narrative
    const synthesis = this.generateSynthesis(
      past, present, future, direction, confidence, hasConflict
    );

    // Generate warnings
    const warnings = this.generateWarnings(
      past, present, future, confidence, hasConflict, conflictType
    );

    // Generate actionable advice
    const actionableAdvice = this.generateAdvice(
      direction, confidence, hasConflict, timeframe, future
    );

    return {
      direction,
      confidence: Math.round(confidence * 100) / 100,
      isSpeculation,
      timeframe,
      pastBias: past.bias,
      presentBias: present.bias,
      futureBias: future.bias,
      hasConflict,
      conflictType,
      synthesis,
      warnings,
      actionableAdvice,
    };
  }

  /**
   * Detect if there's a conflict between timeframes
   */
  private detectConflict(
    past: TemporalSignal,
    present: TemporalSignal,
    future: TemporalSignal
  ): boolean {
    const biases = [past.bias, present.bias, future.bias].filter(b => b !== 'neutral');

    if (biases.length < 2) return false;

    const hasBullish = biases.includes('bullish');
    const hasBearish = biases.includes('bearish');

    return hasBullish && hasBearish;
  }

  /**
   * Identify the type of conflict
   */
  private getConflictType(
    past: TemporalSignal,
    present: TemporalSignal,
    future: TemporalSignal
  ): 'past_vs_future' | 'present_vs_future' | 'all_mixed' | undefined {
    if (!this.detectConflict(past, present, future)) return undefined;

    // Check if past and future conflict but present is neutral
    if (past.bias !== 'neutral' && future.bias !== 'neutral' &&
        past.bias !== future.bias && present.bias === 'neutral') {
      return 'past_vs_future';
    }

    // Check if present and future conflict
    if (present.bias !== 'neutral' && future.bias !== 'neutral' &&
        present.bias !== future.bias) {
      return 'present_vs_future';
    }

    return 'all_mixed';
  }

  /**
   * Generate the synthesis narrative
   */
  private generateSynthesis(
    past: TemporalSignal,
    present: TemporalSignal,
    future: TemporalSignal,
    direction: string,
    confidence: number,
    hasConflict: boolean
  ): string {
    const parts: string[] = [];

    // Past narrative
    if (past.bias !== 'neutral') {
      parts.push(`Past 24-48h: ${past.bias} (${past.reasoning[0] || 'momentum'})`);
    }

    // Present narrative
    if (present.bias !== 'neutral') {
      parts.push(`Current: ${present.bias} (${present.reasoning[0] || 'indicators'})`);
    }

    // Future narrative
    if (future.bias !== 'neutral') {
      parts.push(`72h outlook: ${future.bias} (${future.reasoning[0] || 'pattern'})`);
    }

    // Synthesis
    if (hasConflict) {
      if (direction === 'up') {
        parts.push('→ Net bullish but watch for reversal signals');
      } else if (direction === 'down') {
        parts.push('→ Net bearish but recovery possible');
      } else {
        parts.push('→ Mixed signals - reduce position size');
      }
    } else {
      const confLabel = confidence >= HIGH_CONFIDENCE ? 'high' :
                        confidence >= CONFIDENCE_FLOOR ? 'moderate' : 'low';
      parts.push(`→ ${direction.toUpperCase()} with ${confLabel} confidence`);
    }

    return parts.join(' | ');
  }

  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(
    past: TemporalSignal,
    present: TemporalSignal,
    future: TemporalSignal,
    confidence: number,
    hasConflict: boolean,
    conflictType?: string
  ): string[] {
    const warnings: string[] = [];

    // Speculation warning
    if (confidence < CONFIDENCE_FLOOR) {
      warnings.push(`⚠️ ${SPECULATION_LABEL}: Confidence below 50% - treat as educated guess`);
    }

    // Conflict warnings
    if (conflictType === 'present_vs_future') {
      warnings.push('⚠️ Current momentum may reverse in 72h - set tight stops');
    }

    if (conflictType === 'past_vs_future') {
      warnings.push('⚠️ Recent move may be exhausting - watch for trend change');
    }

    if (conflictType === 'all_mixed') {
      warnings.push('⚠️ All timeframes conflicting - high uncertainty, reduce size');
    }

    // Topping/bottoming warnings
    if (past.bias === 'bullish' && present.bias === 'bullish' && future.bias === 'bearish') {
      warnings.push('🔺 Potential TOP forming: Past & present bullish but 72h turning bearish');
    }

    if (past.bias === 'bearish' && present.bias === 'bearish' && future.bias === 'bullish') {
      warnings.push('🔻 Potential BOTTOM forming: Past & present bearish but 72h turning bullish');
    }

    // Overextension warnings
    if (past.confidence > 0.8 && past.bias === present.bias && future.bias !== past.bias) {
      warnings.push('⚡ Strong move may be overextended - mean reversion likely');
    }

    return warnings;
  }

  /**
   * Generate actionable trading advice
   */
  private generateAdvice(
    direction: string,
    confidence: number,
    hasConflict: boolean,
    timeframe: string,
    future: TemporalSignal
  ): string {
    // Speculation - don't trade
    if (confidence < CONFIDENCE_FLOOR) {
      return 'WAIT: Signals too weak for directional bet. Sit on hands or reduce exposure.';
    }

    // High confidence, no conflict
    if (confidence >= HIGH_CONFIDENCE && !hasConflict) {
      if (direction === 'up') {
        return 'LONG: Strong alignment across timeframes. Full position, trail stops.';
      } else if (direction === 'down') {
        return 'SHORT/HEDGE: Strong bearish alignment. Reduce longs or hedge.';
      }
    }

    // Moderate confidence with future conflict
    if (hasConflict && future.bias !== 'neutral') {
      if (direction === 'up' && future.bias === 'bearish') {
        return 'CAUTIOUS LONG: Bullish now but 72h shows weakness. Take profits early, tight stops.';
      }
      if (direction === 'down' && future.bias === 'bullish') {
        return 'CAUTIOUS SHORT: Bearish now but 72h shows recovery. Cover early, don\'t overstay.';
      }
    }

    // Mixed signals
    if (direction === 'mixed' || direction === 'sideways') {
      return 'RANGE: No clear direction. Trade the range or wait for breakout confirmation.';
    }

    // Default moderate confidence
    if (direction === 'up') {
      return 'LEAN LONG: Bullish bias but size down. Wait for dips to add.';
    } else {
      return 'LEAN SHORT: Bearish bias but size down. Wait for bounces to add.';
    }
  }

  /**
   * Create temporal context from prediction data
   */
  static createContext(
    pastPatterns: { bias: 'bullish' | 'bearish' | 'neutral'; confidence: number; reasoning: string[] },
    presentIndicators: { bias: 'bullish' | 'bearish' | 'neutral'; confidence: number; reasoning: string[] },
    futureProjection: { bias: 'bullish' | 'bearish' | 'neutral'; confidence: number; reasoning: string[] }
  ): TemporalContext {
    return {
      past: pastPatterns,
      present: presentIndicators,
      future: futureProjection,
    };
  }

  /**
   * Get confidence label
   */
  static getConfidenceLabel(confidence: number): string {
    if (confidence < CONFIDENCE_FLOOR) return SPECULATION_LABEL;
    if (confidence < 0.60) return 'LOW';
    if (confidence < 0.70) return 'MODERATE';
    if (confidence < 0.80) return 'HIGH';
    return 'VERY HIGH';
  }

  /**
   * Check if prediction should be treated as speculation
   */
  static isSpeculation(confidence: number): boolean {
    return confidence < CONFIDENCE_FLOOR;
  }
}
