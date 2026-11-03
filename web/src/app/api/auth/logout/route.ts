import { destroySession, sameOrigin } from "@/lib/auth/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  await destroySession();
  return Response.redirect(new URL("/", req.url), 303);
}
