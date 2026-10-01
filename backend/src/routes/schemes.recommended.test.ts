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

function dbScheme(n: number, criteria: Record<string, unknown> | null) {
  return {
    id: `id-${n}`,
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
    eligibilityCriteria: criteria
      ? {
          ageMin: null,
          ageMax: null,
          incomeMinAnnual: null,
          incomeMaxAnnual: null,
          gender: null,
          category: null,
          occupation: null,
          state: null,
          landOwnership: null,
          ...criteria,
        }
      : null,
  };
}

// Scheme 1: female only. Scheme 2: SC or ST. Scheme 3: female AND SC. Scheme 4: no restriction on file.
const SCHEMES = [
  dbScheme(1, { gender: 'female' }),
  dbScheme(2, { category: 'sc,st' }),
  dbScheme(3, { gender: 'female', category: 'sc' }),
  dbScheme(4, null),
];

async function recommendedFor(profile: Record<string, string>): Promise<string[]> {
  mockPrisma.scheme.findMany.mockResolvedValue(SCHEMES);
  const res = await request(buildApp()).post('/api/schemes/recommended').send({ profile });
  expect(res.status).toBe(200);
  return res.body.data.map((s: { name: string }) => s.name).sort();
}

describe('POST /api/schemes/recommended: gender and category set membership', () => {
  beforeEach(() => mockPrisma.scheme.findMany.mockReset());

  it('a female SC profile gets every scheme', async () => {
    expect(await recommendedFor({ gender: 'female', category: 'sc' })).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4']);
  });

  it('a male general profile is excluded from all three restricted schemes', async () => {
    expect(await recommendedFor({ gender: 'male', category: 'general' })).toEqual(['Scheme 4']);
  });

  it('a female ST profile passes the "sc,st" set but fails the SC-only gate of the both-gates scheme', async () => {
    expect(await recommendedFor({ gender: 'female', category: 'st' })).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 4']);
  });

  it('a male SC profile passes the category set but fails both female gates', async () => {
    expect(await recommendedFor({ gender: 'male', category: 'sc' })).toEqual(['Scheme 2', 'Scheme 4']);
  });

  it('a profile "other" only matches transgender schemes, so it is excluded from the female-only ones', async () => {
    expect(await recommendedFor({ gender: 'other', category: 'general' })).toEqual(['Scheme 4']);
  });
});

describe('POST /api/schemes/recommended: an unset profile never excludes a scheme', () => {
  beforeEach(() => mockPrisma.scheme.findMany.mockReset());

  async function recommendedData(profile: Record<string, string>) {
    mockPrisma.scheme.findMany.mockResolvedValue(SCHEMES);
    const res = await request(buildApp()).post('/api/schemes/recommended').send({ profile });
    expect(res.status).toBe(200);
    return res.body.data as Array<{ name: string; unverifiedCriteria?: string[] }>;
  }

  it('an empty profile keeps every scheme and lists what each gated scheme could not be checked on', async () => {
    const data = await recommendedData({});
    expect(data.map((s) => s.name).sort()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4']);
    const byName = Object.fromEntries(data.map((s) => [s.name, s.unverifiedCriteria]));
    expect(byName['Scheme 1']).toEqual(['Gender']);
    expect(byName['Scheme 2']).toEqual(['Social category']);
    expect(byName['Scheme 3']).toEqual(['Gender', 'Social category']);
    expect(byName['Scheme 4']).toBeUndefined();
  });

  it('blank strings behave exactly like a missing profile', async () => {
    const data = await recommendedData({ gender: '', category: '  ', age: '' });
    expect(data).toHaveLength(4);
  });

  it('a known gender with an unknown category: passing gates stay in, failing gates drop out, the rest is noted', async () => {
    const female = await recommendedData({ gender: 'female' });
    expect(female.map((s) => s.name).sort()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4']);
    expect(female.find((s) => s.name === 'Scheme 3')!.unverifiedCriteria).toEqual(['Social category']);

    const male = await recommendedData({ gender: 'male' });
    expect(male.map((s) => s.name).sort()).toEqual(['Scheme 2', 'Scheme 4']);
  });

  it('a fully answered profile carries no unverified note', async () => {
    const data = await recommendedData({ gender: 'female', category: 'sc' });
    expect(data.every((s) => s.unverifiedCriteria === undefined)).toBe(true);
  });
});

describe('POST /api/schemes/recommended: profile state', () => {
  const post = (profile: Record<string, unknown>) => request(buildApp()).post('/api/schemes/recommended').send({ profile });
  const whereOf = () => mockPrisma.scheme.findMany.mock.calls[0][0].where;

  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    mockPrisma.scheme.findMany.mockResolvedValue([]);
  });

  it('a real state keeps central schemes plus that state, whatever spelling it arrives in', async () => {
    await post({ state: '  gujarat ' });
    const w = whereOf();
    expect(w.OR).toHaveLength(3);
    expect(w.OR[1]).toEqual({ authorityName: { equals: 'Gujarat', mode: 'insensitive' } });
    // and a scheme whose own text limits it to that state, whichever authority publishes it
    expect(JSON.stringify(w.OR[2])).toContain('"state":{"equals":"Gujarat"}');
  });

  it('an unrecognised or blank state is treated as unknown: no state filter, so no state scheme is hidden', async () => {
    for (const state of ['Gujrat', 'Somewhere', '', '   ']) {
      mockPrisma.scheme.findMany.mockClear();
      await post({ state });
      expect(whereOf()).toEqual({});
    }
    mockPrisma.scheme.findMany.mockClear();
    await post({});
    expect(whereOf()).toEqual({});
  });
});
