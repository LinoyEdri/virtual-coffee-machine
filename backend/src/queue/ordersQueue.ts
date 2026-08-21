import { Queue } from "bullmq";
import { QUEUE_NAME, redisConnection } from "./connection";
import type { Order, OrderTitle } from "../entities/Order";

/**
 * Queue Producer (requirement 4.1.3 - "a service that adds orders to
 * the queue").
 *
 * Runs inside the API process. Its only job is to turn a saved order
 * into a job in Redis and return immediately, so the HTTP request does
 * not wait for the coffee to be made.
 */

/**
 * What travels in the job.
 *
 * Only the id: a payload copied at enqueue time can be stale by the
 * moment the worker runs it, minutes later. PostgreSQL is the source of
 * truth, so the worker re-reads the order when it starts.
 */
export interface OrderJobData {
  orderId: number;
}

/**
 * Queue priority per role (requirement 4.1.3 - "boss orders receive
 * higher priority"). In BullMQ a LOWER number is handled sooner.
 *
 * Both roles get an explicit number rather than leaving employees
 * unprioritised, because BullMQ treats "no priority" as a separate track
 * from prioritised jobs and the ordering between the two gets subtle.
 *
 * Typed as Record<OrderTitle, number>, so adding a role to ORDER_TITLES
 * without giving it a priority is a COMPILE ERROR rather than a silent
 * runtime surprise.
 */
export const TITLE_PRIORITY: Record<OrderTitle, number> = {
  boss: 1,
  employee: 5,
};

/**
 * The producer's handle on the queue. The generic types the payload, so
 * queue.add() will not accept a shape the worker cannot read.
 */
export const ordersQueue = new Queue<OrderJobData>(QUEUE_NAME, {
  connection: redisConnection,
});

/** Adds a saved order to the queue. Returns the job id. */
export async function enqueueOrder(order: Order): Promise<string> {
  // Derived from scheduledFor rather than delayMinutes, so the delay is
  // always "how long from NOW", not "how long from when it was ordered".
  // Math.max keeps it at 0 for an order that is already due.
  const delayMs = Math.max(0, order.scheduledFor.getTime() - Date.now());

  const job = await ordersQueue.add(
    "brew",
    { orderId: order.id },
    {
      delay: delayMs,
      priority: TITLE_PRIORITY[order.title],

      // A deterministic id derived from the order. BullMQ ignores an add
      // whose id already exists, so the same order can never be queued
      // twice - and the job for an order can be found without storing
      // anything alongside it.
      jobId: `order-${String(order.id)}`,

      // Keep the last 100 of each in Redis for inspection, then discard.
      // Without this, finished jobs accumulate forever.
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  );

  return job.id ?? `order-${String(order.id)}`;
}

/** Closes the producer's Redis connection during shutdown. */
export async function closeQueue(): Promise<void> {
  await ordersQueue.close();
}
