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
    tags: [] as Array<{ id: string; name: string }>,
    categories: [],
    eligibilityCriteria: criteria ? { ...noCriteria, ...criteria } : null,
  };
}

const withTags = (s: ReturnType<typeof dbScheme>, names: string[]) => ({ ...s, tags: names.map((name, i) => ({ id: `${s.id}-t${i}`, name })) });

// What each scheme's eligibility card would say for PROFILE:
//   tagged: no criteria, 2 of 5 tags shared            -> 40%, relevance 2
//   oneOk:  age on file, passes                        -> 100%, relevance 1
//   twoOk:  age + category on file, both pass          -> 100%, relevance 2
//   oneOkOneBlank: age passes, gender left blank       -> 100%, one criterion unanswered
//   half:   age passes, category fails                 -> excluded (a failed hard criterion)
const PROFILE = { age: '30', category: 'sc', interests: ['student', 'scholarship'] };
const tagged = withTags(dbScheme(1, null), ['Student', 'Scholarship', 'Farmer', 'Loan', 'Housing']);
const oneOk = dbScheme(4, { ageMin: 18 });
const twoOk = dbScheme(3, { ageMin: 18, category: 'sc' });
// a lower id than oneOk, so only the unanswered-criteria rule can put it second
const oneOkOneBlank = dbScheme(2, { ageMin: 18, gender: 'female' });
const half = dbScheme(5, { ageMin: 18, category: 'st' });

const ask = (body: object) => request(buildApp()).post('/api/schemes/recommended').send(body);
const ids = (res: { body: { data: Array<{ id: string }> } }) => res.body.data.map((s) => s.id);

describe('POST /api/schemes/recommended: 100% matches first', () => {
  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    // the database hands them back in the "wrong" order on purpose
    mockPrisma.scheme.findMany.mockResolvedValue([tagged, oneOkOneBlank, oneOk, half, twoOk]);
  });

  it('orders by the match percentage the card shows, then unanswered criteria, then relevance', async () => {
    const res = await ask({ profile: PROFILE });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([twoOk.id, oneOk.id, oneOkOneBlank.id, tagged.id]);
  });

  it('a scheme sharing more tags no longer outranks a scheme whose criteria all pass', async () => {
    const res = await ask({ profile: PROFILE });
    expect(ids(res).indexOf(oneOk.id)).toBeLessThan(ids(res).indexOf(tagged.id));
    // the old order put it first: it had the highest raw score
    expect(res.body.data.find((s: { id: string }) => s.id === tagged.id).matchScore).toBe(2);
  });

  it('keeps the order across pages', async () => {
    const first = await ask({ profile: PROFILE, limit: 2 });
    const second = await ask({ profile: PROFILE, limit: 2, page: 2 });
    expect([...ids(first), ...ids(second)]).toEqual([twoOk.id, oneOk.id, oneOkOneBlank.id, tagged.id]);
  });
});
