import { request } from "./client";
import type { CreateOrderRequest, OrderResponse } from "../types/api";

/**
 * POST /api/orders
 *
 * JSON.stringify is required: fetch sends a string body. Passing the
 * object directly would transmit the literal text "[object Object]".
 *
 * Throws an ApiError on failure - 400 with per-field details when
 * validation fails, 401 when the boss password is wrong.
 */
export function createOrder(
  order: CreateOrderRequest,
): Promise<OrderResponse> {
  return request<OrderResponse>("/api/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
}
