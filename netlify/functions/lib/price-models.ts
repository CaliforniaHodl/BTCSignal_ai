// Price Models Library - Phase 6: Bitcoin Valuation Models
// Competing with CryptoQuant/Glassnode valuation analytics
// Stock-to-Flow, Thermocap, NUPL, Puell Multiple, MVRV Z-Score, RHODL, Delta Cap

export interface PriceModels {
  lastUpdated: string;
  currentPrice: number;
  stockToFlow: StockToFlowModel;
  thermocap: ThermocapModel;
  realizedCap: RealizedCapModel;
  nupl: NUPLModel;
  puellMultiple: PuellMultipleModel;
  mvrvZScore: MVRVZScoreModel;
  rhodlRatio: RHODLRatioModel;
  deltaCap: DeltaCapModel;
  overallValuation: ValuationScore;
}

export interface StockToFlowModel {
  currentRatio: number;
  modelPrice: number;
  actualPrice: number;
  deflection: number; // % deviation from model
  deflectionMultiple: number; // actual/model ratio
  signal: 'undervalued' | 'fair' | 'overvalued' | 'extreme_overvalued';
  description: string;
  stock: number; // circulating supply
  flow: number; // annual new supply
  halvingInfo: HalvingInfo;
}

export interface HalvingInfo {
  lastHalving: string;
  nextHalving: string;
  currentReward: number;
  daysUntilHalving: number;
  currentEpoch: number;
}

export interface ThermocapModel {
  estimatedThermocap: number; // in USD
  marketCap: number;
  thermocapMultiple: number;
  signal: 'undervalued' | 'fair' | 'overheated' | 'extreme';
  description: string;
}

export interface RealizedCapModel {
  marketCap: number;
  realizedCap: number; // estimated or from API
  mvrv: number;
  signal: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
  description: string;
}

export interface NUPLModel {
  value: number; // -1 to 1
  zone: 'capitulation' | 'hope' | 'optimism' | 'belief' | 'euphoria';
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  marketCap: number;
  realizedCap: number;
}

export interface PuellMultipleModel {
  value: number;
  dailyIssuanceValue: number; // BTC issued per day * price
  ma365: number; // 365-day moving average
  signal: 'buy_zone' | 'neutral' | 'sell_zone' | 'extreme';
  description: string;
  currentIssuanceBTC: number;
}

export interface MVRVZScoreModel {
  zScore: number;
  mvrv: number;
  marketCap: number;
  realizedCap: number;
  deviation: number;
  signal: 'bottom_zone' | 'accumulation' | 'fair' | 'distribution' | 'top_zone';
  description: string;
}

export interface RHODLRatioModel {
  ratio: number;
  lthSupply: number; // Long-term holder supply
  sthSupply: number; // Short-term holder supply
  signal: 'accumulation' | 'neutral' | 'distribution' | 'speculative_top';
  description: string;
}

export interface DeltaCapModel {
  deltaCap: number;
  realizedCap: number;
  averageCap: number;
  deltaPrice: number; // Delta Cap / Circulating Supply
  currentPrice: number;
  signal: 'extreme_undervalued' | 'undervalued' | 'fair' | 'overvalued';
  description: string;
}

export interface ValuationScore {
  score: number; // -100 to 100 (-100 = max undervalued, 100 = max overvalued)
  rating: 'extreme_undervalued' | 'undervalued' | 'slightly_undervalued' | 'fair' | 'slightly_overvalued' | 'overvalued' | 'extreme_overvalued';
  confidence: number; // 0-100
  modelAgreement: number; // % of models agreeing
  bullishModels: string[];
  bearishModels: string[];
  summary: string;
}

// Bitcoin Constants
export const BTC_CONSTANTS = {
  TOTAL_SUPPLY: 21000000,
  CURRENT_CIRCULATING: 19500000, // Approximate as of late 2024
  BLOCKS_PER_HALVING: 210000,
  CURRENT_BLOCK_REWARD: 3.125, // Post April 2024 halving
  BLOCKS_PER_DAY: 144,
  DAILY_ISSUANCE: 450, // ~3.125 * 144
  ANNUAL_ISSUANCE: 164250, // ~450 * 365

  // Halving dates
  GENESIS_DATE: new Date('2009-01-03'),
  HALVING_1: new Date('2012-11-28'),
  HALVING_2: new Date('2016-07-09'),
  HALVING_3: new Date('2020-05-11'),
  HALVING_4: new Date('2024-04-20'),
  HALVING_5_ESTIMATED: new Date('2028-04-17'),

  // Model parameters
  S2F_COEFFICIENT: 0.4, // PlanB model approximation
  S2F_POWER: 3,
  ESTIMATED_THERMOCAP: 50000000000, // $50B estimated
  MVRV_HISTORICAL_MEAN: 1.4,
  MVRV_HISTORICAL_STD: 0.5,
};

