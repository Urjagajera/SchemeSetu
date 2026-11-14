# SchemeSetu as an Android app (APK)

SchemeSetu is already an **installable web app** (a PWA). An Android APK is built *from the live website*: the APK is
a thin shell (a "Trusted Web Activity") that opens the site full screen in Chrome's engine, with SchemeSetu's own icon
and no address bar. So the website has to be **deployed first**; an APK cannot be made from `localhost`.

Everything here is free: PWABuilder (by Microsoft) builds the APK at no cost, and installing an APK on your own phone
costs nothing. Publishing on the Google Play Store is optional and is **not free** (Google charges a one-time developer
registration fee), so this guide installs the APK directly.

## What is already done in the code (checked 2026-11-14)

| Needed for an APK | Status |
|---|---|
| Web app manifest (name, short name, start page, full-screen `standalone`, theme colours, `id`, categories) | Done (`vite.config.ts`, made at build time as `manifest.webmanifest`) |
| Icons 192×192 and 512×512, plus a 512×512 **maskable** icon (Android's round/square shapes) | Done (`public/icons/`) |
| Service worker with offline basics (app screens, fonts, recently opened scheme pages) | Done (vite-plugin-pwa) |
| `/.well-known/` never answered with the app page (needed for the APK check below) | Done |
| `assetlinks.json` (proves the APK belongs to your site) | **You add it** in step 3: it contains your own signing key's fingerprint, which only exists after step 2 |
| The site live on **HTTPS** | **Not yet**: deployment (Vercel + Render + Neon) comes first |

## Step 0 — Before you start

1. The site is deployed and works in a phone's browser at its `https://` address, for example
   `https://schemesetu.vercel.app` (the Vercel address is fine; no own domain needed).
2. Google sign-in works there: in Google Cloud Console → APIs & Services → Credentials → your OAuth client, the
   deployed address is in **Authorised JavaScript origins**.
3. On an Android phone, open the site in **Chrome**: the menu should offer **Install app** (or "Add to Home screen").
   If it does, the APK will work too.

## Step 1 — Check the site is ready

1. Go to **https://www.pwabuilder.com**.
2. Paste your site's address (e.g. `https://schemesetu.vercel.app`) and press **Start**.
3. It shows a report card for the manifest, service worker and security. Everything needed is already in place.
   It may suggest optional extras (screenshots, shortcuts); you can ignore those for an APK.

## Step 2 — Build the APK

1. In PWABuilder press **Package For Stores** → **Android** → **Generate Package** (or **Options** first).
2. In **Options**, check or set:
   - **Package ID**: `com.schemesetu.app` (choose once and never change it: it is the app's identity).
   - **App name**: `SchemeSetu`; **Launcher name**: `SchemeSetu`.
   - **App version**: `1.0.0`, **version code**: `1` (raise both for every new APK later).
   - **Display mode**: `Standalone`.
   - **Signing key**: **Create new**, and fill in your name and organisation (anything sensible).
3. Press **Download**. You get a `.zip` with:
   - `SchemeSetu.apk` — **this is the file for your phone**;
   - `SchemeSetu.aab` — only for the Play Store (not needed here);
   - `signing.keystore` and `signing-key-info.txt` — **your app's key and its passwords**;
   - `assetlinks.json` — needed in step 3.

> **Keep `signing.keystore` and `signing-key-info.txt` safe and private** (for example on D: and a USB stick or your
> own cloud drive, never in GitHub). Every future version of the app must be signed with the same key, or phones
> refuse to update it.

## Step 3 — Link the APK to the website (removes the address bar)

1. Copy the downloaded `assetlinks.json` into the project as `public/.well-known/assetlinks.json`.
2. Commit, push and deploy the frontend again (Vercel serves files in `public/` as they are).
3. Open `https://<your site>/.well-known/assetlinks.json` in a browser: it must show the JSON (not the SchemeSetu page).

Without this file the app still works, but shows a small address bar at the top, like a browser.

## Step 4 — Install it on your phone

1. Copy `SchemeSetu.apk` to the phone (USB cable, Google Drive, or send it to yourself on WhatsApp/Telegram as a
   document).
2. On the phone, tap the file. Android asks to allow installing from that app (Files, Drive, WhatsApp...):
   **Settings → Allow from this source**, then **Install**. (Play Protect may say it does not know the developer;
   choose **Install anyway**. This is normal for an app that is not on the Play Store.)
3. Open **SchemeSetu** from the home screen.

## Step 5 — Check it works properly

- [ ] It opens full screen with **no address bar** (if there is one, step 3 is not right yet).
- [ ] Sign in with Google works and you stay signed in after closing and reopening the app.
- [ ] Search, a scheme page, Eligibility, Saved schemes and Compare work.
- [ ] Switching to **हिंदी** and **ગુજરાતી** translates a scheme page.
- [ ] SetuAI answers a question.
- [ ] The microphone button asks for permission and voice search works.
- [ ] Read aloud speaks (on phones Hindi/Gujarati voices may need installing: Settings → Text-to-speech).
- [ ] Share opens WhatsApp and the other apps.
- [ ] With mobile data off, the app still opens and scheme pages you opened before still show.

## Updating the app later

- **Most changes need no new APK.** The APK shows the live website, so anything you deploy (new features, fixes,
  new schemes) appears in the app automatically the next time it opens.
- A **new APK** is needed only to change the app's name, icon, Package ID settings or colours. Then repeat step 2
  with the **same signing key** (PWABuilder → Signing key → **Use mine**, upload `signing.keystore` and its passwords
  from `signing-key-info.txt`), raise the version number, and install the new APK over the old one.

## If something goes wrong

| Problem | Fix |
|---|---|
| PWABuilder cannot find a manifest or service worker | The address must be the deployed `https://` site, opened once so it is fully loaded; try again. |
| The app shows an address bar at the top | `assetlinks.json` is missing, not at `/.well-known/assetlinks.json`, or from a different key. Redo step 3 with the file from the same download as the APK. |
| "App not installed" when installing an update | It was signed with a different key. Use the original `signing.keystore`, or uninstall the old app first. |
| Google sign-in says `origin_mismatch` | Add the deployed address to the OAuth client's Authorised JavaScript origins (step 0). |
| Pages say they could not load | The backend (Render) is asleep or down: open the site once and wait a minute; the free Render plan sleeps when unused. |
