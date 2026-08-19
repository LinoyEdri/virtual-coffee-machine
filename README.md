# Virtual Coffee Machine ☕

A full-stack virtual coffee machine application. Users order coffee through a web UI;
orders are pushed onto a message queue, processed asynchronously by a worker
(simulating the brewing time), and persisted to a database. The app also exposes a
monthly report export and a per-user order histogram.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | React Router for navigation |
| Backend | Node.js + Express 5 + TypeScript | Controllers / Services / Repositories layering |
| Database | PostgreSQL 18 | See "Why PostgreSQL" below |
| ORM | TypeORM | The entity defines the schema — see "Why TypeORM" below |
| Queue | Redis + BullMQ | Priority queue + delayed jobs |
| Containerization | Docker + Docker Compose | Whole system starts with one command |
| Source control | Git | |

### Why PostgreSQL?

The requirements leave the database choice open, and PostgreSQL was chosen for
three reasons specific to this project:

1. **The data is inherently relational and fixed-shape.** An order is always the
   same tuple — name, title, order time, delay, done status. A rigid `orders`
   schema with `NOT NULL` constraints and a `CHECK` on `title` pushes part of the
   validation requirement (4.1.2) down into the database itself, so invalid rows
   cannot exist even if application code has a bug.
2. **The reports and histogram are aggregation queries.** The monthly report is a
   date-range filter and the histogram is a `GROUP BY name COUNT(*)`. SQL expresses
   both directly and computes them in the database rather than pulling every order
   into Node.js and aggregating in memory.
3. **Transactional guarantees for the queue handoff.** Persisting an order and
   enqueuing its job must not drift apart. PostgreSQL's ACID transactions make the
   crash-recovery bonus (5.1 — re-queueing orders still marked `done: false`)
   reliable, because a committed order is guaranteed durable.

Redis is used **only** as the queue broker (via BullMQ), not as the source of truth.

### Why TypeORM?

The data layer was originally hand-written SQL over the `pg` driver. It was
replaced with TypeORM for three reasons:

1. **One source of truth for the schema and the type.** `entities/Order.ts` is a
   TypeScript class *and* the table definition. Previously the same structure was
   declared twice — once in `schema.sql` and once as a TypeScript interface — and
   nothing prevented the two from drifting apart.
2. **It expresses everything this schema needs.** The alternatives were compared
   before choosing. Prisma was rejected specifically because its schema language
   cannot express the `CHECK` constraints, the partial index or the generated
   `done` column used here — all three would have had to be hand-written into
   migration SQL that Prisma's client then would not know about. TypeORM supports
   all of them through `@Check`, `@Index({ where })` and `generatedType: "STORED"`.
3. **The swap proved the architecture.** Replacing the entire data layer changed
   only the repository and the files below it. Every service, controller, route
   and DTO was untouched, because they speak in `Order` objects and never knew
   what persisted them. That is the layering required by 4.1.1 and 4.1.7, shown
   rather than claimed.

### Schema management

The schema is created by TypeORM's `synchronize`, not by migrations. On startup it
compares the entity metadata against the live database and issues whatever DDL is
needed — so the table, the `order_status` enum, three `CHECK` constraints and three
indexes are all built from `entities/Order.ts`.

**It is deliberately disabled in production** (`synchronize: !isProduction`).
Because it works by diffing, it will drop a column — and its data — if a property
is removed from the entity, with no warning. It was chosen over migrations because
this project has a single table and no data worth preserving between runs; a
longer-lived system should use migrations instead.

Setting `logging: ["error", "schema"]` outside production prints the generated DDL
at startup, so the schema TypeORM builds is visible rather than implicit.

> **Note on column names.** Columns use TypeORM's default naming, so they are
> camelCase (`delayMinutes`, `createdAt`). PostgreSQL folds unquoted identifiers to
> lowercase, so any SQL written by hand must double-quote them:
> `SELECT "delayMinutes" FROM orders;` — the unquoted form fails. The application is
> unaffected; TypeORM always quotes correctly.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- For local, non-Docker development only: Node.js 20+

---

## Running the Application

The entire system — frontend, backend, database and queue — starts with a single command:

```bash
docker compose up
```

On first run Docker builds the images, which takes a few minutes. Afterwards:

| Service | URL |
|---|---|
| Frontend (app) | http://localhost:3000 |
| Backend API | http://localhost:3333 |
| Health check | http://localhost:3333/health |
| PostgreSQL | `localhost:5432` (user `postgres`, db `coffee_machine`) |
| Redis | `localhost:6379` |

To stop:

```bash
docker compose down
```

To stop **and delete all persisted data** (database rows and queued jobs):

```bash
docker compose down -v
```

### Environment variables

