import { env } from "../config/env";
import * as ordersRepository from "../repositories/ordersRepository";
import { UnauthorizedError } from "../errors/AppError";
import type { CreateOrderRequest } from "../dtos/order.dto";
import type { Order } from "../entities/Order";

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

  // Stage 6: create the queue job here, immediately after the insert.
  // The order deliberately goes into the database FIRST - if the process
  // dies between the two, the order still exists as done = false and
  // crash recovery can pick it up. Enqueueing first would lose it.

  return order;
}
