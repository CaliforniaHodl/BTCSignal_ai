import { runTick } from "@/lib/agent/tick";
import { cronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    const result = await runTick({ force });
    return Response.json(result);
  } catch (e) {
    console.error("[agent] tick failed", e);
    return Response.json({ error: "tick failed" }, { status: 500 });
  }
}
