// Strategy Validator - Bridge between Backtester and Trading Bot
// Only allows strategies that pass professional validation criteria

import fs from 'fs';
import path from 'path';

// Validation thresholds - STRICT requirements for live trading
const VALIDATION_THRESHOLDS = {
  minRobustnessScore: 50,        // Minimum overall robustness score (0-100)
  minWalkForwardEfficiency: 40,  // Minimum walk-forward efficiency %
  minOutOfSampleTrades: 20,      // Need at least 20 OOS trades
  maxOverfitScore: 50,           // Maximum overfit risk score
  minProfitFactor: 1.2,          // Minimum profit factor
  maxDrawdown: 35,               // Maximum acceptable drawdown %
  minWinRate: 35,                // Minimum win rate %
  minSharpeRatio: 0.5,           // Minimum Sharpe ratio
  requireBeatBenchmark: false,   // Must beat buy-and-hold?
};

export interface BacktestValidation {
  strategyId: string;
  strategyDescription: string;
  validatedAt: string;

  // Core metrics
  totalReturn: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;

  // Professional validation
  robustnessScore: number;
  walkForwardEfficiency: number;
  outOfSampleReturn: number;
  outOfSampleTrades: number;
  overfitScore: number;

  // Benchmark comparison
  benchmarkReturn: number;
  alpha: number;

  // Regime analysis
  bullMarketReturn: number;
  bearMarketReturn: number;

  // Validation result
  passed: boolean;
  failureReasons: string[];
  warnings: string[];

  // Recommended settings for live trading
  recommendedSettings: {
    maxPositionPercent: number;
    stopLossPercent: number;
    minConfidence: number;
    tradeCooldownHours: number;
  };
}

export interface ValidatedStrategy {
  id: string;
  description: string;
  validation: BacktestValidation;
  createdAt: string;
  expiresAt: string; // Validations expire after 30 days
  isActive: boolean;
}

// Validate backtest results against professional criteria
export function validateBacktestResults(
  strategyDescription: string,
  backtestStats: any,
  walkForwardResults: any,
  robustnessResults: any,
  overfitResults: any,
  benchmarkResults: any,
  regimeResults: any
): BacktestValidation {
  const failureReasons: string[] = [];
  const warnings: string[] = [];

  // Extract key metrics
  const robustnessScore = robustnessResults?.total || 0;
  const wfe = walkForwardResults?.summary?.walkForwardEfficiency || 0;
  const oosTrades = walkForwardResults?.summary?.totalOutOfSampleTrades || 0;
  const oosReturn = walkForwardResults?.summary?.avgOutOfSampleReturn || 0;
  const overfitScore = overfitResults?.overfitScore || 100;
  const alpha = (backtestStats?.totalReturn || 0) - (benchmarkResults?.totalReturn || 0);

  // Check each threshold
  if (robustnessScore < VALIDATION_THRESHOLDS.minRobustnessScore) {
    failureReasons.push(`Robustness score ${robustnessScore.toFixed(0)} below minimum ${VALIDATION_THRESHOLDS.minRobustnessScore}`);
  }

  if (wfe < VALIDATION_THRESHOLDS.minWalkForwardEfficiency) {
    failureReasons.push(`Walk-forward efficiency ${wfe.toFixed(0)}% below minimum ${VALIDATION_THRESHOLDS.minWalkForwardEfficiency}%`);
  }

  if (oosTrades < VALIDATION_THRESHOLDS.minOutOfSampleTrades) {
    failureReasons.push(`Only ${oosTrades} out-of-sample trades, need at least ${VALIDATION_THRESHOLDS.minOutOfSampleTrades}`);
  }

  if (overfitScore > VALIDATION_THRESHOLDS.maxOverfitScore) {
    failureReasons.push(`Overfit risk score ${overfitScore.toFixed(0)} exceeds maximum ${VALIDATION_THRESHOLDS.maxOverfitScore}`);
  }

  if ((backtestStats?.profitFactor || 0) < VALIDATION_THRESHOLDS.minProfitFactor) {
    failureReasons.push(`Profit factor ${(backtestStats?.profitFactor || 0).toFixed(2)} below minimum ${VALIDATION_THRESHOLDS.minProfitFactor}`);
  }

  if ((backtestStats?.maxDrawdown || 100) > VALIDATION_THRESHOLDS.maxDrawdown) {
    failureReasons.push(`Max drawdown ${(backtestStats?.maxDrawdown || 0).toFixed(1)}% exceeds maximum ${VALIDATION_THRESHOLDS.maxDrawdown}%`);
  }

  if ((backtestStats?.winRate || 0) < VALIDATION_THRESHOLDS.minWinRate) {
    failureReasons.push(`Win rate ${(backtestStats?.winRate || 0).toFixed(1)}% below minimum ${VALIDATION_THRESHOLDS.minWinRate}%`);
  }

  if ((backtestStats?.sharpeRatio || 0) < VALIDATION_THRESHOLDS.minSharpeRatio) {
    failureReasons.push(`Sharpe ratio ${(backtestStats?.sharpeRatio || 0).toFixed(2)} below minimum ${VALIDATION_THRESHOLDS.minSharpeRatio}`);
  }

  if (VALIDATION_THRESHOLDS.requireBeatBenchmark && alpha < 0) {
    failureReasons.push(`Strategy underperformed buy-and-hold by ${Math.abs(alpha).toFixed(1)}%`);
  }

  // Add warnings for marginal metrics
  if (overfitScore > 25 && overfitScore <= 50) {
    warnings.push(`Moderate overfit risk (${overfitScore.toFixed(0)}%) - monitor closely`);
  }

  if (oosReturn < 5 && oosReturn > 0) {
    warnings.push(`Low out-of-sample return (${oosReturn.toFixed(1)}%) - may not be worth the risk`);
  }

  if ((regimeResults?.summary?.bearMarketReturn || 0) < -10) {
    warnings.push(`Significant losses in bear markets (${(regimeResults?.summary?.bearMarketReturn || 0).toFixed(1)}%)`);
  }

  // Calculate recommended settings based on validation
  const recommendedSettings = calculateRecommendedSettings(
    backtestStats,
    robustnessScore,
    overfitScore
  );

  // Generate unique ID
  const strategyId = generateStrategyId(strategyDescription);

  return {
    strategyId,
    strategyDescription,
    validatedAt: new Date().toISOString(),

    totalReturn: backtestStats?.totalReturn || 0,
    winRate: backtestStats?.winRate || 0,
    profitFactor: backtestStats?.profitFactor || 0,
    maxDrawdown: backtestStats?.maxDrawdown || 0,
    sharpeRatio: backtestStats?.sharpeRatio || 0,
    totalTrades: backtestStats?.totalTrades || 0,

    robustnessScore,
    walkForwardEfficiency: wfe,
    outOfSampleReturn: oosReturn,
    outOfSampleTrades: oosTrades,
    overfitScore,

    benchmarkReturn: benchmarkResults?.totalReturn || 0,
    alpha,

    bullMarketReturn: regimeResults?.summary?.bullMarketReturn || 0,
    bearMarketReturn: regimeResults?.summary?.bearMarketReturn || 0,

    passed: failureReasons.length === 0,
    failureReasons,
    warnings,

    recommendedSettings
  };
}

