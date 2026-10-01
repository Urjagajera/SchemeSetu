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
