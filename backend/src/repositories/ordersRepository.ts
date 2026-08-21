import type { Repository } from "typeorm";
import { AppDataSource, initializeDatabase } from "../config/dataSource";
import { env } from "../config/env";
import {
  Order,
  type CreateOrderInput,
  OrderStatus,
} from "../entities/Order";

/**
 * Data Access Layer for orders (requirement 4.1.7).
 *
 * This is the ONLY module in the project that talks to the database.
 * Everything above it - services, controllers, routes - speaks in `Order`
 * objects and never sees a column name or a query. That boundary is what
 * lets the storage change without touching business logic.
 *
 * Rules for this file:
 *   - no business rules (no password checks, no priority decisions)
 *   - no Express types
 *   - every value goes through a bound parameter, never string
 *     concatenation, so a value can never be parsed as SQL
 */

/**
 * Resolved lazily rather than at module load, and awaits initialization
 * before handing back a repository.
 *
 * Two reasons:
 *   - getRepository() is unusable until the DataSource is initialized,
 *     and this module is imported long before server.ts gets that far
 *   - anything that reaches the database outside the normal HTTP
 *     lifecycle (a test, the queue consumer) no longer has to remember
 *     to connect first
 *
 * initializeDatabase() returns immediately when already connected, and
 * concurrent callers share a single attempt, so this is cheap to call on
 * every query.
 */
async function ordersRepo(): Promise<Repository<Order>> {
  await initializeDatabase();
  return AppDataSource.getRepository(Order);
}

/** One row of the "orders per person" aggregation. */
export interface OrderCount {
  name: string;
  count: number;
}

/**
 * Inserts a new order (requirement 4.1.2).
 *
 * `scheduledFor` is when brewing should begin: now for an immediate
 * order, or now + delayMinutes for a delayed one. Storing the absolute
 * instant (rather than only the delay) is what makes it possible to work
 * out how much time is left after a restart.
 *
 * Returns the full entity because the caller needs the generated `id`
 * to create the matching queue job.
 */
export async function create(input: CreateOrderInput): Promise<Order> {
  const repo = await ordersRepo();

  // ONE clock reading for both timestamps.
  //
  // createdAt used to be stamped by PostgreSQL's now() while
  // scheduledFor was computed here, so the two came from different
  // clocks and drifted by however long the INSERT took to land - which
  // made an immediate order's scheduledFor a few milliseconds EARLIER
  // than its own createdAt. Deriving both from the same `now` makes
  // (scheduledFor - createdAt) exactly the requested delay.
  //
  // Node is the right source here: scheduledFor is a derived business
  // value (createdAt + delayMinutes), and every consumer of it - the
  // queue delay, crash recovery - also compares it against Node's clock.
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + input.delayMinutes * 60_000);

  // create() only builds an entity instance in memory; save() performs
  // the INSERT and returns the row as the database stored it - including
  // `done`, which is computed by PostgreSQL rather than sent by us.
  const order = repo.create({
    name: input.name,
    title: input.title,
    delayMinutes: input.delayMinutes,
    createdAt: now,
    scheduledFor,
  });

  return repo.save(order);
}

/**
 * Moves an order through its lifecycle (requirement 4.1.3).
 *
 * The matching timestamp is set in the same update as the status, so the
 * two can never drift apart. `done` is never written here: it is a
 * generated column derived from `status`, so PostgreSQL flips it for us
 * the moment the status becomes 'done'.
 *
 * Called by the queue consumer, not by an HTTP request.
 */
export async function updateStatus(
  id: number,
  status: OrderStatus,
): Promise<Order | null> {
  const repo = await ordersRepo();
  const now = new Date();

  await repo.update(
    { id },
    {
      status,
      ...(status === OrderStatus.Preparing ? { startedAt: now } : {}),
      ...(status === OrderStatus.Done || status === OrderStatus.Failed
        ? { completedAt: now }
        : {}),
    },
  );

  // A second query, deliberately: it returns a fully mapped Order rather
  // than the raw row that .returning() would give, and a status update
  // happens once per order, not per request.
  return repo.findOneBy({ id });
}

/**
 * Every order placed in a given month (requirement 4.1.6).
 *
 * make_timestamptz builds "the 1st of the month at midnight" as an
 * absolute instant in the configured timezone. The range is half-open -
 * >= start AND < start + 1 month - because BETWEEN is inclusive at both
 * ends and would wrongly capture an order placed at exactly midnight on
 * the 1st of the following month.
 *
 * Uses idx_orders_created_at.
 */
export async function findByMonth(
  year: number,
  month: number,
): Promise<Order[]> {
  const repo = await ordersRepo();
  const monthStart = `make_timestamptz(:year, :month, 1, 0, 0, 0, :timezone)`;

  return repo
    .createQueryBuilder("order")
    .where(`order.createdAt >= ${monthStart}`, {
      year,
      month,
      timezone: env.reportTimezone,
    })
    .andWhere(`order.createdAt < ${monthStart} + interval '1 month'`, {
      year,
      month,
      timezone: env.reportTimezone,
    })
    .orderBy("order.createdAt", "ASC")
    .getMany();
}

/**
 * How many orders each person has placed (requirement 4.1.6).
 *
 * Returns plain {name, count} rows. Reshaping them into the `labels` and
 * `data` arrays the API must return is presentation logic and belongs in
 * the service, not in the data access layer.
 *
 * getRawMany rather than getMany because this is an aggregate, not a set
 * of entities - there is no Order to map these rows onto.
 *
 * COUNT(*) is a bigint, which the pg driver returns as a *string* to
 * avoid JavaScript's 53-bit precision limit. Without Number() the chart
 * would receive ["3", "1"] instead of [3, 1].
 *
 * Uses idx_orders_name.
 */
export async function countOrdersByName(): Promise<OrderCount[]> {
  const repo = await ordersRepo();

  const rows = await repo
    .createQueryBuilder("order")
    .select("order.name", "name")
    .addSelect("COUNT(*)", "count")
    .groupBy("order.name")
    .orderBy("COUNT(*)", "DESC")
    .addOrderBy("order.name", "ASC")
    .getRawMany<{ name: string; count: string }>();

  return rows.map((row) => ({
    name: row.name,
    count: Number(row.count),
  }));
}

export async function setJobId(
  id: number,
  jobId: string
): Promise<void> {
  const repo = await ordersRepo();
  
  await repo.update(
    { id },
    { jobId }
  );
}
