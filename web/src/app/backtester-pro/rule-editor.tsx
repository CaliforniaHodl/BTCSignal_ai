"use client";

import clsx from "clsx";
import { Button, Segmented } from "@/components/form";
import { conditionLabel, needsPeriod, OPERAND_KINDS, type Condition, type Operand, type OperandKind, type RuleSpec } from "@/lib/backtest/rules";

const KIND_LABEL: Record<OperandKind, string> = {
  close: "Close", open: "Open", high: "High", low: "Low", volume: "Volume", sma: "SMA", ema: "EMA",
  bb_upper: "Bollinger upper", bb_middle: "Bollinger middle", bb_lower: "Bollinger lower",
  highest_high: "Highest high (prior N)", lowest_low: "Lowest low (prior N)", rsi: "RSI", stoch_k: "Stochastic %K",
  macd_line: "MACD line", macd_signal: "MACD signal", macd_hist: "MACD histogram", atr: "ATR", volume_sma: "Volume SMA", const: "Number",
};
const DEFAULT_PERIOD: Partial<Record<OperandKind, number>> = { sma: 50, ema: 20, bb_upper: 20, bb_middle: 20, bb_lower: 20, highest_high: 20, lowest_low: 20, rsi: 14, stoch_k: 14, atr: 14, volume_sma: 20 };
const OPS: { value: Condition["op"]; label: string }[] = [
  { value: "above", label: "is above" }, { value: "below", label: "is below" },
  { value: "crosses_above", label: "crosses above" }, { value: "crosses_below", label: "crosses below" },
];
const sel = "rounded-lg border border-line-strong bg-sunken px-2 py-1.5 text-sm outline-none focus:border-accent";
const numIn = "num w-20 rounded-lg border border-line-strong bg-sunken px-2 py-1.5 text-sm outline-none focus:border-accent";

function OperandPicker({ value, onChange, label }: { value: Operand; onChange: (o: Operand) => void; label: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <select aria-label={`${label} operand`} className={sel} value={value.kind} onChange={(e) => {
        const kind = e.target.value as OperandKind;
        onChange({ kind, period: needsPeriod(kind) ? value.period ?? DEFAULT_PERIOD[kind] ?? 14 : null, value: kind === "const" ? value.value ?? 50 : null });
      }}>
        {OPERAND_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
      {needsPeriod(value.kind) && (
        <input aria-label={`${label} period`} className={numIn} type="number" min={2} max={400} value={value.period ?? ""} onChange={(e) => onChange({ ...value, period: e.target.value === "" ? null : Number(e.target.value) })} />
      )}
      {value.kind === "const" && (
        <input aria-label={`${label} value`} className={numIn} type="number" step="any" value={value.value ?? ""} onChange={(e) => onChange({ ...value, value: e.target.value === "" ? null : Number(e.target.value) })} />
      )}
    </span>
  );
}

function ConditionList({ title, hint, list, onChange, min }: { title: string; hint: string; list: Condition[]; onChange: (l: Condition[]) => void; min: number }) {
  const set = (i: number, c: Condition) => onChange(list.map((x, j) => (j === i ? c : x)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{title} <span className="text-xs font-normal text-faint">{hint}</span></h3>
        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" disabled={list.length >= 4}
          onClick={() => onChange([...list, { left: { kind: "close", period: null, value: null }, op: "above", right: { kind: "sma", period: 50, value: null } }])}>+ Add</Button>
      </div>
      {list.length === 0 && <p className="mt-2 text-sm text-faint">None.</p>}
      <ul className="mt-2 space-y-2">
        {list.map((c, i) => (
          <li key={i} className="rounded-lg border border-line p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <OperandPicker label={`${title} ${i + 1} left`} value={c.left} onChange={(left) => set(i, { ...c, left })} />
              <select aria-label={`${title} ${i + 1} comparison`} className={sel} value={c.op} onChange={(e) => set(i, { ...c, op: e.target.value as Condition["op"] })}>
                {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <OperandPicker label={`${title} ${i + 1} right`} value={c.right} onChange={(right) => set(i, { ...c, right })} />
              <button type="button" aria-label="Remove condition" disabled={list.length <= min} onClick={() => onChange(list.filter((_, j) => j !== i))} className="ml-auto px-2 text-muted hover:text-down disabled:opacity-30">×</button>
            </div>
            <div className="mt-1 text-xs text-faint">{safeLabel(c)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
const safeLabel = (c: Condition) => { try { return conditionLabel(c); } catch { return ""; } };

function LevelPicker<T extends string>({ label, value, types, onChange }: { label: string; value: { type: T; value: number | null }; types: { value: T; label: string }[]; onChange: (v: { type: T; value: number | null }) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-sm text-muted">{label}</span>
      <select aria-label={`${label} type`} className={sel} value={value.type} onChange={(e) => {
        const type = e.target.value as T;
        onChange({ type, value: type === "none" ? null : value.value ?? (type === "percent" ? 5 : 2) });
      }}>
        {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {value.type !== "none" && <input aria-label={`${label} value`} className={numIn} type="number" step="any" value={value.value ?? ""} onChange={(e) => onChange({ ...value, value: e.target.value === "" ? null : Number(e.target.value) })} />}
    </div>
  );
}

const LEVEL_TYPES = [{ value: "none" as const, label: "None" }, { value: "percent" as const, label: "% from entry" }, { value: "atr" as const, label: "× ATR(14)" }];

export function RuleEditor({ spec, onChange, errors, warnings }: { spec: RuleSpec; onChange: (s: RuleSpec) => void; errors: string[]; warnings: string[] }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Segmented label="Side" value={spec.side} onChange={(side) => onChange({ ...spec, side })} options={[{ value: "long", label: "Long" }, { value: "short", label: "Short" }]} />
        <Segmented label="Timeframe" value={spec.timeframe} onChange={(timeframe) => onChange({ ...spec, timeframe })} options={[{ value: "1h", label: "1h" }, { value: "4h", label: "4h" }, { value: "1d", label: "1d" }]} />
      </div>
      <ConditionList title="Entry" hint="all must be true at a bar close" list={spec.entry} min={1} onChange={(entry) => onChange({ ...spec, entry })} />
      <ConditionList title="Exit" hint="any one true at a bar close" list={spec.exit} min={0} onChange={(exit) => onChange({ ...spec, exit })} />
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Risk exits</h3>
        <LevelPicker label="Stop" value={spec.stop} types={LEVEL_TYPES} onChange={(stop) => onChange({ ...spec, stop })} />
        <LevelPicker label="Target" value={spec.target} types={[...LEVEL_TYPES, { value: "r_multiple" as const, label: "× stop (R)" }]} onChange={(target) => onChange({ ...spec, target })} />
        <LevelPicker label="Trailing" value={spec.trailing} types={LEVEL_TYPES} onChange={(trailing) => onChange({ ...spec, trailing })} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-sm text-muted">Max bars</span>
          <input aria-label="Max bars in trade" className={numIn} type="number" min={1} placeholder="none" value={spec.max_bars ?? ""} onChange={(e) => onChange({ ...spec, max_bars: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      </div>
      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="space-y-1 text-sm">
          {errors.map((e) => <li key={e} className="text-down">✕ {e}</li>)}
          {warnings.map((w) => <li key={w} className={clsx("text-warn")}>! {w}</li>)}
        </ul>
      )}
    </div>
  );
}
