import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import request from 'supertest';

// A LIVE check against the local database: searches people type or speak find what they would expect.
// It needs DATABASE_URL (backend/.env) and a reachable database; without one (as on CI) every test here is skipped.
// Groq is not used here (no key in the mocked config), so Hindi and Gujarati translation is covered by the unit tests.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));

const { default: schemesRouter, schemeVocabulary } = await import('./schemes.js');
const { default: prisma } = await import('../db/prisma.js');

const app = express();
app.use('/api/schemes', schemesRouter);

let dbUp = false;
beforeAll(async () => {
  dbUp = !!process.env.DATABASE_URL && (await prisma.$queryRaw`SELECT 1`.then(() => true, () => false));
  // Like the server at start-up (server.ts): build the typo word list first, so no search below waits for it.
  if (dbUp) await schemeVocabulary();
}, 60_000);
afterAll(async () => {
  await prisma.$disconnect();
});

const search = async (q: string, limit = 5) => {
  const res = await request(app).get(`/api/schemes?limit=${limit}&q=${encodeURIComponent(q)}`);
  return { names: res.body.data.map((s: { name: string }) => s.name) as string[], authorities: res.body.data.map((s: { authorityName: string }) => s.authorityName) as string[], total: res.body.total as number };
};

describe('LIVE (local database): searching by voice or by typing', () => {
  it('a spoken sentence finds the schemes it is about', async (ctx) => {
    if (!dbUp) ctx.skip();
    const { names } = await search('Show me pension schemes for widows in Gujarat');
    expect(names).toContain('Indira Gandhi National Widow Pension Scheme');
    expect(names).toContain('Ganga Swarupa Pension Scheme');
  });

  it('a state named in the search leaves out other states\' schemes', async (ctx) => {
    if (!dbUp) ctx.skip();
    const { authorities } = await search('widow pension Gujarat', 20);
    for (const a of authorities) expect(a).not.toMatch(/^(Kerala|Punjab|Delhi|Tamil Nadu|Uttarakhand)$/);
  });

  it('"pm kisan" puts PM-KISAN first', async (ctx) => {
    if (!dbUp) ctx.skip();
    expect((await search('pm kisan')).names[0]).toBe('Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)');
  });

  it('the exact name of a scheme comes first', async (ctx) => {
    if (!dbUp) ctx.skip();
    expect((await search('kisan credit card')).names[0]).toBe('Kisan Credit Card');
  });

  it('pages never repeat a scheme', async (ctx) => {
    if (!dbUp) ctx.skip();
    const ids = new Set<string>();
    for (const page of [1, 2, 3]) {
      const res = await request(app).get(`/api/schemes?limit=10&page=${page}&q=widow%20pension`);
      for (const s of res.body.data) {
        expect(ids.has(s.id)).toBe(false);
        ids.add(s.id);
      }
    }
    expect(ids.size).toBe(30);
  });
});
