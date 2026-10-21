# SchemeSetu — Project Book (SRS format)

**Document status:** draft 1, written 2026-10-13 from the repository (183 commits, 2026-07-13 to 2026-10-13), the `docs/` folder, the
project notes kept across sessions, and the instructions the owner gave in chat.
**Rule used while writing:** nothing in here is assumed. Where the repository or the owner's instructions do not settle a point, it is
marked **TO CONFIRM** and collected in section 17 as a question for the owner. Numbers are the ones measured on the date shown.

Contents
1. Introduction
2. Overall description
3. Constraints (standing rules)
4. Functional requirements
5. Eligibility engine requirements
6. Language and translation requirements
7. Data requirements
8. Non-functional requirements
9. External interfaces (API, services, environment)
10. Architecture and technology
11. Quality: testing, CI, how work is verified
12. Deployment design and status
13. Decision log (what was decided, and why)
14. Current status
15. Known gaps and deferred items
16. Next plan, step by step
17. Open questions for the owner
Appendix A. Module history (Start / Complete commits)
Appendix B. Files and documents index
Appendix C. Glossary

---

## 1. Introduction

### 1.1 Purpose
SchemeSetu (स्कीम सेतु / સ્કીમ સેતુ) is a web application that helps people in India **find government welfare schemes** and
**see whether they are likely to qualify**. This book is the single reference for what the product is, the limits it must live inside,
what has been built, what was decided and why, and what to do next.

### 1.2 Scope
In scope: discovery (search, filters, categories), eligibility checking (guest wizard and saved profile), scheme detail pages,
bookmarks, comparison of up to three schemes, a canned help assistant, English / Hindi (and Gujarati, built but off) interface and scheme
text, Google sign-in, account export and deletion, privacy and terms pages.

Out of scope (not built, not promised): applying for a scheme inside SchemeSetu, any live assistant, payments, notifications or email,
an admin panel, mobile apps. SchemeSetu is an **independent information service and is not a government website**; the interface says so.

### 1.3 Definitions
See Appendix C.

### 1.4 References inside the repo
`README.md`, the 15 notes in `docs/`, `backend/prisma/schema.prisma`, `render.yaml`, `vercel.json`, `.github/workflows/ci.yml`.
Appendix B lists them.

### 1.5 Ownership and people
- **Owner and product decision maker:** the repository owner (GitHub `Urjagajera/SchemeSetu`). All approvals in section 13 are theirs.
- **Native-speaker reviewer for Hindi or Gujarati:** none yet (the owner has said they have no native Gujarati speaker available).
- **Team size, organisation name, target launch date, target audience size:** **TO CONFIRM** (questions 1 to 4).

---

## 2. Overall description

### 2.1 Product perspective
A decoupled web app: a React single-page frontend, an Express JSON API, a PostgreSQL database. The data is a fixed catalogue of
**4,722 schemes** (central ministries and states / union territories) loaded from one CSV file, then enriched by parsers
(eligibility, state, land, rural/urban, occupation) and cleaned (tags, encoding). An LLM pipeline (Groq) translates scheme text into Hindi.

### 2.2 Users
| User | What they do | Needs sign-in? |
|---|---|---|
| Guest visitor | Browse the home page, use the 3-step eligibility wizard, read privacy and terms | No |
| Signed-in citizen | Search with filters, open scheme details, bookmark, compare, keep a saved profile, get recommendations from the profile, change language/theme, export or delete their data | Yes (Google) |
| Owner / operator | Runs ingestion, translation scripts, deployment | Not a product user; works through scripts and the hosting dashboards |

There is **no admin role** and no demo or guest login: sign-in is real Google sign-in only (README, "Login always goes through the real backend").

### 2.3 Operating environment
- **Browser:** modern evergreen browsers. Exact support list: **TO CONFIRM** (question 5).
- **Server:** Node.js 22 (CI and Render use 22; `engines` says `>=20`), PostgreSQL 14 or newer.
- **Local development:** backend on port 3001, Vite frontend on 5173, local Postgres.
- **Production target (not live yet):** Vercel (frontend, hobby), Render (API, free web service), Neon (database, free).

### 2.4 Assumptions that the design relies on (stated by the owner or verified in code)
1. The scheme catalogue is a snapshot; it is refreshed "from time to time", not daily (the interface no longer claims daily updates).
2. Users reach the API through the Vercel address; Vercel forwards `/api` to Render, so the session cookie is first-party.
3. Translated text is a convenience; the English original is always the source of truth and is one click away on every translated section.
4. Everyone using the app is expected to confirm details on the official portal before applying.

---

## 3. Constraints (standing rules)

These are rules the owner set. They override defaults and apply to every future task unless the owner changes them.

### 3.1 Money
- **Free tier only, always.** Nothing may cost money. No paid plans are to be researched, priced or recommended. (Stated 2026-10-02 after paid
  Groq plans were researched.)
- **Groq stays on the free plan:** about 200,000 tokens per day per model (a rolling 24-hour window), 8,000 tokens per minute, 1,000 requests
  per day, 30 requests per minute. Models have separate quotas: `openai/gpt-oss-120b` (primary), `qwen/qwen3.8-27b` (fallback), `gpt-oss-20b`.
  Heavy work is planned as slow, resumable, multi-day runs. Live translation may fall back to English when the daily quota is gone, but it must
  do so visibly and gracefully (a banner), never as a broken page.
