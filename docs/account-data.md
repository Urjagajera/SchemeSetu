# Account deletion and data export

- `GET /api/account/export`: the signed-in user's own account fields, profile and bookmarks, as JSON.
- `DELETE /api/account`: removes the user's bookmarks, profile and account in one transaction and clears the session cookie.
  A failure partway removes nothing.
- Both require sign-in; the user id always comes from the session, never from the request.
- Settings has "Download my data" and "Delete my account". Deleting asks for the word DELETE to be typed, then clears
  what the browser kept and signs out.
- The Privacy Policy says exactly this, and `Legal.test.tsx` fails if the page and the routes drift apart.

Verified by backend tests on an in-memory database with two users (nothing of the other user is touched or returned,
401 without a session, rows really removed, all-or-nothing) and by frontend tests of the buttons and the service.
**The live check, on a throwaway Google account, was done by the owner in Chrome (pass), not by the assistant.**
Hindi and Gujarati wording is unverified.
