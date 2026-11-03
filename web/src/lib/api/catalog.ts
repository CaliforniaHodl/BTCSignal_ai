/** The public API, exactly as implemented under src/app/api/v1. Docs and explorer read this. */
export type Param = { name: string; values: string[]; default: string; description: string };
export type Endpoint = {
  path: string;
  title: string;
  description: string;
  params: Param[];
  cacheSeconds: number;
  source: string;
  example: string;
};

export const DATUM_SHAPE = `// Every endpoint returns a Datum (or, for /snapshot, an object of Datums):
type Datum<T> =
  | { ok: true;  value: T; source: string; fetchedAt: number /* ms epoch */ }
  | { ok: false; error: string; source: string; fetchedAt: number };
// HTTP 200 when ok, 502 when the upstream source failed (body is still a Datum).
// HTTP 400 { error } for bad parameters.`;

export const ENDPOINTS: Endpoint[] = [
  {
    path: "/api/v1/price",
    title: "Spot price",
    description: "BTC-USD last trade with 24h open/high/low/change/volume from Coinbase, plus a Kraken cross-check.",
    params: [],
    cacheSeconds: 10,
    source: "Coinbase, Kraken",
    example: `{ "ok": true, "source": "Coinbase", "fetchedAt": 1793732599000,
  "value": { "symbol": "BTC-USD", "price": 77501.2, "open24h": 76870.0, "high24h": 78120.5, "low24h": 76400.1,
             "change24hPct": 0.82, "volume24hBtc": 8123.4,
             "crossCheck": { "source": "Kraken", "price": 77498.9, "spreadPct": -0.003 } } }`,
  },
  {
    path: "/api/v1/funding",
    title: "Perpetual funding & open interest",
    description: "Funding normalised to an 8-hour rate (fraction: 0.0001 = 0.01%) and open interest per venue, plus the OI-weighted average.",
    params: [],
    cacheSeconds: 30,
    source: "OKX, Deribit, Hyperliquid",
    example: `{ "ok": true, "source": "OKX · Deribit · Hyperliquid", "fetchedAt": 1793732599000,
  "value": { "avgRate8h": 0.000082, "avgRateAnnualisedPct": 8.98, "totalOpenInterestUsd": 7012345678,
             "venues": [ { "venue": "OKX", "rate8h": 0.0001, "openInterestUsd": 3667767174 }, … ] } }`,
  },
  {
    path: "/api/v1/fear-greed",
    title: "Fear & Greed index",
    description: "The Crypto Fear & Greed index (0–100, daily) with up to 31 days of history, newest last.",
    params: [{ name: "days", values: ["1", "7", "31"], default: "1", description: "History length, integer 1–31." }],
    cacheSeconds: 300,
    source: "alternative.me",
    example: `{ "ok": true, "source": "alternative.me", "fetchedAt": 1793732599000,
  "value": { "value": 26, "label": "Fear", "updatedAt": 1793664000000,
             "history": [ { "value": 26, "label": "Fear", "updatedAt": 1793664000000 } ] } }`,
  },
  {
    path: "/api/v1/key-levels",
    title: "Key support / resistance",
    description: "Support and resistance derived from Coinbase candles: swing highs/lows clustered within 0.4% with at least two touches. Returns the nearest of each plus all levels found.",
    params: [{ name: "tf", values: ["15m", "1h", "4h", "1d"], default: "1h", description: "Candle timeframe." }],
    cacheSeconds: 60,
    source: "Coinbase candles (derived)",
    example: `{ "ok": true, "source": "Coinbase candles · swing clusters", "fetchedAt": 1793732599000,
  "value": { "timeframe": "1h", "price": 77480.1, "candleTime": 1793729600,
             "support": { "price": 76911.4, "touches": 3, "kind": "support", "distancePct": -0.73 },
             "resistance": { "price": 78010.0, "touches": 2, "kind": "resistance", "distancePct": 0.68 },
             "levels": [ … ], "method": "Swing highs/lows …" } }`,
  },
  {
    path: "/api/v1/candles",
    title: "Candles",
    description: "BTC-USD OHLCV candles, ascending by time (unix seconds, candle open). 4h is aggregated from 1h on UTC boundaries.",
    params: [
      { name: "tf", values: ["15m", "1h", "4h", "1d"], default: "1h", description: "Timeframe." },
      { name: "limit", values: ["50", "100", "300"], default: "300", description: "Number of candles, 10–300." },
    ],
    cacheSeconds: 15,
    source: "Coinbase",
    example: `{ "ok": true, "source": "Coinbase", "fetchedAt": 1793732599000,
  "value": [ { "time": 1793725200, "open": 77410.0, "high": 77560.2, "low": 77350.1, "close": 77480.1, "volume": 312.4 }, … ] }`,
  },
  {
    path: "/api/v1/snapshot",
    title: "Market snapshot",
    description: "Everything at once: spot, Kraken cross-check, derivatives, Fear & Greed, fees, network and global market cap. Each field is its own Datum, so one failed source never blanks the rest.",
    params: [],
    cacheSeconds: 10,
    source: "Coinbase, Kraken, OKX, Deribit, Hyperliquid, alternative.me, mempool.space, CoinGecko",
    example: `{ "generatedAt": 1793732599000,
  "spot": { "ok": true, "value": { "price": 77501.2, … }, "source": "Coinbase", "fetchedAt": … },
  "spotCrossCheck": { … }, "derivatives": { … }, "fearGreed": { … }, "fees": { … }, "network": { … }, "global": { … } }`,
  },
];