- Hosting: Neon free Postgres, Render free web service (sleeps when idle; a keep-alive ping on `/health` is planned), Vercel hobby, the default
  `*.vercel.app` address. The local database is about 63 MB, which fits Neon's free tier.

### 3.2 Secrets
- Never print `.env` contents, API keys, database passwords or session secrets into the conversation or any file. Describe them (present, absent,
  identical yes/no, masked) instead. This rule exists because on 2026-10-01 a command printed the Groq key and it had to be rotated.
- `.env.example` files hold no real secrets and may be read.

### 3.3 Git and delivery workflow
- **Master branch only.** No other branches or worktrees, ever.
- **Commit convention per module:** the first commit is `Start: <module> — <description>`, the last is `Complete: <module> — <summary>`; commits in
  between are plain, humanised descriptions. Module name is reused verbatim in both.
- **No Co-Authored-By line and no attribution trailer in any commit message.** (Stated 2026-10-04.) This overrides a harness reminder that offers one.
  76 older pushed commits (all before 2026-10-04) carry a trailer; the owner decided to **leave history as it is**.
- **Explicit paths when staging** (never `git add -A`). The untracked `backend/reports/*` files are never staged.
- **Claude commits and pushes when told to** ("commit this" / "make the Complete commit"); earlier in the project the owner committed by hand (2026-10-04
  rule), which was then replaced by this. Never push unless told, or unless the brief for the module says to push at the end.
- **Before every push:** run BOTH the frontend and backend test suites, BOTH typechecks and BOTH builds. Then push and **confirm CI is green on the
  head commit** through the public GitHub API (the `gh` tool is not installed). Reason: on 2026-10-05 a push broke CI because only the backend suite was
  run, while a frontend test reads backend files.
- **Stop and report** on any failed test, build or proof; do not push around it.
- **Mutation-check new tests:** a test must be shown to fail when the behaviour it guards is broken.
- **Ask instead of assuming**, especially when a reply from the owner contains unfilled placeholders (such as `[PASS/FAIL]`): do not act on it.
- Live browser checks that need Google sign-in are done **by the owner in Chrome**; the assistant's browser pane cannot hold a Google sign-in.
  Commit messages for such modules say "the live check was done by the owner in Chrome, not by the assistant".
- Never delete the owner's real account; account-deletion checks use a throwaway account only.
- Deleted or regenerable report files in `backend/reports` are regenerated only when the owner asks.
- Windows workflow notes: CRLF files (use the Edit tool or scripts that preserve line endings), avoid backslash-heavy shell heredocs, temporary scripts
  live outside the repo (session scratchpad) and are deleted after use.

### 3.4 Languages
- **Hindi is on. Gujarati is OFF** (`LANGUAGES.gu.enabled = false`, guarded by a test) until a native speaker has reviewed it.
- **All Hindi and Gujarati wording is "unverified"** until a native speaker reviews it. Every document that mentions it says so.
- The owner's latest instruction on Gujarati ("I want Gujarati exact same as Hindi") is **not yet acted on**; see question 6.

### 3.5 Product honesty
- The interface may only say things that are true (module "Honest copy", guarded by `src/test/honestCopy.test.ts`).
- No fabricated contact details, user counts, money figures, news or security claims.
- Machine-translated text is labelled as such.

### 3.6 Deployment
- **Do not start or provision deployment** (no accounts, no resources, no deploy) until the owner supplies the real Vercel and Render addresses and says go.
  The owner creates the Neon, Render, Vercel and Google Cloud items themselves; the assistant only prepares commands and config.

### 3.7 Technical constraints that came from facts, not choices
- Groq's real binding limit is **tokens per day**, not requests; the response headers do not show it (the daily "Used" figure only appears inside a 429
  message, so quota is probed by sending an oversized request and reading the error).
- `llama-3.3-70b` is no longer available on Groq (404).
- Render's free Postgres expires after 30 days and Railway is only a trial, so no single free platform fits; hence three services.
- The Google OAuth client ID must be identical in the frontend (`VITE_GOOGLE_CLIENT_ID`) and backend (`GOOGLE_CLIENT_ID`); Vite reads `.env` only at start.
- The pgdump line `transaction_timeout` must be removed before restoring into an older Postgres.

---

## 4. Functional requirements

Route list from `src/routes/AppRoutes.tsx`. "Auth" means signed in; signed-out visitors are redirected to `/login?redirect=…`.

