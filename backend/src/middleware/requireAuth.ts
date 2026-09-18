import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

/** Name of the httpOnly session cookie set by POST /api/auth/google. */
export const SESSION_COOKIE_NAME = 'schemesetu_session';

export interface SessionPayload {
  userId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

/**
 * Verifies the signed session cookie and attaches `req.user`.
 * Responds 401 if the cookie is missing, expired, or fails signature checks.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ error: { message: 'Authentication required', status: 401 } });
    return;
  }

  try {
    const payload = jwt.verify(token, config.SESSION_SECRET) as SessionPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid or expired session', status: 401 } });
  }
}
