import { toCsv } from "@/lib/dashboard/compute";
import { exportRows, loadDashboard, PANELS } from "@/lib/dashboard/load";
import { requirePro } from "@/lib/pay/access";

const IDS = new Set<string>(PANELS.map((p) => p.id));

/** GET /api/pro/dashboard?format=json|csv&panels=a,b — Pro only. Export of the dashboard's numbers. */
export async function GET(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") return Response.json({ error: "format must be json or csv" }, { status: 400 });
  const raw = url.searchParams.get("panels");
  const panels = raw ? new Set(raw.split(",").filter((p) => IDS.has(p))) : undefined;
  const rows = exportRows(await loadDashboard(), panels);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "");
  const headers = { "cache-control": "private, no-store" };
  if (format === "csv") {
    return new Response(toCsv(rows), { headers: { ...headers, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="btcsignal-dashboard-${stamp}.csv"` } });
  }
  return Response.json({ generatedAt: new Date().toISOString(), rows }, { headers: { ...headers, "content-disposition": `attachment; filename="btcsignal-dashboard-${stamp}.json"` } });
}
