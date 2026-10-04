# Hindi title cleanup (2026-10-04)

`npm run scan:translations -- hi --list` (read-only) checks every stored translation for stray-script letters, Latin
letters stuck inside native words ("पoultry") and forbidden renderings (अपाहिज). It scanned 5,482 stored Hindi rows
(4,722 titles, 707 summaries and a few other fields) and found 30 rows: 23 titles and 7 summaries.

| Problem | Rows |
|---|---|
| Stray script (Japanese, Korean, Bengali, Cyrillic, Arabic) | 11 (9 titles, 2 summaries) |
| Latin letters inside a Hindi word | 19 (14 titles, 5 summaries) |
| Forbidden term (अपाहिज) | 0 |

Each was re-translated with the production translator and current validators. A row was overwritten only if the new
text passed every validator and the scan. 27 rows changed; 3 kept their old text:

- Two titles ("Poultry Farming Scheme (HSFDC)", "Scheme For Financial Assistance For Veteran Artists"): both models
  again produced the same glued-letter glitch ("पoultry", "वeteran"), so the old row stays.
- "National Scholarship For Post Graduate Studies": the new text said "पदव्यवस्था" (nonsense) for post-graduate studies,
  which is worse than the old text's stray Cyrillic letters, so the old row was restored.

The old values are backed up outside the repository. Re-run the scan after any bulk translation.
