# Privacy Policy and Terms of Service

Public pages at `/privacy` and `/terms`, linked from the footer and the sign-in page. The text is in the locale files
(`pv*`, `tm*`, `lg*` keys) in English, Hindi and Gujarati.

- Written only from what the code does: what is collected at sign-in, the profile fields, bookmarks, the session cookie,
  the browser storage, the server logs, and what goes to Google and Groq (public scheme text only, never user data).
- No company name, address or contact details are given, because there are none yet.
- `src/pages/Legal.test.tsx` ties the text to the code: the cookie lifetime, the fields the database holds, what the
  translation code can reach, and the existence of the deletion and export routes. If the code changes, the test fails
  until the page is updated.

**The English wording was read and approved by the owner. That review was done by the owner, not by the assistant.**
This is not legal advice. The Hindi and Gujarati versions are unverified by a native speaker.
