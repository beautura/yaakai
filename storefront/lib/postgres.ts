import { Pool, type PoolClient } from "pg";

declare global {
  var yaakaiPostgresPool: Pool | undefined;
}

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  globalThis.yaakaiPostgresPool ??= new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
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