/**
 * Calculate Stock-to-Flow Model
 */
export function calculateStockToFlow(
  currentPrice: number,
  circulatingSupply: number = BTC_CONSTANTS.CURRENT_CIRCULATING,
  annualFlow: number = BTC_CONSTANTS.ANNUAL_ISSUANCE
): StockToFlowModel {
  // S2F Ratio = Stock / Flow
  const stock = circulatingSupply;
  const flow = annualFlow;
  const s2fRatio = stock / flow;

  // S2F Model Price = coefficient * S2F^power
  // Using PlanB's approximation: Price ≈ 0.4 * S2F^3
  const modelPrice = BTC_CONSTANTS.S2F_COEFFICIENT * Math.pow(s2fRatio, BTC_CONSTANTS.S2F_POWER);

  // Deflection from model
  const deflection = ((currentPrice - modelPrice) / modelPrice) * 100;
  const deflectionMultiple = currentPrice / modelPrice;

  // Signal determination
  let signal: 'undervalued' | 'fair' | 'overvalued' | 'extreme_overvalued';
  let description: string;

  if (deflectionMultiple < 0.5) {
    signal = 'undervalued';
    description = `Price ${deflection.toFixed(0)}% below S2F model. Significant undervaluation per scarcity metrics.`;
  } else if (deflectionMultiple < 0.8) {
    signal = 'fair';
    description = `Price ${deflection.toFixed(0)}% below S2F model. Slightly undervalued relative to scarcity.`;
  } else if (deflectionMultiple <= 1.5) {
    signal = 'fair';
    description = `Price within ${Math.abs(deflection).toFixed(0)}% of S2F model. Fair value per scarcity.`;
  } else if (deflectionMultiple <= 2.0) {
    signal = 'overvalued';
    description = `Price ${deflection.toFixed(0)}% above S2F model. Overvalued relative to scarcity.`;
  } else {
    signal = 'extreme_overvalued';
    description = `Price ${deflection.toFixed(0)}% above S2F model. Extreme overvaluation per scarcity metrics.`;
  }

  // Halving info
  const halvingInfo = calculateHalvingInfo();

  return {
    currentRatio: Math.round(s2fRatio * 10) / 10,
    modelPrice: Math.round(modelPrice),
    actualPrice: currentPrice,
    deflection: Math.round(deflection * 10) / 10,
    deflectionMultiple: Math.round(deflectionMultiple * 100) / 100,
    signal,
    description,
    stock,
    flow,
    halvingInfo
  };
}

/**
 * Calculate halving information
 */
function calculateHalvingInfo(): HalvingInfo {
  const now = new Date();
  const lastHalving = BTC_CONSTANTS.HALVING_4;
  const nextHalving = BTC_CONSTANTS.HALVING_5_ESTIMATED;

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilHalving = Math.floor((nextHalving.getTime() - now.getTime()) / msPerDay);

  return {
    lastHalving: lastHalving.toISOString().split('T')[0],
    nextHalving: nextHalving.toISOString().split('T')[0],
    currentReward: BTC_CONSTANTS.CURRENT_BLOCK_REWARD,
    daysUntilHalving,
    currentEpoch: 4 // Post-4th halving
  };
}

/**
 * Calculate Thermocap Multiple
 */
