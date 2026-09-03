# SchemeSetu Backend

Express + TypeScript backend for the SchemeSetu pan-India government scheme eligibility platform.

## Tech Stack

- **Runtime**: Node.js (ESM, `"type": "module"`)
- **Framework**: Express 4
- **Language**: TypeScript, executed via `tsx` (no compilation step in dev)
- **Database**: PostgreSQL via Prisma ORM 5
- **Data Ingestion**: `csv-parse` (RFC4180-compliant multi-line CSV streaming engine)
- **Logger**: Pino + Pino Pretty

---

## Setup & Run Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual values:

| Variable       | Description                              | Default |
| -------------- | ---------------------------------------- | ------- |
| `PORT`         | Port the server binds to                 | `3001`  |
| `NODE_ENV`     | `development` or `production`            | `development` |
| `DATABASE_URL` | PostgreSQL connection string with schema | e.g. `postgresql://postgres:password@localhost:5432/schemesetu?schema=public` |

### 3. Generate Prisma Client & Run Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations
npx prisma migrate dev
```

### 4. Run the CSV Ingestion Parser (Dry Run)

Test the dataset parsing and validation logic without writing anything to the database:

```bash
npm run ingest:dry-run
```

This processes `backend/data/final_data_without_process_mode_.csv`, runs mojibake encoding repair, normalizes application modes (including the 125-row exclusions salvage), verifies merge key uniqueness, and displays parsed sample JSONs.

### 5. Start Development Server

```bash
npm run dev
```

The server starts with `tsx watch` — file changes hot-reload automatically.

### 6. Smoke Test

In a new terminal window:
```bash
curl http://localhost:3001/health
# → { "status": "ok", "timestamp": "..." }
```

---

## NPM Scripts

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start Express server with `tsx watch` (hot-reload)         |
| `npm run build`        | Compile TypeScript to `dist/`                              |
| `npm start`            | Run compiled production build (`node dist/server.js`)       |
| `npm run prisma:generate` | Regenerate Prisma Client types                          |
| `npm run ingest:dry-run` | Run CSV ingestion parser audit (zero database writes)      |

---

## Project Structure (Up to Sprint 7)

```
backend/
├── data/
│   └── final_data_without_process_mode_.csv # 4,722 government schemes dataset
├── prisma/
│   ├── migrations/             # Committed database migrations
│   └── schema.prisma           # Relational models (User, Scheme, Category, Tag, Bookmark)
├── src/
│   ├── config/env.ts           # Typed environment variable loader & validation
│   ├── db/prisma.ts            # PrismaClient singleton
│   ├── ingestion/              # Ingestion & parsing engine
│   │   ├── mojibake.ts         # UTF-8 / Latin-1 encoding repair utility
│   │   ├── csvParser.ts        # RFC4180 parsing, flattening & normalization logic
│   │   └── dryRunParseCsv.ts   # Entrypoint script for dry-run verification
│   ├── middleware/
│   │   ├── errorHandler.ts     # Centralized error handling
│   │   └── requestLogger.ts    # Per-request logging
│   ├── routes/
│   │   └── health.ts           # GET /health smoke-test
│   ├── utils/logger.ts         # Pino logger instance
│   ├── app.ts                  # Express app wiring
│   └── server.ts               # HTTP server entrypoint
├── package.json
└── tsconfig.json
```

---

## Database Models (Sprint 1–6)

- **`User`**: Authentication identity (Google OAuth, email).
- **`Scheme`**: 4,700+ schemes with unique `link` merge key, `title`, `offeredBy`, `details`, `benefits`, `documentRequirements`, `applicationMode` (String array), `applicationProcess`, and `eligibilityRawText`.
- **`EligibilityCriteria`**: 1-to-1 with `Scheme` for numeric criteria (`ageMin`, `ageMax`, `incomeMinAnnual`, `incomeMaxAnnual`).
- **`Category`**: Many-to-many with `Scheme` for state authority or central ministry grouping (`level`, `stateName`).
- **`Tag`**: Many-to-many with `Scheme` for topical navigation and filter tokens.
- **`Bookmark`**: Explicit join table connecting `User` and `Scheme` with compound unique constraint (`userId`, `schemeId`).

---

## Sprint Roadmap & Progress

| Sprint | Scope | Status |
| :---: | :--- | :---: |
| **1** | Server scaffold, health check, Prisma setup | ✅ Completed |
| **2** | Base models (`User`, `Scheme`, `EligibilityCriteria`) | ✅ Completed |
| **3** | Schema refinements (`applicationMode: String[]` multi-value) | ✅ Completed |
| **4** | Category model for Central / State level classification | ✅ Completed |
| **5** | Tag model and Scheme-Tag many-to-many relation | ✅ Completed |
| **6** | Bookmark explicit join model | ✅ Completed |
| **7** | CSV parsing utility, mojibake repair, mode normalization & dry run | ✅ Completed |
| **8** | Database batch ingestion runner | ⏳ Next |
| **9** | Age & income numeric rule extraction | ⏳ Planned |
| **10**| Category derivation & Central/State level mapping | ⏳ Planned |
| **11**| Tag entity generation & eligibility text extraction | ⏳ Planned |
