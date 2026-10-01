import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({
  scheme: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
}));
const mockService = vi.hoisted(() => ({ getForView: vi.fn(), getCardText: vi.fn() }));

// errorHandler -> config/env.ts exits the process when required vars are missing (CI has no .env).
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));
vi.mock('../translation/index.js', () => ({ translationService: mockService }));

const { default: schemesRouter } = await import('./schemes.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function buildApp() {
  const app = express();
  app.use('/api/schemes', schemesRouter);
  app.use(errorHandler);
  return app;
}

const dbScheme = {
  id: 's1',
  name: 'Stand-Up India',
  description: 'desc',
  authorityName: 'Ministry Of Finance',
  sourceUrl: 'https://example.com/s1',
  benefits: ['Loan'],
  documentRequirements: ['Aadhaar Card'],
  applicationMode: ['Online'],
  applicationProcess: 'Step 1',
  eligibilityRawText: ['Age 18+'],
  tags: [],
  categories: [],
};

describe('GET /api/schemes/:id: ?lang=', () => {
  beforeEach(() => {
    mockPrisma.scheme.findUnique.mockReset();
    mockService.getForView.mockReset();
    mockPrisma.scheme.findUnique.mockResolvedValue(dbScheme);
    mockService.getForView.mockResolvedValue({ language: 'hi', status: 'pending', fields: {}, pendingFields: ['title'], failedFields: [] });
  });

  it('adds the translation state for Hindi, next to the untouched English data', async () => {
    const res = await request(buildApp()).get('/api/schemes/s1?lang=hi');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Stand-Up India'); // English is always there
    expect(res.body.translation).toEqual({ language: 'hi', status: 'pending', fields: {}, pendingFields: ['title'], failedFields: [] });
    expect(mockService.getForView).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), expect.objectContaining({ code: 'hi' }));
  });

  it.each([['no lang', ''], ['lang=en', '?lang=en'], ['lang=gu (defined but not enabled yet)', '?lang=gu'], ['an unknown language', '?lang=fr'], ['junk', '?lang=%00']])(
    'returns plain English and starts nothing for %s',
    async (_label, qs) => {
      const res = await request(buildApp()).get(`/api/schemes/s1${qs}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('translation');
      expect(mockService.getForView).not.toHaveBeenCalled();
    },
  );

  it('still 404s for a missing scheme without touching translation', async () => {
    mockPrisma.scheme.findUnique.mockResolvedValue(null);
    const res = await request(buildApp()).get('/api/schemes/nope?lang=hi');
    expect(res.status).toBe(404);
    expect(mockService.getForView).not.toHaveBeenCalled();
  });
});

describe('GET /api/schemes/titles', () => {
  beforeEach(() => {
    mockPrisma.scheme.findMany.mockReset();
    mockService.getCardText.mockReset();
    mockPrisma.scheme.findMany.mockResolvedValue([{ id: 's1', name: 'Stand-Up India', description: 'Details\nA scheme.' }]);
    mockService.getCardText.mockResolvedValue({ language: 'hi', status: 'pending', titles: {}, summaries: {}, pending: 1, failed: 0 });
  });

  it('asks the service for the titles of the requested ids (not treated as a scheme id)', async () => {
    const res = await request(buildApp()).get('/api/schemes/titles?lang=hi&ids=s1,s1,%20s2');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ language: 'hi', status: 'pending', pending: 1 });
    expect(mockPrisma.scheme.findMany).toHaveBeenCalledWith({ where: { id: { in: ['s1', 's2'] } }, select: { id: true, name: true, description: true } });
    expect(mockService.getCardText).toHaveBeenCalledWith([{ id: 's1', name: 'Stand-Up India', description: 'Details\nA scheme.' }], expect.objectContaining({ code: 'hi' }));
  });

  it('caps the number of ids at 100', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => 'id' + i).join(',');
    await request(buildApp()).get('/api/schemes/titles?lang=hi&ids=' + ids);
    expect(mockPrisma.scheme.findMany.mock.calls[0][0].where.id.in).toHaveLength(100);
  });

  it('does nothing for English, an unknown language or Gujarati (not enabled)', async () => {
    for (const q of ['?ids=s1', '?lang=en&ids=s1', '?lang=gu&ids=s1', '?lang=xx&ids=s1']) {
      const res = await request(buildApp()).get('/api/schemes/titles' + q);
      expect(res.body.data).toEqual({ language: 'en', status: 'ready', titles: {}, summaries: {}, pending: 0, failed: 0 });
    }
    expect(mockService.getCardText).not.toHaveBeenCalled();
    expect(mockPrisma.scheme.findMany).not.toHaveBeenCalled();
  });
});
