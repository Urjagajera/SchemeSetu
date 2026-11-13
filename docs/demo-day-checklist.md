# Demo-day checklist (MakerFest)

SchemeSetu is not online yet, so the demo runs on this laptop: PostgreSQL + backend (port 3001) + frontend (port 5173).
Practice-run on 2026-11-13: search, scheme pages and SetuAI all worked from a production build.

## The day before

1. **Free space on C:.** Keep at least 5 GB free (on 2026-11-13 it was down to 0.15 GB, which can freeze Windows).
   Safe places to free space: the npm cache (`npm cache clean --force`, about 1.8 GB, npm downloads again when needed),
   Chrome's cached images and files (Chrome settings → Delete browsing data → Cached images and files), old files in Downloads.
2. **Close other projects**, especially anything on port 5173 (CourtCall's frontend uses it too). Google sign-in only
   works on `http://localhost:5173`, so SchemeSetu must get that port.
3. **Sign in with Google once** on the demo browser at `http://localhost:5173`. The sign-in lasts 7 days, so it keeps
   working at the event even if the internet there is poor.
4. **Warm up Hindi:** open the 3–4 scheme pages you will show and switch them to Hindi once. Translations are saved,
   so they open instantly at the event without using Groq.
5. Charge the laptop and carry the charger.

## At the event: start everything (in this order)

1. PostgreSQL starts by itself with Windows (service `postgresql-x64-18`, Automatic). Nothing to do.
2. Backend, in a terminal at `D:\ANTI\SchemeSetu`:

   ```bash
   npm run backend
   ```

   Wait for `Express backend listening on http://localhost:3001`.
3. Frontend, in a second terminal at `D:\ANTI\SchemeSetu`:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`. If Vite says 5173 is in use, something else is on it: close that and start again.
4. Quick check before visitors come: search "tractor" (should find about 15 schemes), open one, ask SetuAI
   "I want to buy a tractor. I am a farmer in Gujarat."

## Good questions to show SetuAI

- "I want to buy a tractor. I am a farmer in Gujarat."
- "मैं गुजरात का किसान हूँ, ट्रैक्टर खरीदने के लिए कौन सी योजना है?" (Hindi)
- "What is PM Kisan Samman Nidhi?"
- "I am a farmer in Gujarat with a small income. Which schemes can help me?"

## If something goes wrong

| What you see | Why | What to do |
|---|---|---|
| SetuAI says "SetuAI can't write an answer right now" and lists schemes | No internet, or Groq's free limit (about 8,000 words a minute, 200,000 a day per model) | Wait a minute and ask again; the list it shows is still correct. Avoid many questions in a row. |
| Hindi page shows "some sections could not be translated" | Same Groq limit, or no internet | Use the pages you warmed up the day before. |
| Pages say they could not load | Backend stopped | Look at the backend terminal; run `npm run backend` again. |
| Google sign-in fails | No internet, or the app is not on port 5173 | Sign in the day before (lasts 7 days); make sure the address is `localhost:5173`. |
| Laptop very slow | C: almost full or many programs open | Close other projects and browsers; free space on C:. |

What works without internet: search, scheme pages, eligibility, saved schemes, compare, profile, dark mode and English
read aloud. What needs internet: SetuAI's written answers, new Hindi translations, Google sign-in.
