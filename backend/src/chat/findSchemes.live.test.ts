import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// A LIVE check against the local database: the search words SetuAI uses find the schemes a person would expect.
// It needs DATABASE_URL (backend/.env) and a reachable database; without one (as on CI) every test here is skipped.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));

const { findSchemesForChat } = await import('./findSchemes.js');
const { default: prisma } = await import('../db/prisma.js');

let dbUp = false;
beforeAll(async () => {
  dbUp = !!process.env.DATABASE_URL && (await prisma.$queryRaw`SELECT 1`.then(() => true, () => false));
});
afterAll(async () => {
  await prisma.$disconnect();
});

const names = async (words: string[], profile: Record<string, string> | null = null, n = 5) => (await findSchemesForChat(words, profile, n)).map((s) => s.name);

describe('LIVE (local database): SetuAI finds the schemes a question is about', () => {
  it('the full name of PM-KISAN finds it first', async (ctx) => {
    if (!dbUp) ctx.skip();
    expect((await names(['Pradhan Mantri Kisan Samman Nidhi']))[0]).toBe('Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)');
  });

  it('a 68-year-old widow in Gujarat gets Gujarat\'s widow pension and the central pensions, and no other state\'s scheme', async (ctx) => {
    if (!dbUp) ctx.skip();
    const profile = { age: '68', gender: 'female', state: 'Gujarat', widow: 'yes', income: '40000' };
    const rows = await findSchemesForChat(['widow', 'old age', 'pension'], profile, 8);
    const found = rows.map((s) => s.name);
    expect(found).toContain('Ganga Swarupa Pension Scheme');
    expect(found).toContain('Indira Gandhi National Widow Pension Scheme');
    // Widow pensions of other states exist in the data (Punjab, Delhi, Tamil Nadu...): none of them may come back.
    for (const s of rows) expect(s.authority, s.name).not.toMatch(/^(Kerala|Puducherry|Punjab|Delhi|Tamil Nadu|Uttarakhand|Sikkim)$/);
  });

  it('what it hands to Groq is public scheme text, clipped to fit a small model', async (ctx) => {
    if (!dbUp) ctx.skip();
    const [s] = await findSchemesForChat(['scholarship'], null, 1);
    expect(Object.keys(s).sort()).toEqual(['authority', 'benefits', 'description', 'documents', 'eligibility', 'id', 'name']);
    expect(s.description.length).toBeLessThanOrEqual(601);
  });

  it('no search words finds nothing (it never returns schemes at random)', async (ctx) => {
    if (!dbUp) ctx.skip();
    expect(await names(['an', ''])).toEqual([]);
  });
});

describe('LIVE (local database): schemes the person clearly does not qualify for are left out', () => {
  it('a man is not offered a widow pension that is for women only; a woman is', async (ctx) => {
    if (!dbUp) ctx.skip();
    const widowPension = 'Indira Gandhi National Widow Pension Scheme';
    expect(await names(['widow', 'pension'], { gender: 'female', age: '50' }, 10)).toContain(widowPension);
    expect(await names(['widow', 'pension'], { gender: 'male', age: '50' }, 10)).not.toContain(widowPension);
  });
});

describe('LIVE (local database): a state named in the question narrows the search, it is not a search word', () => {
  it('"girls college Gujarat" finds education schemes of Gujarat or the centre, not Gujarat farm schemes', async (ctx) => {
    if (!dbUp) ctx.skip();
    const rows = await findSchemesForChat(['girls', 'college', 'Gujarat'], null, 5);
    expect(rows.length).toBe(5);
    for (const s of rows) expect(s.name, s.name).toMatch(/scholarship|college|education|girl/i);
    for (const s of rows) expect(s.authority, s.name).not.toMatch(/^(Kerala|Puducherry|Punjab|Delhi|Tamil Nadu)$/);
  });
});
