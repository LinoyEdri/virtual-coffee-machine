// MUST be the very first import in the process. Entity decorators run at
// import time and write into reflect-metadata's storage, so that storage
// has to exist before any file containing an entity is loaded.
import "reflect-metadata";

import { env } from "./config/env";
import { closeDatabase, initializeDatabase } from "./config/dataSource";
import app from "./app";

/**
 * Starts the API only after the database is confirmed reachable and the
 * schema is applied, so the service never accepts a request it cannot
 * fulfil.
 */
async function start(): Promise<void> {
  // One call replaces the previous connect + apply-schema pair:
  // initialize() opens the pool, builds entity metadata, and runs schema
  // synchronization.
  await initializeDatabase();

  const server = app.listen(env.port, () => {
    console.log("Coffee Machine backend is running");
    console.log(`  API          : ${env.publicUrl}`);
    console.log(`  Health check : ${env.publicUrl}/health`);
    console.log(`  Bound to port ${env.port} inside the container`);
  });

  /**
   * Graceful shutdown. `docker compose down` sends SIGTERM; Ctrl+C sends
   * SIGINT. Without these handlers Node exits immediately, cutting off
   * in-flight requests and leaving database connections for the server
   * to time out on its own.
   */
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    server.close(async () => {
      await closeDatabase();
      console.log("Shutdown complete");
      process.exit(0);
    });

    // Safety net: never hang forever waiting for a stuck connection
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((error: unknown) => {
  console.error("Failed to start the backend:", error);
  process.exit(1);
});
