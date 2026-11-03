import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { Badge, Page, PageHeader } from "@/components/ui";
import { getOwner } from "@/lib/alerts/owner";
import { formatValue, type AlertKind } from "@/lib/alerts/rules";
import { listHistory } from "@/lib/alerts/store";

export const metadata: Metadata = { title: "Alert history", description: "Every alert that fired, what it saw, and whether it was delivered." };

export default function AlertHistoryPage() {
  return (
    <Page>
      <PageHeader eyebrow="Alerts" title="Alert history" lede="Every time one of your alerts fired: the value it saw, the source, and whether Discord accepted the message.">
        <p className="mt-3 text-sm"><Link href="/alerts" className="text-accent hover:underline">← Manage alerts</Link></p>
      </PageHeader>
      <Suspense fallback={<div className="card mt-8 h-64 animate-pulse" />}>
        <HistoryBody />
      </Suspense>
    </Page>
  );
}

async function HistoryBody() {
  await connection();
  let rows;
  try {
    rows = await listHistory(await getOwner());
  } catch (e) {
    console.error("[alerts history]", e);
    return <div className="card mt-8 p-8 text-muted">Alert history is unavailable right now.</div>;
  }
  if (!rows.length) return <div className="card mt-8 p-8 text-muted">Nothing has fired yet. Alerts are checked every 5 minutes.</div>;
  return (
    <div className="card mt-8 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-faint">
          <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Alert</th><th className="px-4 py-3">Observed</th><th className="px-4 py-3">Delivery</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-3 text-muted"><LocalTime iso={r.firedAt.toISOString()} /></td>
              <td className="px-4 py-3">{r.message.split(" — ")[0]}{r.deleted && <span className="ml-2 text-xs text-faint">(deleted)</span>}</td>
              <td className="num whitespace-nowrap px-4 py-3">{formatValue(r.kind as AlertKind, r.observedValue)}<div className="text-[11px] text-faint">{r.source}</div></td>
              <td className="px-4 py-3">
                {r.delivery === "sent" ? <Badge tone="up">Discord ✓</Badge> : r.delivery === "failed" ? <span title={r.deliveryError ?? ""}><Badge tone="down">Discord failed</Badge></span> : <Badge>In-app</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
