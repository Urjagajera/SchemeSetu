import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SESSION_SECRET = 'test-session-secret-do-not-use-in-prod';

const testConfig = vi.hoisted(() => ({
  NODE_ENV: 'development' as 'development' | 'production' | 'test',
  SESSION_SECRET: 'test-session-secret-do-not-use-in-prod',
  GOOGLE_CLIENT_ID: 'test-google-client-id' as string | undefined,
  CLIENT_URL: 'http://localhost:5173',
}));

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), upsert: vi.fn() },
  bookmark: { deleteMany: vi.fn() },
}));

const mockVerifyIdToken = vi.hoisted(() => vi.fn());

vi.mock('../config/env.js', () => ({ default: testConfig }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const { default: authRouter } = await import('./auth.js');
const { errorHandler } = await import('../middleware/errorHandler.js');
const { SESSION_COOKIE_NAME } = await import('../middleware/requireAuth.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

function extractSessionCookieValue(setCookieHeader: string | string[] | undefined): string | undefined {
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  const raw = values.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!raw) return undefined;
  return raw.split(';')[0].split('=').slice(1).join('=');
}

describe('POST /api/auth/google', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    testConfig.GOOGLE_CLIENT_ID = 'test-google-client-id';
  });

  it('rejects a request with no idToken', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 500 when the server has no GOOGLE_CLIENT_ID configured', async () => {
    testConfig.GOOGLE_CLIENT_ID = undefined;
    const res = await request(app).post('/api/auth/google').send({ idToken: 'anything' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('rejects an idToken that fails Google signature verification', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid signature'));
    const res = await request(app).post('/api/auth/google').send({ idToken: 'bad-token' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a verified token whose payload lacks sub/email', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ name: 'No Sub Or Email' }) });
    const res = await request(app).post('/api/auth/google').send({ idToken: 'weird-token' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in a new user, upserts them, and sets a valid signed session cookie', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: 'google-sub-1', email: 'new@example.com', name: 'New User', picture: 'pic.jpg' }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.upsert.mockResolvedValueOnce({
      id: 'user-uuid-1',
      name: 'New User',
      email: 'new@example.com',
      profilePictureUrl: 'pic.jpg',
    });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'good-token' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      isNewUser: true,
      user: { id: 'user-uuid-1', name: 'New User', email: 'new@example.com', picture: 'pic.jpg' },
    });

    const cookieValue = extractSessionCookieValue(res.headers['set-cookie']);
    expect(cookieValue).toBeDefined();
    const decoded = jwt.verify(cookieValue as string, TEST_SESSION_SECRET) as { userId: string };
    expect(decoded.userId).toBe('user-uuid-1');
  });

  it('reports isNewUser: false for an already-registered Google account', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: 'google-sub-2', email: 'existing@example.com' }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-uuid-2' });
    mockPrisma.user.upsert.mockResolvedValueOnce({
      id: 'user-uuid-2',
      name: null,
      email: 'existing@example.com',
      profilePictureUrl: null,
    });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'good-token-2' });

    expect(res.status).toBe(200);
    expect(res.body.isNewUser).toBe(false);
    expect(res.body.user.name).toBe('Citizen'); // falls back when name is null
  });
});

describe('POST /api/auth/demo-login (removed)', () => {
  it('no longer exists: it 404s whatever the environment and creates no user', async () => {
    vi.clearAllMocks();
    for (const env of ['development', 'production'] as const) {
      testConfig.NODE_ENV = env;
      const res = await request(buildApp()).post('/api/auth/demo-login').send();
      expect(res.status).toBe(404);
    }
    testConfig.NODE_ENV = 'development';
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout', () => {
  it('always returns success and clears the session cookie', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/logout').send();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(res.headers['set-cookie']?.[0]).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=;`));
  });
});

describe('POST /api/auth/logout: cookie attributes', () => {
  afterEach(() => { testConfig.NODE_ENV = 'development'; });

  it.each([
    ['production', /SameSite=None/, /;\s*Secure/],
    ['development', /SameSite=Lax/, null],
  ] as const)('in %s it clears the cookie with the same attributes it is set with', async (env, sameSite, secure) => {
    testConfig.NODE_ENV = env;
    const res = await request(buildApp()).post('/api/auth/logout').send();
    const cleared = String(res.headers['set-cookie']?.[0]);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cleared).toMatch(/;\s*HttpOnly/);
    expect(cleared).toMatch(sameSite);
    if (secure) expect(cleared).toMatch(secure);
    else expect(cleared).not.toMatch(/;\s*Secure/);
  });

  it('is the same cookie attributes sign-in sets', async () => {
    testConfig.NODE_ENV = 'production';
    mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => ({ sub: 'g', email: 'a@b.test' }) });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.upsert.mockResolvedValueOnce({ id: 'u', name: 'A', email: 'a@b.test', profilePictureUrl: null });
    const signIn = await request(buildApp()).post('/api/auth/google').send({ idToken: 'x' });
    const logout = await request(buildApp()).post('/api/auth/logout').send();
    const attrs = (c: string) => c.split(';').map((p) => p.trim()).filter((p) => /^(HttpOnly|Secure|SameSite=.*|Path=.*)$/.test(p)).sort();
    expect(attrs(String(logout.headers['set-cookie']?.[0]))).toEqual(attrs(String(signIn.headers['set-cookie']?.[0])));
  });
});

describe('GET /api/auth/me', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request with no session cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a valid session for a user that no longer exists', async () => {
    const token = jwt.sign({ userId: 'ghost-user' }, TEST_SESSION_SECRET, { expiresIn: '7d' });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/auth/me').set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);

    expect(res.status).toBe(401);
  });

  it('returns the serialized user for a valid session', async () => {
    const token = jwt.sign({ userId: 'user-uuid-3' }, TEST_SESSION_SECRET, { expiresIn: '7d' });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-uuid-3',
      name: 'Existing User',
      email: 'existing3@example.com',
      profilePictureUrl: null,
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 'user-uuid-3',
      name: 'Existing User',
      email: 'existing3@example.com',
      picture: '',
    });
  });
});
