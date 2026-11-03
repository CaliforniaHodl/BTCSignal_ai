import { describe, expect, it } from "vitest";
import { largeTxs, mergeWhales } from "./whales-parse";

const row = (txid: string, btc: number) => ({ txid, value: btc * 1e8, fee: 1000, vsize: 200 });

describe("largeTxs", () => {
  it("skips the coinbase and filters by threshold", () => {
    const rows = [row("cb", 3.2), row("a", 5), row("b", 12), row("c", 10)];
    const r = largeTxs(rows, 10, { blockHeight: 900_000, time: 1, isBlock: true });
    expect(r.map((x) => x.txid)).toEqual(["b", "c"]);
    expect(r[0].blockHeight).toBe(900_000);
  });
  it("keeps the first row for mempool lists", () => {
    expect(largeTxs([row("m", 20)], 10, { blockHeight: null, time: 1, isBlock: false })).toHaveLength(1);
  });
  it("ignores malformed rows", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(largeTxs([row("cb", 1), { txid: 5, value: "x" } as any], 0, { blockHeight: 1, time: 1, isBlock: true })).toEqual([]);
  });
});

describe("mergeWhales", () => {
  it("dedupes preferring confirmed and sorts newest first", () => {
    const un = largeTxs([row("x", 20)], 10, { blockHeight: null, time: 50, isBlock: false });
    const conf = largeTxs([row("cb", 1), row("x", 20), row("y", 30)], 10, { blockHeight: 10, time: 40, isBlock: true });
    const older = largeTxs([row("cb", 1), row("z", 100)], 10, { blockHeight: 9, time: 30, isBlock: true });
    const m = mergeWhales([un, conf, older]);
    expect(m.map((t) => t.txid)).toEqual(["y", "x", "z"]);
    expect(m.find((t) => t.txid === "x")?.blockHeight).toBe(10);
  });
});
