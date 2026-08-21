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
| Excel export | ExcelJS | Monthly report generated server-side |
| Charts | Chart.js + react-chartjs-2 | Consumes the API's `labels`/`data` directly |
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

### Queue processing

Brewing takes several seconds. Doing it inside the HTTP request would hang the
browser, tie up a connection per order, and lose the order entirely if the server
restarted mid-brew. So the work is split in two (requirement 4.1.3):

```
POST /api/orders → INSERT → add job to Redis → respond 201     (~20 ms)

            ...independently, in the worker process...

worker takes the job → status: preparing → wait → status: done
```

| Piece | Where |
|---|---|
| **Producer** — adds a job after the order is saved | `queue/ordersQueue.ts`, inside the API process |
| **Consumer** — processes it and updates the order | `queue/ordersWorker.ts`, in its **own container** |

**PostgreSQL is the source of truth; Redis is a to-do list.** A finished order stays
in the database forever, while its job disappears from Redis once processed.

Four details worth knowing:

- **Priority** — boss orders get a lower BullMQ priority number and are handled
  before employees. Both roles get an explicit number, because BullMQ treats
  "no priority" as a separate track from prioritised jobs.
- **Delay** — `scheduledFor` is converted into a BullMQ delay, so a delayed order
  is invisible to the worker until it is due. Deriving it from the stored instant
  rather than `delayMinutes` means the delay is always "how long from now".
- **Order of operations** — the order is written to PostgreSQL **before** it is
  enqueued. A crash between the two leaves a recoverable row; the reverse would
  lose the order completely.
- **Graceful shutdown** — `stop_grace_period` gives the worker time to finish the
  coffee in hand when the container is stopped, instead of leaving that order
  stuck on `preparing`.

The worker runs the same image and the same codebase as the backend — only the
start command differs (`src/worker.ts` instead of `src/server.ts`). It serves no
HTTP and publishes no ports.

> Unlike the API, the worker does **not** hot-reload. It runs `tsx` directly rather
> than `tsx watch`, because the watcher supervises a child process and kills it on
> SIGTERM before the shutdown handler can drain. Worker changes need
> `docker compose restart worker`.

### Frontend API layer

Components never call `fetch`. Everything goes through `src/api/`, so the base URL,
JSON handling and error translation exist in one place:

- **`client.ts`** wraps `fetch` and turns a failed response into an `ApiError`
  carrying the status and, for a `400`, the per-field details the backend sent. It
  distinguishes two different failures: `fetch` only rejects when the request never
  completed (server down, no network) — an HTTP 500 is a *resolved* promise and is
  handled separately.
- **`reports.ts`** is deliberately different: it returns a **URL string** rather
  than data, because the report is a download. The page points the browser at that
  URL and `Content-Disposition: attachment` does the rest.


#### Why `fetch` rather than axios

Axios is a good library, but every feature it is known for solves a problem this
app does not have:

| What axios adds | Situation here |
|---|---|
| Automatic JSON encode/decode | two lines in `client.ts` |
| Throws on non-2xx | ~6 lines in `client.ts`, and we wanted custom `ApiError` translation anyway |
| Interceptors | there is no auth token to refresh and no cross-cutting header |
| Upload/download progress | nothing is uploaded; the report download is handled by the browser |
| Consistent XHR behaviour across browsers | historical — `fetch` is native in every browser this targets |

The app makes **three** requests in total, all behind a single wrapper. Adding a
dependency — and roughly 13 KB to the bundle — to avoid writing about eight lines
is a poor trade, and `fetch` needs no install, no version to keep current and no
supply-chain surface.

The honest counterpoint: **`fetch` has no built-in timeout**, so a hung request
waits indefinitely. Axios gives you `timeout: 5000`. The native equivalent is
`AbortSignal.timeout(ms)` passed as `signal`, which would be a one-line addition to
`client.ts` if it becomes a problem.

Axios would start to earn its place the moment this app needed authentication token
refresh across many endpoints, upload progress, or shared retry logic — none of
which the requirements call for.

#### Why the types are duplicated

`src/types/api.ts` restates the backend's DTOs rather than importing them. That is
duplication, and it is deliberate — importing is blocked by three things:

1. The frontend's Docker build context is `./frontend`, so files under `backend/`
   are not sent to the daemon at all. It would compile locally and fail in Docker.
