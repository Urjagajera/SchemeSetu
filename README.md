# SchemeSetu (स्कीम सेतु / સ્કીમ સેતુ)

> **Empowering Citizens Through Intelligent Government Welfare Scheme Discovery**

SchemeSetu is a modern pan-India government scheme discovery and eligibility platform designed to help citizens navigate, discover, and check their eligibility for central and state government welfare programs across India.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Step-by-Step Setup Guide (Running on Your PC)](#step-by-step-setup-guide-running-on-your-pc)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Database Setup & Prisma Migrations](#4-database-setup--prisma-migrations)
  - [5. Run Ingestion Parser Dry Run](#5-run-ingestion-parser-dry-run)
  - [6. Launch Development Servers](#6-launch-development-servers)
- [Database Models (Schema Architecture)](#database-models-schema-architecture)
- [Data Ingestion Pipeline (Sprint 7)](#data-ingestion-pipeline-sprint-7)
- [Multilingual Localization](#multilingual-localization)
- [Sprint Roadmap & Status](#sprint-roadmap--status)

---

## Overview

Finding and understanding government schemes in India is often hindered by fragmented portals, complex eligibility conditions, and language barriers. SchemeSetu bridges this gap by:
- Organizing **4,700+ real government schemes** across Central Ministries and 28+ States and Union Territories.
- Providing multi-criteria eligibility filtering (demographics, income, occupation, category).
- Supporting **multilingual access** (English, Hindi, Gujarati).
- Offering modern search, categorization, and bookmarking.

---

## Architecture & Tech Stack

SchemeSetu is architected as a decoupled full-stack application:

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: React Router DOM v7
- **Animations & Icons**: Framer Motion, Lucide React
- **Forms & Validation**: React Hook Form + Zod
- **AI/LLM**: Groq SDK for AI-assisted scheme guidance

### Backend
- **Runtime**: Node.js (ESM, `"type": "module"`)
- **Framework**: Express 4
- **Language**: TypeScript, executed via `tsx` (fast runtime execution without manual compile steps)
- **Database & ORM**: PostgreSQL via [Prisma ORM 5](https://www.prisma.io/)
- **Ingestion & Parsing**: `csv-parse` (RFC4180-compliant multi-line CSV engine)
- **Logging**: Pino + Pino Pretty

---

## Project Structure

```
SchemeSetu/
├── backend/                              # Express + TypeScript API server
│   ├── data/
│   │   └── final_data_without_process_mode_.csv # Ingestion dataset (4,722 schemes)
│   ├── prisma/
│   │   ├── migrations/                  # Committed Prisma database migrations
│   │   └── schema.prisma                # Relational models (User, Scheme, Category, etc.)
│   ├── src/
│   │   ├── config/env.ts                # Environment validation & loading
│   │   ├── db/prisma.ts                 # PrismaClient singleton instance
│   │   ├── ingestion/                   # Dataset parsing & normalization engine
│   │   │   ├── mojibake.ts              # Encoding repair utility (₹, quotes, BOM)
│   │   │   ├── csvParser.ts             # CSV flattening & applicationMode normalization
│   │   │   └── dryRunParseCsv.ts        # Ingestion verification script
│   │   ├── middleware/                  # Error handling & request logging
│   │   ├── routes/health.ts             # Health check endpoint
│   │   ├── utils/logger.ts              # Pino logging setup
│   │   ├── app.ts                       # Express application configuration
│   │   └── server.ts                    # Backend server entrypoint
│   ├── package.json
│   └── tsconfig.json
│
├── locales/                              # Multilingual UI translation files
│   ├── en.json                          # English strings
│   ├── gu.json                          # Gujarati strings
│   └── hi.json                          # Hindi strings
│
├── scripts/
│   └── generate-ui-translations.js      # Automatic translation generator
│
├── src/                                 # React frontend source code
│   ├── components/                      # Reusable UI components
│   ├── constants/                       # Static data constants & scheme data
│   ├── context/                         # State providers (Auth, Language, etc.)
│   ├── layouts/                         # Page shell layouts
│   ├── pages/                           # Application pages/views
│   ├── utils/                           # Frontend utilities & helpers
│   ├── App.tsx                          # Root React component & routing
│   └── main.tsx                         # Client DOM entrypoint
│
├── .env.example                         # Frontend environment template
├── package.json                         # Root / frontend npm configuration
└── vite.config.ts                       # Vite configuration
```

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or higher (tested on Node `v22.x`)
- **npm**: `v10.x` or higher
- **PostgreSQL**: `v14.x` or higher (local service or managed cloud instance such as Supabase / Neon)
- **Git**: For version control

---

## Step-by-Step Setup Guide (Running on Your PC)

Follow these steps in order to set up and run the entire project on your local machine.

### 1. Clone the Repository

Open your terminal or PowerShell and clone the project:

```bash
git clone https://github.com/your-username/SchemeSetu.git
cd SchemeSetu
```

---

### 2. Environment Configuration

#### Frontend Environment (`/.env`):
In the project root, create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure the variables as needed:
```env
VITE_USE_MOCK_DATA="true"
CLIENT_URL=http://localhost:5173
PORT=3001
VITE_ENABLE_DEMO_LOGIN=true
# Optional Groq API key if using AI chatbot features
GROQ_API_KEY=your_groq_api_key_here
```

#### Backend Environment (`/backend/.env`):
Navigate to the `backend/` directory and create its `.env` file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your PostgreSQL database credentials:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/schemesetu?schema=public"
```

---

### 3. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# 1. Install frontend dependencies (from root directory)
cd ..
npm install

# 2. Install backend dependencies
cd backend
npm install
```

---

### 4. Database Setup & Prisma Migrations

Make sure your PostgreSQL service is running and the target database (e.g. `schemesetu`) exists.

From the `backend/` directory, run:

```bash
# Generate Prisma Client types
npm run prisma:generate

# Apply all database migrations to your PostgreSQL database
npx prisma migrate dev
```

This applies all migrations up to Sprint 6, provisioning the tables:
- `User`
- `Scheme`
- `EligibilityCriteria`
- `Category`
- `Tag`
- `Bookmark`

You can verify the database state anytime using Prisma Studio:
```bash
npx prisma studio
```

---

### 5. Run Ingestion Parser Dry Run

Before running the backend, you can test the CSV parsing engine built in Sprint 7. This reads `backend/data/final_data_without_process_mode_.csv`, verifies all 4,722 rows, repairs text encodings, normalizes application modes, and verifies unique keys—**without writing anything to the database**:

```bash
# Inside the backend directory:
npm run ingest:dry-run
```

Expected output:
- **Total rows processed:** 4,722
- **Mojibake encoding repairs:** ~3,430 rows cleaned
- **Misplaced exclusions salvaged:** exactly 125 rows normalized
- **Duplicate links:** 0 duplicates
- **Database writes:** 0 writes (read-only audit)

---

### 6. Launch Development Servers

You will need **two terminal windows**:

#### Terminal 1: Backend Server (Port 3001)
```bash
cd backend
npm run dev
```
- Server starts with hot-reloading via `tsx watch`.
- Verify the server is running by opening `http://localhost:3001/health` in your browser.
  Expected response: `{"status":"ok","timestamp":"..."}`.

#### Terminal 2: Frontend Client (Port 5173)
From the project root directory:
```bash
npm run dev
```
- Open `http://localhost:5173` in your browser.
- The SchemeSetu web application will load with full UI, scheme cards, search filters, and language switching.

---

## Database Models (Schema Architecture)

The backend data layer is managed with Prisma ORM:

```mermaid
erDiagram
    User ||--o{ Bookmark : saves
    Scheme ||--o{ Bookmark : saved_by
    Scheme ||--o| EligibilityCriteria : defines
    Scheme }o--o{ Category : belongs_to
    Scheme }o--o{ Tag : classified_by

    Scheme {
        string id PK
        string link UK "Merge key from CSV url"
        string title
        string offeredBy "Ministry or State"
        string details
        string[] benefits
        string[] documentRequirements
        string[] applicationMode "Online, Offline, Online - Via CSCs"
        string applicationProcess
        string[] eligibilityRawText
    }

    EligibilityCriteria {
        string id PK
        string schemeId FK
        int ageMin
        int ageMax
        int incomeMinAnnual
        int incomeMaxAnnual
    }

    Category {
        string id PK
        string name UK "e.g. Ministry Of Finance, Gujarat"
        string level "Central or State"
        string stateName
    }

    Tag {
        string id PK
        string name UK
    }

    Bookmark {
        string id PK
        string userId FK
        string schemeId FK
        datetime createdAt
    }
```

---

## Data Ingestion Pipeline (Sprint 7)

The ingestion engine transforms raw government scraped data into clean, typed application entities:

1. **Mojibake Encoding Repair (`mojibake.ts`)**:
   - Fixes UTF-8 decoded as Latin-1 corruption (e.g. `â‚¹` → `₹`, `â€™`/`â€˜` → `'`, `â€œ` → `“`).
   - Strips orphaned byte-order-mark sequences (`ï»¿` and `\ufeff`).
   - Resolves legacy Windows-1252 quote artifacts (`€\u009d` → `”`).

2. **Column Flattening (`csvParser.ts`)**:
   - Numbered columns are consolidated into clean arrays (`tag_1..9`, `benefit_1..15`, `eligibility_1..15`).
   - `document_requirement_1..15` columns with `" | "` overflow are split into individual requirement items.
   - Blank / unnamed columns are safely ignored.

3. **Application Mode Normalization & 125-Row Exclusions Salvage**:
   - Normalizes multi-values (`"Offline & Online"`, `"Online\nOffline"`) into atomic arrays matching vocabulary `["Online", "Offline", "Online - Via CSCs"]`.
   - Automatically detects 125 rows in the source data where exclusion paragraphs were misplaced into the `MODE FOR APPLY` column: sets `applicationMode: []` and appends the salvaged exclusion text into `eligibilityRawText`.

---

## Multilingual Localization

SchemeSetu features native multi-language UI support:
- Translation dictionaries reside in `locales/en.json`, `locales/hi.json`, and `locales/gu.json`.
- When adding new UI keys to `locales/en.json`, generate translations automatically:
  ```bash
  node --experimental-strip-types scripts/generate-ui-translations.js
  ```

---

## Sprint Roadmap & Status

| Sprint | Description | Status |
| :---: | :--- | :---: |
| **Sprint 1** | Express + TypeScript backend scaffold, Pino logger, `/health` endpoint | ✅ Completed |
| **Sprint 2** | Prisma setup, initial `User`, `Scheme`, `EligibilityCriteria` models | ✅ Completed |
| **Sprint 3** | Schema refinements, `applicationMode: String[]` multi-value support | ✅ Completed |
| **Sprint 4** | State & Ministry level classification architecture (`Category` model) | ✅ Completed |
| **Sprint 5** | Tag model & many-to-many relationship with Scheme | ✅ Completed |
| **Sprint 6** | User Bookmarks join model with compound unique constraint | ✅ Completed |
| **Sprint 7** | CSV parser utility, mojibake repair, applicationMode normalization, dry-run suite | ✅ Completed |
| **Sprint 8** | *Upcoming*: Database batch ingestion runner (migrating CSV schemes to Postgres) | ⏳ In Queue |
| **Sprint 9** | *Upcoming*: Eligibility numeric rule extraction (Age / Income bounds) | ⏳ Planned |
| **Sprint 10** | *Upcoming*: Category derivation & Central/State level classification | ⏳ Planned |
| **Sprint 11** | *Upcoming*: Tag entity population & eligibility text tag extraction | ⏳ Planned |

---

## Available Scripts

### Root / Frontend
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite frontend dev server at `http://localhost:5173` |
| `npm run build` | Build production frontend bundle |
| `npm run preview` | Preview production frontend build locally |

### Backend (`/backend`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Express server with `tsx watch` (hot-reloading) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server in production mode |
| `npm run prisma:generate` | Regenerate Prisma Client types |
| `npm run ingest:dry-run` | Run CSV ingestion parser audit (zero DB writes) |

---

## License

This project is licensed under the [MIT License](LICENSE).
