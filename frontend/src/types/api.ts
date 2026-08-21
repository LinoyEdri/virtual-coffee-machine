/**
 * The API contract - the shapes that cross the wire between this app and
 * the backend.
 *
 * These mirror the backend's DTOs deliberately. They are the ONLY types
 * with a consumer on both sides, which is what justifies collecting them
 * in one file: everything else stays next to the code that uses it.
 *
 * Note what is absent: `jobId`, the entity, the repository's row shape.
 * The backend keeps those internal, and the frontend has no business
 * knowing they exist.
 */

/**
 * Roles a person can order under. Declared as a const array so it serves
 * twice: the radio buttons map over it, and OrderTitle is derived from
 * it - so the form options and the type can never disagree.
 */
export const ORDER_TITLES = ["employee", "boss"] as const;
export type OrderTitle = (typeof ORDER_TITLES)[number];

/**
 * Lifecycle of an order.
 *
 * A union of string literals rather than a TypeScript enum, unlike the
 * backend. The reason: the frontend only ever READS a status that
 * arrived as JSON, it never constructs one. Nominal typing protects
 * against writing the wrong value, and there is nothing here to write.
 */
export type OrderStatus = "pending" | "preparing" | "done" | "failed";

/** Body of POST /api/orders */
export interface CreateOrderRequest {
  name: string;
  title: OrderTitle;
  /** Required only when title is "boss". Verified, never stored. */
  password?: string;
  /** 0 means "now". */
  delayMinutes: number;
}

/** An order as the API returns it. Dates arrive as ISO 8601 strings. */
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

/**
 * GET /api/histogram - two parallel arrays, where labels[i] and data[i]
 * describe the same person.
 */
export interface HistogramData {
  labels: string[];
  data: number[];
}
