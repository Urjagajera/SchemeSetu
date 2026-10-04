# Session cookie

`backend/src/utils/sessionCookie.ts` is the one place that decides the session cookie's attributes: httpOnly always;
Secure and SameSite=None in production (the browser reaches the API through the Vercel address, and Vercel forwards `/api`
to Render); plain and Lax locally. Sign-in sets it, and both logout and delete-account clear it with exactly the same
attributes, so a browser never receives a "clear" that differs from the cookie it should remove. Before this, logout cleared
the cookie without the Secure and SameSite attributes; browsers still removed it, so this is a tidy-up, not a fix for a bug
that was seen. Tests check the attributes in development and production and that clearing mirrors setting.
