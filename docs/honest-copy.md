# Honest copy

Everything the interface says about SchemeSetu must be true. This module found 19 claims that were false, invented or
pointed at nothing, and fixed them. `src/test/honestCopy.test.ts` fails if any of them comes back.

| # | Was | Now |
|---|---|---|
| 1 | Profile: "credentials encrypted and stored in Supabase secure storage" | Removed (we do not use Supabase and store no credentials) |
| 2 | "Verified Citizen Account" badge | "Signed in with Google" |
| 3 | Footer contact column: invented email, toll-free number, New Delhi address | Column removed; no contact details are shown until there are real ones |
| 4 | Footer: "independent portal for mock discovery" | "SchemeSetu is an independent information service, not a government website. Always confirm details on the official portal." |
| 5 | "© 2026 SchemeSetu — Government of India" | "© 2026 SchemeSetu" |
| 6 | "protected under Government of India security standards" | "We use Google sign-in and never store your password." |
| 7 | Stats: 4500+ schemes, 28 states, 9.8 Cr+ beneficiaries, ₹2.4L Cr disbursed | Scheme total and the number of states and union territories, read from the data; the other two are gone |
| 8 | "500+ … Updated Daily" | No count, no daily claim |
| 9 | "Join 98,000+ citizens" | "Sign in with Google to save your profile and bookmarks" |
| 10 | FAQ: data updated daily, 24-48 hours, instant alerts | Refreshed from the official sources from time to time; confirm on the official portal |
| 11 | FAQ: profile "not stored permanently on our servers" | The profile is saved in your account; the password is never stored |
| 12 | Dashboard "Recent Updates" with invented news | Panel removed |
| 13 | Newsletter handler that said "subscribed" and discarded the email (not rendered) | Code and keys removed |
| 14 | Footer and sign-in links to Privacy Policy and Terms (404 or `#`) | Links, and the "by signing up you agree" line, removed |
| 15, 16 | SetuAI "intelligent", "based on official public databases" | "Quick answers about common schemes. Not a live assistant." (it is five canned replies) |
| 17 | Wizard: "get auto-updates" | "Create a free account with Google to save your answers." |
| 18 | Landing page: SetuAI "cross-references your profile against thousands of active schemes"; "Secure · Private" | Plain description of what it does; "Free to use · Google sign-in · No password stored" |
| 19 | Sign-in checklist: "Download eligibility reports" (no such feature) | "Bookmark schemes and save your profile" |

Hindi and Gujarati wording for all changed lines is unverified by a native speaker.

## Before launch (not done)

- A real privacy policy and terms of service page. We collect Google profile data (name, email), so this is required.
- Real contact details (email at minimum), then a Contact section in the footer.
- Native-speaker review of the Gujarati wording (Gujarati is off), and of the Hindi interface wording.
- The accounts and projects for hosting (Neon, Render, Vercel), created by the owner.
- Decide whether SetuAI stays as canned answers or becomes a real assistant (free tier only).
