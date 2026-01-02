import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config, validateConfig } from './config.js';
import { CoinbaseClient, OrderResult } from './coinbase-client.js';

// Import signal generation from main project
import { DataProvider } from '../netlify/functions/lib/data-provider.js';
import { TechnicalAnalyzer } from '../netlify/functions/lib/technical-analysis.js';
import { PredictionEngine, Prediction } from '../netlify/functions/lib/prediction-engine.js';
import { DerivativesAnalyzer } from '../netlify/functions/lib/derivatives-analyzer.js';

// NEW: Import intelligence stack
import { MarketDataCache } from '../netlify/functions/lib/market-data-cache.js';
import { PatternRecognizer, PatternMatch } from '../netlify/functions/lib/pattern-recognizer.js';
import { HistoricalLearner } from '../netlify/functions/lib/historical-learner.js';
import { TemporalAnalyzer } from '../netlify/functions/lib/temporal-analysis.js';

interface TradeLog {
  timestamp: string;
  action: 'BUY' | 'SELL' | 'SKIP';
  reason: string;
  signal?: {
    direction: string;
    confidence: number;
    targetPrice: number | null;
    stopLoss: number | null;
    // Extended targets
    target24h?: number;
    target48h?: number;
    target72h?: number;
    // Temporal synthesis
    temporalAdvice?: string;
    isSpeculation?: boolean;
    // Patterns
    dominantPattern?: string;
    patternBias?: string;
  };
  trade?: {
    orderId: string;
    price: number;
    amount: number;
    usdValue: number;
  };
  balance?: {
    usd: number;
    btc: number;
  };
  // Historical learning reference
  signalId?: string;
}

interface BotState {
  lastTradeTime: number;
  tradestoday: number;
  lastTradeDate: string;
  dailyPnl: number;
  openPosition: {
    btcAmount: number;
    entryPrice: number;
    stopLossOrderId?: string;
    takeProfitOrderId?: string;
  } | null;
}

export class TradingBot {
  private client: CoinbaseClient;
  private dataProvider: DataProvider;
  private technicalAnalyzer: TechnicalAnalyzer;
  private predictionEngine: PredictionEngine;
  private derivativesAnalyzer: DerivativesAnalyzer;

  // NEW: Intelligence stack
  private marketDataCache: MarketDataCache;
  private patternRecognizer: PatternRecognizer;
  private historicalLearner: HistoricalLearner;
  private temporalAnalyzer: TemporalAnalyzer;

  private state: BotState;
  private stateFile: string;
  private logFile: string;

  constructor() {
    this.client = new CoinbaseClient();
    this.dataProvider = new DataProvider();
    this.technicalAnalyzer = new TechnicalAnalyzer();
    this.predictionEngine = new PredictionEngine();
    this.derivativesAnalyzer = new DerivativesAnalyzer();

    // NEW: Initialize intelligence stack
    this.marketDataCache = new MarketDataCache();
    this.patternRecognizer = new PatternRecognizer();
    this.historicalLearner = new HistoricalLearner();
    this.temporalAnalyzer = new TemporalAnalyzer();

    // State and log files in the private bot directory
    const botDir = path.dirname(new URL(import.meta.url).pathname);
    this.stateFile = path.join(botDir, 'bot-state.json');
    this.logFile = path.join(botDir, 'trade-log.json');

    this.state = this.loadState();
  }

  private loadState(): BotState {
    try {
      if (fs.existsSync(this.stateFile)) {
        return JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
      }
    } catch (e) {
      console.log('Could not load state, starting fresh');
    }

    return {
      lastTradeTime: 0,
      tradestoday: 0,
      lastTradeDate: '',
      dailyPnl: 0,
      openPosition: null,
    };
  }

