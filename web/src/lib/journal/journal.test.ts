import { describe, expect, it } from "vitest";
import { fromCsv, loadAll, mergeEntries, normalize, parseCsv, pnlUsd, rMultiple, stats, STORAGE_KEY, toCsv, type JournalEntry } from "./journal";

const e = (over: Partial<JournalEntry>): JournalEntry => ({
  id: Math.random().toString(36), side: "long", entryDate: "2026-01-01", exitDate: "2026-01-02", entry: 100, exit: 110,
  stop: 95, target: null, sizeUsd: 1000, feesUsd: 0, tags: [], notes: "", timeframe: null, ...over,
});

describe("P&L and R", () => {
  it("long and short P&L net of fees", () => {
    expect(pnlUsd(e({}))).toBeCloseTo(100);
    expect(pnlUsd(e({ side: "short", exit: 90, stop: 105, feesUsd: 5 }))).toBeCloseTo(95);
    expect(pnlUsd(e({ exit: null }))).toBeNull();
  });
  it("R-multiple uses planned risk", () => {
    expect(rMultiple(e({}))).toBeCloseTo(2); // +10 per unit vs 5 risk
    expect(rMultiple(e({ stop: null }))).toBeNull();
  });
});

describe("stats", () => {
  it("win rate, profit factor, expectancy, tags", () => {
    const s = stats([
      e({ exit: 110, tags: ["breakout"] }), // +100
      e({ exit: 95, tags: ["breakout"] }), // -50
      e({ exit: 120, side: "long" }), // +200
      e({ exit: null }), // open
    ]);
    expect(s.closed).toBe(3);
    expect(s.open).toBe(1);
    expect(s.winRatePct).toBeCloseTo(66.67, 1);
    expect(s.profitFactor).toBeCloseTo(300 / 50);
    expect(s.expectancyUsd).toBeCloseTo(250 / 3);
    expect(s.byTag[0]).toMatchObject({ tag: "breakout", trades: 2, pnl: 50 });
    expect(s.avgR).toBeCloseTo((2 - 1 + 4) / 3);
  });
  it("is honest when empty", () => {
    const s = stats([]);
    expect(s.winRatePct).toBeNull();
    expect(s.profitFactor).toBeNull();
  });
});

describe("legacy migration", () => {
  const legacyA = [{ id: "a1", direction: "long", entryPrice: 50000, exitPrice: 52000, size: 1000, stopLoss: 49000, takeProfit: 55000, entryDate: "2025-03-01T10:00:00Z", exitDate: "2025-03-03T10:00:00Z", tags: ["Swing"], notes: "x", status: "closed", pnl: 40 }];
  const legacyB = [{ id: 17, type: "short", entryPrice: 60000, exitPrice: 58000, positionSize: 2000, date: "2025-04-01", tags: "news, scalp", notes: "" }];
  const store = (m: Record<string, unknown>) => ({ getItem: (k: string) => (k in m ? JSON.stringify(m[k]) : null) });

  it("normalizes both legacy shapes", () => {
    const a = normalize(legacyA[0])!;
    expect(a).toMatchObject({ id: "a1", side: "long", entry: 50000, exit: 52000, stop: 49000, target: 55000, sizeUsd: 1000, entryDate: "2025-03-01", exitDate: "2025-03-03", tags: ["swing"] });
    const b = normalize(legacyB[0])!;
    expect(b).toMatchObject({ side: "short", entry: 60000, exit: 58000, sizeUsd: 2000, tags: ["news", "scalp"] });
    expect(normalize({ type: "long" })).toBeNull();
    expect(normalize("junk")).toBeNull();
  });

  it("loads current + both legacy keys without duplicating", () => {
    const current = [normalize(legacyA[0])!];
    const r = loadAll(store({ [STORAGE_KEY]: current, "trade-journal-entries": legacyA, btcsai_trade_journal: legacyB }));
    expect(r.entries).toHaveLength(2);
    expect(r.migrated).toBe(1);
  });

  it("survives corrupt storage", () => {
    const bad = { getItem: () => "{not json" };
    expect(loadAll(bad).entries).toEqual([]);
    expect(loadAll(null).entries).toEqual([]);
  });
});

describe("CSV", () => {
  it("round-trips entries including quotes and commas", () => {
    const src = [e({ id: "x1", notes: 'He said "wait", then I went', tags: ["a", "b"] }), e({ id: "x2", exit: null, exitDate: null })];
    const back = mergeEntries([], fromCsv(toCsv(src)).rows).entries;
    expect(back.find((x) => x.id === "x1")).toMatchObject({ notes: 'He said "wait", then I went', tags: ["a", "b"], exit: 110 });
    expect(back.find((x) => x.id === "x2")!.exit).toBeNull();
  });
  it("neutralises spreadsheet formulas on export", () => {
    expect(toCsv([e({ notes: "=HYPERLINK(1)" })])).toContain("'=HYPERLINK(1)");
  });
  it("parses CRLF and quoted newlines", () => {
    expect(parseCsv('a,b\r\n"1\n2",3\r\n')).toEqual([["a", "b"], ["1\n2", "3"]]);
  });
  it("imports common legacy headers", () => {
    const { rows } = fromCsv("Direction,EntryPrice,ExitPrice,Size,Date\nshort,100,90,500,2025-01-01");
    expect(normalize(rows[0])).toMatchObject({ side: "short", entry: 100, exit: 90, sizeUsd: 500 });
  });
});
