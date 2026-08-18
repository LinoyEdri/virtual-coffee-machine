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

## Project Structure

```
coffee-machine/
├── backend/       
│   ├── db/
│   │   └── schema.sql
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── initDatabase.ts
│   │   ├── models/
│   │   │   └── order.ts
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

---

## Development Status

This project is being built in stages.

- [x] **Stage 1** — Project skeleton (backend + frontend scaffolding, routing, pages)
- [x] **Stage 2** — Docker Compose infrastructure (all four services, volumes, healthchecks)

