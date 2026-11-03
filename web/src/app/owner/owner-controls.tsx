"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function OwnerControls({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (action: string) =>
    start(async () => {
      const r = await fetch("/api/owner/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const j = await r.json();
      setMsg(r.ok ? (j.summary ?? j.reason ?? "Done.") : (j.error ?? "Failed."));
      router.refresh();
    });
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <button disabled={pending} onClick={() => act("disable")} className="rounded-lg bg-down px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Kill switch: stop new trades</button>
        ) : (
          <button disabled={pending} onClick={() => act("enable")} className="rounded-lg bg-up px-3 py-2 text-sm font-medium text-black disabled:opacity-50">Re-enable agent</button>
        )}
        <button disabled={pending} onClick={() => act("tick")} className="rounded-lg border border-line-strong px-3 py-2 text-sm disabled:opacity-50">Run a tick now</button>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
