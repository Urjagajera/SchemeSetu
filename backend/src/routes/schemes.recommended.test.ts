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
