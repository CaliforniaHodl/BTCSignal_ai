/**
 * Every market value carries where it came from and when.
 * A failed source is `{ ok: false }` — never a made-up number.
 */
export type Datum<T> =
  | { ok: true; value: T; source: string; fetchedAt: number }
  | { ok: false; source: string; fetchedAt: number; error: string };

export type Candle = {
  /** Unix seconds, candle open time */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Timeframe = "15m" | "1h" | "4h" | "1d";

export type SpotStats = {
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24hBtc: number;
  change24hPct: number;
};

export type FundingVenue = {
  venue: "OKX" | "Deribit" | "Hyperliquid";
  /** Funding normalised to an 8-hour rate, as a fraction (0.0001 = 0.01%) */
  rate8h: number;
  openInterestUsd: number | null;
};

export type Derivatives = {
  venues: FundingVenue[];
  /** OI-weighted mean of venues that reported OI, else simple mean */
  avgRate8h: number;
  totalOpenInterestUsd: number;
};

export type FearGreed = { value: number; label: string; updatedAt: number };

export type Fees = { fastest: number; halfHour: number; hour: number; economy: number };

export type Network = {
  blockHeight: number;
  hashrateEhs: number;
  difficulty: number;
  difficultyChangePct: number;
  retargetProgressPct: number;
  blocksUntilRetarget: number;
};

export type Global = { btcDominancePct: number; totalMarketCapUsd: number };

export type MarketSnapshot = {
  generatedAt: number;
  spot: Datum<SpotStats>;
  spotCrossCheck: Datum<{ price: number }>;
  derivatives: Datum<Derivatives>;
  fearGreed: Datum<FearGreed>;
  fees: Datum<Fees>;
  network: Datum<Network>;
  global: Datum<Global>;
};