2. Each package has its own `tsconfig` scoped to its own `src`.
3. Most decisively, `OrderStatus` is a TypeScript **enum** — a runtime value, not
   an erasable type. Importing it would pull in `entities/Order.ts` and with it
   TypeORM and `reflect-metadata`, shipping a database ORM to the browser.

Eliminating the duplication properly would mean either npm workspaces with a
shared package (moving both Docker build contexts to the repository root), or
generating the types from an OpenAPI spec. The contract is five small shapes and
changes rarely, so restating it is the cheaper trade — but the file says so in its
header, to make it a decision rather than an accident.

---

### The order form

The form is the only page that writes data, and it carries the two conditional
rules from requirement 4.2.2: the password field exists only for a Boss order, the
minutes field only for a Later one.

**Logic is separated from UI.** `hooks/useOrderForm.ts` owns every field's state,
the validation rules, and what happens on submit. `pages/Order.tsx` only renders
and wires up — it contains no rule about what is required or when. That is what
requirement 5.2 means by "separating logic from UI with custom hooks", and it means
the rules can be read without wading through JSX.

**Validation happens twice, deliberately.** The client checks before sending
(4.2.2) so a mistake costs no round trip; the server checks again because a browser
can be bypassed entirely. Neither trusts the other.

The two sets of rules do not use the same field names — the API calls it
`delayMinutes`, the form calls it `minutes` — so `mapServerErrors` translates
between them. Without that, a server complaint about the delay would arrive keyed
to a field the form has no input for and would silently vanish.

A `401` is handled slightly differently from a `400`: it carries only a message and
no `errors` array, but the only thing that can be unauthorised on this form is the
boss password, so the message is attached to that field as well as the banner.

**`RadioGroup` is generic over its option values.** TypeScript infers the union from
the options array, so `onChange={setTitle}` type-checks directly against
`OrderTitle` with no cast — a wrong value is a compile error rather than something
the server rejects later.

### The histogram chart

`components/BarChart.tsx` wraps the charting library so that no page imports it
directly. Swapping to a different library later would change that one file and
nothing else.

#### Why Chart.js and react-chartjs-2

**Two packages, two jobs.** `chart.js` is a framework-agnostic charting library
that draws onto a `<canvas>`. `react-chartjs-2` is a thin wrapper whose only real
job is managing the Chart.js instance's lifecycle — creating it on mount, updating
it when props change, destroying it on unmount. Without it that would be a `ref`
plus a `useEffect`, and forgetting the destroy leaks a chart on every re-render.

**The decisive reason is the data shape.** Requirement 4.1.6 specifies that the API
return `labels` and `data`:

```json
{ "labels": ["Alice", "Dana"], "data": [3, 1] }
```

That is *exactly* Chart.js's own format — two parallel arrays where `labels[i]`
describes `data[i]`. The API response is passed straight through with no
transformation at all.

**Recharts was the main alternative.** Its declarative components read more like
JSX, and it renders SVG, so bars are inspectable DOM. But it wants
`[{ name, count }]`, so the two arrays would have to be zipped first — turning a
shape the requirements handed us into one they didn't. It is also the larger
bundle.

**Hand-rolling with divs or SVG** would have meant no dependency at all and total
control over appearance. It also means
writing Y-axis scaling, tick labels and bar heights by hand — roughly sixty lines
reimplementing what a library does, in the part of the project least likely to
earn credit for it.

#### What the wrapper has to do

Chart.js has been modular since v3: controllers, elements, scales and plugins ship
separately so a bundle only contains what it uses. The pieces must be **registered**
or the chart fails at runtime with something like `"category" is not a registered
scale` — which reads like a library bug rather than a missing line. `BarChart.tsx`
registers `BarElement`, `CategoryScale`, `LinearScale`, `Tooltip` and `Legend` at
module level, once, rather than on every render.

Two options are set for correctness rather than looks:

- **`beginAtZero`** — otherwise the Y axis can start above zero and make a
  1-versus-2 difference look like 1-versus-10.
- **`ticks: { precision: 0 }`** — order counts are whole numbers. With a maximum of
  3, Chart.js would otherwise label ticks `0.5, 1, 1.5`.

#### The trade-off worth knowing

Chart.js draws pixels onto a canvas, so the bars are **not DOM elements**. They
cannot be inspected in devtools, selected with CSS, or animated with stylesheets —
all appearance goes through the configuration object. That is convenient while the
project has no styling, but it also means a canvas chart is opaque to screen
readers, which an SVG-based library handles better.

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

