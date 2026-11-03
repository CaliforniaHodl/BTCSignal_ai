import { requirePro } from "@/lib/pay/access";
import { loadRadar } from "@/lib/radar/load";
import { getRadarSummary, summaryConfigured } from "@/lib/radar/summary";

/** GET /api/pro/radar[?summary=1] — Pro only. The deterministic feed, optionally with the cached Claude summary. */
export async function GET(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const wantSummary = new URL(req.url).searchParams.get("summary") === "1";
  const headers = { "cache-control": "private, no-store" };
  if (wantSummary) {
    if (!summaryConfigured()) return Response.json({ error: "Claude summary is not configured on this deployment" }, { status: 503, headers });
    try {
      return Response.json(await getRadarSummary(), { headers });
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "summary unavailable" }, { status: 503, headers });
    }
  }
  const r = await loadRadar();
  return Response.json({ generatedAt: r.generatedAt, items: r.items, unavailable: r.unavailable }, { headers });
}