export function calculateThermocap(
  marketCap: number,
  estimatedThermocap: number = BTC_CONSTANTS.ESTIMATED_THERMOCAP
): ThermocapModel {
  const multiple = marketCap / estimatedThermocap;

  let signal: 'undervalued' | 'fair' | 'overheated' | 'extreme';
  let description: string;

  if (multiple < 10) {
    signal = 'undervalued';
    description = `Thermocap multiple ${multiple.toFixed(1)}x. Deep value - market cap below cumulative miner revenue.`;
  } else if (multiple < 25) {
    signal = 'fair';
    description = `Thermocap multiple ${multiple.toFixed(1)}x. Fair valuation relative to mining economics.`;
  } else if (multiple < 50) {
    signal = 'overheated';
    description = `Thermocap multiple ${multiple.toFixed(1)}x. Market heating up relative to miner revenue.`;
  } else {
    signal = 'extreme';
    description = `Thermocap multiple ${multiple.toFixed(1)}x. Extreme overvaluation - historically top territory.`;
  }

  return {
    estimatedThermocap,
    marketCap,
    thermocapMultiple: Math.round(multiple * 10) / 10,
    signal,
    description
  };
}

/**
 * Calculate Realized Cap model (using MVRV if available)
 */
export function calculateRealizedCap(
  marketCap: number,
  mvrv: number
): RealizedCapModel {
  // Realized Cap = Market Cap / MVRV
  const realizedCap = marketCap / mvrv;

  let signal: 'undervalued' | 'fair' | 'overvalued' | 'extreme';
  let description: string;

  if (mvrv < 1.0) {
    signal = 'undervalued';
    description = `MVRV ${mvrv.toFixed(2)}. Market trading below realized value - capitulation zone.`;
  } else if (mvrv < 2.4) {
    signal = 'fair';
    description = `MVRV ${mvrv.toFixed(2)}. Fair valuation - market near average holder cost basis.`;
  } else if (mvrv < 3.5) {
    signal = 'overvalued';
    description = `MVRV ${mvrv.toFixed(2)}. Overvalued - market well above average cost basis.`;
  } else {
    signal = 'extreme';
    description = `MVRV ${mvrv.toFixed(2)}. Extreme overvaluation - historically cycle top levels.`;
  }

  return {
    marketCap,
    realizedCap: Math.round(realizedCap),
    mvrv: Math.round(mvrv * 100) / 100,
    signal,
    description
  };
}

/**
 * Calculate NUPL (Net Unrealized Profit/Loss)
 */
export function calculateNUPL(
  marketCap: number,
  realizedCap: number
): NUPLModel {
  // NUPL = (Market Cap - Realized Cap) / Market Cap
  const nupl = (marketCap - realizedCap) / marketCap;

  // Determine zone
  let zone: 'capitulation' | 'hope' | 'optimism' | 'belief' | 'euphoria';
  let signal: 'bullish' | 'bearish' | 'neutral';
  let description: string;

  if (nupl < 0) {
    zone = 'capitulation';
    signal = 'bullish';
    description = `NUPL ${(nupl * 100).toFixed(1)}%. Capitulation - market in net loss. Strong buy zone.`;
  } else if (nupl < 0.25) {
    zone = 'hope';
    signal = 'bullish';
    description = `NUPL ${(nupl * 100).toFixed(1)}%. Hope/Fear - early recovery phase. Accumulation zone.`;
  } else if (nupl < 0.5) {
    zone = 'optimism';
    signal = 'neutral';
    description = `NUPL ${(nupl * 100).toFixed(1)}%. Optimism/Anxiety - market in moderate profit. Hold zone.`;
  } else if (nupl < 0.75) {
    zone = 'belief';
    signal = 'neutral';
    description = `NUPL ${(nupl * 100).toFixed(1)}%. Belief/Denial - strong uptrend, approaching euphoria.`;
  } else {
    zone = 'euphoria';
    signal = 'bearish';
    description = `NUPL ${(nupl * 100).toFixed(1)}%. Euphoria/Greed - extreme profit taking. Distribution zone.`;
  }

  return {
    value: Math.round(nupl * 1000) / 1000,
    zone,
    signal,
    description,
    marketCap,
    realizedCap
  };
}

/**
 * Calculate Puell Multiple
 */
