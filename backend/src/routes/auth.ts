import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import config from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, SESSION_COOKIE_NAME } from '../middleware/requireAuth.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = Router();

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function setSessionCookie(res: Response, userId: string): void {
  const token = jwt.sign({ userId }, config.SESSION_SECRET, { expiresIn: '7d' });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

function serializeUser(user: { id: string; name: string | null; email: string; profilePictureUrl: string | null }) {
  return {
    id: user.id,
    name: user.name ?? 'Citizen',
    email: user.email,
    picture: user.profilePictureUrl ?? '',
  };
}

/**
 * POST /api/auth/google
 * Body: { idToken }. Verifies the Google ID token server-side against Google's
 * public keys (network call to www.googleapis.com/oauth2/v3/certs — this is the
 * part the old atob()-based client decode in AuthContext.tsx never actually did:
 * it trusted the JWT payload without checking the signature at all, so anyone
 * could hand-craft a fake token and "log in" as any user).
 */
router.post(
  '/google',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      res.status(400).json({ success: false, error: { message: 'idToken is required', status: 400 } });
      return;
    }
    if (!config.GOOGLE_CLIENT_ID) {
      res
        .status(500)
        .json({ success: false, error: { message: 'Server misconfigured: GOOGLE_CLIENT_ID not set', status: 500 } });
      return;
    }

    const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      res.status(401).json({ success: false, error: { message: 'Invalid Google ID token', status: 401 } });
      return;
    }

    if (!payload?.sub || !payload.email) {
      res.status(401).json({ success: false, error: { message: 'Invalid Google ID token payload', status: 401 } });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    const isNewUser = !existing;

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        name: payload.name ?? existing?.name,
        profilePictureUrl: payload.picture ?? existing?.profilePictureUrl,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? 'Citizen',
        profilePictureUrl: payload.picture ?? null,
      },
    });

    setSessionCookie(res, user.id);
    res.json({ success: true, user: serializeUser(user), isNewUser });
  }),
);

/** POST /api/auth/logout — idempotent; clears the session cookie regardless of whether one was present. */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Not in the original task list, but a real cookie-based session needs a way for
 * the frontend to validate/rehydrate auth state on page load (the httpOnly cookie
 * itself is unreadable from JS by design) — see the final report for why this was
 * added.
 *
 * Deliberately NOT behind authLimiter (unlike POST /google): this fires on every
 * page load/refresh via AuthContext's mount effect, not just login attempts.
 * Reproduced live during verification — sharing the 20-req/15min login-attempt
 * bucket meant a handful of page reloads could 429 a legitimately logged-in user,
 * and AuthContext's catch-all treats any error (429 included) as "logged out",
 * silently bouncing them to /login. This route isn't a credential-verification
 * surface (requireAuth already rejects anything without a valid signed cookie),
 * so it doesn't need the same brute-force protection as an actual login attempt.
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: { message: 'Session user no longer exists', status: 401 } });
      return;
    }
    res.json({ user: serializeUser(user) });
  }),
);

export default router;
