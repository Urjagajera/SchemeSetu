import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({
  profile: { findUnique: vi.fn(), upsert: vi.fn() },
  user: { update: vi.fn() },
  $transaction: vi.fn(),
}));

// errorHandler -> config/env.ts exits the process when required vars are missing (CI has no .env).
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));
// The session cookie check is covered by requireAuth.test.ts; here every request is "logged in".
vi.mock('../middleware/requireAuth.js', () => ({
  SESSION_COOKIE_NAME: 'schemesetu_session',
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { userId: 'user-1' };
    next();
  },
}));

const { default: profileRouter } = await import('./profile.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/profile', profileRouter);
  app.use(errorHandler);
  return app;
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'p1', userId: 'user-1', age: '30', dob: null, gender: 'female', occupation: null, education: null,
    income: null, category: null, state: null, district: null, residence: null, minority: null,
    disability: null, farmer: null, widow: null, veteran: null, land: null, profileTags: [],
    ...over,
  };
}

describe('GET /api/profile: residence', () => {
  beforeEach(() => mockPrisma.profile.findUnique.mockReset());

  it('returns the saved residence', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(row({ residence: 'rural' }));
    const res = await request(buildApp()).get('/api/profile');
    expect(res.status).toBe(200);
    expect(res.body.profile.residence).toBe('rural');
  });

  it('omits residence when it was never set (unknown, not a default)', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(row());
    const res = await request(buildApp()).get('/api/profile');
    expect(res.body.profile).not.toHaveProperty('residence');
  });

  it('returns profile: null for a user who never saved one', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null);
    const res = await request(buildApp()).get('/api/profile');
    expect(res.body).toEqual({ profile: null });
  });
});

describe('PUT /api/profile: residence', () => {
  beforeEach(() => {
    mockPrisma.profile.upsert.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.profile.upsert.mockImplementation((args: unknown) => args);
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => [row({ residence: 'urban' }), ...ops.slice(1)]);
  });

  it('writes residence on both create and update, and returns it', async () => {
    const res = await request(buildApp()).put('/api/profile').send({ gender: 'female', residence: 'urban' });
    expect(res.status).toBe(200);
    const args = mockPrisma.profile.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'user-1' });
    expect(args.create).toMatchObject({ userId: 'user-1', residence: 'urban' });
    expect(args.update).toMatchObject({ residence: 'urban' });
    expect(res.body.profile.residence).toBe('urban');
  });

  it('leaves residence untouched when the update does not mention it', async () => {
    await request(buildApp()).put('/api/profile').send({ age: '31' });
    const args = mockPrisma.profile.upsert.mock.calls[0][0];
    // Prisma treats undefined as "don't touch this column"
    expect(args.update.residence).toBeUndefined();
    expect(args.create.residence).toBeUndefined();
  });
});
