import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * The Order entity.
 *
 * This single class is both the TypeScript type AND the database schema:
 * TypeORM reads these decorators at startup and creates the table, the
 * enum type, the constraints and the indexes to match. It replaces what
 * db/schema.sql and models/order.ts previously did together.
 *
 * Two rules apply to every column in this file:
 *
 *  1. `type` is always stated explicitly. The dev server runs on tsx,
 *     which is built on esbuild, and esbuild cannot emit decorator
 *     metadata - so TypeORM has no way to infer that `delayMinutes:
 *     number` means an integer column. Omitting `type` fails at runtime.
 *
 *  2. Every property ends with `!` (a definite assignment assertion).
 *     `strictPropertyInitialization` is deliberately left ON, and
 *     TypeORM assigns these properties by reflection rather than in a
 *     constructor, so the compiler needs to be told they will be set.
 */

/** Roles a person can order under. `boss` requires a password. */
export const ORDER_TITLES = ["employee", "boss"] as const;
export type OrderTitle = (typeof ORDER_TITLES)[number];

/**
 * Lifecycle of an order. Becomes the `order_status` enum in PostgreSQL.
 *
 * A real TypeScript enum rather than a union of string literals, because
 * string enums are NOMINAL: `updateStatus(id, "done")` is a compile
 * error and only `OrderStatus.Done` is accepted. A union type would have
 * accepted the bare string quite happily, which is exactly what we want
 * to prevent - a typo like "Done" or "compelted" must never reach the
 * database.
 */
export enum OrderStatus {
  Pending = "pending",
  Preparing = "preparing",
  Done = "done",
  Failed = "failed",
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

// The table name is passed explicitly - without it TypeORM would name
// the table `order`, singular, and `order` is also a reserved SQL word.
@Entity("orders")
// Monthly report: filters on a created_at range.
@Index("idx_orders_created_at", ["createdAt"])
// Histogram: GROUP BY name.
@Index("idx_orders_name", ["name"])
// Crash recovery: a PARTIAL index. It only contains rows that are not
// done, so it stays tiny no matter how many completed orders accumulate.
@Index("idx_orders_unfinished", ["scheduledFor"], {
  where: `status <> 'done'`,
})
// Validation enforced by the database itself, so an invalid row cannot
// exist even if application-level validation is bypassed.
//
// `"delayMinutes"` MUST be quoted: PostgreSQL folds unquoted identifiers
// to lowercase, so the unquoted form would look for `delayminutes` and
// fail. `name` and `title` are already lowercase, so they need nothing.
@Check("orders_name_not_blank", `length(trim(name)) > 0`)
@Check("orders_title_valid", `title IN ('employee', 'boss')`)
@Check("orders_delay_valid", `"delayMinutes" >= 0`)

export class Order {
  /**
   * 'identity' emits GENERATED ALWAYS AS IDENTITY, the SQL-standard form.
   * The default ('increment') would emit SERIAL instead.
   */
  @PrimaryGeneratedColumn("identity")
  id!: number;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  /** Matches the `title` field name used by the API contract. */
  @Column({ type: "varchar", length: 20 })
  title!: OrderTitle;

  /** 0 means "now"; anything higher is a delayed order. */
  @Column({ type: "int", default: 0 })
  delayMinutes!: number;

  /**
   * `enumName` is important: without it TypeORM invents a name such as
   * `orders_status_enum`. Passing it explicitly produces the
   * `order_status` type, and keeps that name stable if the table is
   * ever renamed.
   *
   * TypeORM accepts the enum object directly and reads its values, so
   * the SQL enum and the TypeScript enum can never list different
   * members.
   */
  @Column({
    type: "enum",
    enum: OrderStatus,
    enumName: "order_status",
    default: OrderStatus.Pending,
  })
  status!: OrderStatus;

  /**
   * Required by the spec as a plain boolean, but GENERATED from `status`
   * rather than stored separately, so the two can never disagree.
   *
   * `asExpression` is raw SQL evaluated by PostgreSQL, so it refers to
   * the `status` COLUMN, not this TypeScript property.
   *
   * Treat this as read-only: never assign to it. The database computes it.
   */
  @Column({
    type: "boolean",
    generatedType: "STORED",
    asExpression: `status = 'done'::order_status`,
  })
  done!: boolean;

  /** Identifier of the matching queue job, used by crash recovery. */
  @Column({ type: "varchar", length: 100, nullable: true })
  jobId!: string | null;

  /**
   * timestamptz everywhere: stores a real instant rather than a
   * wall-clock reading, so delay maths stays correct across timezones.
   *
   * @CreateDateColumn tells TypeORM to populate this on insert and to
   * give the column a NOW() default.
   */
  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  /** createdAt + delayMinutes, set by the repository when inserting. */
  @Column({ type: "timestamptz" })
  scheduledFor!: Date;

  @Column({ type: "timestamptz", nullable: true })
  startedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;
}
