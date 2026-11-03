"use client";

import { useMemo, useState } from "react";
import { Card, SourceLine, Stat } from "@/components/ui";
import { Field, inputCls } from "@/components/form";
import { SeriesChart, type ChartLine } from "@/components/series-chart";
import { FREQUENCIES, simulateDca, type DailyPrice, type DcaResult, type Frequency } from "@/lib/calc/dca";
import { pct, usd } from "@/lib/format";

const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
const parseDay = (s: string) => {
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) ? t / 1000 : null;
};

export function DcaCalculator({ prices, source, fetchedAt }: { prices: DailyPrice[]; source: string; fetchedAt: number }) {
  const first = prices[0][0];
  const last = prices[prices.length - 1][0];
  const [amount, setAmount] = useState("100");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [start, setStart] = useState(() => iso(Math.max(first, last - 4 * 365 * 86400)));
  const [end, setEnd] = useState(() => iso(last));
  const [fee, setFee] = useState("0.5");

  const run = useMemo((): { ok: true; r: DcaResult } | { ok: false; error: string } => {
    const s = parseDay(start);
    const e = parseDay(end);
    const a = Number(amount);
    const f = Number(fee);
    if (s == null || e == null) return { ok: false, error: "Pick a start and end date." };
    if (e <= s) return { ok: false, error: "End date must be after the start date." };
    if (!(a > 0) || a > 1e9) return { ok: false, error: "Enter an amount above $0." };
    if (!(f >= 0 && f < 50)) return { ok: false, error: "Fee must be between 0% and 50%." };
    try {
      return { ok: true, r: simulateDca({ prices, start: s, end: e, amountUsd: a, frequency, feePct: f }) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Couldn't run that." };
    }
  }, [prices, start, end, amount, frequency, fee]);

  const chart = useMemo(() => {
    if (!run.ok) return null;
    const s = run.r.series;
    // daily points over a decade is fine for lightweight-charts; keep it exact
    return {
      t: s.map((p) => p.time),
      lines: [
        { label: "DCA value", color: "#f7931a", values: s.map((p) => p.dcaValue), width: 2 },
        { label: "Lump-sum value", color: "#60a5fa", values: s.map((p) => p.lumpValue), width: 2 },
        { label: "DCA invested", color: "#8b94a7", values: s.map((p) => p.invested), dashed: true },
      ] satisfies ChartLine[],
    };
  }, [run]);

  return (
    <div className="mt-10 space-y-6">
      <Card title="Plan">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Amount per buy (USD)" htmlFor="dca-amt">
            <input id="dca-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Frequency" htmlFor="dca-freq">
            <select id="dca-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={inputCls + " font-sans"}>
              {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </Field>
          <Field label="Start" htmlFor="dca-start">
            <input id="dca-start" type="date" min={iso(first)} max={iso(last)} value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="End" htmlFor="dca-end">
            <input id="dca-end" type="date" min={iso(first)} max={iso(last)} value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fee per buy (%)" htmlFor="dca-fee">
            <input id="dca-fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <SourceLine source={`${source} daily closes`} fetchedAt={fetchedAt} extra={`${iso(first)} → ${iso(last)} · ${prices.length.toLocaleString()} days`} />
      </Card>

      {!run.ok ? (
        <Card><p className="text-sm text-down">{run.error}</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Invested" value={usd(run.r.dca.invested)} sub={`${run.r.buys.length.toLocaleString()} buys · ${usd(run.r.dca.fees)} fees`} />
            <Stat label="DCA value" value={usd(run.r.dca.value)} tone={run.r.dca.returnPct >= 0 ? "up" : "down"} sub={`${pct(run.r.dca.returnPct, 1)} · ${run.r.dca.btc.toFixed(6)} BTC`} />
            <Stat label="Lump-sum value" value={usd(run.r.lump.value)} tone={run.r.lump.returnPct >= 0 ? "up" : "down"} sub={`${pct(run.r.lump.returnPct, 1)} · ${run.r.lump.btc.toFixed(6)} BTC`} />
            <Stat label="DCA avg cost" value={usd(run.r.dca.avgCost)} sub={`vs ${usd(run.r.endPrice)} on ${iso(run.r.endTime)}`} />
          </div>
          <Card title="Portfolio value">
            <p className="mb-3 text-sm text-muted">
              {run.r.dca.value >= run.r.lump.value ? "DCA beat" : "Lump sum beat"} the alternative by{" "}
              <span className="num text-fg">{usd(Math.abs(run.r.dca.value - run.r.lump.value))}</span> over this period. Lump sum
              invests the same {usd(run.r.dca.invested)} at the {iso(run.r.startTime)} close.
            </p>
            {chart && <SeriesChart t={chart.t} lines={chart.lines} unit="usd" />}
            <SourceLine
              source={`${source} daily closes`}
              fetchedAt={fetchedAt}
              extra={run.r.endTime === last ? "latest day is today's still-forming candle" : undefined}
            />
          </Card>
        </>
      )}
    </div>
  );
}
