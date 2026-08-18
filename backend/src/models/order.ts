/**
 * The Order model.
 *
 * Two shapes are declared here on purpose:
 *
 *   OrderRow - the row exactly as PostgreSQL returns it (snake_case).
 *   Order    - the domain/API shape the rest of the app speaks (camelCase).
 *
 * The repository layer is the only place that knows both and maps
 * between them. That boundary is what keeps SQL naming out of the
 * services, the controllers and the JSON sent to React - so renaming a
 * column never ripples past the repository.
 */

/** Roles a person can order under. `boss` requires a password. */
export const ORDER_TITLES = ["employee", "boss"] as const;
export type OrderTitle = (typeof ORDER_TITLES)[number];

/** Lifecycle of an order, mirroring the `order_status` enum in SQL. */
export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "done",
  "failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** A row of the `orders` table, as returned by the pg driver. */
export interface OrderRow {
  id: number;
  name: string;
  title: OrderTitle;
  delay_minutes: number;
  status: OrderStatus;
  done: boolean;
  job_id: string | null;
  created_at: Date;
  scheduled_for: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

/** An order as the rest of the application and the API see it. */
export interface Order {
  id: number;
  name: string;
  title: OrderTitle;
  delayMinutes: number;
  status: OrderStatus;
  done: boolean;
  jobId: string | null;
  createdAt: Date;
  scheduledFor: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * What the caller must supply to create an order.
 *
 * Note there is no `password` field: the boss password is verified
 * against an environment secret and is never persisted.
 */
export interface CreateOrderInput {
  name: string;
  title: OrderTitle;
  delayMinutes: number;
}

/** Translates a database row into the domain shape. */
export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    delayMinutes: row.delay_minutes,
    status: row.status,
    done: row.done,
    jobId: row.job_id,
    createdAt: row.created_at,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}