// Calculate conservative trading settings based on backtest performance
function calculateRecommendedSettings(
  stats: any,
  robustnessScore: number,
  overfitScore: number
) {
  // More conservative settings for lower scores
  const confidenceMultiplier = Math.max(0.5, robustnessScore / 100);
  const riskMultiplier = Math.max(0.3, (100 - overfitScore) / 100);

  // Base position size on drawdown and robustness
  let maxPositionPercent = 10; // Start with 10%
  if (stats?.maxDrawdown > 25) maxPositionPercent = 5;
  if (stats?.maxDrawdown > 35) maxPositionPercent = 3;
  maxPositionPercent *= riskMultiplier;

  // Stop loss based on historical performance
  let stopLossPercent = 3; // Default 3%
  if (stats?.avgLoss) {
    // Set stop at 1.5x average loss
    stopLossPercent = Math.min(5, Math.max(1, stats.avgLoss * 1.5));
  }

  // Minimum confidence scales with robustness
  const minConfidence = Math.max(0.6, 0.5 + (1 - confidenceMultiplier) * 0.3);

  // Cooldown increases with lower scores
  let tradeCooldownHours = 4;
  if (robustnessScore < 60) tradeCooldownHours = 6;
  if (robustnessScore < 50) tradeCooldownHours = 8;

  return {
    maxPositionPercent: Math.round(maxPositionPercent * 10) / 10,
    stopLossPercent: Math.round(stopLossPercent * 10) / 10,
    minConfidence: Math.round(minConfidence * 100) / 100,
    tradeCooldownHours
  };
}

