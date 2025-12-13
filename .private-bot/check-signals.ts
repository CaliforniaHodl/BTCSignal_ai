#!/usr/bin/env npx tsx
/**
 * Check current signals without trading
 * Useful for seeing what the bot would do
 */

import { DataProvider } from '../netlify/functions/lib/data-provider.js';
import { TechnicalAnalyzer } from '../netlify/functions/lib/technical-analysis.js';
import { PredictionEngine } from '../netlify/functions/lib/prediction-engine.js';
import { DerivativesAnalyzer } from '../netlify/functions/lib/derivatives-analyzer.js';

async function checkSignals() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║               BTC SIGNAL - SIGNAL CHECK                  ║
╚══════════════════════════════════════════════════════════╝
`);

  const dataProvider = new DataProvider();
  const technicalAnalyzer = new TechnicalAnalyzer();
  const predictionEngine = new PredictionEngine();
  const derivativesAnalyzer = new DerivativesAnalyzer();

  console.log('Fetching market data...');
  const marketData = await dataProvider.fetchData('BTC-USD', '1h', 100);

  const currentPrice = marketData.data[marketData.data.length - 1].close;
  console.log(`\nCurrent Price: $${currentPrice.toLocaleString()}`);

  console.log('\nCalculating indicators...');
  const indicators = technicalAnalyzer.calculateIndicators(marketData.data);

  console.log('\n--- INDICATORS ---');
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
    console.log('\n--- PATTERNS DETECTED ---');
    patterns.forEach(p => {
      console.log(`${p.type === 'bullish' ? '🟢' : p.type === 'bearish' ? '🔴' : '⚪'} ${p.name} (${(p.confidence * 100).toFixed(0)}%)`);
      console.log(`   ${p.description}`);
    });
  } else {
    console.log('\nNo significant patterns detected');
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

  console.log('\nGenerating prediction...');
  const prediction = predictionEngine.predict(
    marketData.data,
    indicators,
    patterns,
    derivativesData || undefined
  );

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
  console.log('║  REASONING:                                              ║');

  prediction.reasoning.forEach(r => {
    const line = `║    ${r}`;
    console.log(line.padEnd(59) + '║');
  });

  console.log('╚══════════════════════════════════════════════════════════╝');

  // Trading recommendation
  const minConf = 0.65;
  console.log('\n--- BOT RECOMMENDATION ---');
  if (prediction.direction === 'up' && prediction.confidence >= minConf) {
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
