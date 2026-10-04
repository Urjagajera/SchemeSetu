# Hindi quality label

What a reader sees when text is machine translated:

- **Cards (Hindi or Gujarati mode):** a small "मशीन अनुवाद" line appears once a translated title or summary has arrived.
  It is absent in English and while the card is still showing English. Its hover text carries the longer note.
- **Scheme page:** a note under the breadcrumb says the text is machine translated and may contain mistakes, and points
  to the language switch on each section. It shows when the translation is ready or partial.
- **Per-section switch:** Benefits, Eligibility, How to Apply and Documents each get an "English | हिन्दी" switch. It shows
  that section's English original from data the page already has (no extra request). It is per section, is not
  remembered, and resets when another scheme is opened. It appears only on a section that was actually translated.

Wording is in `locales/en.json`, `hi.json` and `gu.json` (`machineTranslatedNote`, `machineTranslatedBadge`,
`sectionLanguageToggle`). **The Hindi and Gujarati wording is unverified by a native speaker.**

Verification: frontend tests (mutation-checked) for the note, the badge, the switch, and the locale files. The live
check (badge, note, switch on a scheme with all four sections, reset on opening another scheme) was done by the owner in
Chrome, not by the assistant; the browser pane the assistant controls could not hold a Google sign-in.