export function calculatePuellMultiple(
  currentPrice: number,
  dailyIssuanceBTC: number = BTC_CONSTANTS.DAILY_ISSUANCE,
  historicalAvgPrice: number
): PuellMultipleModel {
  // Daily Issuance Value = Daily BTC * Current Price
  const dailyIssuanceValue = dailyIssuanceBTC * currentPrice;

  // 365-day MA approximation: use historical average price
  const ma365 = dailyIssuanceBTC * historicalAvgPrice;

  // Puell Multiple = Current Daily Issuance Value / 365-day MA
  const puellMultiple = ma365 > 0 ? dailyIssuanceValue / ma365 : 1;

  let signal: 'buy_zone' | 'neutral' | 'sell_zone' | 'extreme';
  let description: string;

  if (puellMultiple < 0.5) {
    signal = 'buy_zone';
    description = `Puell ${puellMultiple.toFixed(2)}. Miner capitulation - extreme stress. Historical buy zone.`;
  } else if (puellMultiple < 0.8) {
    signal = 'buy_zone';
    description = `Puell ${puellMultiple.toFixed(2)}. Below average miner revenue. Accumulation opportunity.`;
  } else if (puellMultiple <= 1.5) {
    signal = 'neutral';
    description = `Puell ${puellMultiple.toFixed(2)}. Normal miner revenue levels. Neutral zone.`;
  } else if (puellMultiple <= 4.0) {
    signal = 'sell_zone';
    description = `Puell ${puellMultiple.toFixed(2)}. High miner revenue. Distribution/profit-taking zone.`;
  } else {
    signal = 'extreme';
    description = `Puell ${puellMultiple.toFixed(2)}. Extreme miner profitability. Historical cycle top indicator.`;
  }

  return {
    value: Math.round(puellMultiple * 100) / 100,
    dailyIssuanceValue: Math.round(dailyIssuanceValue),
    ma365: Math.round(ma365),
    signal,
    description,
    currentIssuanceBTC: dailyIssuanceBTC
  };
}

/**
 * Calculate MVRV Z-Score
 */
export function calculateMVRVZScore(
  mvrv: number,
  historicalMean: number = BTC_CONSTANTS.MVRV_HISTORICAL_MEAN,
  historicalStd: number = BTC_CONSTANTS.MVRV_HISTORICAL_STD
): MVRVZScoreModel {
  // Z-Score = (MVRV - Historical Mean) / Historical Std Dev
  const zScore = (mvrv - historicalMean) / historicalStd;
  const marketCap = 0; // Will be populated by caller
  const realizedCap = 0; // Will be populated by caller
  const deviation = mvrv - historicalMean;

  let signal: 'bottom_zone' | 'accumulation' | 'fair' | 'distribution' | 'top_zone';
  let description: string;

  if (zScore < -0.5) {
    signal = 'bottom_zone';
    description = `MVRV Z-Score ${zScore.toFixed(2)}. Deep undervaluation - historical bottom zone.`;
  } else if (zScore < 0.5) {
    signal = 'accumulation';
    description = `MVRV Z-Score ${zScore.toFixed(2)}. Below average - accumulation opportunity.`;
  } else if (zScore <= 3.0) {
    signal = 'fair';
    description = `MVRV Z-Score ${zScore.toFixed(2)}. Fair value range - normal market conditions.`;
  } else if (zScore <= 7.0) {
    signal = 'distribution';
    description = `MVRV Z-Score ${zScore.toFixed(2)}. High - distribution zone, take profits.`;
  } else {
    signal = 'top_zone';
    description = `MVRV Z-Score ${zScore.toFixed(2)}. Extreme - historical cycle top zone.`;
  }

  return {
    zScore: Math.round(zScore * 100) / 100,
    mvrv: Math.round(mvrv * 100) / 100,
    marketCap,
    realizedCap,
    deviation: Math.round(deviation * 100) / 100,
    signal,
    description
  };
}

/**
 * Calculate RHODL Ratio (proxy using LTH/STH)
 */
export function calculateRHODLRatio(
  lthSupply: number,
  sthSupply: number
): RHODLRatioModel {
  // RHODL approximation: LTH supply / STH supply
  // Higher ratio = more long-term holding = accumulation
  const ratio = sthSupply > 0 ? lthSupply / sthSupply : 0;

  let signal: 'accumulation' | 'neutral' | 'distribution' | 'speculative_top';
  let description: string;

  if (ratio > 3.0) {
    signal = 'accumulation';
    description = `RHODL ${ratio.toFixed(2)}. Very high long-term holding. Strong accumulation phase.`;
  } else if (ratio > 2.0) {
    signal = 'accumulation';
    description = `RHODL ${ratio.toFixed(2)}. Strong holder base. Accumulation continues.`;
  } else if (ratio > 1.0) {
    signal = 'neutral';
    description = `RHODL ${ratio.toFixed(2)}. Balanced holder distribution. Neutral phase.`;
  } else if (ratio > 0.5) {
    signal = 'distribution';
    description = `RHODL ${ratio.toFixed(2)}. High short-term speculation. Distribution phase.`;
  } else {
    signal = 'speculative_top';
    description = `RHODL ${ratio.toFixed(2)}. Extreme speculation. Potential cycle top signal.`;
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    lthSupply: Math.round(lthSupply),
    sthSupply: Math.round(sthSupply),
    signal,
    description
  };
}

