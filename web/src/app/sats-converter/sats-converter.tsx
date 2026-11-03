"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, SourceLine, Unavailable } from "@/components/ui";
import { Field, inputCls } from "@/components/form";
import { formatBtc, fromSats, parseAmount, toSats, type Unit } from "@/lib/calc/sats";
import type { Fiat, FxRates } from "@/lib/market/fx";
import type { Datum, SpotStats } from "@/lib/market/types";

const STORAGE_KEY = "btcs.stack.v1";
type Entry = { id: string; label: string; sats: number; addedAt: number };

function loadStack(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v)
      ? v.filter((e): e is Entry => !!e && typeof e.id === "string" && typeof e.label === "string" && Number.isFinite(e.sats) && Number.isFinite(e.addedAt))
      : [];
  } catch {
    return [];
  }
}
function saveStack(s: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota — tracker just won't persist */
  }
}

const fiatFmt = (n: number, f: Fiat) =>
  n.toLocaleString("en-US", { style: "currency", currency: f, maximumFractionDigits: f === "JPY" || n >= 1000 ? 0 : 2 });

export function SatsConverter({ spot, fx }: { spot: Datum<SpotStats>; fx: Datum<FxRates> }) {
  const fiats = useMemo(() => (fx.ok ? (Object.keys(fx.value) as Fiat[]) : (["USD"] as Fiat[])), [fx]);
  const [fiat, setFiat] = useState<Fiat>("USD");
  const [edited, setEdited] = useState<{ unit: Unit; raw: string }>({ unit: "btc", raw: "0.01" });
  const [stack, setStack] = useState<Entry[]>([]);
  const [label, setLabel] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage is only readable after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStack(loadStack());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveStack(stack);
  }, [stack, loaded]);

  if (!spot.ok) {
    return (
      <Card className="mt-10">
        <Unavailable source={spot.source} error={spot.error} />
        <SourceLine source={spot.source} fetchedAt={spot.fetchedAt} />
      </Card>
    );
  }
  const fiatPerBtc = spot.value.price * (fx.ok ? fx.value[fiat] : 1);
  const amount = parseAmount(edited.raw);
  const sats = amount != null ? toSats(amount, edited.unit, fiatPerBtc) : null;
  const conv = sats != null ? fromSats(sats, fiatPerBtc) : null;
  const shown = (unit: Unit) => {
    if (edited.unit === unit) return edited.raw;
    if (!conv) return "";
    if (unit === "btc") return formatBtc(conv.btc);
    if (unit === "sats") return conv.sats.toLocaleString("en-US");
    return conv.fiat.toFixed(fiat === "JPY" ? 0 : 2);
  };
  const totalSats = stack.reduce((s, e) => s + e.sats, 0);
  const total = fromSats(totalSats, fiatPerBtc);

  const add = () => {
    if (!sats) return;
    setStack((s) => [...s, { id: crypto.randomUUID(), label: label.trim().slice(0, 60) || "Stack", sats, addedAt: Date.now() }]);
    setLabel("");
  };

  return (
    <div className="mt-10 space-y-6">
      <Card title="Convert">
        <div className="grid gap-4">
          <Field label="Bitcoin (BTC)" htmlFor="sc-btc">
            <input id="sc-btc" inputMode="decimal" autoComplete="off" value={shown("btc")} onChange={(e) => setEdited({ unit: "btc", raw: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Satoshis (sats)" htmlFor="sc-sats">
            <input id="sc-sats" inputMode="numeric" autoComplete="off" value={shown("sats")} onChange={(e) => setEdited({ unit: "sats", raw: e.target.value })} className={inputCls} />
          </Field>
          <Field label={fiat} htmlFor="sc-fiat">
            <div className="flex gap-2">
              <input id="sc-fiat" inputMode="decimal" autoComplete="off" value={shown("fiat")} onChange={(e) => setEdited({ unit: "fiat", raw: e.target.value })} className={inputCls} />
              <select aria-label="Currency" value={fiat} onChange={(e) => setFiat(e.target.value as Fiat)} className="rounded-lg border border-line-strong bg-sunken px-2 outline-none focus:border-accent">
                {fiats.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </Field>
        </div>
        {amount == null && edited.raw.trim() !== "" && <p className="mt-3 text-sm text-down">Enter a positive number.</p>}
        <div className="num mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-sunken p-3">
            <div className="text-[11px] uppercase tracking-wider text-faint">1 BTC</div>
            <div className="mt-1 font-semibold">{fiatFmt(fiatPerBtc, fiat)}</div>
          </div>
          <div className="rounded-lg border border-line bg-sunken p-3">
            <div className="text-[11px] uppercase tracking-wider text-faint">Sats per 1 {fiat}</div>
            <div className="mt-1 font-semibold">{Math.round(1e8 / fiatPerBtc).toLocaleString()}</div>
          </div>
        </div>
        <SourceLine source={spot.source} fetchedAt={spot.fetchedAt} extra="BTC-USD spot" />
        {fiat !== "USD" && fx.ok && <SourceLine source={fx.source} fetchedAt={fx.fetchedAt} extra={`1 USD = ${fx.value[fiat]} ${fiat}`} />}
        {!fx.ok && <p className="mt-2 text-xs text-faint">Other currencies unavailable: {fx.source} didn&apos;t respond. USD only.</p>}
      </Card>

      <Card title="Stack tracker" action={<span className="text-xs text-faint">Saved in this browser only</span>}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input aria-label="Label" placeholder="Label (e.g. Cold wallet)" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} className={inputCls + " font-sans"} />
          <button type="button" onClick={add} disabled={!sats} className="shrink-0 rounded-lg bg-accent px-4 py-2 font-medium text-black disabled:opacity-50">
            Add {sats ? `${sats.toLocaleString()} sats` : ""}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-faint">Adds the amount currently in the converter.</p>
        {stack.length > 0 ? (
          <>
            <ul className="mt-4 divide-y divide-line">
              {stack.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{e.label}</div>
                    <div className="num text-xs text-faint">{e.sats.toLocaleString()} sats · {fiatFmt(fromSats(e.sats, fiatPerBtc).fiat, fiat)}</div>
                  </div>
                  <button type="button" onClick={() => setStack((s) => s.filter((x) => x.id !== e.id))} className="text-xs text-muted hover:text-down" aria-label={`Remove ${e.label}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="num mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-line-strong pt-3">
              <span className="font-sans text-sm text-muted">Total</span>
              <span className="font-semibold">
                {totalSats.toLocaleString()} sats · {formatBtc(total.btc)} BTC · {fiatFmt(total.fiat, fiat)}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">{loaded ? "Nothing tracked yet." : "Loading…"}</p>
        )}
      </Card>
    </div>
  );
}
