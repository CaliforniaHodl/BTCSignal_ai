#!/usr/bin/env npx tsx
/**
 * Check current signals without trading
 * Shows full intelligence stack: patterns, temporal synthesis, 72h predictions
 */

import { DataProvider } from '../netlify/functions/lib/data-provider.js';
import { TechnicalAnalyzer } from '../netlify/functions/lib/technical-analysis.js';
import { PredictionEngine } from '../netlify/functions/lib/prediction-engine.js';
import { DerivativesAnalyzer } from '../netlify/functions/lib/derivatives-analyzer.js';
import { MarketDataCache } from '../netlify/functions/lib/market-data-cache.js';
import { HistoricalLearner } from '../netlify/functions/lib/historical-learner.js';

async function checkSignals() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         BTC SIGNAL - FULL INTELLIGENCE CHECK             ║
╚══════════════════════════════════════════════════════════╝
`);

  const dataProvider = new DataProvider();
  const technicalAnalyzer = new TechnicalAnalyzer();
  const predictionEngine = new PredictionEngine();
  const derivativesAnalyzer = new DerivativesAnalyzer();
  const marketDataCache = new MarketDataCache();
  const historicalLearner = new HistoricalLearner();

  console.log('Fetching market data...');
  const marketData = await dataProvider.fetchData('BTC-USD', '1h', 100);

  const currentPrice = marketData.data[marketData.data.length - 1].close;
  console.log(`\nCurrent Price: $${currentPrice.toLocaleString()}`);

  console.log('\nCalculating indicators...');
  const indicators = technicalAnalyzer.calculateIndicators(marketData.data);

  console.log('\n--- TECHNICAL INDICATORS ---');
  console.log(`RSI: ${indicators.rsi?.toFixed(2) || 'N/A'}`);
  console.log(`MACD Histogram: ${indicators.macd?.histogram.toFixed(4) || 'N/A'}`);
  console.log(`EMA20: $${indicators.ema20?.toFixed(2) || 'N/A'}`);
  console.log(`SMA50: $${indicators.sma50?.toFixed(2) || 'N/A'}`);
  console.log(`ATR: $${indicators.atr?.toFixed(2) || 'N/A'}`);
  console.log(`Volume Ratio: ${indicators.volumeRatio?.toFixed(2) || 'N/A'}x`);
  console.log(`Volume Trend: ${indicators.volumeTrend || 'N/A'}`);
  console.log(`RSI Divergence: ${indicators.rsiDivergence || 'none'}`);

  console.log('\nIdentifying patterns...');
  const patterns = technicalAnalyzer.identifyPatterns(marketData.data, indicators);

  if (patterns.length > 0) {
    console.log('\n--- TA PATTERNS DETECTED ---');
    patterns.forEach(p => {
      console.log(`${p.type === 'bullish' ? '🟢' : p.type === 'bearish' ? '🔴' : '⚪'} ${p.name} (${(p.confidence * 100).toFixed(0)}%)`);
      console.log(`   ${p.description}`);
    });
  } else {
    console.log('\nNo significant TA patterns detected');
  }

  console.log('\nFetching derivatives data...');
  let derivativesData = null;
  try {
    const last24h = marketData.data.slice(-24);
    const price24hAgo = last24h[0].close;
    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    derivativesData = await derivativesAnalyzer.getDerivativesData(currentPrice, priceChange24h);

    console.log('\n--- DERIVATIVES ---');
    if (derivativesData.fundingRate) {
      const fr = derivativesData.fundingRate.fundingRate * 100;
      console.log(`Funding Rate: ${fr >= 0 ? '+' : ''}${fr.toFixed(4)}%`);
    }
    if (derivativesData.openInterest) {
      const oiBillions = derivativesData.openInterest.openInterestValue / 1e9;
      console.log(`Open Interest: $${oiBillions.toFixed(2)}B`);
    }
    if (derivativesData.squeezeAlert.type !== 'none') {
      console.log(`Squeeze Alert: ${derivativesData.squeezeAlert.type} (${derivativesData.squeezeAlert.probability})`);
    }
  } catch (e) {
    console.log('Could not fetch derivatives data');
  }

  // NEW: Load cached hourly trends
  console.log('\nLoading cached hourly trends...');
  let hourlyTrendData = null;
  try {
    hourlyTrendData = await marketDataCache.getHourlyTrendFactors();
    if (hourlyTrendData) {
      console.log('\n--- HOURLY TRENDS (24x daily data) ---');
      console.log(`Data Age: ${hourlyTrendData.dataAge.toFixed(0)} minutes`);
      console.log(`Funding Trend: ${hourlyTrendData.fundingTrend}`);
      console.log(`Funding Velocity (6h): ${hourlyTrendData.fundingVelocity6h.toFixed(4)}`);
      console.log(`OI Trend: ${hourlyTrendData.oiTrend}`);
      console.log(`OI Momentum (24h): ${hourlyTrendData.oiMomentum24h.toFixed(2)}%`);
      console.log(`Price-OI Divergence: ${hourlyTrendData.priceOIDivergence.type}`);
      console.log(`Multi-timeframe Bias: ${hourlyTrendData.multiTimeframeBias}`);
    }
  } catch (e) {
    console.log('Could not load hourly trend data');
  }

  console.log('\nGenerating full prediction...');
  const prediction = predictionEngine.predict(
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

  // Show pattern recognition results
  if (prediction.patternFactors && prediction.patternFactors.patterns.length > 0) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║               PATTERN RECOGNITION (72h)                  ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    prediction.patternFactors.patterns.forEach(p => {
      const emoji = p.bias === 'bullish' ? '🟢' : p.bias === 'bearish' ? '🔴' : '⚪';
      console.log(`║  ${emoji} ${p.name.padEnd(45)}║`);
      console.log(`║     Confidence: ${(p.confidence * 100).toFixed(0)}% | Historical: ${((p.historicalAccuracy || 0.5) * 100).toFixed(0)}%`.padEnd(58) + '║');
      console.log(`║     ${p.reasoning.slice(0, 50)}`.padEnd(58) + '║');
    });
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Dominant: ${prediction.patternFactors.dominantPattern}`.padEnd(58) + '║');
    console.log(`║  Aggregate Bias: ${prediction.patternFactors.patternBias} (${(prediction.patternFactors.patternConfidence * 100).toFixed(0)}% conf)`.padEnd(58) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  }

  // Show temporal synthesis
  if (prediction.temporalSynthesis) {
    const ts = prediction.temporalSynthesis;
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║             TEMPORAL SYNTHESIS (PAST+PRESENT+FUTURE)     ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  PAST (24-48h):    ${ts.pastBias.padEnd(38)}║`);
    console.log(`║  PRESENT:          ${ts.presentBias.padEnd(38)}║`);
    console.log(`║  FUTURE (72h):     ${ts.futureBias.padEnd(38)}║`);
    console.log('╠══════════════════════════════════════════════════════════╣');

    if (ts.isSpeculation) {
      console.log('║  ⚠️  STATUS: SPECULATION (confidence < 50%)              ║');
    } else {
      console.log(`║  Reliable Timeframe: ${ts.reliableTimeframe}`.padEnd(58) + '║');
    }

    if (ts.hasConflict) {
      console.log(`║  ⚠️  Conflict: ${ts.conflictType}`.padEnd(58) + '║');
    }

    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  SYNTHESIS:                                              ║');
    const synthParts = ts.synthesis.split(' | ');
    synthParts.forEach(part => {
      console.log(`║    ${part}`.padEnd(58) + '║');
    });

    if (ts.warnings.length > 0) {
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║  WARNINGS:                                               ║');
      ts.warnings.forEach(w => {
        console.log(`║    ${w.slice(0, 52)}`.padEnd(58) + '║');
      });
    }

    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  ACTIONABLE ADVICE:                                      ║');
    console.log(`║    ${ts.actionableAdvice.slice(0, 52)}`.padEnd(58) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  }

  // Show extended targets
  if (prediction.targets) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                   PRICE TARGETS                          ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Current:  $${currentPrice.toLocaleString().padEnd(45)}║`);
    console.log(`║  24h:      $${prediction.targets.h24.price.toFixed(0).padEnd(15)} (${(prediction.targets.h24.confidence * 100).toFixed(0)}% confidence)`.padEnd(58) + '║');
    console.log(`║  48h:      $${prediction.targets.h48.price.toFixed(0).padEnd(15)} (${(prediction.targets.h48.confidence * 100).toFixed(0)}% confidence)`.padEnd(58) + '║');
    console.log(`║  72h:      $${prediction.targets.h72.price.toFixed(0).padEnd(15)} (${(prediction.targets.h72.confidence * 100).toFixed(0)}% confidence)`.padEnd(58) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  }

  // Main signal summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                     SIGNAL SUMMARY                       ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  const directionEmoji = prediction.direction === 'up' ? '🟢 BULLISH' :
                         prediction.direction === 'down' ? '🔴 BEARISH' :
                         prediction.direction === 'sideways' ? '⚪ SIDEWAYS' : '🟡 MIXED';

  console.log(`║  Direction:   ${directionEmoji.padEnd(42)}║`);
  console.log(`║  Confidence:  ${(prediction.confidence * 100).toFixed(1)}%`.padEnd(59) + '║');
  console.log(`║  Target:      $${prediction.targetPrice?.toFixed(2) || 'N/A'}`.padEnd(59) + '║');
  console.log(`║  Stop Loss:   $${prediction.stopLoss?.toFixed(2) || 'N/A'}`.padEnd(59) + '║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  TOP REASONING:                                          ║');

  prediction.reasoning.slice(0, 5).forEach(r => {
    const line = `║    ${r.slice(0, 52)}`;
    console.log(line.padEnd(59) + '║');
  });

  console.log('╚══════════════════════════════════════════════════════════╝');

  // Historical performance
  try {
    await historicalLearner.loadData();
    const stats = historicalLearner.getStats();
    const insights = historicalLearner.getInsights();

    if (stats.totalSignals > 0) {
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║               HISTORICAL PERFORMANCE                     ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║  Total Signals:  ${stats.totalSignals}`.padEnd(59) + '║');
      console.log(`║  24h Accuracy:   ${(stats.accuracy24h * 100).toFixed(0)}%`.padEnd(59) + '║');
      console.log(`║  48h Accuracy:   ${(stats.accuracy48h * 100).toFixed(0)}%`.padEnd(59) + '║');
      console.log(`║  72h Accuracy:   ${(stats.accuracy72h * 100).toFixed(0)}%`.padEnd(59) + '║');
      console.log(`║  Current Streak: ${insights.streak}`.padEnd(59) + '║');
      console.log(`║  Performance:    ${insights.recentPerformance}`.padEnd(59) + '║');

      if (insights.bestPatterns.length > 0) {
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  BEST PATTERNS:                                          ║');
        insights.bestPatterns.forEach(p => {
          console.log(`║    ${p.pattern}: ${(p.accuracy * 100).toFixed(0)}% accuracy`.padEnd(58) + '║');
        });
      }

      console.log('╚══════════════════════════════════════════════════════════╝');
    }
  } catch (e) {
    // No historical data yet
  }

  // Trading recommendation
  const minConf = 0.65;
  console.log('\n--- BOT RECOMMENDATION ---');

  // Use temporal advice if available
  if (prediction.temporalSynthesis?.actionableAdvice) {
    console.log(`📊 ${prediction.temporalSynthesis.actionableAdvice}`);
  }

  if (prediction.temporalSynthesis?.isSpeculation) {
    console.log(`⚠️  SPECULATION MODE - Signals too weak for confident prediction`);
  } else if (prediction.direction === 'up' && prediction.confidence >= minConf) {
    console.log(`✅ WOULD BUY - Signal meets criteria`);
    console.log(`   Confidence ${(prediction.confidence * 100).toFixed(1)}% >= ${(minConf * 100).toFixed(0)}% threshold`);
  } else if (prediction.direction === 'down' && prediction.confidence >= minConf) {
    console.log(`⚠️  BEARISH - Would close any open position`);
  } else if (prediction.confidence < minConf) {
    console.log(`❌ SKIP - Confidence too low (${(prediction.confidence * 100).toFixed(1)}% < ${(minConf * 100).toFixed(0)}%)`);
  } else {
    console.log(`❌ SKIP - No clear direction (${prediction.direction})`);
  }
}

checkSignals().catch(console.error);
