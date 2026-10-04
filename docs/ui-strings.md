# Interface strings and the locale files

Every piece of interface text lives in `locales/en.json`, `hi.json` and `gu.json`. `src/test/locales.test.ts` fails if
Hindi or Gujarati lacks a key English has, if any value is empty, if the code asks for a `t('key')` that English lacks, or
if a profile, wizard or shared-part key was left in English.

**All Hindi and Gujarati wording in the keys below is unverified by a native speaker.**

## Profile page and eligibility wizard (keys `pf*`, `wz*`, `opt*`)

- Profile form: tab names, headings, field labels, dropdown options, buttons, the success and failure messages, the names
  used in the error list, and the seven validation messages (same meaning as before; zod now returns locale keys that are
  translated where shown). A message that comes from the server is shown as received, in English.
- Guest eligibility wizard: all three steps, the buttons, the sign-up prompt and the results text.
- Verified by tests that read the real English dictionary (so the English wording is unchanged), Hindi and Gujarati
  tests for the form and the wizard, and mutation checks. The live check was done by the owner in Chrome, not by the
  assistant.
- Not translated on purpose: the suggestion chips on the profile page ("Student", "Farmer"…) are scheme tags used for
  matching, and the SC / ST / OBC acronyms.
