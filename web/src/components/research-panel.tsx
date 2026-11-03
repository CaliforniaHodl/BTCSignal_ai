import clsx from "clsx";
import research from "../../research/latest.json";

type M = { returnPct: number; holdPct: number; trades: number; winRatePct: number; profitFactor: number | null; maxDrawdownPct: number; sharpe: number; feesUsd: number };
const fmt = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(d));

/** Backtest + walk-forward results from `npm run research`, shown on the public agent page. */
export function ResearchPanel() {
  const r = research as unknown as {
    generatedAt: string; period: { from: string; to: string }; fees: { maker: number; taker: number };
    baseline: M; intradayV2: M; walkForward: { trainDays: number; testDays: number; oos: M };
    gate: { pass: boolean; failures: string[] };
  };
  const rows: [string, M, string][] = [
    ["Live config (in-sample)", r.baseline, "Chosen after seeing this history: optimistic by construction"],
    ["Walk-forward, out-of-sample", r.walkForward.oos, `Tuned on ${r.walkForward.trainDays}d, traded the next unseen ${r.walkForward.testDays}d, rolled forward`],
    ["Original v2.0 intraday config", r.intradayV2, "Retired: fees overwhelmed it"],
  ];
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Backtest &amp; live-trading gate</h2>
        <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", r.gate.pass ? "bg-up-soft text-up" : "bg-down-soft text-down")}>
          Gate {r.gate.pass ? "PASSED" : "NOT PASSED"} — {r.gate.pass ? "eligible for small live size" : "paper only"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        {r.period.from} → {r.period.to}, Coinbase hourly data, all seven factors, with historical funding (Deribit) and
        Fear &amp; Greed. Fees {fmt(r.fees.maker * 100)}% maker / {fmt(r.fees.taker * 100)}% taker plus slippage; stops
        assumed to hit before targets inside a bar. Buy-and-hold over the same period: {fmt(r.baseline.holdPct, 1)}%.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="num w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-faint">
            <tr><th className="pb-2 font-normal">Run</th><th className="font-normal">Return</th><th className="font-normal">Trades</th><th className="font-normal">Win</th><th className="font-normal">PF</th><th className="font-normal">Max DD</th><th className="font-normal">Sharpe</th><th className="font-normal">Fees</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, m, note]) => (
              <tr key={label}>
                <td className="py-2.5 pr-4 font-sans"><div>{label}</div><div className="text-xs text-faint">{note}</div></td>
                <td className={m.returnPct >= 0 ? "text-up" : "text-down"}>{m.returnPct >= 0 ? "+" : ""}{fmt(m.returnPct, 1)}%</td>
                <td>{m.trades}</td>
                <td>{fmt(m.winRatePct, 0)}%</td>
                <td>{fmt(m.profitFactor)}</td>
                <td>{fmt(m.maxDrawdownPct, 1)}%</td>
                <td>{fmt(m.sharpe)}</td>
                <td>${fmt(m.feesUsd, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!r.gate.pass && (
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {r.gate.failures.map((f) => <li key={f}>✗ Out-of-sample {f}</li>)}
        </ul>
      )}
      <p className="mt-4 text-xs text-faint">
        Real money requires the out-of-sample gate (PF ≥ 1.2, Sharpe ≥ 0.5, win ≥ 35%, DD ≤ 35%, ≥ 20 trades) plus 30+ days
        of paper trading consistent with the backtest. Updated {r.generatedAt.slice(0, 10)}.
      </p>
    </div>
  );
}
