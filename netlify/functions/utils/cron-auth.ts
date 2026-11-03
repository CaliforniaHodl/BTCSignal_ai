// Shared-secret guard for scheduled / machine-triggered functions.
// Callers (GitHub Actions) must send:  Authorization: Bearer <CRON_SECRET>
// Fails closed: if CRON_SECRET is not configured, every request is rejected.

import { timingSafeEqual, createHash } from 'node:crypto';

function digest(value: string): Buffer {
  // Hash both sides so lengths always match for timingSafeEqual.
  return createHash('sha256').update(value).digest();
}

export function isCronAuthorized(authorizationHeader: string | null | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 32) {
    console.error('SECURITY: CRON_SECRET missing or shorter than 32 chars - rejecting request');
    return false;
  }
  if (!authorizationHeader?.startsWith('Bearer ')) return false;
  const provided = authorizationHeader.slice('Bearer '.length).trim();
  return timingSafeEqual(digest(provided), digest(expected));
}

/** For v2 functions: `export default async (req: Request) => ...` */
export function requireCron(req: Request): Response | null {
  if (isCronAuthorized(req.headers.get('authorization'))) return null;
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** For v1 functions: `const handler: Handler = async (event) => ...` */
export function requireCronEvent(
  headers: Record<string, string | undefined>
): { statusCode: number; body: string } | null {
  if (isCronAuthorized(headers['authorization'] ?? headers['Authorization'])) return null;
  return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
}