Five services start: `frontend`, `backend`, `worker`, `database` and `redis`. The
worker has no URL — it consumes jobs rather than serving requests. Watch it with:

```bash
docker compose logs -f worker
```

To stop:

```bash
docker compose down
```

To stop **and delete all persisted data** (database rows and queued jobs):

```bash
docker compose down -v
```

### After changing dependencies

If you add or remove a package, rebuilding is **not** enough:

```bash
docker compose up -d --build -V <service>
```

The `backend`, `worker` and `frontend` services all mount an anonymous volume over
`/app/node_modules`:

```yaml
volumes:
  - ./frontend:/app        # your source, live-mounted
  - /app/node_modules      # anonymous volume, shadows the image's copy
```

That second line is deliberate. Without it the host's `node_modules` — built for
Windows or macOS — would overlay the container's Linux one, and anything with a
native binary (esbuild, which Vite and tsx both depend on) would be the wrong
platform's build and fail to run.

The cost is that the volume **survives image rebuilds**. `--build` produces a new
image containing the new package, and Compose then mounts the old volume straight
over it, so the container still cannot find it. `-V` (`--renew-anon-volumes`)
discards the stale volume.

The symptom is always the same: `Cannot find module 'x'`, or from Vite,
`Failed to resolve import "x"`.

| Changed | Command |
|---|---|
| Source only | nothing — the watchers handle it |
| `package.json` or a lockfile | `docker compose up -d --build -V <service>` |
| Environment variables | `docker compose up -d --force-recreate <service>` |

### Environment variables

There is **one** configuration file: `.env` in the project root. Docker Compose
reads it while parsing `docker-compose.yml`, substituting the values into
`${VAR}` placeholders. `.env.example` documents every variable.

```bash
cp .env.example .env
```

`docker-compose.yml` supplies a working default for every non-sensitive variable.
The two **passwords** — `POSTGRES_PASSWORD` and `BOSS_PASSWORD` — deliberately have
none: they use Compose's `${VAR:?message}` form, which refuses to start and prints
an explanation if the variable is missing. A committed default would mean every
clone of this project shared a publicly known credential.

Note that environment variables are not a security mechanism in themselves —
anyone who can run `docker inspect` can read them. They keep secrets out of
version control, which is the goal here; a production system would use Docker
secrets or an external vault.

`.env` is git-ignored; only `.env.example` is committed.

Two settings control the queue:

| Variable | Meaning |
|---|---|
| `PREPARATION_SECONDS` | how long the consumer simulates brewing a coffee |
| `WORKER_STOP_GRACE_PERIOD` | how long Docker waits for the worker to finish the coffee in progress before killing it — **must be longer than `PREPARATION_SECONDS`** |

Three more describe how the services are reached. A container cannot discover its
own published host port, so each is supplied explicitly and **must match the host
side of that service's `ports` entry**:

| Variable | Meaning |
|---|---|
| `BACKEND_PUBLIC_URL` | where the API is reachable — used for log output |
| `FRONTEND_PUBLIC_URL` | where the app is reachable — used for log output |
| `VITE_API_URL` | where the **browser** calls the API. Must be host-reachable: the browser cannot resolve Docker service names such as `backend` |

> Note that `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` are applied by
> PostgreSQL **only on first start with an empty data directory**. Changing them
> later has no effect until you run `docker compose down -v`.

### Persistence

Two named Docker volumes keep state across restarts:

- `postgres_data` — database contents
- `redis_data` — queued orders (Redis runs with `appendonly yes`)

---

## Local Development (without Docker)

```bash
# Backend API
cd backend
npm install
npm run dev        # tsx watch, http://localhost:3000
npm run lint       # ESLint
npm run build      # type-check and emit to dist/

# Queue consumer (a separate process — run it in another terminal)
npm run worker

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

Running the backend outside Docker also needs its own `backend/.env`, because
`dotenv` reads from the working directory and there is no Compose to inject
anything. Create one from the root `.env.example`, changing `DB_HOST` and
`REDIS_HOST` to `localhost` — inside Docker they are the service names
`database` and `redis`.

---

## API Endpoints

All routes are mounted under `/api`. Base URL when running in Docker:
`http://localhost:3333`.