| ID | Requirement | Where | Auth |
|---|---|---|---|
| F-1 | Home page with scheme total and number of states/UTs (real counts from the data), featured schemes, categories | `/` | No |
| F-2 | Google sign-in; session in an httpOnly cookie (7 days); `GET /api/auth/me`; logout | `/login`, `/register` | No |
| F-3 | Guest eligibility wizard: 3 steps (age, income, then the rest), ending in a recommended list | `/eligibility` | No |
| F-4 | Recommended schemes from the saved profile, 20 per page with a "Show more" button; header shows "shown / total"; no scheme repeated | `/eligibility` | Yes (saved profile) |
| F-5 | Search with free text, category, level (Central/State), ministry, state, gender, social category, age, income, occupation; server-side pagination | `/search` | Yes |
| F-6 | Scheme detail: description, benefits, eligibility, documents, how to apply (web addresses are clickable), related schemes, official source link | `/schemes/:id` | Yes |
| F-7 | Bookmarks: add, remove, list | `/bookmarks` | Yes |
| F-8 | Compare up to 3 schemes (title, ministry, category, every benefit, eligibility, documents; loading state; polls while a translation is pending) | `/compare` | Yes |
| F-9 | Profile: 16 optional fields plus name; only `name` is required; blank means "unknown"; save errors shown with a summary and red tab markers | `/profile` | Yes |
| F-10 | Dashboard: profile completeness (counts 7 fields: age, gender, state, category, occupation, income, residence), recommendations | `/dashboard` | Yes |
| F-11 | Settings: language, theme, **Download my data** (JSON export), **Delete my account** (type the word DELETE to confirm) | `/settings` | Yes |
| F-12 | Privacy Policy and Terms of Service pages, in English, Hindi, Gujarati | `/privacy`, `/terms` | No |
| F-13 | Help desk / FAQ | `/help` | Yes |
| F-14 | SetuAI: **canned answers only** (5 topics + a default), described honestly as "Quick answers about common schemes. Not a live assistant." | `/ai`, chat bubble | Yes |
| F-15 | Language switcher (English, Hindi; Gujarati strings exist) and light/dark theme | Navbar | No |
| F-16 | 404 page for unknown routes (including `/home`) | `*` | No |

### 4.1 Per-feature behaviour worth recording
- **Cards:** show translated title and short summary once available; a small "मशीन अनुवाद" (machine translation) line appears in Hindi/Gujarati mode only
  once translated text has arrived.
- **Scheme page translation:** `GET /api/schemes/:id?lang=hi` never waits for the model. It returns what is stored, plus `translation{status, fields,
  pendingFields, failedFields}`; the page polls. A banner notes untranslated sections. Each translated section (Benefits, Eligibility, How to Apply,
  Documents) has an "English | हिन्दी" switch that shows the original without another request; it is per section, not remembered, and resets when
  another scheme opens.
- **Description display:** the leading "Details" heading present in 4,422 of 4,722 stored descriptions is removed at display time, not in the data.
- **Pagination of recommendations:** `POST /api/schemes/recommended` takes `{profile, page?, limit?}`; default page 1, limit 20, maximum 50; the response
  adds `page, limit, total, hasMore`; ties are ordered by scheme id so pages never overlap; non-integer or less-than-1 values give HTTP 400.
- **Account export/delete:** user id always comes from the session; delete removes bookmarks, profile and account in one transaction (all or nothing) and
  clears the cookie with the same attributes used to set it.

---

## 5. Eligibility engine requirements

Located in `backend/src/utils/criteriaMatch.ts`, `demographicFilters.ts`, `routes/eligibility.ts`, `routes/schemes.ts` (`/recommended`).

1. **"Unknown is not a failure."** A blank profile field never excludes a scheme; it produces an "unverified" note instead.
2. **Hard criteria** (can exclude): age range, annual income range, gender, social category (general/SC/ST/OBC), state, land ownership, residence (rural/urban).
   Gender, category and state are **set membership** (a scheme may allow several values).
3. **Soft criterion: occupation.** It adds +1 on a match and -1 on a mismatch to ranking, appears as a "worth checking" note, and **never excludes** and never
   changes `isEligible` or `overallMatch`. Profile occupation values "other" and "senior citizen", or blank, produce no occupation result at all.
4. **State matching:** a state-level scheme (by its authority name) is shown to people in that state; central schemes are shown everywhere unless the parser
   found a real state gate (about 16 central schemes). `?state=` search hides central schemes limited to other states. An unrecognised profile state counts as unknown.
5. **Land:** the profile question is "Own Cultivable Land?", so a land "yes" gate only counts when it is about farming land (house plots, shops are rejected).
6. **Rural/urban:** most mentions are income ceilings (87 schemes) and are not gates; only 31 schemes carry a real rural/urban gate.
7. **Messages:** "Owning cultivable land is required", "The applicant must be landless".
8. **Precision over recall in the parsers.** Known losses: 168 girl-child/daughter schemes have gender left null on purpose; some correct gates lost
   (e.g. SC Credit Co-operative Society); segmented schemes can carry the wrong single gate; there is no EWS, minority, DNT or PVTG gate.
9. **Pre-existing quirk, deliberately left:** for the 149 occupation-only schemes, eligibility still moves with the profile occupation through the older
   keyword/tag path. The owner has **deferred** deciding what to do about these 149.
10. **Coverage today (stored criteria rows 2,987):** age 763, income 765, gender 254, category 447 (earlier counts), state set on 2,149 schemes (2,133 state, 16 central),
    land 41 (34 yes, 7 no), residence 31 (26 rural, 5 urban), occupation 683 (student 332, farmer 288, unemployed 47, entrepreneur 10, employee 2, 4 two-way sets).
    3 schemes with state gates are suppressed on purpose as source-data errors (slugs `maternalnutritionuk`, `matbhpbocwwb`, `shssd`).

---

## 6. Language and translation requirements

### 6.1 Interface strings
- Locale files `locales/en.json`, `hi.json`, `gu.json` are the single source for interface text. A parity test (`src/test/locales.test.ts`) fails if
  the three files drift. About 300 hard-coded strings were moved into them (profile, wizard, shared parts, legal pages, compare).
- All Hindi and Gujarati interface wording is hand-written or machine-generated and **unverified by a native speaker**.

### 6.2 Scheme text translation pipeline (`backend/src/translation/`)
- Table `SchemeTranslation`: one row per scheme + language + field (`title`, `description`, `benefits`, `eligibility`, `documents`,
  `applicationProcess`, `summary`), with `status` ok/failed, `sourceHash` (detects stale rows), the model used and attempts.
