"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Badge, Card, Stat } from "@/components/ui";
import { Button, ErrorNote, Field, inputCls, Segmented } from "@/components/tool-form";
import {
  fromCsv, isClosed, loadAll, mergeEntries, MIGRATED_FLAG, newId, normalize, pnlPct, pnlUsd, rMultiple, sortEntries, stats,
  STORAGE_KEY, toCsv, type JournalEntry,
} from "@/lib/journal/journal";
import { usd } from "@/lib/format";

const storage = (): Storage | null => {
  try { return window.localStorage; } catch { return null; }
};
const today = () => new Date().toISOString().slice(0, 10);
type Draft = Record<"entry" | "exit" | "stop" | "target" | "sizeUsd" | "feesUsd" | "tags" | "notes" | "entryDate" | "exitDate" | "timeframe", string> & { side: "long" | "short" };
/** `entryDate` is filled after mount: no clock reads during prerender. */
const blank = (entryDate = ""): Draft => ({ side: "long", entry: "", exit: "", stop: "", target: "", sizeUsd: "", feesUsd: "", tags: "", notes: "", entryDate, exitDate: "", timeframe: "" });
const toDraft = (e: JournalEntry): Draft => ({
  side: e.side, entry: String(e.entry), exit: e.exit?.toString() ?? "", stop: e.stop?.toString() ?? "", target: e.target?.toString() ?? "",
  sizeUsd: String(e.sizeUsd), feesUsd: e.feesUsd ? String(e.feesUsd) : "", tags: e.tags.join(", "), notes: e.notes, entryDate: e.entryDate, exitDate: e.exitDate ?? "", timeframe: e.timeframe ?? "",
});
const sign = (n: number) => (n > 0 ? "+" : "");

