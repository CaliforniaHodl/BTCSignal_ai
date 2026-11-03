import { requirePro } from "@/lib/pay/access";
import { errorResponse, notConfigured } from "@/lib/ai/claude";
import { analyzeChart } from "@/lib/ai/features";
import { readImageUpload } from "@/lib/ai/images";
import { rateLimit } from "@/lib/ai/rate-limit";

/** Premium. multipart/form-data: image (png/jpeg/webp ≤ 5 MB), question? (≤ 500 chars) */
export async function POST(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const off = notConfigured();
  if (off) return off;

  const img = await readImageUpload(req);
  if (!img.ok) return Response.json({ error: img.error }, { status: 400 });
  const question = String(img.fields?.get("question") ?? "").trim().slice(0, 500);

  const limited = await rateLimit("analyze");
  if (limited) return limited;

  const r = await analyzeChart(img, question);
  if (!r.ok) return errorResponse(r);
  return Response.json({ analysis: r.data, model: r.model });
}
