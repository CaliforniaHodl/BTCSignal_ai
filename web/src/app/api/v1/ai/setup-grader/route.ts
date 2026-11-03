import { requirePro } from "@/lib/pay/access";
import { errorResponse, notConfigured } from "@/lib/ai/claude";
import { gradeSetup } from "@/lib/ai/features";
import { readImageUpload } from "@/lib/ai/images";
import { rateLimit } from "@/lib/ai/rate-limit";

const TFS = new Set(["5m", "15m", "1h", "4h", "1d", "1w"]);
const BIASES = new Set(["long", "short"]);

/** Premium. multipart/form-data: image (png/jpeg/webp ≤ 5 MB), timeframe?, bias? */
export async function POST(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const off = notConfigured();
  if (off) return off;

  const img = await readImageUpload(req);
  if (!img.ok) return Response.json({ error: img.error }, { status: 400 });
  const tf = String(img.fields?.get("timeframe") ?? "");
  const bias = String(img.fields?.get("bias") ?? "");

  const limited = await rateLimit("setup-grader");
  if (limited) return limited;

  const r = await gradeSetup(img, { timeframe: TFS.has(tf) ? tf : "", bias: BIASES.has(bias) ? bias : null });
  if (!r.ok) return errorResponse(r);
  return Response.json({ grade: r.data, model: r.model });
}