/**
 * Calculate Delta Cap
 */
export function calculateDeltaCap(
  marketCap: number,
  realizedCap: number,
  historicalAvgMarketCap: number,
  circulatingSupply: number
): DeltaCapModel {
  // Average Cap = Historical average of Market Cap
  const averageCap = historicalAvgMarketCap;

  // Delta Cap = Realized Cap - Average Cap
  const deltaCap = realizedCap - averageCap;

  // Delta Price = Delta Cap / Circulating Supply
  const deltaPrice = deltaCap / circulatingSupply;
  const currentPrice = marketCap / circulatingSupply;

  // Signal based on price vs delta price
  const ratio = currentPrice / deltaPrice;

  let signal: 'extreme_undervalued' | 'undervalued' | 'fair' | 'overvalued';
  let description: string;

  if (ratio < 0.5) {
    signal = 'extreme_undervalued';
    description = `Price ${(ratio * 100).toFixed(0)}% of Delta Price. Extreme undervaluation - crisis levels.`;
  } else if (ratio < 0.8) {
    signal = 'undervalued';
    description = `Price ${(ratio * 100).toFixed(0)}% of Delta Price. Significant undervaluation.`;
  } else if (ratio <= 1.5) {
    signal = 'fair';
    description = `Price near Delta Price. Fair valuation relative to historical average.`;
  } else {
    signal = 'overvalued';
    description = `Price ${(ratio * 100).toFixed(0)}% of Delta Price. Overvalued relative to historical baseline.`;
  }

  return {
    deltaCap: Math.round(deltaCap),
    realizedCap: Math.round(realizedCap),
    averageCap: Math.round(averageCap),
    deltaPrice: Math.round(deltaPrice),
    currentPrice: Math.round(currentPrice),
    signal,
    description
  };
}

/**
 * Calculate overall valuation score from all models
 */
