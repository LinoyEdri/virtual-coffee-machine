import { readFileSync } from "node:fs";
import path from "node:path";
import { pool } from "./database";

/**
 * Applies db/schema.sql to the database on startup.
 *
 * The schema file lives OUTSIDE src/ on purpose. `tsc` only emits .ts
 * files, so a .sql file inside src/ would never be copied to dist/ and
 * the compiled build would crash looking for it. Because backend/db is
 * one level below both src/config and dist/config, the same relative
 * path resolves correctly whether the code is run by tsx or from dist.
 */
const SCHEMA_PATH = path.resolve(__dirname, "../../db/schema.sql");

export async function initDatabase(): Promise<void> {
  const schemaSql = readFileSync(SCHEMA_PATH, "utf8");

  // Sent as a single multi-statement query, which PostgreSQL wraps in an
  // implicit transaction: the schema applies fully, or not at all.
  await pool.query(schemaSql);

  console.log("Database schema is up to date");
}
