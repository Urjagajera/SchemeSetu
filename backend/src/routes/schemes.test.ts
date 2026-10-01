import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({
  scheme: { findMany: vi.fn(), count: vi.fn() },
}));

// errorHandler -> config/env.ts exits the process when PORT/DATABASE_URL/etc. are
// missing, which is the case on CI (no .env). Same stand-in auth.test.ts uses.
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

const { default: schemesRouter } = await import('./schemes.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function buildApp() {
  const app = express();
  app.use('/api/schemes', schemesRouter);
  app.use(errorHandler);
  return app;
}

function dbScheme(n: number, authorityName = 'Ministry Of Finance') {
  return {
    id: `id-${n}`,
    name: `Scheme ${n}`,
    description: 'desc',
    authorityName,
    sourceUrl: `https://example.com/${n}`,
    benefits: [],
    documentRequirements: [],
    applicationMode: [],
    applicationProcess: [],
    eligibilityRawText: [],
    tags: [],
    categories: [],
  };
}

describe('GET /api/schemes pagination', () => {
  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    mockPrisma.scheme.count.mockReset();
    mockPrisma.scheme.findMany.mockResolvedValue([dbScheme(1)]);
    mockPrisma.scheme.count.mockResolvedValue(4722);
  });

  it('returns the full match count as total, not just the page length', async () => {
    const res = await request(buildApp()).get('/api/schemes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(4722);
  });

  it('defaults to 20 per page and skips by page number', async () => {
    await request(buildApp()).get('/api/schemes');
    expect(mockPrisma.scheme.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0, take: 20 }));

    await request(buildApp()).get('/api/schemes?page=3&limit=15');
    expect(mockPrisma.scheme.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 30, take: 15 }));
  });

  it('caps limit at 100', async () => {
    await request(buildApp()).get('/api/schemes?limit=500');
    expect(mockPrisma.scheme.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100 }));
  });
});

describe('GET /api/schemes filters', () => {
  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    mockPrisma.scheme.count.mockReset();
    mockPrisma.scheme.findMany.mockResolvedValue([]);
    mockPrisma.scheme.count.mockResolvedValue(0);
  });

  it('filters by exact ministry (authorityName), case-insensitively', async () => {
    await request(buildApp()).get('/api/schemes?ministry=Ministry%20Of%20Finance');
    const { where } = mockPrisma.scheme.findMany.mock.calls[0][0];
    expect(where.AND).toContainEqual({ authorityName: { equals: 'Ministry Of Finance', mode: 'insensitive' } });
  });

  it('state filter keeps central schemes plus that one state', async () => {
    await request(buildApp()).get('/api/schemes?state=Gujarat');
    const { where } = mockPrisma.scheme.findMany.mock.calls[0][0];
    const stateClause = where.AND.find((c: any) => c.OR?.some((o: any) => o.authorityName?.equals === 'Gujarat'));
    expect(stateClause).toBeDefined();
    // the same clause must also admit central authorities, i.e. everything that is not one of the 36 states/UTs
    expect(JSON.stringify(stateClause)).toContain('"NOT"');
    expect(JSON.stringify(stateClause)).toContain('Tamil Nadu');
  });
});

describe('GET /api/schemes/ministries', () => {
  it('returns every distinct authority, sorted and trimmed, and is not shadowed by /:id', async () => {
    mockPrisma.scheme.findMany.mockResolvedValue([
      { authorityName: 'Ministry Of Finance ' },
      { authorityName: 'Andhra Pradesh' },
      { authorityName: 'Ministry Of Finance' },
    ]);
    const res = await request(buildApp()).get('/api/schemes/ministries');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(['Andhra Pradesh', 'Ministry Of Finance']);
    expect(mockPrisma.scheme.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ['authorityName'] }),
    );
  });
});

describe('GET /api/schemes/states', () => {
  it('serves the fixed list of 28 states and 8 union territories, sorted, without touching the database', async () => {
    mockPrisma.scheme.findMany.mockClear();
    const res = await request(buildApp()).get('/api/schemes/states');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(36);
    expect(res.body.data).toEqual([...res.body.data].sort((a: string, b: string) => a.localeCompare(b, 'en')));
    expect(res.body.data).toEqual(expect.arrayContaining(['Gujarat', 'Delhi', 'Ladakh', 'Dadra & Nagar Haveli and Daman & Diu']));
    expect(res.body.data).not.toContain('NITI Aayog (National Institution for Transforming India)');
    expect(mockPrisma.scheme.findMany).not.toHaveBeenCalled();
  });

  it('is not shadowed by /:id', async () => {
    const res = await request(buildApp()).get('/api/schemes/states');
    expect(res.body).toHaveProperty('data');
  });
});