- Translation is **on demand and cached**; the API never waits for the model; the page polls.
- Primary model `openai/gpt-oss-120b`, automatic fallback `qwen/qwen3.8-27b`. Work is split into chunks and per-field calls.
- **Validator** rejects an output (and moves to the fallback) when: too little native script (60% for long text, 40% medium, 20% short, with the
  quoted-names exception below), numbers or URLs missing, line count or list length changed, English returned unchanged, glossary term wrong or forbidden,
  letters from another script appear, or Latin letters are glued to native letters (Hindi: both directions; Gujarati: native-then-Latin is rejected,
  Latin word plus Gujarati ending is allowed because 5 of 7 real cases were correct Gujarati suffixes).
- **Quoted-names exception (added 2026-10-13):** names the source puts in quotation marks and the output keeps exactly are not counted against the
  native-script share. Reason: one sentence made of two scheme names in quotes could never reach the percentage.
- **Glossary** (`glossary.ts`) with preferred, acceptable and forbidden renderings, whole-word matching and exceptions. Decisions: Hindi uses **दिव्यांग**
  (not विकलांग); **अपाहिज is forbidden**; "pulse" (crop) and "marginal" have Gujarati entries (કઠોળ, સીમાંત) with exceptions for Pulse Polio, pulse rate,
  pulse oximeter. All Gujarati glossary entries are marked `unverified`.
- **Vocabulary** (`translation/vocabulary/hi.ts`, `GET /api/vocabulary?lang=hi`): ministry and state names plus 363 tags. Tags used fewer than 10 times are
  hidden in Hindi; the Goa tag (9 uses) stays hidden. 8 ministry names are as the model wrote them and not checked against official Hindi names (a soft item;
  the owner will review later).
- **Stored-text scan:** `npm run scan:translations -- hi --list` re-checks every stored row for stray scripts, Latin-in-word and forbidden words.
  Last result: 0 problem rows in 5,482 Hindi title/summary rows (after 7 hand corrections).

### 6.3 Measured quality (back-translation audits judged by Claude)
- Gujarati, Qwen only: 8.1% of lines changed meaning; 30% of schemes had at least one. Kept off.
- Gujarati, gpt-oss only: 0.9% (first sample) and 3.1% (fresh sample, stricter grading). Roughly 1 in 20 lines still changes meaning. A native review is the gate.
- Hindi: about 2% of lines changed meaning in the first audit; 0 of 50 stored titles.

