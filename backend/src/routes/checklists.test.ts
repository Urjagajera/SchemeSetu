import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

type Row = Record<string, any>;

// A small in-memory table, so "only their own ticks" is checked on real rows, not on mocks of calls.
const db = vi.hoisted(() => {
  const state = {
    schemes: [] as Row[],
    checklists: [] as Row[],
  };
  const key = (w: Row) => w.userId_schemeId ?? w;
  return {
    state,
    prisma: {
      scheme: { findUnique: async ({ where }: { where: Row }) => state.schemes.find((s) => s.id === where.id) ?? null },
      documentChecklist: {
        findUnique: async ({ where }: { where: Row }) => {
          const k = key(where);
          return state.checklists.find((c) => c.userId === k.userId && c.schemeId === k.schemeId) ?? null;
        },
        upsert: async ({ where, create, update }: { where: Row; create: Row; update: Row }) => {
          const k = key(where);
          const row = state.checklists.find((c) => c.userId === k.userId && c.schemeId === k.schemeId);
          if (row) return Object.assign(row, update);
          state.checklists.push({ ...create });
          return create;
        },
        deleteMany: async ({ where }: { where: Row }) => {
          const before = state.checklists.length;
          state.checklists = state.checklists.filter((c) => !(c.userId === where.userId && c.schemeId === where.schemeId));
          return { count: before - state.checklists.length };
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

const { default: checklistsRouter } = await import('./checklists.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/checklists', checklistsRouter);
  a.use(errorHandler);
  return a;
}
const get = (schemeId: string) => request(app()).get(`/api/checklists/${schemeId}`);
const put = (schemeId: string, body: unknown) => request(app()).put(`/api/checklists/${schemeId}`).send(body as object);

const DOCS = ['Aadhaar Card', 'Ration Card', 'Income Certificate', 'Any other documents as required'];

beforeEach(() => {
  session.userId = 'u1';
  db.state.schemes = [{ id: 's1', documentRequirements: DOCS }];
  db.state.checklists = [{ userId: 'u2', schemeId: 's1', checked: ['Income Certificate'], unchecked: [] }];
});

describe('document checklists need a signed-in session', () => {
  it('reading and saving are both 401 without one', async () => {
    session.userId = null;
    expect((await get('s1')).status).toBe(401);
    expect((await put('s1', { checked: ['Aadhaar Card'] })).status).toBe(401);
    expect(db.state.checklists).toHaveLength(1);
  });
});

describe('GET /api/checklists/:schemeId', () => {
  it('is two empty lists when nothing was saved', async () => {
    const res = await get('s1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ checked: [], unchecked: [] });
  });

  it('never returns another person\'s ticks for the same scheme', async () => {
    session.userId = 'u2';
    expect((await get('s1')).body.checked).toEqual(['Income Certificate']);
    session.userId = 'u1';
    expect((await get('s1')).body.checked).toEqual([]);
  });
});

describe('PUT /api/checklists/:schemeId', () => {
  it('saves ticks and reads them back', async () => {
    const res = await put('s1', { checked: ['Aadhaar Card'], unchecked: ['Ration Card'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ checked: ['Aadhaar Card'], unchecked: ['Ration Card'] });
    expect((await get('s1')).body).toEqual({ checked: ['Aadhaar Card'], unchecked: ['Ration Card'] });
  });

  it('replaces what was there, and leaves the other person\'s row alone', async () => {
    await put('s1', { checked: ['Aadhaar Card', 'Ration Card'] });
    await put('s1', { checked: ['Ration Card'] });
    expect((await get('s1')).body).toEqual({ checked: ['Ration Card'], unchecked: [] });
    expect(db.state.checklists.find((c) => c.userId === 'u2')).toEqual({ userId: 'u2', schemeId: 's1', checked: ['Income Certificate'], unchecked: [] });
  });

  it('keeps only lines that are in the scheme\'s list, each once', async () => {
    const res = await put('s1', { checked: ['Aadhaar Card', 'Aadhaar Card', 'Something made up', '<script>'], unchecked: ['Not a line'] });
    expect(res.body).toEqual({ checked: ['Aadhaar Card'], unchecked: [] });
  });

  it('a line ticked by hand is never also stored as unticked', async () => {
    const res = await put('s1', { checked: ['Ration Card'], unchecked: ['Ration Card', 'Income Certificate'] });
    expect(res.body).toEqual({ checked: ['Ration Card'], unchecked: ['Income Certificate'] });
  });

  it('two empty lists remove the row instead of keeping an empty one', async () => {
    await put('s1', { checked: ['Aadhaar Card'] });
    await put('s1', { checked: [], unchecked: [] });
    expect(db.state.checklists.filter((c) => c.userId === 'u1')).toEqual([]);
  });

  it('is 404 for a scheme that does not exist, and saves nothing', async () => {
    const res = await put('nope', { checked: ['Aadhaar Card'] });
    expect(res.status).toBe(404);
    expect(db.state.checklists).toHaveLength(1);
  });

  it('rejects a body that is not two lists of text', async () => {
    for (const body of [{ checked: 'Aadhaar Card' }, { checked: [1, 2] }, { unchecked: { a: 1 } }]) {
      expect((await put('s1', body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(db.state.checklists).toHaveLength(1);
  });

  it('rejects more lines than any scheme has', async () => {
    const res = await put('s1', { checked: Array.from({ length: 201 }, (_, i) => `line ${i}`) });
    expect(res.status).toBe(400);
  });
});
