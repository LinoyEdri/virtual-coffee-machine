import "dotenv/config";

/**
 * Centralised, validated access to environment variables.
 *
 * Every other module imports `env` from here instead of touching
 * process.env directly. Two benefits:
 *   1. Values are validated once, at startup ("fail fast"), so a typo in
 *      a variable name crashes immediately with a clear message instead
 *      of surfacing as `undefined` deep inside a database call.
 *   2. Values are typed. process.env is always `string | undefined`,
 *      while env.db.port is a real `number`.
 */

/** Reads a variable that must be present. Throws if it is missing. */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy backend/.env.example to backend/.env, or run the project with docker compose.`,
    );
  }
  return value;
}

/** Reads a variable that has a sensible default. */
function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value;
}

/** Converts a variable to a positive integer, or throws. */
function toPort(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid environment variable ${name}: expected a port number, received "${value}".`,
    );
  }
  return parsed;
}

const port = toPort("PORT", optional("PORT", "3000"));

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port,

  /**
   * How the service is reached from the host. A container cannot discover
   * its own published port, so docker-compose.yml supplies this.
   */
  publicUrl: optional("PUBLIC_URL", `http://localhost:${port}`),

  db: {
    host: optional("DB_HOST", "localhost"),
    port: toPort("DB_PORT", optional("DB_PORT", "5432")),
    name: optional("DB_NAME", "coffee_machine"),
    user: optional("DB_USER", "postgres"),
    // Deliberately has no default: a silent fallback password is how
    // projects end up shipping with credentials nobody meant to use.
    password: required("DB_PASSWORD"),
  },
} as const;

export const isProduction = env.nodeEnv === "production";
