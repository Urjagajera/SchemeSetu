# Compare page

## Translated titles, ministry and category (Hindi / Gujarati)

Titles come from what the cards already fetched (`useStoredTitles`, which never asks the server and so can never start
a translation); ministry and category come from the stored vocabulary. English shows until they are there.

**The live check was done by the owner in Chrome (pass), not by the assistant.**

## Details (benefits, eligibility, documents)

The list API carries no eligibility, documents or full benefits, so Compare fetches each compared scheme's detail (three at
most) the way the scheme page does. It shows "Loading…" until the detail arrives, then every benefit and the first three
eligibility and document items with "+N more". In Hindi each section shows its translation when ready and English
otherwise, asking again every 3 seconds while the server says pending and giving up after about a minute. It starts no
more translation than opening each scheme page does. If a detail cannot be loaded, the list data is shown.

**The live check was done by the owner in Chrome (pass), not by the assistant.**