export function calculateOverallValuation(models: {
  s2f: StockToFlowModel;
  thermocap: ThermocapModel;
  realizedCap: RealizedCapModel;
  nupl: NUPLModel;
  puell: PuellMultipleModel;
  mvrvZ: MVRVZScoreModel;
  rhodl: RHODLRatioModel;
  deltaCap: DeltaCapModel;
}): ValuationScore {
  const modelScores: { model: string; score: number; weight: number }[] = [];

  // Stock-to-Flow (-100 to 100)
  let s2fScore = 0;
  if (models.s2f.signal === 'undervalued') s2fScore = -60;
  else if (models.s2f.signal === 'fair') s2fScore = 0;
  else if (models.s2f.signal === 'overvalued') s2fScore = 60;
  else if (models.s2f.signal === 'extreme_overvalued') s2fScore = 90;
  modelScores.push({ model: 'S2F', score: s2fScore, weight: 0.15 });

  // Thermocap (-100 to 100)
  let thermocapScore = 0;
  if (models.thermocap.signal === 'undervalued') thermocapScore = -70;
  else if (models.thermocap.signal === 'fair') thermocapScore = 0;
  else if (models.thermocap.signal === 'overheated') thermocapScore = 60;
  else if (models.thermocap.signal === 'extreme') thermocapScore = 95;
  modelScores.push({ model: 'Thermocap', score: thermocapScore, weight: 0.10 });

  // MVRV (-100 to 100)
  let mvrvScore = 0;
  if (models.realizedCap.signal === 'undervalued') mvrvScore = -75;
  else if (models.realizedCap.signal === 'fair') mvrvScore = 0;
  else if (models.realizedCap.signal === 'overvalued') mvrvScore = 65;
  else if (models.realizedCap.signal === 'extreme') mvrvScore = 90;
  modelScores.push({ model: 'MVRV', score: mvrvScore, weight: 0.20 });

  // NUPL (-100 to 100)
  let nuplScore = 0;
  if (models.nupl.zone === 'capitulation') nuplScore = -90;
  else if (models.nupl.zone === 'hope') nuplScore = -40;
  else if (models.nupl.zone === 'optimism') nuplScore = 0;
  else if (models.nupl.zone === 'belief') nuplScore = 50;
  else if (models.nupl.zone === 'euphoria') nuplScore = 90;
  modelScores.push({ model: 'NUPL', score: nuplScore, weight: 0.20 });

  // Puell Multiple (-100 to 100)
  let puellScore = 0;
  if (models.puell.signal === 'buy_zone') puellScore = -70;
  else if (models.puell.signal === 'neutral') puellScore = 0;
  else if (models.puell.signal === 'sell_zone') puellScore = 60;
  else if (models.puell.signal === 'extreme') puellScore = 85;
  modelScores.push({ model: 'Puell', score: puellScore, weight: 0.10 });

  // MVRV Z-Score (-100 to 100)
  let zScore = 0;
  if (models.mvrvZ.signal === 'bottom_zone') zScore = -85;
  else if (models.mvrvZ.signal === 'accumulation') zScore = -40;
  else if (models.mvrvZ.signal === 'fair') zScore = 0;
  else if (models.mvrvZ.signal === 'distribution') zScore = 60;
  else if (models.mvrvZ.signal === 'top_zone') zScore = 95;
  modelScores.push({ model: 'MVRV Z-Score', score: zScore, weight: 0.15 });

  // RHODL Ratio (-100 to 100)
  let rhodlScore = 0;
  if (models.rhodl.signal === 'accumulation') rhodlScore = -50;
  else if (models.rhodl.signal === 'neutral') rhodlScore = 0;
  else if (models.rhodl.signal === 'distribution') rhodlScore = 50;
  else if (models.rhodl.signal === 'speculative_top') rhodlScore = 80;
  modelScores.push({ model: 'RHODL', score: rhodlScore, weight: 0.05 });

  // Delta Cap (-100 to 100)
  let deltaScore = 0;
  if (models.deltaCap.signal === 'extreme_undervalued') deltaScore = -90;
  else if (models.deltaCap.signal === 'undervalued') deltaScore = -60;
  else if (models.deltaCap.signal === 'fair') deltaScore = 0;
  else if (models.deltaCap.signal === 'overvalued') deltaScore = 60;
  modelScores.push({ model: 'Delta Cap', score: deltaScore, weight: 0.05 });

  // Calculate weighted average
  let totalWeightedScore = 0;
  let totalWeight = 0;
  modelScores.forEach(m => {
    totalWeightedScore += m.score * m.weight;
    totalWeight += m.weight;
  });

  const overallScore = Math.round(totalWeightedScore / totalWeight);

  // Determine rating
  let rating: ValuationScore['rating'];
  if (overallScore < -70) rating = 'extreme_undervalued';
  else if (overallScore < -40) rating = 'undervalued';
  else if (overallScore < -15) rating = 'slightly_undervalued';
  else if (overallScore <= 15) rating = 'fair';
  else if (overallScore <= 40) rating = 'slightly_overvalued';
  else if (overallScore <= 70) rating = 'overvalued';
  else rating = 'extreme_overvalued';

  // Model agreement
  const bearishModels = modelScores.filter(m => m.score < -20).map(m => m.model);
  const bullishModels = modelScores.filter(m => m.score > 20).map(m => m.model);
  const neutralModels = modelScores.filter(m => m.score >= -20 && m.score <= 20);

  const agreement = Math.max(bearishModels.length, bullishModels.length, neutralModels.length) / modelScores.length;
  const modelAgreement = Math.round(agreement * 100);

  // Confidence based on agreement
  const confidence = Math.min(100, modelAgreement + 10);

  // Summary
  let summary: string;
  if (rating === 'extreme_undervalued') {
    summary = `Extreme undervaluation across ${bearishModels.length} models. Historical buying opportunity.`;
  } else if (rating === 'undervalued') {
    summary = `Undervalued per ${bearishModels.length} models. Good accumulation zone.`;
  } else if (rating === 'slightly_undervalued') {
    summary = 'Slightly undervalued. Reasonable entry point for long-term holders.';
  } else if (rating === 'fair') {
    summary = 'Fair valuation. Market near equilibrium across most models.';
  } else if (rating === 'slightly_overvalued') {
    summary = 'Slightly overvalued. Consider taking partial profits.';
  } else if (rating === 'overvalued') {
    summary = `Overvalued per ${bullishModels.length} models. Distribution zone - reduce exposure.`;
  } else {
    summary = `Extreme overvaluation across ${bullishModels.length} models. Historical cycle top levels.`;
  }

  return {
    score: overallScore,
    rating,
    confidence,
    modelAgreement,
    bullishModels: bearishModels, // Bearish signal = price undervalued = bullish for buying
    bearishModels: bullishModels, // Bullish signal = price overvalued = bearish for buying
    summary
  };
}

