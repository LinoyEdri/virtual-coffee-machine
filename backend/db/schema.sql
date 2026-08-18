-- ---------------------------------------------------------------------
-- Coffee Machine - database schema
--
-- This file is executed on every backend startup by initDatabase().
-- Every statement is therefore written to be IDEMPOTENT: running it a
-- second time must be a no-op, never an error.
--
-- PostgreSQL runs a multi-statement query inside an implicit
-- transaction, so the whole file either applies completely or not at all.
--
-- You can also paste this straight into pgAdmin's Query Tool.
-- ---------------------------------------------------------------------


-- CREATE TYPE has no "IF NOT EXISTS" form, so it needs an explicit guard.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'done', 'failed');
    END IF;
END
$$;


CREATE TABLE IF NOT EXISTS orders (
    -- INTEGER (not BIGINT): the pg driver returns BIGINT as a *string* to
    -- avoid precision loss, which would leak an awkward type into the API.
    id             INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Who ordered, and in what role. `title` matches the field name used
    -- by the API contract in the requirements document.
    name           VARCHAR(100) NOT NULL,
    title          VARCHAR(20)  NOT NULL,

    -- 0 = "now", anything higher = a delayed order.
    delay_minutes  INTEGER      NOT NULL DEFAULT 0,

    -- Lifecycle of the order. Drives the real-time UI.
    status         order_status NOT NULL DEFAULT 'pending',

    -- Required by the spec as a plain boolean. Generated from `status`
    -- rather than stored separately, so the two can never disagree.
    done           BOOLEAN      GENERATED ALWAYS AS (status = 'done'::order_status) STORED,

    -- Identifier of the matching BullMQ job, used by crash recovery.
    job_id         VARCHAR(100),

    -- TIMESTAMPTZ everywhere: stores a real instant rather than a
    -- wall-clock reading, so delay maths stays correct across timezones.
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- created_at + delay_minutes, computed by the application.
    -- It cannot be a generated column: PostgreSQL requires those to be
    -- IMMUTABLE, and `timestamptz + interval` is only STABLE.
    scheduled_for  TIMESTAMPTZ  NOT NULL,

    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,

    -- Validation enforced by the database itself, so an invalid row
    -- cannot exist even if application-level validation is bypassed.
    CONSTRAINT orders_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT orders_title_valid    CHECK (title IN ('employee', 'boss')),
    CONSTRAINT orders_delay_valid    CHECK (delay_minutes >= 0)
);


-- Monthly report: filters on a created_at range.
CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders (created_at DESC);

-- Histogram: GROUP BY name.
CREATE INDEX IF NOT EXISTS idx_orders_name
    ON orders (name ASC);

-- Crash recovery: find unfinished orders. A PARTIAL index - it only
-- contains rows that are not done, so it stays tiny no matter how many
-- completed orders accumulate.
CREATE INDEX IF NOT EXISTS idx_orders_unfinished
    ON orders (scheduled_for)
    WHERE status <> 'done';
