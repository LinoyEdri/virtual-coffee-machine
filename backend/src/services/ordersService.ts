import { env } from "../config/env";
import * as ordersRepository from "../repositories/ordersRepository";
import { UnauthorizedError } from "../errors/AppError";
import type { CreateOrderRequest } from "../dtos/order.dto";
import type { Order, OrderStatus } from "../entities/Order";
import { enqueueOrder } from "../queue/ordersQueue";
/**
 * Order Service (requirement 4.1.2, and "Order Service" in the section 2
 * architecture diagram).
 *
 * Holds the business rules. Note what it does NOT do:
 *   - it never sees `req` or `res`, which is what makes it testable with
 *     plain function calls rather than a running HTTP server
 *   - it never talks to the database directly; that is the repository's
 *     job
 */

/**
 * Places an order.
 *
 * The password check runs BEFORE the insert, so a failed boss attempt
 * leaves no row behind.
 */
export async function placeOrder(request: CreateOrderRequest): Promise<Order> {
  if (request.title === "boss" && request.password !== env.bossPassword) {
    throw new UnauthorizedError("Incorrect boss password");
  }

  const order = await ordersRepository.create({
    name: request.name,
    title: request.title,
    delayMinutes: request.delayMinutes,
  });

  const jobId = await enqueueOrder(order);

  await ordersRepository.setJobId(order.id, jobId);

  return order;
}

/**
 * Moves an order to a new lifecycle state. Called by the queue consumer.
 *
 * It exists so that NOTHING outside this layer reaches the repository -
 * the consumer is an entry point, at the same level as a controller, and
 * controllers never touch the database directly either.
 *
 * It is also the seam where transition rules belong as the project
 * grows: rejecting an impossible move such as Done -> Preparing, or
 * pushing a WebSocket notification the moment a coffee is ready.
 *
 * The status is an OrderStatus enum member, never a string. Setting
 * OrderStatus.Done is what satisfies requirement 4.1.3, since the
 * generated `done` column follows from it automatically.
 *
 * Returns null when the order no longer exists.
 */
export function updateStatus(
  orderId: number,
  status: OrderStatus,
): Promise<Order | null> {
  return ordersRepository.updateStatus(orderId, status);
}
