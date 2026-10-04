import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';

type Row = Record<string, any>;

// A small in-memory database with two users, so "only their own data" is tested on real rows, not on mocks of calls.
const db = vi.hoisted(() => {
  const state = { users: [] as Row[], profiles: [] as Row[], bookmarks: [] as Row[], schemes: [] as Row[], failOn: '' as string };
  const matches = (row: Row, where: Row) => Object.entries(where).every(([k, v]) => row[k] === v);
  // Like Prisma's own promises, a delete does nothing until it is awaited, so a transaction decides when it runs.
  const lazy = <T,>(run: () => Promise<T>): PromiseLike<T> => ({ then: (ok, bad) => run().then(ok, bad) });
  const del = (name: 'users' | 'profiles' | 'bookmarks') => ({ where }: { where: Row }) =>
    lazy(async () => {
      if (state.failOn === name) throw new Error('boom');
      const before = state[name].length;
      state[name] = state[name].filter((r) => !matches(r, where));
      return { count: before - state[name].length };
    });
  return {
    state,
    prisma: {
      user: { findUnique: async ({ where }: { where: Row }) => state.users.find((r) => matches(r, where)) ?? null, deleteMany: del('users') },
      profile: { findUnique: async ({ where }: { where: Row }) => state.profiles.find((r) => matches(r, where)) ?? null, deleteMany: del('profiles') },
      bookmark: {
        findMany: async ({ where }: { where: Row }) =>
          state.bookmarks.filter((r) => matches(r, where)).map((b) => ({ ...b, scheme: state.schemes.find((s) => s.id === b.schemeId) })),
        deleteMany: del('bookmarks'),
      },
      // Runs the queued deletes in order and puts everything back if one fails, like a real transaction.
      $transaction: async (ops: Array<PromiseLike<unknown>>) => {
        const snapshot = JSON.stringify([state.users, state.profiles, state.bookmarks]);
        try {
          const out: unknown[] = [];
          for (const op of ops) out.push(await op);
          return out;
        } catch (e) {
          [state.users, state.profiles, state.bookmarks] = JSON.parse(snapshot);
          throw e;
        }
      },
    },
  };
});

const testConfig = vi.hoisted(() => ({ NODE_ENV: 'test' as string, SESSION_SECRET: 'test-secret' }));
vi.mock('../config/env.js', () => ({ default: testConfig }));
vi.mock('../db/prisma.js', () => ({ default: db.prisma }));

const { default: accountRouter } = await import('./account.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function app() {
  const a = express();
  a.use(express.json());
  a.use(cookieParser());
  a.use('/api/account', accountRouter);
  a.use(errorHandler);
  return a;
}
const cookieFor = (userId: string) => `schemesetu_session=${jwt.sign({ userId }, 'test-secret')}`;

beforeEach(() => {
  testConfig.NODE_ENV = 'test';
  db.state.failOn = '';
  db.state.users = [
    { id: 'u1', googleId: 'g1', email: 'one@example.test', name: 'One', profilePictureUrl: 'http://pic/1', createdAt: new Date('2026-01-01') },
    { id: 'u2', googleId: 'g2', email: 'two@example.test', name: 'Two', profilePictureUrl: null, createdAt: new Date('2026-01-02') },
  ];
  db.state.profiles = [
    { id: 'p1', userId: 'u1', age: '30', gender: 'female', disability: 'yes', profileTags: ['Farmer'], state: 'Gujarat' },
    { id: 'p2', userId: 'u2', age: '55', gender: 'male', profileTags: ['Student'], state: 'Kerala' },
  ];
  db.state.schemes = [{ id: 's1', name: 'Scheme One', sourceUrl: 'http://x/1' }, { id: 's2', name: 'Scheme Two', sourceUrl: 'http://x/2' }];
  db.state.bookmarks = [
    { id: 'b1', userId: 'u1', schemeId: 's1', createdAt: new Date('2026-02-01') },
    { id: 'b2', userId: 'u2', schemeId: 's2', createdAt: new Date('2026-02-02') },
    { id: 'b3', userId: 'u2', schemeId: 's1', createdAt: new Date('2026-02-03') },
  ];
});

describe('account routes need a signed-in session', () => {
  it.each([['GET', '/api/account/export'], ['DELETE', '/api/account']] as const)('%s %s without a cookie is 401 and touches nothing', async (method, url) => {
    const res = await request(app())[method === 'GET' ? 'get' : 'delete'](url);
    expect(res.status).toBe(401);
    expect(db.state.users).toHaveLength(2);
    expect(db.state.bookmarks).toHaveLength(3);
  });

  it('a cookie with a bad signature is 401 too', async () => {
    const forged = `schemesetu_session=${jwt.sign({ userId: 'u1' }, 'someone-elses-secret')}`;
    const res = await request(app()).delete('/api/account').set('Cookie', forged);
    expect(res.status).toBe(401);
    expect(db.state.users).toHaveLength(2);
  });
});