/**
 * Generate price model signals for prediction engine
 */
export interface PriceModelSignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  weight: number;
  reason: string;
  model: string;
}

export function generatePriceModelSignals(models: PriceModels): PriceModelSignal[] {
  const signals: PriceModelSignal[] = [];

  // S2F Signal
  if (models.stockToFlow.deflectionMultiple < 0.5) {
    signals.push({
      signal: 'bullish',
      weight: 0.6,
      reason: `S2F: ${models.stockToFlow.deflection.toFixed(0)}% below model - deep undervaluation`,
      model: 's2f'
    });
  } else if (models.stockToFlow.deflectionMultiple > 2.0) {
    signals.push({
      signal: 'bearish',
      weight: 0.7,
      reason: `S2F: ${models.stockToFlow.deflection.toFixed(0)}% above model - extreme overvaluation`,
      model: 's2f'
    });
  }

  // Thermocap Signal
  if (models.thermocap.thermocapMultiple < 10) {
    signals.push({
      signal: 'bullish',
      weight: 0.7,
      reason: `Thermocap: ${models.thermocap.thermocapMultiple}x - deep value vs miner revenue`,
      model: 'thermocap'
    });
  } else if (models.thermocap.thermocapMultiple > 50) {
    signals.push({
      signal: 'bearish',
      weight: 0.8,
      reason: `Thermocap: ${models.thermocap.thermocapMultiple}x - extreme overheating`,
      model: 'thermocap'
    });
  }

  // NUPL Signal
  if (models.nupl.zone === 'capitulation') {
    signals.push({
      signal: 'bullish',
      weight: 0.9,
      reason: 'NUPL: Capitulation zone - market in net loss',
      model: 'nupl'
    });
  } else if (models.nupl.zone === 'euphoria') {
    signals.push({
      signal: 'bearish',
      weight: 0.9,
      reason: 'NUPL: Euphoria zone - extreme greed',
      model: 'nupl'
    });
  }

  // Puell Multiple Signal
  if (models.puellMultiple.value < 0.5) {
    signals.push({
      signal: 'bullish',
      weight: 0.8,
      reason: `Puell: ${models.puellMultiple.value.toFixed(2)} - miner capitulation`,
      model: 'puell'
    });
  } else if (models.puellMultiple.value > 4.0) {
    signals.push({
      signal: 'bearish',
      weight: 0.7,
      reason: `Puell: ${models.puellMultiple.value.toFixed(2)} - extreme miner profit-taking`,
      model: 'puell'
    });
  }

  // MVRV Z-Score Signal
  if (models.mvrvZScore.zScore < -0.5) {
    signals.push({
      signal: 'bullish',
      weight: 0.8,
      reason: `MVRV Z-Score: ${models.mvrvZScore.zScore.toFixed(2)} - bottom zone`,
      model: 'mvrv_z'
    });
  } else if (models.mvrvZScore.zScore > 7.0) {
    signals.push({
      signal: 'bearish',
      weight: 0.9,
      reason: `MVRV Z-Score: ${models.mvrvZScore.zScore.toFixed(2)} - top zone`,
      model: 'mvrv_z'
    });
  }

  // Overall valuation signal
  if (models.overallValuation.score < -50) {
    signals.push({
      signal: 'bullish',
      weight: 1.0,
      reason: `Overall valuation: ${models.overallValuation.rating} - strong buy`,
      model: 'overall'
    });
  } else if (models.overallValuation.score > 50) {
    signals.push({
      signal: 'bearish',
      weight: 1.0,
      reason: `Overall valuation: ${models.overallValuation.rating} - strong sell`,
      model: 'overall'
    });
  }

  return signals;
}
