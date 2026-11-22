# Render and Vercel: how SchemeSetu is deployed

SchemeSetu is **live** (since 23 Nov 2026), on free plans only. The longer first-time guide is
[docs/deploy-backend.md](docs/deploy-backend.md).

| Part | Where | Address |
|---|---|---|
| Website | Vercel | https://schemesetu-chi.vercel.app |
| Backend (API) | Render, service `schemesetu-backend` (from `render.yaml`) | https://schemesetu-backend-ms7u.onrender.com |
| Database | Neon (free, Singapore) | — |
| Weekly new schemes | GitHub Actions, Sunday 02:00 IST | writes to Neon directly |

```
Browser ──> Vercel (schemesetu-chi.vercel.app) ──/api──> Render (schemesetu-backend-ms7u) ──> Neon
                                                               └──> Groq (SetuAI, translation)
```

Checked live on 22–23 Nov: 5,195 schemes, search (`tractor` → 17 schemes), Hindi scheme page, Google sign-in.

## Settings (names only; values live in the dashboards, never in chat, GitHub or files)

**Render → schemesetu-backend → Environment**

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string, **direct (pooling off)**, ending `?sslmode=require&connect_timeout=15`. **Not** the local `localhost:5432` one |
| `CLIENT_URL` | `https://schemesetu-chi.vercel.app` (no `/` at the end) |
| `GOOGLE_CLIENT_ID` | the OAuth client ID (ends `.apps.googleusercontent.com`) |
| `GROQ_API_KEY` | the Groq key |
| `SESSION_SECRET`, `NODE_ENV`, `NODE_VERSION`, `TRUST_PROXY_HOPS` | set by `render.yaml`; nothing to type |

**Vercel → project → Settings → Environment Variables**: only **one** is needed.

| Name | Value | Environments |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | the same client ID as `GOOGLE_CLIENT_ID` on Render | Production (+ Preview, Development) |

Backend settings (`DATABASE_URL`, `SESSION_SECRET`, `GROQ_API_KEY`, ...) do **not** belong in Vercel.

**Google Cloud → Credentials → OAuth client → Authorised JavaScript origins**: `https://schemesetu-chi.vercel.app`
and `http://localhost:5173`. No redirect URI is needed.

## Updating the live site

**Backend changes** (anything in `backend/`): push, then Render → **Manual Deploy → Deploy latest commit**.
Database changes are applied by `prisma migrate deploy` when the service starts; it never deletes data.

**Website changes** (anything else, including `vercel.json`): push, then Vercel → **Deployments** → **⋯** (top
right) → **Create Deployment** → `master` → check the new row shows the new commit and the blue **Production** badge.

## Traps we hit (22 Nov 2026)

1. **Vercel "Redeploy" rebuilds the same old commit.** Deploying on push is off (`vercel.json`), so a row's
   Redeploy never picks up new commits. Use **Create Deployment** with `master` (or Redeploy only a row that is
   already the newest commit).
2. **Website settings must start with `VITE_`** and are built in at build time. `GOOGLE_CLIENT_ID` without
   `VITE_` gave a Google button with client ID `undefined`. After changing a Vercel variable, rebuild.
3. **Don't delete and recreate the Render service.** Each new one gets a new address (`-obmi`, `-zeh2`, then
   `-ms7u`) and `vercel.json` must change with it. Edit the existing service's Environment instead.
4. **`DATABASE_URL` was the local address** (`localhost:5432`) at first: the service exited with
   `P1001: Can't reach database server`.
5. **After a website update, a browser may still show the old version** (SchemeSetu is an installable app and keeps
   an offline copy). Test in a private window or press Ctrl+Shift+R.

## Still to check on the live site
- [ ] Eligibility, Saved, Compare and the dashboard work when signed in
- [ ] SetuAI answers a question
- [ ] "Report a problem with this scheme" sends
- [ ] Gujarati (ગુજરાતી) scheme page translates

## Good to know (free plan)
- The backend **sleeps after 15 minutes** without visitors; the first visit after that takes about 50 seconds.
  Open the site a couple of minutes before a demo.
- New schemes from the weekly job appear on the live site without redeploying anything.
