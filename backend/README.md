# SchemeSetu Backend

Express + TypeScript backend for the SchemeSetu pan-India government scheme eligibility platform.

## Tech Stack

- **Runtime**: Node.js (ESM, `"type": "module"`)
- **Framework**: Express 4
- **Language**: TypeScript, executed via `tsx` (no compilation step in dev)
- **Database**: PostgreSQL via Prisma ORM
- **Logger**: pino

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual values:

| Variable       | Description                                    |
| -------------- | ---------------------------------------------- |
| `PORT`         | Port the server binds to (default: 3001)       |
| `NODE_ENV`     | `development` or `production`                  |
| `DATABASE_URL` | PostgreSQL connection string                   |

### 3. Generate Prisma client

```bash
npx prisma generate
```

### 4. Run in development

```bash
npm run dev
```

The server starts with `tsx watch` — file changes hot-reload automatically.

### 5. Smoke test

```bash
curl http://localhost:3001/health
# → { "status": "ok", "timestamp": "..." }
```

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start with `tsx watch` (hot-reload)          |
| `npm run build` | Compile TypeScript to `dist/`                |
| `npm start`     | Run compiled output (`node dist/server.js`)  |

## Project Structure (Sprint 1)

```
src/
├── config/env.ts          # Typed config; validates env vars at startup
├── db/prisma.ts           # PrismaClient singleton
├── middleware/
│   ├── errorHandler.ts    # Centralized error handling
│   └── requestLogger.ts   # Per-request logging
├── routes/health.ts       # GET /health smoke-test
├── utils/logger.ts        # pino logger instance
├── app.ts                 # Express app wiring
└── server.ts              # HTTP server entrypoint
prisma/
└── schema.prisma          # datasource + generator (models added Sprint 2)
```

## Sprint Roadmap

| Sprint | Scope                                          |
| ------ | ---------------------------------------------- |
| **1**  | ✅ Server scaffold, health check, Prisma setup |
| 2      | Prisma models (User, Scheme, EligibilityCriteria) |
| 3      | Authentication (Google OAuth + JWT)            |
| 4–5    | Scheme & user routes                           |
| 6      | Eligibility matching engine                    |
| 7      | Rate limiting, helmet, CORS, tests             |
| 8+     | Groq/translation integration                  |
