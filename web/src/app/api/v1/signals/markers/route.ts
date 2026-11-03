import { connection } from "next/server";
import { and, desc, gte, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SignalMarker } from "@/lib/chart/signal-markers";

/** Our own published (non-flat) engine signals since `since` (unix seconds). Free: the track record is public. */
export async function GET(req: Request) {
  await connection();
  const sinceParam = Number(new URL(req.url).searchParams.get("since"));
  const since = Number.isFinite(sinceParam) && sinceParam > 0 ? sinceParam : Math.floor(Date.now() / 1000) - 30 * 86_400;
  try {
    const d = await db();
    const rows = await d
      .select()
      .from(schema.signals)
      .where(and(gte(schema.signals.createdAt, new Date(since * 1000)), ne(schema.signals.direction, "flat")))
      .orderBy(desc(schema.signals.createdAt))
      .limit(500);
    const markers: SignalMarker[] = rows.map((r) => ({
      time: Math.floor(r.createdAt.getTime() / 1000),
      direction: r.direction === "short" ? "short" : "long",
      price: r.price,
      confidence: r.confidence,
      outcome: r.outcome,
      directionCorrect: r.directionCorrect,
    }));
    return Response.json({ ok: true, markers }, { headers: { "cache-control": "public, max-age=60" } });
  } catch (e) {
    console.error("[signals/markers]", e);
    return Response.json({ ok: false, error: "signal history unavailable" }, { status: 503 });
  }
}
