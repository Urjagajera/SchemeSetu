# Dependency audit

Started 2026-10-04 with `npm audit` in the frontend (12 findings: 5 moderate, 6 high, 1 critical) and the backend
(8 findings: 6 moderate, 1 high, 1 critical). Each finding is classified below as:

- **Fix now**: `npm audit fix` applies it inside the version range we already declare (no major bump).
- **Major bump**: only fixed by a new major version. Not applied; see the table.
- **Cannot fix yet**: no fixed version available.

"Runtime" means the package ships in what users run (`npm audit --omit=dev` reports it); "dev-only" means it is
only used to build, test or run the dev server.

Baseline findings are recorded here first; the outcome is added when the module completes.
