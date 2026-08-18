import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";

/**
 * A single connection Pool shared by the whole process.
 *
 * Why a Pool and not a Client: opening a TCP connection and
 * authenticating costs tens of milliseconds, and PostgreSQL spawns an OS
 * process per connection. A pool keeps a small set of connections open
 * and hands them out per query, which is what lets the API serve several
 * concurrent orders without the connection cost dominating.
 */
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,

  max: 10, // Maximum simultaneous connections
  idleTimeoutMillis: 30_000, // Close a connection idle for 30s
  connectionTimeoutMillis: 5_000, // Fail fast if the server is unreachable
});

/**
 * A pooled connection can die between queries (server restart, network
 * drop). Without this listener that surfaces as an unhandled 'error'
 * event, which crashes the Node process.
 */
pool.on("error", (error) => {
  console.error("Unexpected error on an idle database connection:", error);
});

/**
 * Runs a query using a connection borrowed from the pool, which is
 * returned automatically afterwards.
 *
 * Always pass values through `params` rather than string concatenation.
 * The driver sends the SQL and the values separately, so a value can
 * never be parsed as SQL - this is what makes SQL injection impossible.
 */
export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Verifies the database is reachable before the API starts accepting
 * traffic.
 *
 * docker-compose already waits for the container healthcheck, but that
 * only proves PostgreSQL is accepting connections - not that these
 * credentials work against this database. Retrying also covers running
 * the backend outside Docker, where nothing sequences the startup.
 */
export async function connectDatabase(
  retries = 5,
  delayMs = 2_000,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await query<{ now: Date }>("SELECT NOW() as now");
      console.log(
        `Connected to PostgreSQL at ${env.db.host}:${env.db.port}/${env.db.name} ` +
          `(server time ${result.rows[0]?.now.toISOString()})`,
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Database connection attempt ${attempt}/${retries} failed: ${message}`,
      );

      if (attempt === retries) {
        // `cause` keeps the underlying driver error (bad password, host
        // not found, ...) attached, instead of masking it behind a
        // generic message that says nothing about what went wrong.
        throw new Error(
          `Could not connect to the database after ${retries} attempts.`,
          { cause: error },
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/** Lightweight liveness probe used by the /health endpoint. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Closes every pooled connection so the process can exit cleanly.
 * Called from the shutdown handler in server.ts.
 */
export async function disconnectDatabase(): Promise<void> {
  await pool.end();
  console.log("Database connection pool closed");
}
