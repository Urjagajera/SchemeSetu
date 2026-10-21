import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({
  scheme: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
}));

// errorHandler -> config/env.ts exits the process when required vars are missing (CI has no .env).
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

const { default: schemesRouter } = await import('./schemes.js');
const { errorHandler } = await import('../middleware/errorHandler.js');
const { clearFilterOptionsCache } = await import('../filters/options.js');

function buildApp() {
  const app = express();
  app.use('/api/schemes', schemesRouter);
  app.use(errorHandler);
  return app;
}

describe('GET /api/schemes: gender, social category, age and income filters', () => {
  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    mockPrisma.scheme.count.mockReset();
    mockPrisma.scheme.findMany.mockResolvedValue([]);
    mockPrisma.scheme.count.mockResolvedValue(123);
  });

  const whereOf = (call: 'findMany' | 'count') => mockPrisma.scheme[call].mock.calls[0][0].where;

  it('puts the filters in the database query, and uses the SAME condition for the page and the total', async () => {
    const res = await request(buildApp()).get('/api/schemes?gender=female&socialCategory=sc&age=30&income=200000&page=2&limit=15');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(123); // total comes from count() on the filtered where, not from the page length
    expect(JSON.stringify(whereOf('findMany'))).toBe(JSON.stringify(whereOf('count')));
    const text = JSON.stringify(whereOf('findMany'));
    expect(text).toContain('"equals":"female"');
    expect(text).toContain('"equals":"sc"');
    expect(text).toContain('{"ageMin":{"lte":30}}');
    expect(text).toContain('{"incomeMaxAnnual":{"gte":200000}}');
    expect(mockPrisma.scheme.findMany.mock.calls[0][0]).toMatchObject({ skip: 15, take: 15 });
  });

  it('adds nothing for these filters when none are sent, or when the values are invalid', async () => {
    await request(buildApp()).get('/api/schemes?gender=nope&socialCategory=x&age=abc&income=-1');
    const text = JSON.stringify(whereOf('findMany'));
    expect(text).not.toContain('eligibilityCriteria');
  });

  it('composes with the existing filters instead of replacing them', async () => {
    await request(buildApp()).get('/api/schemes?ministry=Ministry%20Of%20Finance&gender=male');
    const text = JSON.stringify(whereOf('findMany'));
    expect(text).toContain('Ministry Of Finance');
    expect(text).toContain('"equals":"male"');
  });
});

describe('GET /api/schemes: topics, occupation and appliedFilters', () => {
  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    mockPrisma.scheme.count.mockReset();
    mockPrisma.scheme.findMany.mockResolvedValue([]);
    mockPrisma.scheme.count.mockResolvedValue(7);
  });

  it('echoes the filters as they were applied, dropping invalid ones', async () => {
    const res = await request(buildApp()).get('/api/schemes?topic=health,nope&occupation=farmer&state=goa&gender=robot&category=Education');
    expect(res.body.appliedFilters).toEqual({ topics: ['education', 'health'], occupation: 'farmer', state: 'Goa' });
  });

  it('puts topic and occupation in the database query, so the total is real', async () => {
    await request(buildApp()).get('/api/schemes?topic=housing&occupation=student');
    const where = JSON.stringify(mockPrisma.scheme.count.mock.calls[0][0].where);
    expect(where).toContain('"Shelter"');
    expect(where).toContain('"occupation":{"equals":"student"}');
    expect(where).toBe(JSON.stringify(mockPrisma.scheme.findMany.mock.calls[0][0].where));
  });
});

describe('GET /api/schemes/filters', () => {
  beforeEach(() => {
    clearFilterOptionsCache();
    mockPrisma.scheme.count.mockReset();
    mockPrisma.scheme.groupBy.mockReset();
    mockPrisma.scheme.count.mockResolvedValue(5);
    mockPrisma.scheme.groupBy.mockResolvedValue([
      { authorityName: 'Ministry Of Finance', _count: { _all: 18 } },
      { authorityName: 'Gujarat', _count: { _all: 638 } },
      { authorityName: ' Ministry Of Finance ', _count: { _all: 2 } },
      { authorityName: 'NITI Aayog (National Institution for Transforming India)', _count: { _all: 1 } },
    ]);
  });

  it('returns every option list with counts in one response', async () => {
    const res = await request(buildApp()).get('/api/schemes/filters');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.topics[0]).toEqual({ id: 'education', count: 5 });
    expect(d.occupations.map((o: { id: string }) => o.id)).toContain('farmer');
    expect(d.levels).toEqual([{ id: 'Central', count: 5 }, { id: 'State', count: 5 }]);
    expect(d.states).toHaveLength(36);
    expect(d.genders).toEqual(['male', 'female', 'other']);
    expect(d.socialCategories).toEqual(['general', 'sc', 'st', 'obc']);
  });

  it('lists central authorities only (a state is reached through the State filter), merging spellings', async () => {
    const res = await request(buildApp()).get('/api/schemes/filters');
    expect(res.body.data.ministries).toEqual([
      { name: 'Ministry Of Finance', count: 20 },
      { name: 'NITI Aayog (National Institution for Transforming India)', count: 1 },
    ]);
  });

  it('keeps the counts between requests instead of recounting', async () => {
    await request(buildApp()).get('/api/schemes/filters');
    const calls = mockPrisma.scheme.count.mock.calls.length;
    await request(buildApp()).get('/api/schemes/filters');
    expect(mockPrisma.scheme.count.mock.calls.length).toBe(calls);
  });

  it('does not keep a failed load', async () => {
    mockPrisma.scheme.groupBy.mockRejectedValueOnce(new Error('db down'));
    expect((await request(buildApp()).get('/api/schemes/filters')).status).toBe(500);
    expect((await request(buildApp()).get('/api/schemes/filters')).status).toBe(200);
  });
});