describe('GET /api/account/export', () => {
  it('returns the caller\'s account, profile and bookmarks', async () => {
    const res = await request(app()).get('/api/account/export').set('Cookie', cookieFor('u1'));
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({ id: 'u1', email: 'one@example.test', name: 'One', googleId: 'g1' });
    expect(res.body.profile).toMatchObject({ age: '30', gender: 'female', disability: 'yes', state: 'Gujarat', interestTags: ['Farmer'] });
    expect(res.body.bookmarks).toEqual([{ schemeId: 's1', schemeName: 'Scheme One', schemeUrl: 'http://x/1', savedAt: expect.any(String) }]);
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('never contains another user\'s data', async () => {
    const res = await request(app()).get('/api/account/export').set('Cookie', cookieFor('u1'));
    const body = JSON.stringify(res.body);
    for (const other of ['two@example.test', 'g2', '"Two"', 'Kerala', 'Student', '"55"', 'Scheme Two']) expect(body, other).not.toContain(other);
  });

  it('gives the other user only their own', async () => {
    const res = await request(app()).get('/api/account/export').set('Cookie', cookieFor('u2'));
    expect(res.body.account.email).toBe('two@example.test');
    expect(res.body.bookmarks.map((b: Row) => b.schemeId).sort()).toEqual(['s1', 's2']);
    expect(JSON.stringify(res.body)).not.toContain('one@example.test');
  });

  it('profile is null for someone who never saved one', async () => {
    db.state.profiles = [];
    const res = await request(app()).get('/api/account/export').set('Cookie', cookieFor('u1'));
    expect(res.body.profile).toBeNull();
  });

  it('is 404 for a valid session whose account no longer exists', async () => {
    const res = await request(app()).get('/api/account/export').set('Cookie', cookieFor('ghost'));
    expect(res.status).toBe(404);
  });

  it('does not change anything', async () => {
    await request(app()).get('/api/account/export').set('Cookie', cookieFor('u1'));
    expect(db.state.users).toHaveLength(2);
    expect(db.state.profiles).toHaveLength(2);
    expect(db.state.bookmarks).toHaveLength(3);
  });
});

describe('DELETE /api/account', () => {
  it('removes the caller\'s bookmarks, profile and account, and says how many', async () => {
    const res = await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, deleted: { bookmarks: 1, profile: 1, account: 1 } });
    expect(db.state.users.map((u) => u.id)).toEqual(['u2']);
    expect(db.state.profiles.map((p) => p.userId)).toEqual(['u2']);
    expect(db.state.bookmarks.map((b) => b.id)).toEqual(['b2', 'b3']);
  });

  it('leaves the other user\'s rows exactly as they were', async () => {
    const before = JSON.stringify([db.state.users[1], db.state.profiles[1], db.state.bookmarks.filter((b) => b.userId === 'u2')]);
    await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    const after = JSON.stringify([db.state.users[0], db.state.profiles[0], db.state.bookmarks.filter((b) => b.userId === 'u2')]);
    expect(after).toBe(before);
  });

  it('clears the session cookie', async () => {
    const res = await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    const set = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(set).toMatch(/schemesetu_session=;/);
    expect(set).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('in production clears the cookie with Secure and SameSite=None, like logout', async () => {
    testConfig.NODE_ENV = 'production';
    const res = await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    const cleared = String(res.headers['set-cookie']?.[0]);
    expect(cleared).toMatch(/SameSite=None/);
    expect(cleared).toMatch(/;\s*Secure/);
    expect(cleared).toMatch(/;\s*HttpOnly/);
  });

  it('works for an account that never saved a profile or a bookmark', async () => {
    db.state.profiles = db.state.profiles.filter((p) => p.userId !== 'u1');
    db.state.bookmarks = db.state.bookmarks.filter((b) => b.userId !== 'u1');
    const res = await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    expect(res.body.deleted).toEqual({ bookmarks: 0, profile: 0, account: 1 });
  });

  it('is all-or-nothing: if one delete fails, nothing is removed and the cookie stays', async () => {
    db.state.failOn = 'users';
    const res = await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    expect(res.status).toBe(500);
    expect(db.state.users).toHaveLength(2);
    expect(db.state.profiles).toHaveLength(2);
    expect(db.state.bookmarks).toHaveLength(3);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('deleting twice is safe: the second call finds nothing to remove', async () => {
    await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    const again = await request(app()).delete('/api/account').set('Cookie', cookieFor('u1'));
    expect(again.status).toBe(200);
    expect(again.body.deleted).toEqual({ bookmarks: 0, profile: 0, account: 0 });
    expect(db.state.users.map((u) => u.id)).toEqual(['u2']);
  });
});
