/**
 * Historical data for research, cached on disk under .data/history so repeated
 * runs don't hammer public APIs. Cache files are keyed by series and day.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Candle } from "@/lib/market/types";

const DIR = path.join(process.cwd(), ".data", "history");
mkdirSync(DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const file = path.join(DIR, `${key}-${today}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as T;
  const v = await fn();
  writeFileSync(file, JSON.stringify(v));
  return v;
}

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers: { "user-agent": "btcsignal-research" } });
    if (r.ok) return (await r.json()) as T;
    if (attempt >= 5) throw new Error(`HTTP ${r.status} ${url}`);
    await sleep(600 * (attempt + 1));
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Coinbase candles, paginated 300 at a time. */
export function candles(granularity: 3600 | 86400, fromSec: number, toSec: number): Promise<Candle[]> {
  return cached(`cb-${granularity}-${fromSec}`, async () => {
    const out = new Map<number, Candle>();
    const span = granularity * 300;
    for (let s = fromSec; s < toSec; s += span) {
      const e = Math.min(toSec, s + span);
      const rows = await getJson<number[][]>(
        `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${granularity}&start=${new Date(s * 1000).toISOString()}&end=${new Date(e * 1000).toISOString()}`
      );
      for (const [time, low, high, open, close, volume] of rows) out.set(time, { time, open, high, low, close, volume });
      await sleep(120);
    }
    return [...out.values()].sort((a, b) => a.time - b.time);
  });
}

/** Daily Fear & Greed since 2018. Returns map: UTC day start (sec) → value. */
export function fearGreed(): Promise<Record<number, number>> {
  return cached("fng", async () => {
    const r = await getJson<{ data: { value: string; timestamp: string }[] }>("https://api.alternative.me/fng/?limit=0");
    return Object.fromEntries(r.data.map((d) => [Number(d.timestamp), Number(d.value)]));
  });
}

/** Deribit BTC-PERPETUAL 8h-equivalent funding, hourly. Map: hour (sec) → rate. */
export function funding(fromSec: number, toSec: number): Promise<Record<number, number>> {
  return cached(`deribit-funding-${fromSec}`, async () => {
    const out: Record<number, number> = {};
    const span = 30 * 86400;
    for (let s = fromSec; s < toSec; s += span) {
      const e = Math.min(toSec, s + span);
      const r = await getJson<{ result: { timestamp: number; interest_8h: number }[] }>(
        `https://www.deribit.com/api/v2/public/get_funding_rate_history?instrument_name=BTC-PERPETUAL&start_timestamp=${s * 1000}&end_timestamp=${e * 1000}`
      );
      for (const x of r.result) out[Math.floor(x.timestamp / 1000 / 3600) * 3600] = x.interest_8h;
      await sleep(150);
    }
    return out;
  });
}
