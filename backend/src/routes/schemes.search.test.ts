import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({ scheme: { findMany: vi.fn(), count: vi.fn() } }));
const translate = vi.hoisted(() => vi.fn());

vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));
vi.mock('../search/translateQuery.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../search/translateQuery.js')>()),
  createQueryTranslator: () => translate,
}));

const { default: schemesRouter } = await import('./schemes.js');

const app = express();
app.use('/api/schemes', schemesRouter);

const light = (name: string, authorityName = 'Ministry Of Rural Development') => ({ id: name, name, description: '', authorityName, tags: [] });
const full = (name: string) => ({ ...light(name), tags: [], categories: [], benefits: [], eligibilityRawText: [], documentRequirements: [] });

beforeEach(() => {
  mockPrisma.scheme.findMany.mockReset();
  mockPrisma.scheme.count.mockReset();
  translate.mockReset();
  // First call: the light rows for ranking. Second: the full rows of the page, in database order.
  mockPrisma.scheme.findMany.mockImplementation(async (args: { select?: unknown; where: { id?: { in: string[] } } }) =>
    args.select
      ? [light('Old Age Pension'), light('Widow Pension'), light('Widow Support')]
      : (args.where.id?.in ?? []).slice().reverse().map(full),
  );
});

const whereOfSearch = () => JSON.stringify(mockPrisma.scheme.findMany.mock.calls[0][0].where);

describe('GET /api/schemes?q=: searched word by word, best matches first', () => {
  it('a spoken sentence finds schemes by its topic words, best match first, with the real total', async () => {
    const res = await request(app).get('/api/schemes?q=' + encodeURIComponent('Show me pension schemes for widows'));
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual(['Widow Pension', 'Old Age Pension', 'Widow Support']);
    expect(res.body.total).toBe(3);
    expect(res.body.appliedFilters.query).toBe('Show me pension schemes for widows');
    const where = whereOfSearch();
    expect(where).toContain('"contains":"widow"');
    expect(where).toContain('"contains":"pension"');
    expect(where).not.toContain('"contains":"show"');
  });

  it('pages through the ranked list', async () => {
    const res = await request(app).get('/api/schemes?q=widow%20pension&page=2&limit=2');
    expect(res.body.data.map((s: { name: string }) => s.name)).toEqual(['Widow Support']);
    expect(res.body.total).toBe(3);
  });

  it('a state named in the search narrows it to central schemes and that state\'s', async () => {
    await request(app).get('/api/schemes?q=widow%20pension%20Gujarat');
    const where = whereOfSearch();
    expect(where).toContain('{"authorityName":{"equals":"Gujarat","mode":"insensitive"}}');
    expect(where).not.toContain('"contains":"gujarat"');
  });

  it('a state picked in the filters wins over one named in the search', async () => {
    await request(app).get('/api/schemes?q=widow%20Gujarat&state=Kerala');
    // (Every state's name is in the condition, to tell central schemes apart; the one kept is the state's own.)
    expect(whereOfSearch()).toContain('{"state":{"equals":"Kerala"}}');
    expect(whereOfSearch()).not.toContain('{"state":{"equals":"Gujarat"}}');
  });

  it('a Hindi search is turned into English words before searching', async () => {
    translate.mockResolvedValue(['widow', 'pension']);
    const res = await request(app).get('/api/schemes?q=' + encodeURIComponent('विधवा पेंशन'));
    expect(translate).toHaveBeenCalledWith('विधवा पेंशन');
    expect(whereOfSearch()).toContain('"contains":"widow"');
    expect(res.body.appliedFilters.query).toBe('विधवा पेंशन');
  });

  it('when Groq cannot translate, searches the Hindi words as written', async () => {
    translate.mockResolvedValue(null);
    await request(app).get('/api/schemes?q=' + encodeURIComponent('विधवा पेंशन'));
    expect(whereOfSearch()).toContain('"contains":"विधवा"');
  });

  it('English searches never go to Groq', async () => {
    await request(app).get('/api/schemes?q=widow');
    expect(translate).not.toHaveBeenCalled();
  });

  it('a search of filler words only is matched as written, as before', async () => {
    mockPrisma.scheme.findMany.mockResolvedValue([]);
    mockPrisma.scheme.count.mockResolvedValue(0);
    await request(app).get('/api/schemes?q=schemes');
    expect(whereOfSearch()).toContain('{"name":{"contains":"schemes","mode":"insensitive"}}');
  });
});
