import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({ scheme: { findUnique: vi.fn() }, schemeReport: { create: vi.fn() } }));
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

const { default: reportsRouter, MAX_REPORT_MESSAGE } = await import('./reports.js');
const app = express();
app.use(express.json());
app.use('/api/reports', reportsRouter);

const ID = '18fad72f-8ada-4d91-93bd-a40998edb042';

beforeEach(() => {
  mockPrisma.scheme.findUnique.mockReset().mockResolvedValue({ id: ID });
  mockPrisma.schemeReport.create.mockReset().mockResolvedValue({});
});

describe('POST /api/reports: report a wrong scheme', () => {
  it('stores the scheme, the kind of problem and the note, and nothing about who sent it', async () => {
    const res = await request(app).post('/api/reports').send({ schemeId: ID, reason: 'documents', message: '  The land record is now 7/12.  ' });
    expect(res.status).toBe(201);
    expect(mockPrisma.schemeReport.create).toHaveBeenCalledWith({ data: { schemeId: ID, reason: 'documents', message: 'The land record is now 7/12.' } });
  });

  it('the note is optional; an empty note is stored as none', async () => {
    await request(app).post('/api/reports').send({ schemeId: ID, reason: 'closed', message: '   ' });
    expect(mockPrisma.schemeReport.create).toHaveBeenCalledWith({ data: { schemeId: ID, reason: 'closed', message: null } });
  });

  it('refuses an unknown reason, a missing or malformed scheme id, and a note that is too long', async () => {
    for (const bad of [
      { schemeId: ID, reason: 'spam' },
      { reason: 'other' },
      { schemeId: 'not-a-uuid', reason: 'other' },
      { schemeId: ID, reason: 'other', message: 'x'.repeat(MAX_REPORT_MESSAGE + 1) },
    ]) {
      expect((await request(app).post('/api/reports').send(bad)).status, JSON.stringify(bad).slice(0, 60)).toBe(400);
    }
    expect(mockPrisma.schemeReport.create).not.toHaveBeenCalled();
  });

  it('a scheme that does not exist is 404 and nothing is stored', async () => {
    mockPrisma.scheme.findUnique.mockResolvedValue(null);
    expect((await request(app).post('/api/reports').send({ schemeId: ID, reason: 'other' })).status).toBe(404);
    expect(mockPrisma.schemeReport.create).not.toHaveBeenCalled();
  });
});
