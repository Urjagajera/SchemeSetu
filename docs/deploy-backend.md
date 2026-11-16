# Deploying the SchemeSetu backend (Render, free plan)

The frontend is already live at **https://schemesetu-chi.vercel.app**, but its `/api` requests go to an address
that is **not ours** (`schemesetu-api.onrender.com` belongs to someone else's project). Until the steps below are done:
**do not sign in on the live site and do not share the link**: sign-in would send the Google token to that server.

Everything here uses free plans: Render (backend), Neon (database, already filled), Vercel (frontend), Groq (AI).

```
Browser ──> Vercel (schemesetu-chi.vercel.app) ──/api──> Render (our backend) ──> Neon (database)
                                                              └──> Groq (SetuAI, translation)
```

## What you need first

| Thing | Where to find it |
|---|---|
| Neon connection string (**direct**, not pooled) | Neon → your project → **Connect** → turn **Connection pooling off** → copy. It starts with `postgresql://` and should end with `?sslmode=require` (add `&connect_timeout=15` at the end). This is the same value as the GitHub `DATABASE_URL` secret you just updated. |
| Google client ID | The same value as `VITE_GOOGLE_CLIENT_ID` in your Vercel project's settings (Google Cloud → APIs & Services → Credentials). It ends with `.apps.googleusercontent.com`. |
| Groq API key | https://console.groq.com → API Keys (the one in your local `backend/.env`). |

Keep these private: paste them only into Render's dashboard, never into chat, GitHub or files.

## Step 1 — Create the backend on Render

1. Go to **https://render.com** and sign up / sign in **with GitHub** (free; no card needed for the free plan).
2. Dashboard → **New** → **Blueprint**.
3. Connect the **Urjagajera/SchemeSetu** repository. Render reads `render.yaml` and shows one service,
   **schemesetu-backend** (free plan, Singapore).
4. It asks for the values marked secret. Fill in:
   - `DATABASE_URL` → the Neon connection string
   - `CLIENT_URL` → `https://schemesetu-chi.vercel.app` (exactly this, no `/` at the end)
   - `GOOGLE_CLIENT_ID` → the Google client ID
   - `GROQ_API_KEY` → the Groq key
   (`SESSION_SECRET` is created by Render itself; you do not type it.)
5. Press **Apply**. The first build takes about 5 minutes. On start it runs `prisma migrate deploy`, which adds
   anything new to Neon (for example the table for "Report a problem with this scheme"); it never deletes data.

## Step 2 — Check the backend works on its own

On the service's page, Render shows its address, for example `https://schemesetu-backend.onrender.com` (if the name
is taken, Render adds a few letters: use **exactly** the address it shows).

Open these two in a browser:

- `https://<your address>/health` → a short JSON answer that says it is OK.
- `https://<your address>/api/schemes?limit=1` → JSON that starts with `{"data":[` and has a `"total"` of about
  **4,900** schemes.

If a page says the service is starting, wait a minute (the free plan sleeps when unused) and reload.
If the build or start fails, open **Logs** on Render and send a screenshot (it never shows your secrets).

## Step 3 — Point the frontend at it

Send the Render address to Claude: `vercel.json` gets the new address and is tested, then you:

1. commit and push the change;
2. deploy the frontend again on Vercel **the same way you deployed it before** (Vercel → your project →
   **Deployments** → **Redeploy**, or `vercel --prod`), so the new `vercel.json` is used.

## Step 4 — Google sign-in on the live site

Google Cloud Console → APIs & Services → **Credentials** → your OAuth client → **Authorised JavaScript origins** →
**Add URI** → `https://schemesetu-chi.vercel.app` → **Save** (it can take a few minutes to apply). Keep
`http://localhost:5173` there too for local work.

## Step 5 — Check everything on the live site

- [ ] Home shows the real scheme count; Search for `tractor` finds the Gujarat tractor schemes.
- [ ] A scheme page opens; switching to हिंदी and ગુજરાતી translates it.
- [ ] Sign in with Google works, and you stay signed in after a reload.
- [ ] Eligibility, Saved schemes, Compare and the dashboard work.
- [ ] SetuAI answers a question.
- [ ] "Report a problem with this scheme" sends.

## Good to know (free plan)

- **It sleeps after 15 minutes without visitors.** The next visit wakes it in about 50 seconds; pages say they could
  not load until then. Before a demo, open the site a couple of minutes early.
- One free web service fits in Render's free monthly hours (750 hours; a month has at most 744).
- `autoDeploy` is off: after you push backend changes, deploy them on Render with **Manual Deploy → Deploy latest commit**.
- The weekly myScheme job (GitHub Actions) writes to Neon directly, so new schemes appear on the live site without
  redeploying anything.
