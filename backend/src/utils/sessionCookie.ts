import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { SESSION_COOKIE_NAME } from '../middleware/requireAuth.js';

export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * The attributes of the session cookie. Deployed, the browser talks to the Vercel address and Vercel forwards /api to
 * the API, so the cookie must be Secure and SameSite=None; locally it is plain and Lax. Setting and clearing use
 * exactly these attributes, so a browser never sees a "clear" that differs from the cookie it is meant to remove.
 */
export function sessionCookieOptions() {
  const production = config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: (production ? 'none' : 'lax') as 'none' | 'lax',
  };
}

export function setSessionCookie(res: Response, userId: string): void {
  const token = jwt.sign({ userId }, config.SESSION_SECRET, { expiresIn: '7d' });
  res.cookie(SESSION_COOKIE_NAME, token, { ...sessionCookieOptions(), maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
}