| Method | Path | Accepts | Returns | Requirement |
|---|---|---|---|---|
| `POST` | `/api/orders` | JSON body | `201` + the created order | 4.1.2 |
| `GET` | `/api/histogram` | — | `200` + `{ labels, data }` | 4.1.6 |
| `GET` | `/api/reports/monthly` | `?year=&month=` | `200` + an `.xlsx` file download | 4.1.6, 4.2.2 |
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

### `GET /api/reports/monthly?year=2026&month=8`

Returns every order placed in that month as an Excel workbook. Unlike the other
endpoints this responds with **binary file bytes, not JSON**, using two headers:

| Header | Effect |
|---|---|
| `Content-Type: application/vnd.openxmlformats-...sheet` | these bytes are an `.xlsx` workbook |
| `Content-Disposition: attachment; filename="coffee-report-2026-08.xlsx"` | do not display — **save it**, under this name |

`Content-Disposition: attachment` is what makes the browser download the file, and
it is why this is a `GET`: the frontend's export button is a single line,
`window.location.href = "/api/reports/monthly?year=2026&month=8"`, and the browser
handles the save dialog natively. A `POST` could not be navigated to and would
need the response read as a Blob and clicked through a synthetic link.

The workbook is generated **in the backend** rather than the browser, so the raw
order data is never exposed as JSON.

| Detail | Behaviour |
|---|---|
| Columns | ID, Name, Title, Delay (minutes), Status, Ordered at, Scheduled for, Started at, Completed at |
| Dates | real Excel date cells with a display format, so they sort and filter as dates rather than text |
| Timezone | rebased into `REPORT_TIMEZONE` — Excel date cells carry no timezone of their own, so the raw instant would display as UTC |
| Header row | bold and frozen |
| Empty month | still a valid file, header row only, `200` — the month exists, it is simply empty |
| `month` outside 1–12 | `400` |

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
│   │   │   └── Order.ts          
│   │   ├── dtos/
│   │   │   └── order.dto.ts     
│   │   ├── errors/
│   │   │   └── AppError.ts     
│   │   ├── repositories/
│   │   │   └── ordersRepository.ts  
│   │   ├── services/        
│   │   │   ├── ordersService.ts
│   │   │   ├── histogramService.ts
│   │   │   └── reportsService.ts  
│   │   ├── controllers/      
│   │   │   ├── ordersController.ts
│   │   │   ├── histogramController.ts
│   │   │   └── reportsController.ts
│   │   ├── routes/           
│   │   │   ├── index.ts
│   │   │   ├── ordersRoutes.ts
│   │   │   ├── histogramsRoutes.ts
│   │   │   └── reportsRoute.ts
│   │   ├── middlewares/
│   │   │   ├── errorHandler.ts  
│   │   │   └── notFound.ts   
│   │   ├── queue/
│   │   │   ├── connection.ts      
│   │   │   ├── ordersQueue.ts     
│   │   │   └── ordersWorker.ts     
│   │   ├── app.ts        
│   │   ├── server.ts           
│   │   └── worker.ts            
│   ├── eslint.config.js   
│   ├── Dockerfile
│   └── tsconfig.json
├── frontend/        
│   ├── public/       
│   ├── src/
│   │   ├── api/              
│   │   │   ├── client.ts    
│   │   │   ├── orders.ts
│   │   │   ├── histogram.ts
│   │   │   └── reports.ts         
│   │   ├── types/
│   │   │   └── api.ts            
│   │   ├── errors/
│   │   │   └── ApiError.ts     
│   │   ├── hooks/
│   │   │   ├── useOrderForm.ts   
│   │   │   └── useHistogram.ts
│   │   ├── components/    
│   │   │   ├── Navbar.tsx
│   │   │   ├── Field.tsx       
│   │   │   ├── RadioGroup.tsx    
│   │   │   ├── Message.tsx    
│   │   │   └── BarChart.tsx
│   │   ├── pages/          
│   │   ├── App.tsx      
│   │   ├── index.css     
│   │   ├── main.tsx      
│   │   └── vite-env.d.ts    
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
- [x] **Stage 4** — Monthly report exported as an Excel file, generated server-side
- [x] **Stage 5** — Queue processing with Redis and BullMQ (producer, consumer, priority, delayed jobs)
- [x] **Stage 6** — Frontend foundation: API layer, shared contract types, active nav marking
- [x] **Stage 7** — Order page: conditional fields, client-side validation, order submission
- [x] **Stage 8** — Histogram page: bar chart of orders per person, with a refresh button

