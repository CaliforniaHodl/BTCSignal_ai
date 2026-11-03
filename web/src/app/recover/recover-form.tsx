"use client";

import { useState } from "react";

export function RecoverForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ k: "idle" | "busy" } | { k: "ok"; until: string } | { k: "err"; msg: string }>({ k: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ k: "busy" });
    try {
      const r = await fetch("/api/access/recover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const j = await r.json();
      setState(j.ok ? { k: "ok", until: new Date(j.expiresAt).toLocaleDateString() } : { k: "err", msg: j.error ?? "Couldn't restore that code." });
    } catch {
      setState({ k: "err", msg: "Network error. Try again." });
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-3">
      <label htmlFor="code" className="text-sm text-muted">Recovery code</label>
      <input
        id="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="BTCS-XXXX-XXXX-XXXX-XXXX"
        autoComplete="off"
        spellCheck={false}
        className="num w-full rounded-lg border border-line-strong bg-sunken px-3 py-2.5 uppercase outline-none focus:border-accent"
      />
      <button disabled={state.k === "busy" || code.trim().length < 16} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-black disabled:opacity-50">
        {state.k === "busy" ? "Checking…" : "Restore access"}
      </button>
      {state.k === "ok" && <p className="text-up">Restored. Pro is active until {state.until}. <a href="/dashboard" className="underline">Open the dashboard</a>.</p>}
      {state.k === "err" && <p className="text-down">{state.msg}</p>}
    </form>
  );
}
