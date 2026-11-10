import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

type Row = Record<string, any>;

// A small in-memory table, so "only their own family members" is checked on real rows.
const db = vi.hoisted(() => {
  const state = { rows: [] as Row[], next: 1 };
  const match = (r: Row, where: Row) => Object.entries(where).every(([k, v]) => r[k] === v);
  return {
    state,
    prisma: {
      familyMember: {
        findMany: async ({ where }: { where: Row }) => state.rows.filter((r) => match(r, where)),
        findFirst: async ({ where }: { where: Row }) => state.rows.find((r) => match(r, where)) ?? null,
        count: async ({ where }: { where: Row }) => state.rows.filter((r) => match(r, where)).length,
        create: async ({ data }: { data: Row }) => {
          const row = { id: `m${state.next++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
          state.rows.push(row);
          return row;
        },
        updateMany: async ({ where, data }: { where: Row; data: Row }) => {
          const hit = state.rows.filter((r) => match(r, where));
          hit.forEach((r) => Object.assign(r, data));
          return { count: hit.length };
        },
        deleteMany: async ({ where }: { where: Row }) => {
          const before = state.rows.length;
          state.rows = state.rows.filter((r) => !match(r, where));
          return { count: before - state.rows.length };
        },
      },
    },
  };
});

const session = vi.hoisted(() => ({ userId: 'u1' as string | null }));
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: db.prisma }));
vi.mock('../middleware/requireAuth.js', () => ({
  requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!session.userId) {
      res.status(401).json({ error: { message: 'Not signed in', status: 401 } });
      return;
    }
    req.user = { userId: session.userId };
    next();
  },
}));

const { default: familyRouter, MAX_FAMILY_MEMBERS } = await import('./family.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/family', familyRouter);
  a.use(errorHandler);
  return a;
}

beforeEach(() => {
  session.userId = 'u1';
  db.state.rows = [];
});

describe('/api/family', () => {
  it('needs sign-in', async () => {
    session.userId = null;
    expect((await request(app()).get('/api/family')).status).toBe(401);
  });

  it('adds a member with validated answers and works out the age from the birth date', async () => {
    const res = await request(app()).post('/api/family').send({ label: 'Mother', dob: '1960-05-01', gender: 'FEMALE', state: 'gujarat', bpl: 'yes', govtJob: 'family' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ label: 'Mother', gender: 'female', state: 'Gujarat', bpl: 'yes', govtJob: 'family' });
    expect(Number(res.body.age)).toBeGreaterThanOrEqual(65);
    const list = await request(app()).get('/api/family');
    expect(list.body.members).toHaveLength(1);
    expect(list.body.max).toBe(MAX_FAMILY_MEMBERS);
  });

  it('rejects a missing name and an invalid answer, saying which field', async () => {
    expect((await request(app()).post('/api/family').send({ gender: 'female' })).body.error.fields.label).toBeTruthy();
    expect((await request(app()).post('/api/family').send({ label: 'Son', govtJob: 'maybe' })).body.error.fields.govtJob).toBeTruthy();
  });

  it(`allows at most ${6} members`, async () => {
    for (let i = 0; i < MAX_FAMILY_MEMBERS; i++) expect((await request(app()).post('/api/family').send({ label: `P${i}` })).status).toBe(201);
    expect((await request(app()).post('/api/family').send({ label: 'One more' })).status).toBe(409);
  });

  it('changes and deletes only the caller\'s own members', async () => {
    const mine = (await request(app()).post('/api/family').send({ label: 'Father' })).body;
    session.userId = 'u2';
    expect((await request(app()).put(`/api/family/${mine.id}`).send({ income: '50000' })).status).toBe(404);
    expect((await request(app()).delete(`/api/family/${mine.id}`)).status).toBe(404);
    expect((await request(app()).get('/api/family')).body.members).toEqual([]);
    session.userId = 'u1';
    const changed = await request(app()).put(`/api/family/${mine.id}`).send({ income: '50000', label: 'Papa' });
    expect(changed.body).toMatchObject({ label: 'Papa', income: '50000' });
    expect((await request(app()).delete(`/api/family/${mine.id}`)).status).toBe(200);
    expect(db.state.rows).toEqual([]);
  });
});