  private saveState(): void {
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  private logTrade(log: TradeLog): void {
    let logs: TradeLog[] = [];
    try {
      if (fs.existsSync(this.logFile)) {
        logs = JSON.parse(fs.readFileSync(this.logFile, 'utf-8'));
      }
    } catch (e) {
      logs = [];
    }

    logs.push(log);

    // Keep last 1000 logs
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    fs.writeFileSync(this.logFile, JSON.stringify(logs, null, 2));
  }

  /**
   * Get current signal from the analysis engine with full intelligence stack
   */
  async getSignal(): Promise<{ prediction: Prediction; signalId?: string }> {
    console.log('Fetching market data...');
    const marketData = await this.dataProvider.fetchData('BTC-USD', '1h', 100);

    console.log('Calculating indicators...');
    const indicators = this.technicalAnalyzer.calculateIndicators(marketData.data);
    const patterns = this.technicalAnalyzer.identifyPatterns(marketData.data, indicators);

    console.log('Fetching derivatives data...');
    const currentPrice = marketData.data[marketData.data.length - 1].close;
    const last24h = marketData.data.slice(-24);
    const price24hAgo = last24h[0].close;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

    let derivativesData = null;
    try {
      derivativesData = await this.derivativesAnalyzer.getDerivativesData(currentPrice, priceChange24h);
    } catch (e) {
      console.log('Could not fetch derivatives data, continuing without it');
    }

    // NEW: Load cached hourly trend data (from 24x daily fetches)
    console.log('Loading cached hourly trends...');
    let hourlyTrendData = null;
    try {
      hourlyTrendData = await this.marketDataCache.getHourlyTrendFactors();
      if (hourlyTrendData) {
        console.log(`  Hourly data age: ${hourlyTrendData.dataAge.toFixed(0)} minutes`);
        console.log(`  Funding trend: ${hourlyTrendData.fundingTrend}`);
        console.log(`  OI trend: ${hourlyTrendData.oiTrend}`);
      }
    } catch (e) {
      console.log('Could not load cached hourly data, continuing without it');
    }

    // NEW: Check outcomes of past signals
    try {
      const updated = await this.historicalLearner.checkOutcomes(currentPrice);
      if (updated > 0) {
        console.log(`Updated ${updated} historical signal outcomes`);
      }
    } catch (e) {
      console.log('Could not check historical outcomes');
    }

    console.log('Generating prediction with full intelligence...');
    const prediction = this.predictionEngine.predict(
      marketData.data,
      indicators,
      patterns,
      derivativesData || undefined,
      undefined, // onChainData
      undefined, // exchangeFlowData
      undefined, // profitabilityData
      undefined, // cohortData
      undefined, // derivativesAdvancedData
      undefined, // priceModelsData
      hourlyTrendData || undefined
    );

    // NEW: Log signal to historical learner for future accuracy tracking
    let signalId: string | undefined;
    try {
      const patternMatches: PatternMatch[] = prediction.patternFactors?.patterns.map(p => ({
        pattern: p.name,
        bias: p.bias,
        confidence: p.confidence,
        timeframe: p.timeframe as '24h' | '48h' | '72h',
        description: p.reasoning,
        reasoning: p.reasoning,
        historicalAccuracy: p.historicalAccuracy,
      })) || [];

      signalId = await this.historicalLearner.logSignal(
        currentPrice,
        prediction.direction,
        prediction.confidence,
        patternMatches,
        {
          h24: prediction.targets?.h24.price,
          h48: prediction.targets?.h48.price,
          h72: prediction.targets?.h72.price,
        }
      );
      console.log(`Logged signal ${signalId} for historical tracking`);
    } catch (e) {
      console.log('Could not log signal to historical learner');
    }

    return { prediction, signalId };
  }

  /**
   * Check if we should trade based on cooldowns and limits
   */
  private canTrade(): { canTrade: boolean; reason: string } {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Reset daily counters if new day
    if (this.state.lastTradeDate !== today) {
      this.state.tradestoday = 0;
      this.state.dailyPnl = 0;
      this.state.lastTradeDate = today;
      this.saveState();
    }

    // Check cooldown
    const timeSinceLastTrade = now - this.state.lastTradeTime;
    if (timeSinceLastTrade < config.trading.tradeCooldownMs) {
      const remainingMs = config.trading.tradeCooldownMs - timeSinceLastTrade;
      const remainingMins = Math.ceil(remainingMs / 60000);
      return { canTrade: false, reason: `Cooldown: ${remainingMins} minutes remaining` };
    }

    // Check daily trade limit
    if (this.state.tradestoday >= config.safety.maxTradesPerDay) {
      return { canTrade: false, reason: `Daily trade limit reached (${config.safety.maxTradesPerDay})` };
    }

    // Check daily loss limit
    if (this.state.dailyPnl <= -config.safety.maxDailyLossPercent) {
      return { canTrade: false, reason: `Daily loss limit reached (${this.state.dailyPnl.toFixed(2)}%)` };
    }

    return { canTrade: true, reason: 'OK' };
  }

  /**
   * Execute a trade based on signal with temporal synthesis
   */
  async executeTrade(signal: Prediction, signalId?: string): Promise<void> {
    const { canTrade, reason } = this.canTrade();

    // NEW: Check temporal synthesis for speculation warning
    const isSpeculation = signal.temporalSynthesis?.isSpeculation || false;
    const temporalAdvice = signal.temporalSynthesis?.actionableAdvice || '';
    const hasConflict = signal.temporalSynthesis?.hasConflict || false;

    // Check if we have an open position
    if (this.state.openPosition) {
      console.log('\n--- OPEN POSITION ---');
      console.log(`BTC: ${this.state.openPosition.btcAmount.toFixed(8)}`);
      console.log(`Entry: $${this.state.openPosition.entryPrice.toFixed(2)}`);

      // Check if signal suggests closing (use temporal synthesis)
      const shouldClose = (signal.direction === 'down' && signal.confidence >= config.trading.minConfidence) ||
                          (temporalAdvice.includes('SHORT') || temporalAdvice.includes('HEDGE'));
      if (shouldClose) {
        await this.closePosition(temporalAdvice || 'Signal turned bearish');
        return;
      }

      // Show temporal warnings if holding
      if (signal.temporalSynthesis?.warnings.length) {
        console.log('\nWarnings:');
        signal.temporalSynthesis.warnings.forEach(w => console.log(`  ${w}`));
      }

      console.log('Holding position...');
      return;
    }

    if (!canTrade) {
      console.log(`\nSkipping trade: ${reason}`);
      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SKIP',
        reason,
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
          target24h: signal.targets?.h24.price,
          target48h: signal.targets?.h48.price,
          target72h: signal.targets?.h72.price,
          temporalAdvice,
          isSpeculation,
          dominantPattern: signal.patternFactors?.dominantPattern,
          patternBias: signal.patternFactors?.patternBias,
        },
        signalId,
      });
      return;
    }

    // NEW: Skip if temporal analysis says it's speculation
    if (isSpeculation && config.trading.skipSpeculation) {
      console.log(`\nSkipping: Temporal analysis indicates SPECULATION (confidence < 50%)`);
      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SKIP',
        reason: 'Temporal analysis: SPECULATION',
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
          temporalAdvice,
          isSpeculation: true,
        },
        signalId,
      });
      return;
    }

    // Check signal quality
    if (config.trading.requireClearDirection && !['up', 'down'].includes(signal.direction)) {
      console.log(`\nSkipping: Direction unclear (${signal.direction})`);
      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SKIP',
        reason: `Direction unclear: ${signal.direction}`,
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
          temporalAdvice,
          isSpeculation,
        },
        signalId,
      });
      return;
    }

    if (signal.confidence < config.trading.minConfidence) {
      console.log(`\nSkipping: Confidence too low (${(signal.confidence * 100).toFixed(1)}% < ${(config.trading.minConfidence * 100).toFixed(1)}%)`);
      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SKIP',
        reason: `Confidence too low: ${(signal.confidence * 100).toFixed(1)}%`,
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
          temporalAdvice,
          isSpeculation,
        },
        signalId,
      });
      return;
    }

    // Only trade bullish signals (we're not shorting)
    if (signal.direction !== 'up') {
      console.log(`\nSkipping: Not a buy signal (${signal.direction})`);
      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SKIP',
        reason: `Not a buy signal: ${signal.direction}`,
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
          temporalAdvice,
          isSpeculation,
        },
        signalId,
      });
      return;
    }

    // Get current price and balance
    const currentPrice = await this.client.getCurrentPrice();
    const usdBalance = await this.client.getUsdBalance();

    console.log('\n--- TRADE DECISION ---');
    console.log(`Signal: ${signal.direction.toUpperCase()} @ ${(signal.confidence * 100).toFixed(1)}% confidence`);
    console.log(`Current Price: $${currentPrice.toFixed(2)}`);
    console.log(`Target: $${signal.targetPrice?.toFixed(2) || 'N/A'}`);
    console.log(`Stop Loss: $${signal.stopLoss?.toFixed(2) || 'N/A'}`);
    console.log(`USD Balance: $${usdBalance.toFixed(2)}`);

    // NEW: Show extended targets
    if (signal.targets) {
      console.log('\n--- EXTENDED TARGETS ---');
      console.log(`24h: $${signal.targets.h24.price.toFixed(0)} (${(signal.targets.h24.confidence * 100).toFixed(0)}%)`);
      console.log(`48h: $${signal.targets.h48.price.toFixed(0)} (${(signal.targets.h48.confidence * 100).toFixed(0)}%)`);
      console.log(`72h: $${signal.targets.h72.price.toFixed(0)} (${(signal.targets.h72.confidence * 100).toFixed(0)}%)`);
    }

    // NEW: Show pattern info
    if (signal.patternFactors && signal.patternFactors.patterns.length > 0) {
      console.log('\n--- PATTERNS DETECTED ---');
      signal.patternFactors.patterns.slice(0, 3).forEach(p => {
        console.log(`  ${p.bias === 'bullish' ? '🟢' : p.bias === 'bearish' ? '🔴' : '⚪'} ${p.name} (${(p.confidence * 100).toFixed(0)}%)`);
      });
    }

    // NEW: Show temporal synthesis
    if (signal.temporalSynthesis) {
      console.log('\n--- TEMPORAL SYNTHESIS ---');
      console.log(`Past: ${signal.temporalSynthesis.pastBias} | Present: ${signal.temporalSynthesis.presentBias} | Future: ${signal.temporalSynthesis.futureBias}`);
      console.log(`Advice: ${signal.temporalSynthesis.actionableAdvice}`);
      if (signal.temporalSynthesis.warnings.length > 0) {
        signal.temporalSynthesis.warnings.forEach(w => console.log(`  ${w}`));
      }
    }

    // Calculate position size
    const tradeAmount = Math.min(config.trading.maxPositionUsd, usdBalance);

    if (tradeAmount < 10) {
      console.log('\nSkipping: Insufficient balance (< $10)');
      return;
    }

    console.log(`Trade Amount: $${tradeAmount.toFixed(2)}`);

    // DRY RUN MODE
    if (config.safety.dryRun) {
      console.log('\n[DRY RUN] Would execute:');
      console.log(`  BUY $${tradeAmount.toFixed(2)} of BTC @ ~$${currentPrice.toFixed(2)}`);
      console.log(`  Stop Loss @ $${signal.stopLoss?.toFixed(2) || 'N/A'}`);
      console.log(`  Target @ $${signal.targetPrice?.toFixed(2) || 'N/A'}`);

      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'BUY',
        reason: '[DRY RUN] Signal met criteria',
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
        },
        trade: {
          orderId: 'DRY_RUN',
          price: currentPrice,
          amount: tradeAmount / currentPrice,
          usdValue: tradeAmount,
        },
      });

      return;
    }

    // LIVE TRADE
    console.log('\nExecuting trade...');
    const result = await this.client.marketBuy(tradeAmount);

    if (result.success) {
      const btcBought = tradeAmount / currentPrice;

      console.log(`\nBUY EXECUTED: ${btcBought.toFixed(8)} BTC`);

      // Update state
      this.state.openPosition = {
        btcAmount: btcBought,
        entryPrice: currentPrice,
      };
      this.state.lastTradeTime = Date.now();
      this.state.tradestoday++;
      this.saveState();

      // Set stop loss if available
      if (signal.stopLoss) {
        console.log(`Setting stop loss @ $${signal.stopLoss.toFixed(2)}...`);
        const slResult = await this.client.stopLoss(btcBought, signal.stopLoss);
        if (slResult.success) {
          this.state.openPosition.stopLossOrderId = slResult.orderId;
          this.saveState();
          console.log('Stop loss set!');
        } else {
          console.log(`Warning: Could not set stop loss: ${slResult.error}`);
        }
      }

      // Set take profit if available
      if (signal.targetPrice) {
        console.log(`Setting take profit @ $${signal.targetPrice.toFixed(2)}...`);
        const tpResult = await this.client.limitSell(btcBought, signal.targetPrice);
        if (tpResult.success) {
          this.state.openPosition.takeProfitOrderId = tpResult.orderId;
          this.saveState();
          console.log('Take profit set!');
        } else {
          console.log(`Warning: Could not set take profit: ${tpResult.error}`);
        }
      }

      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'BUY',
        reason: 'Signal met criteria',
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
        },
        trade: {
          orderId: result.orderId!,
          price: currentPrice,
          amount: btcBought,
          usdValue: tradeAmount,
        },
        balance: {
          usd: usdBalance - tradeAmount,
          btc: btcBought,
        },
      });
    } else {
      console.log(`\nTRADE FAILED: ${result.error}`);
      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SKIP',
        reason: `Trade failed: ${result.error}`,
        signal: {
          direction: signal.direction,
          confidence: signal.confidence,
          targetPrice: signal.targetPrice,
          stopLoss: signal.stopLoss,
        },
      });
    }
  }

  /**
   * Close open position
   */
  async closePosition(reason: string): Promise<void> {
    if (!this.state.openPosition) {
      console.log('No open position to close');
      return;
    }

    const { btcAmount, entryPrice, stopLossOrderId, takeProfitOrderId } = this.state.openPosition;

    // Cancel existing orders
    if (stopLossOrderId) {
      await this.client.cancelOrder(stopLossOrderId);
    }
    if (takeProfitOrderId) {
      await this.client.cancelOrder(takeProfitOrderId);
    }

    if (config.safety.dryRun) {
      const currentPrice = await this.client.getCurrentPrice();
      const pnl = ((currentPrice - entryPrice) / entryPrice) * 100;

      console.log('\n[DRY RUN] Would close position:');
      console.log(`  SELL ${btcAmount.toFixed(8)} BTC @ ~$${currentPrice.toFixed(2)}`);
      console.log(`  Entry was: $${entryPrice.toFixed(2)}`);
      console.log(`  P/L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`);

      this.state.openPosition = null;
      this.state.dailyPnl += pnl;
      this.saveState();

      return;
    }

    // Execute sell
    const result = await this.client.marketSell(btcAmount);

    if (result.success) {
      const currentPrice = await this.client.getCurrentPrice();
      const pnl = ((currentPrice - entryPrice) / entryPrice) * 100;

      console.log(`\nPOSITION CLOSED: ${btcAmount.toFixed(8)} BTC @ $${currentPrice.toFixed(2)}`);
      console.log(`P/L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`);

      this.state.openPosition = null;
      this.state.dailyPnl += pnl;
      this.saveState();

      this.logTrade({
        timestamp: new Date().toISOString(),
        action: 'SELL',
        reason,
        trade: {
          orderId: result.orderId!,
          price: currentPrice,
          amount: btcAmount,
          usdValue: btcAmount * currentPrice,
        },
      });
    } else {
      console.log(`\nFailed to close position: ${result.error}`);
    }
  }

  /**
   * Run one iteration of the bot
   */
  async run(): Promise<void> {
    console.log('\n========================================');
    console.log(`BTC Signal Bot - ${new Date().toISOString()}`);
    console.log(`Mode: ${config.safety.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('========================================\n');

    try {
      const { prediction: signal, signalId } = await this.getSignal();

      console.log('\n--- SIGNAL ---');
      console.log(`Direction: ${signal.direction.toUpperCase()}`);
      console.log(`Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`Target: $${signal.targetPrice?.toFixed(2) || 'N/A'}`);
      console.log(`Stop Loss: $${signal.stopLoss?.toFixed(2) || 'N/A'}`);

      // NEW: Show temporal synthesis summary
      if (signal.temporalSynthesis) {
        const ts = signal.temporalSynthesis;
        console.log(`\nTemporal: Past=${ts.pastBias} | Present=${ts.presentBias} | Future=${ts.futureBias}`);
        if (ts.isSpeculation) {
          console.log('⚠️  SPECULATION: Confidence below 50% - treat with caution');
        }
        if (ts.hasConflict) {
          console.log(`⚠️  Conflict detected: ${ts.conflictType}`);
        }
      }

      // NEW: Show pattern summary
      if (signal.patternFactors && signal.patternFactors.patterns.length > 0) {
        console.log(`\nDominant Pattern: ${signal.patternFactors.dominantPattern}`);
        console.log(`Pattern Bias: ${signal.patternFactors.patternBias} (${(signal.patternFactors.patternConfidence * 100).toFixed(0)}%)`);
      }

      console.log('\nReasoning:');
      signal.reasoning.slice(0, 10).forEach(r => console.log(`  ${r}`));

      await this.executeTrade(signal, signalId);

      // NEW: Show historical learning stats
      try {
        const stats = this.historicalLearner.getStats();
        if (stats.totalSignals > 0) {
          console.log('\n--- HISTORICAL PERFORMANCE ---');
          console.log(`Total Signals: ${stats.totalSignals}`);
          console.log(`24h Accuracy: ${(stats.accuracy24h * 100).toFixed(0)}%`);
          console.log(`72h Accuracy: ${(stats.accuracy72h * 100).toFixed(0)}%`);
          console.log(`Current Streak: ${stats.currentStreak}`);
        }
      } catch (e) {
        // Ignore stats errors
      }
    } catch (error: any) {
      console.error('\nError:', error.message);
    }
  }

  /**
   * Get bot status
   */
  async getStatus(): Promise<void> {
    console.log('\n========================================');
    console.log('BOT STATUS');
    console.log('========================================\n');

    console.log(`Mode: ${config.safety.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Max Position: $${config.trading.maxPositionUsd}`);
    console.log(`Min Confidence: ${(config.trading.minConfidence * 100).toFixed(0)}%`);

    try {
      const usd = await this.client.getUsdBalance();
      const btc = await this.client.getBtcBalance();
      const price = await this.client.getCurrentPrice();

      console.log(`\nBalances:`);
      console.log(`  USD: $${usd.toFixed(2)}`);
      console.log(`  BTC: ${btc.toFixed(8)} (~$${(btc * price).toFixed(2)})`);
      console.log(`  Total: ~$${(usd + btc * price).toFixed(2)}`);
    } catch (e: any) {
      console.log(`\nCould not fetch balances: ${e.message}`);
    }

    console.log(`\nState:`);
    console.log(`  Trades Today: ${this.state.tradestoday}/${config.safety.maxTradesPerDay}`);
    console.log(`  Daily P/L: ${this.state.dailyPnl >= 0 ? '+' : ''}${this.state.dailyPnl.toFixed(2)}%`);

    if (this.state.openPosition) {
      console.log(`\nOpen Position:`);
      console.log(`  BTC: ${this.state.openPosition.btcAmount.toFixed(8)}`);
      console.log(`  Entry: $${this.state.openPosition.entryPrice.toFixed(2)}`);
    } else {
      console.log(`\nNo open position`);
    }
  }
}
