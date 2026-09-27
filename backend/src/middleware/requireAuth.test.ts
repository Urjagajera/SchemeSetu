import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const TEST_SESSION_SECRET = 'test-session-secret-do-not-use-in-prod';

vi.mock('../config/env.js', () => ({
  default: {
    NODE_ENV: 'development',
    SESSION_SECRET: TEST_SESSION_SECRET,
  },
}));

const { requireAuth, SESSION_COOKIE_NAME } = await import('./requireAuth.js');

function makeReq(cookieValue?: string): Request {
  return { cookies: cookieValue !== undefined ? { [SESSION_COOKIE_NAME]: cookieValue } : {} } as unknown as Request;
}

function makeRes() {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res as unknown as Response & { statusCode?: number; body?: unknown };
}

describe('requireAuth', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('responds 401 when the session cookie is missing entirely', () => {
    const req = makeReq(undefined);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: { message: 'Authentication required', status: 401 } });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when the cookie value is not a valid JWT', () => {
    const req = makeReq('not-a-real-token');
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: { message: 'Invalid or expired session', status: 401 } });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when the JWT is signed with the wrong secret', () => {
    const token = jwt.sign({ userId: 'user-1' }, 'wrong-secret', { expiresIn: '7d' });
    const req = makeReq(token);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when the JWT has already expired', () => {
    const token = jwt.sign({ userId: 'user-1' }, TEST_SESSION_SECRET, { expiresIn: -10 });
    const req = makeReq(token);
    const res = makeRes();

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next() for a valid, correctly-signed token', () => {
    const token = jwt.sign({ userId: 'user-42' }, TEST_SESSION_SECRET, { expiresIn: '7d' });
    const req = makeReq(token);
    const res = makeRes();

    requireAuth(req, res, next);

    // toMatchObject, not toEqual: a real signed JWT payload also carries iat/exp.
    expect(req.user).toMatchObject({ userId: 'user-42' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined();
  });
});
