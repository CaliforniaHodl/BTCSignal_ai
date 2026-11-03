import path from "node:path";
import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/** Connects and applies pending migrations (idempotent). Shared by the app and scripts. */
export async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 5, prepare: false });
    const d = drizzle(client, { schema });
    await migrate(d, { migrationsFolder: MIGRATIONS });
    return d as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const d = drizzle(client, { schema });
  await migrate(d, { migrationsFolder: MIGRATIONS });
  return d as unknown as Db;
}