### 6.4 Coverage (2026-10-13)
- Hindi titles: **4,722 / 4,722**. Hindi card summaries: **4,722 / 4,722**, 0 failed. Hindi detail pages (benefits, eligibility, etc.): **on demand only**
  (a full pre-translation would cost about 10 million tokens, roughly 50 days of one model's free quota).
- Gujarati: nothing stored beyond test rows; off.

### 6.5 Requirements for future languages
Any language switched on must have: validator rules (script range, digits, ordinals), a glossary, an audit on a fresh sample, a native-speaker review, the
label and the per-section English switch, and the owner's explicit approval.

---

## 7. Data requirements

### 7.1 Source and ingestion
- **Dataset:** `backend/data/final_data_without_process_mode_.csv`, 4,722 rows; merge key is the scheme URL (unique). **Where the data came from, its licence and
  who may redistribute it: TO CONFIRM** (question 7).
- Mojibake repair (₹, quotes, byte-order marks; about 3,430 rows touched), numbered-column flattening (tags 1 to 9, benefits 1 to 15, eligibility 1 to 15,
  documents 1 to 15 with " | " overflow), application-mode normalisation to `Online`, `Offline`, `Online - Via CSCs`, and salvage of 125 rows where exclusion text
  sat in the application-mode column.
- Ingestion is idempotent and additive: each step is dry-run first (report in `backend/reports`, untracked), then the owner approves, then it writes with a
  backup and an "additive proof" (no other table or column changed; counts identical).

### 7.2 Database model (Prisma 5.22, PostgreSQL)
`User`, `Profile` (16 optional text fields + `profileTags`), `Bookmark` (unique user+scheme), `Scheme` (name, authorityName, description, benefits[],
documentRequirements[], applicationMode[], applicationProcess, eligibilityRawText[], sourceUrl unique), `EligibilityCriteria` (one per scheme: ageMin/Max,
incomeMin/MaxAnnual, gender, category, occupation, state, landOwnership, residence), `Category` (authority name, level Central/State, stateName), `Tag`,
`SchemeTranslation`. Many-to-many: schemes to categories and to tags.

### 7.3 Data sizes (2026-10-13)
4,722 schemes; 2,987 criteria rows; 4,770 tags (from 5,131); 5,482 stored Hindi title and summary rows at the last scan (now 9,444 title and summary rows, plus on-demand detail rows); local database about 63 MB.
Copied to Neon at deployment: Category, Tag, Scheme, EligibilityCriteria, SchemeTranslation and the two link tables. **Not copied:** User, Profile, Bookmark.

### 7.4 Tags
361 renames merged 5,131 raw tags into 4,770 (typographic duplicates only; 13 singular/plural pairs held back because the meaning differs). The rename map is committed
(`tagRenames.ts`, `tagCanonical.ts`) so re-ingestion gives the same tags. Search's entrepreneur keyword list was extended so kept spellings still match.

### 7.5 States
One list of 36 states and union territories (`backend/src/utils/states.ts`) drives the states endpoint, level derivation, profile validation (canonical spelling),
and the dropdowns. NITI Aayog, Lokpal and CAG are Central.

### 7.6 Personal data
Collected: Google name, email, profile picture URL, Google id; the profile fields the user enters; bookmarks. Not collected: passwords. Stored in the browser: the
session cookie (httpOnly) and small preferences. Sent to Groq: public scheme text only, never user data. A user can export or delete everything.

---

## 8. Non-functional requirements

### 8.1 Security
- Google ID token verified server-side; session is an HS256 JWT in an httpOnly cookie, 7 days. In production the cookie is `Secure` and `SameSite=None`; locally
  `Lax`. One module (`utils/sessionCookie.ts`) sets and clears it so attributes always match.
- Helmet security headers; CORS fixed to `CLIENT_URL` with credentials (never `*`); API responses are `no-store`; ETags disabled.
- Rate limits: auth 20 requests per 15 minutes, chat 30 per 5 minutes.
- `TRUST_PROXY_HOPS=2` behind Vercel and Render (too high would let a visitor forge their address).
- `requireAuth` on profile, bookmarks, account; account routes take the user id only from the session.
- Dependencies: all runtime findings fixed without major bumps (axios, react-router, express, qs). Five dev-only findings remain, needing Vitest 5 / Vite 8 majors.
- Old local `.env` (localhost DB password only) exists in git history from commit dcbc65d, unscrubbed; the owner knows and left it.

### 8.2 Performance and availability
No numeric targets have been set. Free-tier facts that shape behaviour: Render sleeps when idle (cold start), Groq quotas, Neon free limits. Targets: **TO CONFIRM** (question 8).

### 8.3 Accessibility
No formal target (for example WCAG level) has been set: **TO CONFIRM** (question 9).

### 8.4 Internationalisation
English, Hindi on; Gujarati built and off; digits and ordinals handled in validators; per-section original/translated switch.

### 8.5 Privacy and legal
Privacy Policy and Terms drafts exist and the owner approved the English wording. This is **not legal advice**; a proper legal review before launch is still open. No company
name, address or contact details appear, because none exist yet.

### 8.6 Maintainability
Typed (TypeScript), tested (section 11), documented per module in `docs/`, ingestion steps are reproducible scripts, and the commit log shows module boundaries.

---

## 9. External interfaces

### 9.1 HTTP API (`backend/src/app.ts`)
| Prefix | Routes |
|---|---|
| `/health` | `GET /` |
| `/api/schemes` | `GET /` (search/filter, paged), `GET /featured`, `GET /states`, `GET /ministries`, `POST /recommended`, `GET /titles`, `GET /:id` |
| `/api/categories` | `GET /` |
| `/api/eligibility` | `POST /report` (eligibility report for a profile and scheme) |
| `/api/chat` | `POST /message` (canned replies, rate limited) |
| `/api/bookmarks` | `GET /`, `POST /`, `DELETE /:schemeId` (auth) |
| `/api/auth` | `POST /google`, `POST /logout`, `GET /me` |
| `/api/profile` | `GET /`, `PUT /` (auth; zod validation, 400 with per-field messages) |
| `/api/account` | `GET /export`, `DELETE /` (auth) |
| `/api/vocabulary` | `GET /?lang=hi` |

### 9.2 Third-party services
| Service | Use | Plan |
|---|---|---|
| Google Identity | Sign-in | Free; the OAuth consent screen and allowed origins need setting for the real address |
| Groq | Scheme-text translation (the chat assistant is canned and does not call it) | Free plan only |
| GitHub | Source and Actions CI | Free |
| Neon, Render, Vercel | Database, API, frontend | Free tiers (planned) |

### 9.3 Environment variables (names only)
Backend: `PORT`, `NODE_ENV`, `DATABASE_URL`, `CLIENT_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `TRUST_PROXY_HOPS`, `GROQ_API_KEY`, translation model names.
Frontend: `VITE_USE_MOCK_DATA`, `VITE_GOOGLE_CLIENT_ID`. Note: the dev backend needs `GROQ_API_KEY` in `backend/.env` itself or translation reports "unavailable".

---

## 10. Architecture and technology

- **Frontend:** React 19, Vite 5, TypeScript 7, Tailwind CSS 4, React Router 7, React Hook Form + Zod, Framer Motion, Lucide icons, Axios.
- **Backend:** Node.js (ESM), Express 4, TypeScript run with `tsx` in development and compiled with `tsc` for production, Prisma 5.22, PostgreSQL, Pino logging,
  `csv-parse`, `express-rate-limit`, Helmet, `groq-sdk`.
- **Tests:** Vitest 2 in both halves; jsdom and Testing Library on the frontend; supertest on the backend.
- **Layout:** `src/` (pages, components, contexts, hooks, services, utils, constants), `locales/`, `backend/src/{routes,utils,middleware,ingestion,translation,db,config}`,
  `backend/prisma/` (schema and committed migrations), `docs/`, `scripts/`.
- **Unrouted code kept on purpose:** `src/components/landing/*` and `src/pages/Landing/_archive/OldLanding.tsx` (the old SchemeSetu landing pieces, not routed).
- **Scripts:** frontend `dev, build, preview, typecheck, test, test:watch`. Backend `dev, build, start, prisma:generate, typecheck, test, ingest:dry-run, ingest:*`
  (eligibility, state, land-residence, occupation, tags dry runs), `translate:cards`, `scan:translations`.

---

## 11. Quality: testing, CI and verification

- **CI** (`.github/workflows/ci.yml`) runs on every push to master and pull request: frontend (install, typecheck, tests, build) and backend (install, `prisma generate`,
  typecheck, tests, build), on Node 22.
- **Counts on 2026-10-13:** frontend 317 tests (26 files), backend 646 tests (35 files). Typechecks and builds clean.
- **Test style:** mock at the edges (axios, context hooks, services), fake timers for polling, tests built from real data lines (audit sentences), and each new test is
  **mutation-checked**. Some frontend tests read backend files (cookie settings, route names), which is why both suites must run before any push.
- **Guard tests:** honest copy, locale parity, Gujarati stays off, Privacy page matches the code (cookie lifetime, stored fields, deletion/export routes).
- **Live checks:** done by the owner in Chrome for anything needing Google sign-in; recorded in the Complete commit messages.
- **Not covered:** end-to-end browser tests, most remaining pages, accessibility tests, load tests.

---

## 12. Deployment design and status

**Status: not started, on purpose.** Waiting for the owner's real Vercel and Render addresses and an explicit go.

Design (all free):
1. **Neon** free Postgres (direct connection string with `sslmode=require`); restore the local data tables (not User/Profile/Bookmark); remove the `transaction_timeout` line from the dump.
2. **Render** web service from `render.yaml` (`rootDir: backend`, Node 22, `buildCommand` installs dev dependencies, `startCommand` runs `prisma migrate deploy` then `node dist/server.js`,
   health check `/health`, `autoDeploy: false`, region Singapore). Secrets typed in the dashboard.
3. **Vercel** hobby, framework Vite; `vercel.json` rewrites `/api/*` to the Render address (currently `https://schemesetu-api.onrender.com`, **must be changed to the real URL**) and everything
   else to `index.html`; Git auto-deploy disabled.
4. **Google Cloud:** add the Vercel origin as an authorised JavaScript origin; publish the consent screen.
5. Keep-alive ping on `/health` for Render's idle sleep.
6. Set `CLIENT_URL` to the exact Vercel origin (no trailing slash) and `TRUST_PROXY_HOPS=2`.

---

## 13. Decision log (what and why)

Grouped by area; dates are when the owner decided or approved.

### 13.1 Cost and platform
| Decision | Why |
|---|---|
| Free tier only, always | The project has no revenue; after paid Groq plans were researched the owner closed the question (2026-10-02) |
| Neon + Render + Vercel with a Vercel `/api` rewrite | No single free platform exists (Render's free DB expires in 30 days, Railway is a trial); the rewrite makes the cookie first-party |
| Groq translation, gpt-oss primary and Qwen fallback | Best quality in audits (gpt-oss) with an automatic fallback when its daily tokens run out |
| Live translation may fall back to English | Free quota is small; accepted as long as it is graceful and visible |

### 13.2 Data and eligibility
| Decision | Why |
|---|---|
| Parsers favour precision over recall | A wrong gate hides a scheme someone could claim; missing a gate only shows an extra scheme |
| "Unknown is not a failure" | A partial profile must still produce results |
| State matching through authority name plus a stored state set | 2,148 of the state schemes name their own state; only about 16 central schemes have real state gates |
| Occupation is soft (ranking and a note, never excludes) | Profile occupation is single-valued and noisy text patterns would wrongly exclude people |
| 3 state gates suppressed | The owner judged them source-data errors |
| 149 occupation-only schemes: deferred | Owner has not decided; no change made |
| Tags: merge only typographic duplicates; hold back 13 singular/plural pairs | Meaning differs; the rename map is committed so re-ingestion is stable |
| Profile form: only `name` required | The earlier "all 16 fields" rule contradicted "unknown is not a failure" |
| Detail text stays on-demand translated | A full pre-translation costs about 10 million tokens (about 50 days of free quota) |

### 13.3 Languages
| Decision | Why |
|---|---|
| Hindi on; Gujarati off | Gujarati audits showed 3% to 8% of lines changing meaning and the owner has no native speaker |
| No gpt-oss quota on Gujarati until Hindi summaries were done | Hindi summaries were the priority; that is now complete |
| दिव्यांग not विकलांग; अपाहिज forbidden | Respectful, current terminology; 43 stored rows re-translated |
| Hindi title hand fixes (7) instead of re-translating | The models repeated the same glitch (e.g. "पoultry") |
| Glued Latin letters: reject in Hindi both ways, in Gujarati only native-then-Latin | 5 of 7 real Gujarati cases were correct suffixes on English words |
| Per-section English/Hindi switch, not remembered | Lets readers check the original without extra requests; avoids a sticky setting |
| Machine-translation label on cards and scheme page | Honesty; the quality is not native-reviewed |
| Quoted names kept in English no longer count against the script share | The last stuck sentence was two scheme names in quotes; chosen over lowering the threshold because it cannot let a badly translated sentence through |

### 13.4 Product and copy
| Decision | Why |
|---|---|
| Honest-copy pass: 19 false claims removed (Supabase line, fake contact column, mock disclaimer, invented user/money figures, fake news pane, dead newsletter code, 404 legal links, "intelligent" SetuAI, daily-update claims, "auto-updates", "Download eligibility reports") | The interface must say only true things |
| Footer has no Contact column for now | There are no real contact details yet |
| Home stats come from the data (scheme total, states/UTs) | The other figures were invented |
| SetuAI stays as canned answers, with an honest label | Real assistant needs a free model plan; decided later |
| `/home` and the Mostar tourism template deleted | It was an unrelated Bosnia tourism template routed at `/home`, linked from nowhere; the old SchemeSetu landing components were kept but unrouted |
| "Landing page strings" module dropped | Its page was deleted |
| Recommendations: 20 per page with a "Show more" button | Previously hard-capped at 20 with no way to see more |
| Account export and delete | Required once the Privacy Policy says data is collected |
| Delete requires typing DELETE; deletion checked only on a throwaway account | Prevents accidents; never touch the owner's real account |
| Privacy/Terms with no company name or contact | None exists; wording tied to the code by a test |

### 13.5 Security
| Decision | Why |
|---|---|
| Real Google sign-in only; no demo login | Removed the fake default profile and demo account |
| One module sets and clears the session cookie | Logout and delete used different attributes before |
| Runtime dependency fixes only, no majors | Majors need Vite 8/Vitest 5 and are dev-only; deferred |

### 13.6 Engineering process
| Decision | Why |
|---|---|
| Master only | Owner found unexpected stray branches |
| Start/Complete commit convention | Module boundaries visible in `git log` |
| No Co-Authored-By trailers; old commits left | Owner preference; history not rewritten |
| Run both suites, typechecks and builds before every push | A CI failure on 2026-10-05 |
| Mutation-check new tests | Prove the tests can fail |
| Live Google checks by the owner | The assistant's browser pane cannot hold a Google sign-in |
| Dry run, then owner approval, then backed-up additive write | Every data change so far followed this |

---

## 14. Current status (2026-10-13)

- Branch `master`, head `1a1605c`, CI green. 183 commits.
- Data: 4,722 schemes; 2,987 criteria rows; 4,770 tags; Hindi titles and summaries complete.
- Tests: frontend 317, backend 646.
- Features: all in section 4 built; Hindi live; Gujarati off.
- Deployment: not started.
- Groq quota: used heavily by the Hindi summaries runs; refills on a rolling 24-hour window.

---

## 15. Known gaps and deferred items

**Product and data**
1. 149 occupation-only schemes: eligibility still moves with the profile occupation through the old keyword path (decision deferred).
2. Parser limits (section 5 point 8); no EWS, minority, DNT, PVTG gates.
3. Detail text beyond the card (benefits, eligibility, documents, how to apply) is translated only on demand and only when Groq quota allows.
4. Hindi and Gujarati criteria labels and a few API messages are English-only; the residence tile shows raw "rural".
5. Gujarati: built but unreviewed and off; roughly 1 line in 20 still changes meaning.
6. 8 Hindi ministry names are unchecked against official names; interface Hindi wording and the hand-written "worth checking" text are unverified.
7. SetuAI is canned. Decide whether it ever becomes a real assistant (free tier only).
8. Dashboard completeness counts only 7 fields.

**Pre-launch**
9. A real privacy and terms **legal review**.
10. A real **contact email**, then a Contact section in the footer.
11. A native-speaker review of Hindi (and Gujarati before switching it on).
12. Hosting accounts (Neon, Render, Vercel), Google origin and consent-screen publishing, a keep-alive ping.

**Engineering**
13. Dev-only dependency findings needing Vite 8 / Vitest 5 majors.
14. No end-to-end tests; most remaining pages untested.
15. The old `.env` (localhost password only) in git history (commit `dcbc65d`), unscrubbed; 76 old commits carry a Co-Authored-By trailer (left as is).
16. Housekeeping: `%TEMP%\env.bak.*` and `%TEMP%\elig\demo_profile_backup.json` hold old secrets or data; CRLF/LF warnings; Prisma migration checksum caveat if line endings change; an IDE (Antigravity) that can run terminals on this repo, so only one tool should write to it.
17. Untracked `backend/reports/*` (audits, tag backups, dry-run reports) are not in git by design.

---

## 16. Next plan, step by step

Each step follows the standing workflow: Start commit, work, tests (both halves), Complete commit, push, CI check, report.

1. **Decide Gujarati (waiting on the owner).** Answer question 6, then either (a) build Gujarati coverage the same way as Hindi: titles first, then summaries, using the free quota
   (an estimated 10 or more days), keeping it off in the app; or (b) also switch it on, which needs the native review first.
2. **Deployment preparation (waiting on addresses).** Owner supplies the real Vercel and Render URLs. Then: update `vercel.json`, run both suites/typechecks/builds, commit, push, CI.
   The owner creates Neon, Render, Vercel and the Google origin; the assistant prepares commands. Restore data to Neon without User/Profile/Bookmark; set env vars; first deploy; smoke test.
3. **Live checks after deploy (owner, Chrome):** sign-in on the real origin, session after reload, logout, search, scheme page in Hindi, bookmarks, compare, account export on a throwaway account.
4. **Pre-launch content:** real contact email and footer Contact section; legal review of Privacy and Terms; update the pages if wording changes.
5. **Native review:** Hindi wording (interface, label, "worth checking"), the 8 ministry names; Gujarati when available.
6. **Decide the 149 occupation-only schemes** (options to be presented with real examples).
7. **Detail-page translation coverage:** run a metered, resumable script for the most visited schemes within the free quota (needs the owner's priority list or a rule).
8. **Dev dependency majors (Vite 8, Vitest 5)** as a separate module with full suites as the safety net.
9. **Optional later:** accessibility audit, end-to-end tests, decide SetuAI's future, extend parsers (EWS, minority, DNT/PVTG) with dry-run and review each time.

---

## 17. Open questions for the owner

Answer any you like; I will update this book and will not assume the rest.

1. **Team and organisation:** is this a solo project, a college/team project or a company product? What name and legal entity should the Privacy Policy and Terms use (currently none)?
2. **Launch date or milestone:** is there a deadline (for example a submission or demo date)?
3. **Audience size and geography:** how many users do you expect in the first months, and which states matter most? (This decides whether the free tiers are enough.)
4. **Intended audience:** citizens directly, or also NGOs/CSC operators/helpers? This affects wording and features.
5. **Browser and device support:** which browsers and phone sizes must work?
6. **Gujarati:** "I want Gujarati exact same as Hindi": do you mean (a) stored Gujarati titles, summaries and detail text for all 4,722 schemes, still switched off in the app, or (b) also switched on for users like Hindi? And can the free gpt-oss quota go to Gujarati from tomorrow?
7. **Data source and rights:** where did the 4,722-scheme CSV come from, and are we allowed to show and redistribute it? Should the app name the source?
8. **Performance and availability targets:** any response-time or uptime expectations beyond "works on the free tiers"?
9. **Accessibility:** do you want a target such as WCAG 2.1 AA?
10. **Data freshness:** how often should the catalogue be refreshed, and who will provide new data?
11. **Contact and support:** which email should be shown, and who answers it? Should there be a feedback or report-a-wrong-scheme form?
12. **SetuAI:** keep it canned permanently, or plan a real assistant using a free model? If real, which free model and limits are acceptable?
13. **Hindi reviewer:** do you have, or can you find, a native Hindi reader to review the interface wording and the 8 ministry names? Same for Gujarati.
14. **The "Row" numbers** (Row 5 tag cleanup, Rows 8+ deployment) in my old notes: is there a master table of rows or sprints that you keep? If so please share it so this book can mirror it.
15. **Anything missing:** features or constraints you expect in this book that I have not listed.

---

## Appendix A. Module history (Complete commits, newest first)

| Date | Commit | Module |
|---|---|---|
| 2026-10-13 | 1a1605c | Hindi summaries finish (all 4,722 stored; quoted-names validator exception) |
| 2026-10-05 | 240821a | Recommended pagination |
| 2026-10-05 | 02bcc83 | Remove Mostar page |
| 2026-10-05 | d22b42a | Gujarati validator |
| 2026-10-05 | 9fc154d | Logout cookie |
| 2026-10-05 | 193cb18 | Hindi title fixes |
| 2026-10-05 | 3dd5293 | Compare details |
| 2026-10-05 | 09f079c | Account deletion and export |
| 2026-10-05 | f36d3b6 | Compare page translation |
| 2026-10-05 | 30d35a6 | Privacy and terms |
| 2026-10-05 | d8a04c2 | UI strings, shared parts |
| 2026-10-05 | 1af67c3 | UI strings, profile and eligibility |
| 2026-10-05 | 18883d4 | Hindi quality label |
| 2026-10-04 | 7c1582b | Honest copy |
| 2026-10-04 | 56d4c8a | Hindi title cleanup |
| 2026-10-04 | 8be4814 | Gujarati hardening |
| 2026-10-04 | 54f63e7 | Dependency audit |
| 2026-10-04 | bdebae1 | Tag cleanup |
| 2026-10-04 | 8807d06 | Cosmetic fixes |
| 2026-10-02 | 54f555d | Frontend tests |

Earlier work (July to early October) used the older commit style: the base app (2026-07-13), CSV ingestion, auth and Google sign-in, profile and bookmarks, server-side filters,
eligibility parsers (age, income, gender, category, state, land, residence, occupation), the translation pipeline, the Hindi vocabulary and card titles.

## Appendix B. Files and documents index

`README.md` (setup and commands), `docs/account-data.md`, `compare-page.md`, `dependency-audit.md`, `gujarati-hardening.md`, `hindi-quality-label.md`, `hindi-summaries.md`,
`hindi-title-cleanup.md`, `hindi-title-fixes.md`, `honest-copy.md`, `privacy-and-terms.md`, `recommended-pagination.md`, `removed-pages.md`, `session-cookie.md`, `ui-strings.md`;
`backend/prisma/schema.prisma`, `render.yaml`, `vercel.json`, `.github/workflows/ci.yml`; `backend/src/translation/` (pipeline), `backend/src/ingestion/` (parsers and cleanups).

## Appendix C. Glossary

- **Scheme:** a government welfare programme (central or state).
- **Central / State:** who offers it; derived from the authority name.
- **Criteria:** parsed, structured eligibility conditions (`EligibilityCriteria`).
- **Hard / soft criterion:** hard can exclude; soft only ranks and adds a note.
- **Unverified:** wording a native speaker has not reviewed.
- **TPD / TPM / RPD:** Groq tokens per day / per minute / requests per day.
- **Metered run:** a translation run with a token budget so the daily quota is never overrun.
- **Additive proof:** a check, after a data change, that nothing outside the intended change moved.
- **Mutation check:** breaking the guarded behaviour on purpose to prove a test fails.
- **Module:** one unit of work with a Start and a Complete commit.
