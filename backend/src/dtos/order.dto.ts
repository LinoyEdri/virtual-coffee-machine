import { z } from "zod";
import {
  ORDER_TITLES,
  type Order,
  type OrderStatus,
  type OrderTitle,
} from "../entities/Order";

/**
 * Data Transfer Objects - the contract between the API and its clients.
 *
 * Deliberately NOT the same as the Order entity:
 *   - the request accepts `password`, which is never stored anywhere
 *   - the request cannot set `id`, `status`, `done` or any timestamp
 *   - the response sends ISO strings instead of Date objects, and hides
 *     `jobId`, which is an internal queue detail
 */

/** Body of POST /api/orders */
export const createOrderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name must be at most 100 characters"),

    title: z.enum(ORDER_TITLES),

    // Only meaningful for a boss order. Verified, never persisted.
    password: z.string().optional(),

    // 0 means "now". The order form sends >= 1 when "Later" is chosen.
    delayMinutes: z
      .number()
      .int("Minutes must be a whole number")
      .min(0, "Minutes cannot be negative")
      .max(1440, "Minutes cannot exceed 24 hours")
      .default(0),
  })
  // A CROSS-FIELD rule: it depends on two fields at once, so it cannot
  // live on either one. The password is required only when title is
  // "boss" (requirement 4.1.2).
  .refine((data) => data.title !== "boss" || Boolean(data.password), {
    message: "A boss order requires the boss password",
    path: ["password"],
  });

/**
 * The TypeScript type is INFERRED from the schema above, not written by
 * hand. Change a validation rule and this type follows automatically -
 * the two can never drift apart.
 */
export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

/** An order as sent to clients. */
export interface OrderResponse {
  id: number;
  name: string;
  title: OrderTitle;
  delayMinutes: number;
  status: OrderStatus;
  done: boolean;
  createdAt: string;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
}

/** Entity -> API response. Dates become ISO 8601 strings. */
export function toOrderResponse(order: Order): OrderResponse {
  return {
    id: order.id,
    name: order.name,
    title: order.title,
    delayMinutes: order.delayMinutes,
    status: order.status,
    done: order.done,
    createdAt: order.createdAt.toISOString(),
    scheduledFor: order.scheduledFor.toISOString(),
    startedAt: order.startedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
  };
}
