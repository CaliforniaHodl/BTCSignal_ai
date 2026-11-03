/**
 * Dollar-cost-averaging vs lump-sum simulator over real daily closes.
 * Pure: no I/O. Prices are `[unixSecondsUtcMidnight, close]`, ascending.
 */

export type DailyPrice = [time: number, close: number];
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly";

export const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every 2 weeks" },
  { id: "monthly", label: "Monthly" },
];

export type DcaInput = {
  prices: DailyPrice[];
  /** Inclusive, unix seconds (any time of day — snapped to UTC day). */
  start: number;
  end: number;
  amountUsd: number;
  frequency: Frequency;
  /** Fee per purchase as a percent of the purchase, e.g. 0.5 = 0.5%. */
  feePct: number;
};

export type DcaPoint = { time: number; invested: number; dcaValue: number; lumpValue: number };
export type DcaBuy = { time: number; price: number; usd: number; btc: number };

export type StrategyResult = {
  invested: number;
  fees: number;
  btc: number;
  value: number;
  /** Average USD paid per BTC, fees included. */
  avgCost: number;
  returnPct: number;
};

export type DcaResult = {
  buys: DcaBuy[];
  dca: StrategyResult;
  lump: StrategyResult;
  endPrice: number;
  endTime: number;
  startTime: number;
  series: DcaPoint[];
};

const DAY = 86400;
const dayOf = (t: number) => Math.floor(t / DAY) * DAY;

/** Schedule of intended buy days (UTC midnights) from start to end inclusive. */
export function schedule(start: number, end: number, frequency: Frequency): number[] {
  const s = dayOf(start);
  const e = dayOf(end);
  const out: number[] = [];
  if (e < s) return out;
  if (frequency === "monthly") {
    const d0 = new Date(s * 1000);
    const dom = d0.getUTCDate();
    for (let m = 0; ; m++) {
      const y = d0.getUTCFullYear();
      const month = d0.getUTCMonth() + m;
      // clamp e.g. the 31st to the last day of shorter months
      const lastDom = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
      const t = Date.UTC(y, month, Math.min(dom, lastDom)) / 1000;
      if (t > e) break;
      out.push(t);
    }
    return out;
  }
  const step = { daily: 1, weekly: 7, biweekly: 14 }[frequency] * DAY;
  for (let t = s; t <= e; t += step) out.push(t);
  return out;
}

function result(invested: number, fees: number, btc: number, price: number): StrategyResult {
  const value = btc * price;
  return {
    invested,
    fees,
    btc,
    value,
    avgCost: btc > 0 ? invested / btc : 0,
    returnPct: invested > 0 ? ((value - invested) / invested) * 100 : 0,
  };
}

export function simulateDca(input: DcaInput): DcaResult {
  const { prices, amountUsd, frequency, feePct } = input;
  if (!(amountUsd > 0)) throw new Error("amount must be positive");
  if (!(feePct >= 0 && feePct < 100)) throw new Error("fee must be between 0 and 100%");

  const window = prices.filter(([t]) => t >= dayOf(input.start) && t <= dayOf(input.end));
  if (window.length === 0) throw new Error("no price data in that date range");

  const feeFrac = feePct / 100;
  const planned = schedule(input.start, input.end, frequency);

  // Each planned day buys at the first available close on or after it (handles data gaps).
  const buys: DcaBuy[] = [];
  let j = 0;
  for (const day of planned) {
    while (j < window.length && window[j][0] < day) j++;
    if (j >= window.length) break;
    const [t, price] = window[j];
    if (buys.length && buys[buys.length - 1].time === t) continue; // gap merged two buys onto one day
    buys.push({ time: t, price, usd: amountUsd, btc: (amountUsd * (1 - feeFrac)) / price });
  }

  const totalInvested = buys.length * amountUsd;
  const [startTime, startPrice] = window[0];
  const [endTime, endPrice] = window[window.length - 1];
  const lumpBtc = (totalInvested * (1 - feeFrac)) / startPrice;

  const series: DcaPoint[] = [];
  let k = 0;
  let invested = 0;
  let btc = 0;
  for (const [t, close] of window) {
    while (k < buys.length && buys[k].time <= t) {
      invested += buys[k].usd;
      btc += buys[k].btc;
      k++;
    }
    series.push({ time: t, invested, dcaValue: btc * close, lumpValue: lumpBtc * close });
  }

  const dcaBtc = buys.reduce((s, b) => s + b.btc, 0);
  return {
    buys,
    dca: result(totalInvested, totalInvested * feeFrac, dcaBtc, endPrice),
    lump: result(totalInvested, totalInvested * feeFrac, lumpBtc, endPrice),
    endPrice,
    endTime,
    startTime,
    series,
  };
}
