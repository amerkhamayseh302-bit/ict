import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    null
  );
}

export function isDbConfigured(): boolean {
  return Boolean(getConnectionString());
}

export function getPool(): Pool | null {
  const connectionString = getConnectionString();
  if (!connectionString) return null;

  if (globalThis.__pgPool) {
    return globalThis.__pgPool;
  }

  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isLocal
      ? false
      : {
          rejectUnauthorized: false,
        },
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__pgPool = pool;
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const pool = getPool();
  if (!pool) {
    throw new Error(
      "إعدادات قاعدة بيانات PostgreSQL غير مكتملة. أضف DATABASE_URL في ملف .env.local.",
    );
  }
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  if (!pool) {
    throw new Error(
      "إعدادات قاعدة بيانات PostgreSQL غير مكتملة. أضف DATABASE_URL في ملف .env.local.",
    );
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
