import { DataSource } from "typeorm";
import { env, isProduction } from "./env";
import { Order } from "../entities/Order";

/**
 * The TypeORM DataSource - the single connection to PostgreSQL.
 *
 * This replaces both config/database.ts (the pg connection pool) and
 * config/initDatabase.ts (which executed db/schema.sql), because
 * initialize() below does all of it in one call.
 */
export const AppDataSource = new DataSource({
  type: "postgres",

  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  // NOTE: TypeORM calls this `username`, while the pg driver calls it
  // `user`. Getting it wrong surfaces as an authentication failure that
  // looks like a wrong password.
  username: env.db.user,
  password: env.db.password,

  /**
   * Listed explicitly rather than as a glob such as "src/entities/*.ts".
   * A glob that resolves under tsx (reading .ts from src/) breaks after
   * `npm run build` (running .js from dist/), and an explicit array is
   * checked by the compiler - renaming the entity becomes a build error
   * instead of a runtime "No metadata for Order was found".
   */
  entities: [Order],

  /**
   * Schema management. On initialize(), TypeORM compares the entity
   * metadata against the live database and issues whatever DDL closes
   * the gap: the first run creates everything, later runs should be
   * silent.
   *
   * Forced off in production. It works by diffing, so it will happily
   * DROP a column - and its data - if a property is removed from the
   * entity, with no warning and no confirmation.
   */
  synchronize: !isProduction,

  /**
   * "schema" prints the DDL TypeORM generates, which is how the
   * CREATE TABLE and CREATE TYPE produced by the decorators become
   * visible in the terminal. Add "query" temporarily to see every
   * statement the application runs.
   */
  logging: isProduction ? ["error"] : ["error", "schema"],

  // Same pool sizing the previous pg.Pool used.
  poolSize: 10,

  // `extra` is passed straight through to the underlying pg driver,
  // which is how the two timeouts survive the migration to TypeORM.
  extra: {
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
});

/**
 * Opens the connection and prepares the schema before the API starts
 * accepting traffic.
 *
 * initialize() does three things in one call:
 *   1. opens the connection pool
 *   2. reads the decorators and builds entity metadata
 *   3. runs schema synchronization, when enabled above
 *
 * docker-compose already waits for the database healthcheck, but that
 * only proves PostgreSQL is accepting connections - not that these
 * credentials work against this database. Retrying also covers running
 * the backend outside Docker, where nothing sequences the startup.
 */
/**
 * Holds the in-flight initialization so that concurrent callers await the
 * SAME attempt. Without it, two simultaneous callers would both see
 * `isInitialized === false` and both call AppDataSource.initialize(),
 * and TypeORM rejects the second one.
 */
let initialization: Promise<void> | null = null;

export function initializeDatabase(
  retries = 5,
  delayMs = 2_000,
): Promise<void> {
  // Already connected - nothing to do.
  if (AppDataSource.isInitialized) {
    return Promise.resolve();
  }

  initialization ??= connectWithRetry(retries, delayMs).catch(
    (error: unknown) => {
      // Clear the memo so a later call can try again rather than
      // replaying a rejected promise forever.
      initialization = null;
      throw error;
    },
  );

  return initialization;
}

async function connectWithRetry(
  retries: number,
  delayMs: number,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await AppDataSource.initialize();

      console.log(
        `Connected to PostgreSQL at ${env.db.host}:${env.db.port}/${env.db.name}`,
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

/**
 * Lightweight liveness probe used by the /health endpoint.
 *
 * The isInitialized check comes first because querying a DataSource that
 * was never initialized throws a different, less obvious error.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  if (!AppDataSource.isInitialized) {
    return false;
  }

  try {
    await AppDataSource.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Drains and closes every pooled connection so the process can exit
 * cleanly. TypeORM's equivalent of pool.end().
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log("Database connection closed");
  }

  // Allow a fresh connection later (tests, or a restart in-process).
  initialization = null;
}

// The TypeORM CLI loads a DataSource by importing a file and taking its
// default export. Unused today, but it makes this file CLI-ready if you
// ever want to generate a migration.
export default AppDataSource;
