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

describe('PUT /api/profile: partial saves and validation', () => {
  const put = (body: unknown) => request(buildApp()).put('/api/profile').send(body as object);
  const upsertArgs = () => mockPrisma.profile.upsert.mock.calls[0][0];

  beforeEach(() => {
    mockPrisma.profile.upsert.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.profile.upsert.mockImplementation((args: unknown) => args);
    mockPrisma.user.update.mockImplementation((args: unknown) => args);
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => [row(), ...ops.slice(1)]);
  });

  it('saves a profile with only a name: nothing else is written', async () => {
    const res = await put({ name: 'Asha Patel' });
    expect(res.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { name: 'Asha Patel' } });
    for (const v of Object.values(upsertArgs().update)) expect(v).toBeUndefined();
  });

  it('saves just one or two fields and leaves the rest untouched', async () => {
    await put({ age: '34', state: 'Gujarat' });
    expect(upsertArgs().update).toMatchObject({ age: '34', state: 'Gujarat' });
    expect(upsertArgs().update.gender).toBeUndefined();
    expect(upsertArgs().update.income).toBeUndefined();
  });

  it('clears a previously saved field when it is sent blank (stored as null, i.e. unknown)', async () => {
    await put({ age: '', gender: '   ', income: null, state: '', occupation: '' });
    const u = upsertArgs().update;
    expect(u.age).toBeNull();
    expect(u.gender).toBeNull();
    expect(u.income).toBeNull();
    expect(u.state).toBeNull();
    expect(u.occupation).toBeNull();
    expect(upsertArgs().create.age).toBeNull();
  });

  it('keeps income 0: it is an answer, not "unknown"', async () => {
    await put({ income: '0' });
    expect(upsertArgs().update.income).toBe('0');
  });

  it('accepts numbers for age/income, any case for options, and ignores unknown keys', async () => {
    await put({ age: 34, income: 250000, gender: 'Female', category: 'OBC', role: 'admin', email: 'x@y.z' });
    const u = upsertArgs().update;
    expect(u).toMatchObject({ age: '34', income: '250000', gender: 'female', category: 'obc' });
    expect(u).not.toHaveProperty('role');
    expect(u).not.toHaveProperty('email');
  });

  it('trims and de-duplicates interests, and accepts the "interests" alias', async () => {
    await put({ interests: [' farming ', 'farming', '', 'women'] });
    expect(upsertArgs().update.profileTags).toEqual(['farming', 'women']);
    mockPrisma.profile.upsert.mockClear();
    await put({ profileTags: [] });
    expect(upsertArgs().update.profileTags).toEqual([]);
  });

  describe('rejects values that make no sense, with a message per field and no database write', () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['age 0', { age: '0' }, 'age'],
      ['age 121', { age: '121' }, 'age'],
      ['age not a number', { age: 'abc' }, 'age'],
      ['age with decimals', { age: '30.5' }, 'age'],
      ['negative income', { income: '-5' }, 'income'],
      ['income with decimals', { income: '1.5' }, 'income'],
      ['income with letters', { income: '5 lakh' }, 'income'],
      ['future date of birth', { dob: '2999-01-01' }, 'dob'],
      ['impossible date of birth', { dob: '2020-02-31' }, 'dob'],
      ['date of birth in the wrong format', { dob: '12/05/1990' }, 'dob'],
      ['unknown gender', { gender: 'robot' }, 'gender'],
      ['unknown category', { category: 'brahmin' }, 'category'],
      ['unknown residence', { residence: 'suburban' }, 'residence'],
      ['yes/no field with another answer', { disability: 'maybe' }, 'disability'],
      ['one-letter name', { name: 'A' }, 'name'],
      ['blank name (it can be left out, but not blanked)', { name: '   ' }, 'name'],
      ['state far too long', { state: 'x'.repeat(101) }, 'state'],
      ['too many interests', { interests: Array.from({ length: 51 }, (_, i) => `tag${i}`) }, 'interests'],
      ['an interest that is far too long', { profileTags: ['y'.repeat(61)] }, 'profileTags'],
    ];

    it.each(cases)('%s', async (_label, body, field) => {
      const res = await put(body);
      expect(res.status).toBe(400);
      expect(res.body.error.status).toBe(400);
      expect(typeof res.body.error.fields[field]).toBe('string');
      expect(res.body.error.fields[field].length).toBeGreaterThan(5);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.profile.upsert).not.toHaveBeenCalled();
    });

    it('reports every bad field at once, and saves none of the good ones', async () => {
      const res = await put({ age: '999', income: '-1', gender: 'female', state: 'Goa' });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(['age', 'income']);
      expect(mockPrisma.profile.upsert).not.toHaveBeenCalled();
    });
  });
});
