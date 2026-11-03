import { describe, expect, it } from "vitest";
import { INTRADAY_V2_CONFIG as ENGINE_CONFIG, type Computed } from "@/lib/engine/signal";
import { RISK } from "@/lib/agent/risk";
import { gate, metrics, simulate, type Step } from "./sim";

const bull: Computed = {
  price: 0,
  atr4h: 1000,
  atr1d: 3000,
  factors: (["trend_4h", "trend_1d", "momentum_4h", "rsi_1h", "funding", "fear_greed"] as const).map((name) => ({ name, label: name, value: 1, detail: "" })),
};
const bar = (t: number, o: number, h: number, l: number, c: number) => ({ time: t - 3600, open: o, high: h, low: l, close: c, volume: 1 });
const cfg = { ...RISK, makerFee: 0, takerFee: 0, slippage: 0 };

describe("simulate", () => {
  it("enters at the decision bar close and exits on a LATER bar only", () => {
    const steps: Step[] = [
      { t: 3600, bar: bar(3600, 100_000, 100_100, 99_900, 100_000), computed: bull },
      // this bar touches the target (100_000 + 2.5*1000) — must close here, not on bar 1
      { t: 7200, bar: bar(7200, 100_000, 102_600, 99_800, 102_000), computed: null },
    ];
    const r = simulate(steps, ENGINE_CONFIG, cfg);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]).toMatchObject({ reason: "target", openT: 3600, closeT: 7200, entry: 100_000, exit: 102_500 });
    expect(r.finalEquity).toBeGreaterThan(10_000);
  });

  it("charges maker on targets and taker on stops", () => {
    const fees = { ...RISK, makerFee: 0.001, takerFee: 0.01, slippage: 0 };
    const win = simulate([
      { t: 3600, bar: bar(3600, 100_000, 100_000, 100_000, 100_000), computed: bull },
      { t: 7200, bar: bar(7200, 100_000, 103_000, 100_000, 103_000), computed: null },
    ], ENGINE_CONFIG, fees);
    const loss = simulate([
      { t: 3600, bar: bar(3600, 100_000, 100_000, 100_000, 100_000), computed: bull },
      { t: 7200, bar: bar(7200, 100_000, 100_000, 98_000, 98_000), computed: null },
    ], ENGINE_CONFIG, fees);
    const q = win.trades[0] && (win.trades[0].feesUsd);
    // entry is taker in both; exit fee differs by liquidity
    expect(loss.trades[0].feesUsd).toBeGreaterThan(q);
  });

  it("metrics + gate flag a too-small sample", () => {
    const r = simulate([{ t: 3600, bar: bar(3600, 1, 1, 1, 1), computed: null }], ENGINE_CONFIG, cfg);
    const m = metrics(r);
    expect(m.trades).toBe(0);
    expect(gate(m).some((x) => x.includes("only 0 trades"))).toBe(true);
  });
});