export function JournalApp() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => blank());
  const [editing, setEditing] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [tag, setTag] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load (and one-time migrate legacy keys) after mount: localStorage isn't available on the server.
  useEffect(() => {
    const s = storage();
    let migrated = false;
    try { migrated = s?.getItem(MIGRATED_FLAG) === "1"; } catch { /* ignore */ }
    const r = loadAll(s, { includeLegacy: !migrated });
    setEntries(r.entries); // eslint-disable-line react-hooks/set-state-in-effect -- hydrate from browser storage
    setDraft((d) => (d.entryDate ? d : { ...d, entryDate: today() }));
    if (r.migrated) setNotice(`Imported ${r.migrated} trade${r.migrated === 1 ? "" : "s"} from the previous version of the journal.`);
    try {
      s?.setItem(STORAGE_KEY, JSON.stringify(r.entries));
      s?.setItem(MIGRATED_FLAG, "1");
    } catch { setStorageOk(false); }
  }, []);

  function save(next: JournalEntry[]) {
    const sorted = sortEntries(next);
    setEntries(sorted);
    try { storage()?.setItem(STORAGE_KEY, JSON.stringify(sorted)); setStorageOk(true); } catch { setStorageOk(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    const n = normalize({ ...draft, id: editing ?? newId(), exitDate: draft.exitDate || null });
    if (!n) return setFormErr("Side, a positive entry price and a position size are required.");
    if (n.stop != null && (n.side === "long" ? n.stop >= n.entry : n.stop <= n.entry)) return setFormErr(`For a ${n.side}, the stop must be ${n.side === "long" ? "below" : "above"} the entry.`);
    save(editing ? entries!.map((x) => (x.id === editing ? n : x)) : [n, ...(entries ?? [])]);
    setDraft(blank(today())); setEditing(null);
  }

  function exportCsv() {
    const blob = new Blob([toCsv(entries ?? [])], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trade-journal-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importCsv(f: File | undefined) {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return setNotice("That CSV is over 2 MB.");
    const { rows, error } = fromCsv(await f.text());
    if (error) return setNotice(error);
    const r = mergeEntries(entries ?? [], rows);
    save(r.entries);
    setNotice(`Imported ${r.added} of ${rows.length} rows${rows.length - r.added ? ` (${rows.length - r.added} skipped as duplicates or missing side/entry/size)` : ""}.`);
    if (fileRef.current) fileRef.current.value = "";
  }

  const s = useMemo(() => stats(entries ?? []), [entries]);
  const allTags = useMemo(() => [...new Set((entries ?? []).flatMap((e) => e.tags))].sort(), [entries]);
  const shown = (entries ?? []).filter((e) => (filter === "all" || (filter === "open") !== isClosed(e)) && (!tag || e.tags.includes(tag)));

  if (entries == null) return <div className="card h-64 animate-pulse" />;
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <div className="space-y-6">
      {notice && <div className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">{notice} <button className="ml-2 underline" onClick={() => setNotice(null)}>Dismiss</button></div>}
      {!storageOk && <ErrorNote>This browser is blocking local storage, so trades won&apos;t be saved after you leave. Export to CSV to keep them.</ErrorNote>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Net P&L" value={`${sign(s.totalPnl)}${usd(s.totalPnl, 2)}`} tone={s.totalPnl > 0 ? "up" : s.totalPnl < 0 ? "down" : "muted"} sub={`${s.closed} closed · ${s.open} open`} />
        <Stat label="Win rate" value={s.winRatePct == null ? "—" : `${s.winRatePct.toFixed(0)}%`} sub={`${s.wins}W / ${s.losses}L`} />
        <Stat label="Expectancy" value={s.expectancyUsd == null ? "—" : `${sign(s.expectancyUsd)}${usd(s.expectancyUsd, 2)}`} sub="avg P&L per closed trade" />
        <Stat label="Avg R" value={s.avgR == null ? "—" : `${sign(s.avgR)}${s.avgR.toFixed(2)}R`} sub={`${s.rTrades} trades with a stop`} />
        <Stat label="Profit factor" value={s.profitFactor == null ? "—" : s.profitFactor.toFixed(2)} sub="gross win / gross loss" />
        <Stat label="Avg win / loss" value={s.avgWin == null ? "—" : usd(s.avgWin)} sub={s.avgLoss == null ? "no losses" : `loss ${usd(s.avgLoss)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} className="card space-y-3 p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><h2 className="font-medium">{editing ? "Edit trade" : "Log a trade"}</h2>
            <Segmented label="Side" value={draft.side} onChange={(side) => setDraft({ ...draft, side })} options={[{ value: "long", label: "Long" }, { value: "short", label: "Short" }]} /></div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry date"><input className={inputCls} type="date" value={draft.entryDate} onChange={set("entryDate")} required /></Field>
            <Field label="Exit date" hint="blank = still open"><input className={inputCls} type="date" value={draft.exitDate} onChange={set("exitDate")} /></Field>
            <Field label="Entry price"><input className={inputCls} inputMode="decimal" value={draft.entry} onChange={set("entry")} required /></Field>
            <Field label="Exit price" hint="blank = still open"><input className={inputCls} inputMode="decimal" value={draft.exit} onChange={set("exit")} /></Field>
            <Field label="Stop" hint="for R-multiples"><input className={inputCls} inputMode="decimal" value={draft.stop} onChange={set("stop")} /></Field>
            <Field label="Target"><input className={inputCls} inputMode="decimal" value={draft.target} onChange={set("target")} /></Field>
            <Field label="Size (USD notional)"><input className={inputCls} inputMode="decimal" value={draft.sizeUsd} onChange={set("sizeUsd")} required /></Field>
            <Field label="Fees paid (USD)"><input className={inputCls} inputMode="decimal" value={draft.feesUsd} onChange={set("feesUsd")} /></Field>
            <Field label="Tags" hint="comma separated" className="col-span-2"><input className={clsx(inputCls, "font-sans")} value={draft.tags} onChange={set("tags")} placeholder="breakout, 4h, revenge-trade" /></Field>
          </div>
          <Field label="Notes"><textarea className={clsx(inputCls, "min-h-20 font-sans")} maxLength={2000} value={draft.notes} onChange={set("notes")} /></Field>
          {formErr && <ErrorNote>{formErr}</ErrorNote>}
          <div className="flex gap-2">
            <Button type="submit">{editing ? "Save changes" : "Add trade"}</Button>
            {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setDraft(blank(today())); }}>Cancel</Button>}
          </div>
        </form>

        <div className="space-y-6 lg:col-span-3">
          <Card title="Trades" action={
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />
              {allTags.length > 0 && (
                <select aria-label="Filter by tag" className="rounded-lg border border-line-strong bg-sunken px-2 py-1.5 text-sm" value={tag} onChange={(e) => setTag(e.target.value)}>
                  <option value="">All tags</option>{allTags.map((t) => <option key={t}>{t}</option>)}
                </select>
              )}
            </div>
          }>
            {shown.length === 0 ? <p className="text-sm text-muted">{entries.length ? "No trades match this filter." : "No trades yet. Log your first one, or import a CSV."}</p> : (
              <ul className="divide-y divide-line">
                {shown.map((e) => {
                  const p = pnlUsd(e), pp = pnlPct(e), r = rMultiple(e);
                  return (
                    <li key={e.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge tone={e.side === "long" ? "up" : "down"}>{e.side}</Badge>
                          <span className="num">{usd(e.entry)} → {e.exit != null ? usd(e.exit) : <span className="text-muted">open</span>}</span>
                          <span className="text-xs text-faint">{e.entryDate}{e.exitDate && e.exitDate !== e.entryDate ? ` → ${e.exitDate}` : ""} · {usd(e.sizeUsd)}</span>
                        </div>
                        {e.tags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{e.tags.map((t) => <button key={t} onClick={() => setTag(t)} className="rounded bg-sunken px-1.5 py-0.5 text-[11px] text-muted hover:text-fg">#{t}</button>)}</div>}
                        {e.notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{e.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        {p != null && <span className={clsx("num text-sm", p >= 0 ? "text-up" : "text-down")}>{sign(p)}{usd(p, 2)}<span className="ml-1 text-xs text-faint">{pp != null ? `${sign(pp)}${pp.toFixed(1)}%` : ""}{r != null ? ` · ${sign(r)}${r.toFixed(2)}R` : ""}</span></span>}
                        <button className="text-xs text-muted underline" onClick={() => { setEditing(e.id); setDraft(toDraft(e)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                        <button className="text-xs text-muted underline hover:text-down" onClick={() => { if (confirm("Delete this trade?")) save(entries.filter((x) => x.id !== e.id)); }}>Delete</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {s.byTag.length > 0 && (
            <Card title="By tag" className="overflow-x-auto">
              <table className="num w-full min-w-[360px] text-sm">
                <thead className="text-left text-xs text-faint"><tr><th className="pb-2 font-normal">Tag</th><th className="font-normal">Trades</th><th className="font-normal">Win</th><th className="text-right font-normal">P&amp;L</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {s.byTag.map((t) => (
                    <tr key={t.tag}><td className="py-1.5 font-sans">#{t.tag}</td><td>{t.trades}</td><td>{t.winRatePct.toFixed(0)}%</td><td className={clsx("text-right", t.pnl >= 0 ? "text-up" : "text-down")}>{sign(t.pnl)}{usd(t.pnl, 2)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-faint">Long: {s.bySide.long.trades} trades, {sign(s.bySide.long.pnl)}{usd(s.bySide.long.pnl, 2)} · Short: {s.bySide.short.trades} trades, {sign(s.bySide.short.pnl)}{usd(s.bySide.short.pnl, 2)}</p>
            </Card>
          )}

          <Card title="Your data">
            <p className="text-sm text-muted">Trades are stored only in this browser. Nothing is sent to our servers. Export a CSV to back them up or move them to another device.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={exportCsv} disabled={!entries.length}>Export CSV</Button>
              <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>Import CSV</Button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => importCsv(e.target.files?.[0])} />
              <Button type="button" variant="danger" disabled={!entries.length} onClick={() => { if (confirm(`Delete all ${entries.length} trades from this browser? Export first if you want a copy.`)) save([]); }}>Clear all</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
