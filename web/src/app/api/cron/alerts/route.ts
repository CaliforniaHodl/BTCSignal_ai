import { runAlertCheck } from "@/lib/alerts/check";
import { cronAuthorized } from "@/lib/cron-auth";

export const maxDuration = 120;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await runAlertCheck());
  } catch (e) {
    console.error("[alerts] check failed", e);
    return Response.json({ error: "alert check failed" }, { status: 500 });
  }
}
