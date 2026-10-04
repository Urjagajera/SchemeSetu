import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';

const testConfig = vi.hoisted(() => ({ NODE_ENV: 'development' as string, SESSION_SECRET: 'unit-test-secret' }));
vi.mock('../config/env.js', () => ({ default: testConfig }));

const { sessionCookieOptions, setSessionCookie, clearSessionCookie, SESSION_MAX_AGE_MS } = await import('./sessionCookie.js');

type Call = { name: string; value?: string; options: Record<string, unknown> };
function fakeRes() {
  const calls: Call[] = [];
  const res = {
    cookie: (name: string, value: string, options: Record<string, unknown>) => calls.push({ name, value, options }),
    clearCookie: (name: string, options: Record<string, unknown>) => calls.push({ name, options }),
  } as unknown as Response;
  return { res, calls };
}

beforeEach(() => { testConfig.NODE_ENV = 'development'; });

describe('sessionCookieOptions', () => {
  it('is httpOnly, not Secure and Lax when run locally', () => {
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: false, sameSite: 'lax' });
  });

  it('is httpOnly, Secure and SameSite=None in production (the browser reaches the API through the Vercel address)', () => {
    testConfig.NODE_ENV = 'production';
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: 'none' });
  });
});

describe.each(['development', 'production'])('setting and clearing the cookie in %s', (env) => {
  beforeEach(() => { testConfig.NODE_ENV = env; });

  it('clears with exactly the attributes it was set with (only the lifetime differs)', () => {
    const set = fakeRes();
    const clear = fakeRes();
    setSessionCookie(set.res, 'user-1');
    clearSessionCookie(clear.res);
    const { maxAge, ...setAttributes } = set.calls[0].options;
    expect(maxAge).toBe(SESSION_MAX_AGE_MS);
    expect(clear.calls[0].options).toEqual(setAttributes);
    expect(clear.calls[0].name).toBe(set.calls[0].name);
    expect(clear.calls[0].name).toBe('schemesetu_session');
  });

  it('the cleared cookie is never the plain default: it keeps httpOnly', () => {
    const clear = fakeRes();
    clearSessionCookie(clear.res);
    expect(clear.calls[0].options.httpOnly).toBe(true);
  });
});

describe('setSessionCookie', () => {
  it('lasts 7 days', () => {
    expect(SESSION_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