`docker-compose.yml` provides working defaults for every variable, so no setup is
required to run the project. To override them locally, copy the template:

```bash
cp backend/.env.example backend/.env
```

`backend/.env` is git-ignored and is loaded only if it exists.

### Persistence

Two named Docker volumes keep state across restarts:

- `postgres_data` — database contents
- `redis_data` — queued orders (Redis runs with `appendonly yes`)

---

## Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev        # tsx watch, http://localhost:3000
npm run lint       # ESLint
npm run build      # type-check and emit to dist/

# Frontend
cd frontend
npm install
npm run dev        # vite, http://localhost:5173
npm run lint       # ESLint
npm run build      # type-check and produce a production bundle
```

Both packages are pinned to TypeScript 6.0.x so a single compiler version covers
the whole repository and `typescript-eslint` can parse both.

Note that a local PostgreSQL and Redis instance are required for the full feature
set; running them via `docker compose up database redis` is the easiest option.

---

## API Endpoints

All routes are mounted under `/api`. Base URL when running in Docker:
`http://localhost:3333`.

| Method | Path | Accepts | Returns | Requirement |
|---|---|---|---|---|
| `POST` | `/api/orders` | JSON body | `201` + the created order | 4.1.2 |
| `GET` | `/api/histogram` | — | `200` + `{ labels, data }` | 4.1.6 |
| `GET` | `/health` | — | `200`, or `503` if the database is unreachable | — |

### `POST /api/orders`

```json
{ "name": "Dana", "title": "boss", "password": "...", "delayMinutes": 10 }
```

| Field | Rules |
|---|---|
| `name` | required, non-empty after trimming, max 100 characters |
| `title` | `"employee"` or `"boss"` |
| `password` | required **only** when `title` is `"boss"`; verified against `BOSS_PASSWORD` and never stored |
| `delayMinutes` | integer 0–1440, defaults to `0`. `0` means "now" |

| Status | When |
|---|---|
| `201` | created |
| `400` | validation failed — the body lists every invalid field, not just the first |
| `401` | boss password incorrect |

### `GET /api/histogram`

Returns the two parallel arrays named in requirement 4.1.6, where `labels[i]` and
`data[i]` describe the same person:

```json
{ "labels": ["Alice", "Dana"], "data": [3, 1] }
```

Unmatched routes return a JSON `404` rather than an HTML error page.

---

## Project Structure

```
coffee-machine/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── dataSource.ts    
│   │   │   └── env.ts        
│   │   ├── entities/
│   │   │   └── Order.ts          t
│   │   ├── dtos/
│   │   │   └── order.dto.ts     
│   │   ├── errors/
│   │   │   └── AppError.ts     
│   │   ├── repositories/
│   │   │   └── ordersRepository.ts  
│   │   ├── services/        
│   │   │   ├── ordersService.ts
│   │   │   └── histogramService.ts
│   │   ├── controllers/      
│   │   │   ├── ordersController.ts
│   │   │   └── histogramController.ts
│   │   ├── routes/           
│   │   │   ├── index.ts
│   │   │   ├── orderRoutes.ts
│   │   │   └── histogramRoutes.ts
│   │   ├── middlewares/
│   │   │   ├── errorHandler.ts  
│   │   │   └── notFound.ts   
│   │   ├── app.ts        
│   │   └── server.ts    
│   ├── .env.example      
│   ├── eslint.config.js   
│   ├── Dockerfile
│   └── tsconfig.json
├── frontend/        
│   ├── public/       
│   ├── src/
│   │   ├── components/    
│   │   ├── pages/          
│   │   ├── App.tsx      
│   │   ├── index.css     
│   │   └── main.tsx      
│   ├── eslint.config.js   
│   ├── Dockerfile
│   └── vite.config.ts
├── docker-compose.yml  
├── AIPOLICY.TXT     
└── README.md
```

The backend folders follow one rule, which is what makes the separation required
by 4.1.1 and 4.1.7 verifiable rather than decorative:

```
routes → controllers → services → repositories → dataSource → PostgreSQL

entities · dtos · errors   (leaves — imported by anyone, importing nothing upward)
```

**A layer only imports from layers below it.** There is no SQL above
`repositories/`, and no `req`/`res` below `controllers/` — which is also why the
services can be unit-tested with plain function calls, and why swapping the entire
data layer to TypeORM left everything above the repository untouched.

---

## Development Status

This project is being built in stages.

- [x] **Stage 1** — Project skeleton (backend + frontend scaffolding, routing, pages)
- [x] **Stage 2** — Docker Compose infrastructure (all four services, volumes, healthchecks)
- [x] **Stage 3** — Database layer with TypeORM (entity, DataSource, repository) and the orders + histogram API

