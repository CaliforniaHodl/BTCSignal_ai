import "server-only";
import * as schema from "./schema";
import { connect, type Db } from "./connect";

/**
 * One DB handle per process. Production: DATABASE_URL (Neon/Postgres).
 * Local dev: embedded PGlite in .data/pglite — no install, real Postgres.
 */
const g = globalThis as unknown as { __db?: Promise<Db> };
export function db(): Promise<Db> {
  g.__db ??= connect().catch((e) => {
    g.__db = undefined; // don't cache a failed connection
    throw e;
  });
  return g.__db;
}
export { schema };
