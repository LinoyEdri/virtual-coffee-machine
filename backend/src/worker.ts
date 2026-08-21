// MUST be the very first import in the process. This process loads the
// Order entity through the repository, and its decorators run at import
// time and write into reflect-metadata's storage.
import "reflect-metadata";

import { closeDatabase, initializeDatabase } from "./config/dataSource";
import { startOrdersWorker } from "./queue/ordersWorker";

/**
 * Entry point for the QUEUE CONSUMER process.
 *
 * This is the sibling of server.ts. It runs in its own container, serves
 * no HTTP, and shares nothing with the API except PostgreSQL and Redis -
 * being a separate Node process, it has its own database connection,
 * its own memory and its own lifecycle.
 */
async function start(): Promise<void> {
  // Its own connection: nothing is inherited from the API process.
  await initializeDatabase();

  const worker = startOrdersWorker();

  /**
   * Graceful shutdown. `docker compose down` sends SIGTERM; Ctrl+C sends
   * SIGINT.
   *
   * worker.close() stops accepting new jobs and WAITS for the one
   * currently being processed to finish. Without it, stopping the
   * container mid-brew would leave that order stuck on 'preparing'
   * forever, with no job left in Redis to complete it.
   */
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down the worker...`);

    try {
      await worker.close();
      await closeDatabase();
      
      console.log("Worker shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Error during worker shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((error: unknown) => {
  console.error("Failed to start the worker:", error);
  process.exit(1);
});
