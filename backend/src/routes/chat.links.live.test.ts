import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import request from 'supertest';

// A LIVE check against the local database: each search link in the canned chat replies must find the scheme the reply
// is about, first. It needs DATABASE_URL (backend/.env) and a reachable database; without one (as on CI) every test
// here is skipped, not failed.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// config/env.ts exits the process when PORT/SESSION_SECRET/etc. are missing; the routes only need NODE_ENV from it.
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));

const { default: chatRouter } = await import('./chat.js');
const { default: schemesRouter } = await import('./schemes.js');
const { default: prisma } = await import('../db/prisma.js');

const app = express();
app.use(express.json());
app.use('/api/chat', chatRouter);
app.use('/api/schemes', schemesRouter);

let dbUp = false;
beforeAll(async () => {
  dbUp = !!process.env.DATABASE_URL && (await prisma.$queryRaw`SELECT 1`.then(() => true, () => false));
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function linksInReplyTo(text: string): Promise<string[]> {
  const res = await request(app).post('/api/chat/message').send({ text });
  return [...String(res.body.text).matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
}

/** The schemes a page link would show: the link's own query, asked of the API. */
async function searchFor(link: string) {
  const res = await request(app).get('/api/schemes' + link.slice('/search'.length) + '&limit=3');
  return { total: res.body.total as number, names: (res.body.data as Array<{ name: string }>).map((s) => s.name) };
}

describe('LIVE (local database): the chat links open the schemes they talk about', () => {
  it.for([
    ['what is pm kisan', 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)'],
    ['ayushman', 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana'],
  ])('"%s" links to a search that finds %s first', async ([question, scheme], ctx) => {
    if (!dbUp) ctx.skip();
    const [link] = (await linksInReplyTo(question)).filter((l) => l.startsWith('/search?q='));
    expect((await searchFor(link)).names[0]).toBe(scheme);
  });

  it('the scholarship reply links to each of its two schemes, and to education schemes', async (ctx) => {
    if (!dbUp) ctx.skip();
    const [sc, nmmss, education] = await linksInReplyTo('i am a student');
    expect((await searchFor(sc)).names[0]).toBe('Post-Matric Scholarship for SC students');
    expect((await searchFor(nmmss)).names[0]).toBe('National Means-cum-Merit Scholarship Scheme');
    expect((await searchFor(education)).total).toBeGreaterThan(100);
  });
});
