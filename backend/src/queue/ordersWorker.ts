import { Worker, type Job } from "bullmq";
import { QUEUE_NAME, redisConnection } from "./connection";
import type { OrderJobData } from "./ordersQueue";
import { env } from "../config/env";
import * as ordersService from "../services/ordersService";
import { OrderStatus } from "../entities/Order";

/**
 * Queue Consumer (requirement 4.1.3 - "a service that processes orders
 * from the queue").
 *
 * Runs in its own process, separate from the API. It never handles an
 * HTTP request; it only takes jobs from Redis and updates PostgreSQL.
 */

/** Pauses without blocking the event loop. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes one order.
 *
 * The job carries only an orderId, so the order is re-read here rather
 * than trusting a payload that may have been written minutes ago.
 *
 * Any throw from this function marks the job failed, which is what the
 * "failed" listener below reacts to.
 */
async function processOrder(job: Job<OrderJobData>): Promise<void> {
  const { orderId } = job.data;

  const preparing = await ordersService.updateStatus(
    orderId,
    OrderStatus.Preparing,
  );

  // The row is gone - retrying will not bring it back, so return quietly
  // rather than throwing and burning retry attempts.
  if (!preparing) {
    console.warn(`[worker] order ${String(orderId)} no longer exists, skipping`);
    return;
  }

  console.log(
    `[worker] preparing order ${String(orderId)} for ${preparing.name} (${preparing.title})`,
  );

  // The coffee preparation simulation (requirement 4.1.3). A timer, not
  // computation, so it does not block anything.
  await sleep(env.preparationSeconds * 1000);

  // Setting status to 'done' is all that is needed: `done` is a
  // generated column, so PostgreSQL flips it to true automatically.
  await ordersService.updateStatus(orderId, OrderStatus.Done);

  console.log(`[worker] order ${String(orderId)} is ready`);
}

/**
 * Starts consuming. Returns the Worker so the entry point can close it
 * during shutdown.
 */
export function startOrdersWorker(): Worker<OrderJobData> {
  const worker = new Worker<OrderJobData>(QUEUE_NAME, processOrder, {
    connection: redisConnection,

    // One coffee at a time, like a real machine. It also makes the
    // priority ordering observable: with several orders waiting, the
    // boss's is picked up next rather than running alongside.
    concurrency: 1,
  });

  /**
   * Fires when a job has thrown and exhausted its attempts. The order is
   * marked failed so it is not left stuck on 'preparing' forever.
   */
  worker.on("failed", (job, error) => {
    const orderId = job?.data.orderId;
    console.error(`[worker] job ${job?.id ?? "?"} failed:`, error.message);

    if (orderId !== undefined) {
      void ordersService
        .updateStatus(orderId, OrderStatus.Failed)
        .catch((updateError: unknown) => {
          console.error(
            `[worker] could not mark order ${String(orderId)} as failed:`,
            updateError,
          );
        });
    }
  });

  // Connection-level problems (Redis unreachable), not job failures.
  worker.on("error", (error) => {
    console.error("[worker] queue error:", error.message);
  });

  console.log(
    `[worker] listening on queue "${QUEUE_NAME}", preparation takes ${String(env.preparationSeconds)}s`,
  );

  return worker;
}
