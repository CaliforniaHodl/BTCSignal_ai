import { describe, expect, it } from "vitest";
import { changeOver, parseHolderRows, rollingNetOutflow } from "./holders-parse";

const rows = [
  { time: "2026-01-02T00:00:00.000000000Z", SplyCur: "100", SplyExNtv: "10", FlowInExNtv: "1", FlowOutExNtv: "3", CapMVRVCur: "1.5" },
  { time: "2026-01-01T00:00:00.000000000Z", SplyCur: "100", SplyExNtv: "12", FlowInExNtv: "2", FlowOutExNtv: "2", CapMVRVCur: "1.4" },
  { time: "2026-01-03T00:00:00.000000000Z", SplyCur: "100", SplyExNtv: "9", FlowInExNtv: "1", FlowOutExNtv: "2", "SplyExNtv-status": "flash" },
  { time: "bad", SplyCur: "100" },
  { time: "2026-01-04T00:00:00.000000000Z", SplyCur: "" },
];

describe("parseHolderRows", () => {
  const p = parseHolderRows(rows);
  it("sorts, drops invalid rows, computes share", () => {
    expect(p).toHaveLength(3);
    expect(p[0].exchangeSharePct).toBe(12);
    expect(p[2].mvrv).toBeNull();
    expect(p[2].flash).toBe(true);
  });
  it("rolling net outflow", () => {
    expect(rollingNetOutflow(p, 2)).toEqual([null, 2, 3]);
  });
  it("changeOver", () => {
    expect(changeOver(p, 2, (x) => x.exchangeSupply)).toBe(-3);
    expect(changeOver(p, 5, (x) => x.exchangeSupply)).toBeNull();
  });
});
