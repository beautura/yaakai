import { Pool, type PoolClient } from "pg";

declare global {
  var yaakaiPostgresPool: Pool | undefined;
}

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const parsedUrl = new URL(connectionString);
  const sslMode = parsedUrl.searchParams.get("sslmode")?.toLowerCase();
  if (!sslMode || !["require", "verify-ca", "verify-full"].includes(sslMode)) {
    throw new Error("DATABASE_URL must include sslmode=require (or a certificate-verified SSL mode).");
  }
  globalThis.yaakaiPostgresPool ??= new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
  return globalThis.yaakaiPostgresPool;
}

export async function inTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
