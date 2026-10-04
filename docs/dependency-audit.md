# Dependency audit

Started 2026-10-04 with `npm audit` in the frontend (12 findings: 5 moderate, 6 high, 1 critical) and the backend
(8 findings: 6 moderate, 1 high, 1 critical). Each finding is classified below as:

- **Fix now**: `npm audit fix` applies it inside the version range we already declare (no major bump).
- **Major bump**: only fixed by a new major version. Not applied; see the table.
- **Cannot fix yet**: no fixed version available.

"Runtime" means the package ships in what users run (`npm audit --omit=dev` reports it); "dev-only" means it is
only used to build, test or run the dev server.

Baseline findings are recorded here first; the outcome is added when the module completes.

## Outcome (2026-10-04)

`npm audit fix` (no `--force`, no change to any version range in `package.json`) cleared every runtime finding.
Frontend 12 -> 5 findings, backend 8 -> 5. Everything left is **dev-only** and needs a major bump.
After each batch: typecheck, full test suite and production build were run. Frontend 141 tests, backend 516 tests, all green.

### Fixed (non-breaking, in range)

| Package | Where | Runtime? | Severity | From -> to |
|---|---|---|---|---|
| axios | frontend | runtime | high | 1.18.1 -> 1.20.0 |
| react-router, react-router-dom | frontend | runtime | high | 7.18.1 -> 7.18.4 |
| express | backend | runtime | moderate | 4.22.2 -> 4.22.3 |
| body-parser, qs | backend | runtime | moderate | 1.20.6 -> 1.20.8 (body-parser), 6.15.3 -> 6.16.0 (qs) |
| browserslist, baseline-browser-mapping, nanoid, postcss | frontend | build-time (dev-only) | high/moderate | patch/minor updates inside range |

axios and react-router-dom were expected to need a major bump; they did not, because the fixed releases sit inside
the `^1` and `^7` ranges we already declare.

### Left: needs a major bump (not applied)

| Package | Current | Target | Runtime? | What could break | What our tests cover | Recommendation |
|---|---|---|---|---|---|---|
| vitest (+ @vitest/mocker, vite-node) | 2.1.9 (both) | 5.0.3 | dev-only | Config schema, mock/spy behaviour, coverage and jsdom environment defaults across three majors; needs a compatible Vite | The 657 tests themselves are the check: any change shows up as a failing or differently-behaving test | Do as its own module, together with the Vite bump on the frontend. Severity is critical on paper, but the issues need the Vitest UI server (`--ui`, which we never run) or a hostile page open while tests run |
| vite (+ esbuild) | 5.4.x (frontend) | 8.3.2 | dev-only | Build output and chunking, plugin API (`@vitejs/plugin-react`), Node version floor, Tailwind/PostCSS integration, `vite.config.ts` and proxy settings | `npm run build` and the 141 frontend tests; nothing exercises the dev-server proxy or the visual result | Do after reading the Vite 6, 7 and 8 migration notes, then check the built site by hand. Issues only affect the local dev server and the `.map` handling of the dev server; the deployed site is static files |
| esbuild | pulled in by Vite and Vitest | follows them | dev-only | Nothing directly | Same as above | Clears itself with the Vite/Vitest bump |

Nothing is in the "cannot fix yet" group: every remaining finding has a fixed version published.
