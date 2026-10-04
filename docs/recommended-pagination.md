# Recommended pagination

`POST /api/schemes/recommended` takes `{ profile, page?, limit? }` (page default 1; limit default 20, at most 50; anything
that is not a whole number of 1 or more is a 400) and answers with `data`, `page`, `limit`, `total` (everything that matched)
and `hasMore`. The ranking is the same as before (best score first); equal scores are ordered by scheme id, so the same
profile always gets the same order and the next page never repeats a scheme. A blank profile still matches everything, with
score 0.

The eligibility results (signed in and guest) show 20 at a time with a "Show more" button. It asks for the next page about
the same profile, adds only schemes not already shown, and builds reports only for the new ones. A failed page keeps what
is shown and can be retried. The dashboard still reads just the first page.

Backend tests check no repeats across pages, pages joined equal one big read, a stable order whatever order the database
returns, the boundary where a page ends exactly on the total, the limit cap and validation. Frontend tests cover the button,
dedupe, retry, disabled-while-loading and the Hindi label. The Hindi and Gujarati button wording is unverified.

**The live check (Show more, no repeats, the header count, the Hindi button, the guest wizard, `/home` showing the 404 page)
was done by the owner in Chrome, not by the assistant.**
