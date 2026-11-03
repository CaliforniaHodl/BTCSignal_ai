/** BTC ⇄ sats ⇄ fiat conversion. Sats are the integer unit of account. */

export const SATS_PER_BTC = 100_000_000;

export type Unit = "btc" | "sats" | "fiat";

/** Parse user input like "1,234.5" or " 0.001 ". Returns null for empty / invalid / negative. */
export function parseAmount(raw: string): number | null {
  const s = raw.replace(/[,\s_]/g, "");
  if (s === "" || !/^\d*\.?\d*$/.test(s) || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Convert any unit to sats (rounded to the nearest whole sat). */
export function toSats(amount: number, unit: Unit, fiatPerBtc: number): number {
  if (unit === "sats") return Math.round(amount);
  if (unit === "btc") return Math.round(amount * SATS_PER_BTC);
  if (!(fiatPerBtc > 0)) throw new Error("price required for fiat conversion");
  return Math.round((amount / fiatPerBtc) * SATS_PER_BTC);
}

export function fromSats(sats: number, fiatPerBtc: number) {
  const btc = sats / SATS_PER_BTC;
  return { sats, btc, fiat: btc * fiatPerBtc };
}

/** "0.00012345" — trims trailing zeros but never uses exponent notation. */
export function formatBtc(btc: number): string {
  return btc.toFixed(8).replace(/\.?0+$/, "") || "0";
}