// Generate deterministic ID from strategy description
function generateStrategyId(description: string): string {
  let hash = 0;
  for (let i = 0; i < description.length; i++) {
    const char = description.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `strat_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

// Storage for validated strategies
const VALIDATED_STRATEGIES_FILE = path.join(__dirname, 'validated-strategies.json');

export function loadValidatedStrategies(): ValidatedStrategy[] {
  try {
    if (fs.existsSync(VALIDATED_STRATEGIES_FILE)) {
      const data = fs.readFileSync(VALIDATED_STRATEGIES_FILE, 'utf-8');
      const strategies: ValidatedStrategy[] = JSON.parse(data);

      // Filter out expired strategies
      const now = new Date();
      return strategies.filter(s => new Date(s.expiresAt) > now);
    }
  } catch (e) {
    console.error('Error loading validated strategies:', e);
  }
  return [];
}

export function saveValidatedStrategy(validation: BacktestValidation): ValidatedStrategy | null {
  if (!validation.passed) {
    console.log('Strategy failed validation, not saving');
    return null;
  }

  const strategies = loadValidatedStrategies();

  // Check if strategy already exists
  const existingIdx = strategies.findIndex(s => s.id === validation.strategyId);

  const newStrategy: ValidatedStrategy = {
    id: validation.strategyId,
    description: validation.strategyDescription,
    validation,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    isActive: true
  };

  if (existingIdx >= 0) {
    strategies[existingIdx] = newStrategy;
  } else {
    strategies.push(newStrategy);
  }

  try {
    fs.writeFileSync(VALIDATED_STRATEGIES_FILE, JSON.stringify(strategies, null, 2));
    return newStrategy;
  } catch (e) {
    console.error('Error saving validated strategy:', e);
    return null;
  }
}

// Check if current strategy is validated for live trading
export function isStrategyValidated(strategyDescription: string): {
  isValid: boolean;
  strategy: ValidatedStrategy | null;
  reason: string;
} {
  const strategies = loadValidatedStrategies();
  const strategyId = generateStrategyId(strategyDescription);

  const found = strategies.find(s => s.id === strategyId && s.isActive);

  if (!found) {
    return {
      isValid: false,
      strategy: null,
      reason: 'Strategy has not been validated. Run backtest with validation first.'
    };
  }

  if (new Date(found.expiresAt) < new Date()) {
    return {
      isValid: false,
      strategy: found,
      reason: 'Strategy validation has expired. Re-run backtest to revalidate.'
    };
  }

  return {
    isValid: true,
    strategy: found,
    reason: 'Strategy is validated for live trading'
  };
}

// Get trading config adjustments based on validated strategy
export function getTradingConfigFromValidation(strategyId: string): {
  success: boolean;
  config?: {
    maxPositionUsd: number;
    riskPerTradePercent: number;
    minConfidence: number;
    tradeCooldownMs: number;
  };
  error?: string;
} {
  const strategies = loadValidatedStrategies();
  const found = strategies.find(s => s.id === strategyId && s.isActive);

  if (!found) {
    return { success: false, error: 'Strategy not found' };
  }

  const settings = found.validation.recommendedSettings;

  return {
    success: true,
    config: {
      maxPositionUsd: 100 * (settings.maxPositionPercent / 100), // Based on $100 capital
      riskPerTradePercent: settings.stopLossPercent,
      minConfidence: settings.minConfidence,
      tradeCooldownMs: settings.tradeCooldownHours * 60 * 60 * 1000
    }
  };
}

// Print validation report
export function printValidationReport(validation: BacktestValidation): void {
  console.log('\n========================================');
  console.log('STRATEGY VALIDATION REPORT');
  console.log('========================================\n');

  console.log(`Strategy: ${validation.strategyDescription.substring(0, 50)}...`);
  console.log(`ID: ${validation.strategyId}`);
  console.log(`Validated: ${validation.validatedAt}\n`);

  console.log('--- CORE METRICS ---');
  console.log(`Total Return: ${validation.totalReturn.toFixed(2)}%`);
  console.log(`Win Rate: ${validation.winRate.toFixed(1)}%`);
  console.log(`Profit Factor: ${validation.profitFactor.toFixed(2)}`);
  console.log(`Max Drawdown: ${validation.maxDrawdown.toFixed(1)}%`);
  console.log(`Sharpe Ratio: ${validation.sharpeRatio.toFixed(2)}`);
  console.log(`Total Trades: ${validation.totalTrades}\n`);

  console.log('--- PROFESSIONAL VALIDATION ---');
  console.log(`Robustness Score: ${validation.robustnessScore.toFixed(0)}/100`);
  console.log(`Walk-Forward Efficiency: ${validation.walkForwardEfficiency.toFixed(1)}%`);
  console.log(`Out-of-Sample Return: ${validation.outOfSampleReturn.toFixed(2)}%`);
  console.log(`Out-of-Sample Trades: ${validation.outOfSampleTrades}`);
  console.log(`Overfit Risk: ${validation.overfitScore.toFixed(0)}/100\n`);

  console.log('--- BENCHMARK ---');
  console.log(`Buy & Hold Return: ${validation.benchmarkReturn.toFixed(2)}%`);
  console.log(`Alpha: ${validation.alpha >= 0 ? '+' : ''}${validation.alpha.toFixed(2)}%\n`);

  console.log('--- REGIME PERFORMANCE ---');
  console.log(`Bull Market: ${validation.bullMarketReturn.toFixed(2)}%`);
  console.log(`Bear Market: ${validation.bearMarketReturn.toFixed(2)}%\n`);

  if (validation.passed) {
    console.log('========================================');
    console.log('VALIDATION: PASSED');
    console.log('========================================\n');

    console.log('Recommended Trading Settings:');
    console.log(`  Max Position: ${validation.recommendedSettings.maxPositionPercent}%`);
    console.log(`  Stop Loss: ${validation.recommendedSettings.stopLossPercent}%`);
    console.log(`  Min Confidence: ${(validation.recommendedSettings.minConfidence * 100).toFixed(0)}%`);
    console.log(`  Trade Cooldown: ${validation.recommendedSettings.tradeCooldownHours} hours`);
  } else {
    console.log('========================================');
    console.log('VALIDATION: FAILED');
    console.log('========================================\n');

    console.log('Failure Reasons:');
    validation.failureReasons.forEach(r => console.log(`  - ${r}`));
  }

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:');
    validation.warnings.forEach(w => console.log(`  - ${w}`));
  }
}
