import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({
  scheme: { findMany: vi.fn(), count: vi.fn() },
}));

// errorHandler -> config/env.ts exits the process when required vars are missing (CI has no .env).
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

const { default: schemesRouter } = await import('./schemes.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/schemes', schemesRouter);
  app.use(errorHandler);
  return app;
}

const noCriteria = { ageMin: null, ageMax: null, incomeMinAnnual: null, incomeMaxAnnual: null, gender: null, category: null, occupation: null, state: null, landOwnership: null };

function dbScheme(n: number, criteria: Record<string, unknown> | null) {
  return {
    id: `id-${String(n).padStart(3, '0')}`,
    name: `Scheme ${n}`,
    description: 'desc',
    authorityName: 'Ministry Of Finance',
    sourceUrl: `https://example.com/${n}`,
    benefits: [],
    documentRequirements: [],
    applicationMode: [],
    applicationProcess: [],
    eligibilityRawText: [],
    tags: [],
    categories: [],
    eligibilityCriteria: criteria ? { ...noCriteria, ...criteria } : null,
  };
}

// 1-30: age 18 to 60 on file, so a 30-year-old passes and scores 1.  31-55: nothing on file, scores 0.
// 56-60: age 70 and over, so a 30-year-old is excluded.
const ALL = [
  ...Array.from({ length: 30 }, (_, i) => dbScheme(i + 1, { ageMin: 18, ageMax: 60 })),
  ...Array.from({ length: 25 }, (_, i) => dbScheme(i + 31, null)),
  ...Array.from({ length: 5 }, (_, i) => dbScheme(i + 56, { ageMin: 70 })),
];
const IDS_SCORED = ALL.slice(0, 30).map((s) => s.id);
const IDS_UNSCORED = ALL.slice(30, 55).map((s) => s.id);

// The database returns them in an order that has nothing to do with the ids.
const shuffled = (list: typeof ALL) => [...list].sort((a, b) => ((a.name.length * 7 + a.id.charCodeAt(5)) % 11) - ((b.name.length * 7 + b.id.charCodeAt(5)) % 11) || (a.id < b.id ? 1 : -1));

const ask = (body: Record<string, unknown>) => request(buildApp()).post('/api/schemes/recommended').send(body);
const ids = (res: { body: { data: Array<{ id: string }> } }) => res.body.data.map((s) => s.id);

beforeEach(() => {
  mockPrisma.scheme.findMany.mockReset();
  mockPrisma.scheme.findMany.mockResolvedValue(shuffled(ALL));
});

describe('POST /api/schemes/recommended: paging', () => {
  it('gives the first 20 by default and says how many matched in all', async () => {
    const res = await ask({ profile: { age: '30' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body).toMatchObject({ page: 1, limit: 20, total: 55, hasMore: true });
  });

  it('keeps the ranking: every scheme that scored comes before every one that did not', async () => {
    const both = [...ids(await ask({ profile: { age: '30' }, page: 1, limit: 50 }))];
    expect(both.slice(0, 30).sort()).toEqual(IDS_SCORED);
    expect(both.slice(30).sort()).toEqual(IDS_UNSCORED.slice(0, 20));
  });

  it('the next page never repeats a scheme from an earlier page, and together the pages are everything that matched, once', async () => {
    const seen: string[] = [];
    for (let page = 1; page <= 6; page++) {
      const res = await ask({ profile: { age: '30' }, page, limit: 10 });
      const pageIds = ids(res);
      for (const id of pageIds) expect(seen, `page ${page} repeated ${id}`).not.toContain(id);
      seen.push(...pageIds);
      expect(res.body.hasMore).toBe(page < 6);
    }
    expect(seen).toHaveLength(55);
    expect([...seen].sort()).toEqual([...IDS_SCORED, ...IDS_UNSCORED].sort());
  });

  it('reading in pages gives exactly the order of reading all at once', async () => {
    const whole = ids(await ask({ profile: { age: '30' }, page: 1, limit: 50 }));
    const parts = [...ids(await ask({ profile: { age: '30' }, page: 1, limit: 20 })), ...ids(await ask({ profile: { age: '30' }, page: 2, limit: 20 })), ...ids(await ask({ profile: { age: '30' }, page: 3, limit: 20 }))];
    expect(parts.slice(0, 50)).toEqual(whole);
  });

  it('the order does not depend on the order the database returned the rows in', async () => {
    const a = ids(await ask({ profile: { age: '30' }, limit: 50 }));
    mockPrisma.scheme.findMany.mockResolvedValue([...ALL].reverse());
    const b = ids(await ask({ profile: { age: '30' }, limit: 50 }));
    expect(b).toEqual(a);
  });

  it('the last page says there is no more, and a page past the end is empty with the same total', async () => {
    const last = await ask({ profile: { age: '30' }, page: 3, limit: 20 });
    expect(last.body.data).toHaveLength(15);
    expect(last.body.hasMore).toBe(false);
    const past = await ask({ profile: { age: '30' }, page: 4, limit: 20 });
    expect(past.status).toBe(200);
    expect(past.body).toMatchObject({ data: [], total: 55, hasMore: false });
  });

  it('when the last page ends exactly on the total, it says there is no more', async () => {
    const fourth = await ask({ profile: { age: '30' }, page: 4, limit: 11 });
    expect(fourth.body.hasMore).toBe(true);
    const fifth = await ask({ profile: { age: '30' }, page: 5, limit: 11 }); // 5 x 11 = 55 = the total
    expect(fifth.body.data).toHaveLength(11);
    expect(fifth.body.hasMore).toBe(false);
  });

  it('the total leaves out schemes the profile does not qualify for', async () => {
    const res = await ask({ profile: { age: '30' } });
    expect(res.body.total).toBe(55); // 60 schemes, 5 of them need age 70 or more
    const old = await ask({ profile: { age: '75' }, limit: 50 });
    expect(old.body.total).toBe(30); // the 30 "18 to 60" schemes drop out; 25 with nothing on file and the five 70+ ones are in
  });

  it('limit is capped at 50', async () => {
    const res = await ask({ profile: { age: '30' }, limit: 500 });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(50);
    expect(res.body.data).toHaveLength(50);
  });

  it('a blank profile behaves as before: everything matches, nothing scores, first 20 in a steady order', async () => {
    const res = await ask({ profile: {} });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(60);
    expect(res.body.data).toHaveLength(20);
    expect(ids(res)).toEqual(ALL.map((s) => s.id).slice(0, 20));
    expect(res.body.data.every((s: { matchScore?: number }) => !s.matchScore)).toBe(true);
    const next = await ask({ profile: {}, page: 2 });
    expect(ids(next)).toEqual(ALL.map((s) => s.id).slice(20, 40));
  });

  it.each([[0], [-1], ['abc'], [1.5], [null], [{}]])('page %s is a 400', async (page) => {
    const res = await ask({ profile: {}, page });
    expect(res.status).toBe(400);
  });

  it.each([[0], [-5], ['x'], [2.5], [null]])('limit %s is a 400', async (limit) => {
    const res = await ask({ profile: {}, limit });
    expect(res.status).toBe(400);
  });

  it('a missing profile is still a 400', async () => {
    expect((await ask({ page: 1 })).status).toBe(400);
  });
});
