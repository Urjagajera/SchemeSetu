# Render: what you have to do

A short checklist for putting the SchemeSetu backend on Render (free plan). The full guide with screenshots-level
detail is [docs/deploy-backend.md](docs/deploy-backend.md). Nothing here costs money.

**Backend address: https://schemesetu-backend-ms7u.onrender.com** (live since 22 Nov 2026; `/health` ok, 5,195 schemes).

> ⚠️ Until step 4 (Vercel redeploy) is done: **do not sign in on https://schemesetu-chi.vercel.app and do not share
> the link.** The deployed site still sends `/api` to `schemesetu-api.onrender.com`, which is someone else's server.

## What is already done (nothing to do)

| | Status |
|---|---|
| Neon database | Filled: 5,163 schemes, the same as the CSV (checked 16 Nov) |
| `render.yaml` | Ready: service `schemesetu-backend`, free plan, Singapore, Node 22, health check `/health` |
| Database changes | Render runs `prisma migrate deploy` on every start. It adds the one missing table (`add_scheme_reports`, for "Report a problem") and never deletes data |
| `SESSION_SECRET` | Render creates it itself; you never type it |
| Weekly myScheme job | Scheduled every Sunday 02:00 IST on GitHub; writes to Neon directly |

## Your steps

### 1. Create the service (about 10 minutes)
- [ ] https://render.com → sign in **with GitHub**
- [ ] **New → Blueprint** → pick the `Urjagajera/SchemeSetu` repository
- [ ] Render shows one service, **schemesetu-backend**. Type these four values when it asks:

  | Name | What to paste | Where to find it |
  |---|---|---|
  | `DATABASE_URL` | Neon connection string, **direct (pooling off)**, ending in `?sslmode=require&connect_timeout=15` | Neon → project → Connect |
  | `CLIENT_URL` | `https://schemesetu-chi.vercel.app` (no `/` at the end) | — |
  | `GOOGLE_CLIENT_ID` | Same value as `VITE_GOOGLE_CLIENT_ID` in Vercel, ends in `.apps.googleusercontent.com` | Google Cloud → Credentials |
  | `GROQ_API_KEY` | Your Groq key | console.groq.com → API Keys |

- [ ] Press **Apply** and wait for the first build (about 5 minutes)

Paste these only into Render's dashboard: never into chat, GitHub or a file.

### 2. Check it on its own
- [ ] Copy the address Render shows (for example `https://schemesetu-backend.onrender.com`, maybe with extra letters)
- [ ] Open `<address>/health` → a short "ok" answer
- [ ] Open `<address>/api/schemes?limit=1` → JSON with `"total"` about **5,163**
- [ ] If it fails: Render → **Logs** → send Claude a screenshot

### 3. Send the address to Claude
- [x] `vercel.json` now sends `/api` to `https://schemesetu-backend-ms7u.onrender.com` (was `schemesetu-api`);
      committed and pushed after your yes
- [x] Render → Environment: `CLIENT_URL` = `https://schemesetu-chi.vercel.app` (checked 22 Nov: the backend accepts
      requests from the Vercel site)
- ⚠️ **Keep this service.** Each time the Blueprint/service is deleted and created again, Render gives a new address
  (`-obmi`, `-zeh2`, now `-ms7u`) and `vercel.json` has to change. To change settings, edit the existing service's
  **Environment** and redeploy instead.

### 4. Redeploy the frontend
- [ ] Vercel → your project → **Deployments** → **Redeploy** (so the new `vercel.json` is used)

### 5. Google sign-in
- [ ] Google Cloud Console → APIs & Services → Credentials → your OAuth client → **Authorised JavaScript origins**
      → add `https://schemesetu-chi.vercel.app` → Save (keep `http://localhost:5173` too)

### 6. Check the live site
- [ ] Home shows the scheme count; Search `tractor` finds the Gujarat tractor schemes
- [ ] A scheme page opens; हिंदी and ગુજરાતી translate it
- [ ] Google sign-in works and stays after a reload
- [ ] Eligibility, Saved, Compare and the dashboard work
- [ ] SetuAI answers a question
- [ ] "Report a problem with this scheme" sends

## Good to know (free plan)
- It **sleeps after 15 minutes** without visitors; the first visit after that takes about 50 seconds. Open the site
  a couple of minutes before a demo.
- **Auto-deploy is off.** After backend changes are pushed: Render → **Manual Deploy → Deploy latest commit**.
- New schemes from the weekly job appear on the live site without redeploying anything.
