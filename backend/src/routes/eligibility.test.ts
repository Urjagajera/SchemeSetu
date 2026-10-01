import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockPrisma = vi.hoisted(() => ({
  scheme: { findUnique: vi.fn() },
}));

// errorHandler -> config/env.ts exits the process when required vars are missing (CI has no .env).
vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

const { default: eligibilityRouter } = await import('./eligibility.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/eligibility', eligibilityRouter);
  app.use(errorHandler);
  return app;
}

function schemeWith(criteria: Record<string, unknown>) {
  return {
    id: 'scheme-1',
    name: 'Test Scheme',
    tags: [],
    eligibilityCriteria: {
      ageMin: null,
      ageMax: null,
      incomeMinAnnual: null,
      incomeMaxAnnual: null,
      gender: null,
      category: null,
      occupation: null,
      state: null,
      landOwnership: null,
      ...criteria,
    },
  };
}

async function report(criteria: Record<string, unknown>, profile: Record<string, string>, tags: string[] = []) {
  mockPrisma.scheme.findUnique.mockResolvedValue({ ...schemeWith(criteria), tags: tags.map((name) => ({ name })) });
  const res = await request(buildApp()).post('/api/eligibility/report').send({ profile, schemeId: 'scheme-1' });
  return res.body;
}

describe('POST /api/eligibility/report: gender and category set membership', () => {
  beforeEach(() => mockPrisma.scheme.findUnique.mockReset());

  it('passes a female profile on a female-only scheme and fails a male one', async () => {
    const pass = await report({ gender: 'female' }, { gender: 'female' });
    expect(pass.isEligible).toBe(true);
    expect(pass.passedCriteria).toContain('Gender matches (female)');

    const fail = await report({ gender: 'female' }, { gender: 'male' });
    expect(fail.isEligible).toBe(false);
    expect(fail.failedCriteria).toContain('Gender must be female');
  });

  it('passes either SC or ST on an "sc,st" scheme and fails general and OBC', async () => {
    expect((await report({ category: 'sc,st' }, { category: 'sc' })).isEligible).toBe(true);
    expect((await report({ category: 'sc,st' }, { category: 'st' })).isEligible).toBe(true);

    const fail = await report({ category: 'sc,st' }, { category: 'general' });
    expect(fail.isEligible).toBe(false);
    expect(fail.failedCriteria).toContain('Social category must be SC or ST');
    expect((await report({ category: 'sc,st' }, { category: 'obc' })).isEligible).toBe(false);
  });

  it('requires BOTH gates on a scheme with gender and category', async () => {
    const criteria = { gender: 'female', category: 'sc' };
    expect((await report(criteria, { gender: 'female', category: 'sc' })).isEligible).toBe(true);
    expect((await report(criteria, { gender: 'female', category: 'st' })).isEligible).toBe(false);
    expect((await report(criteria, { gender: 'male', category: 'sc' })).isEligible).toBe(false);
  });

  it('counts the new gates in the match percentage together with age', async () => {
    const body = await report(
      { ageMin: 18, gender: 'female', category: 'sc,st' },
      { age: '30', gender: 'female', category: 'general' },
    );
    expect(body.isEligible).toBe(false);
    expect(body.overallMatch).toBe(67); // age and gender passed, category failed: 2 of 3
  });

  it('matches profile gender "other" to a transgender-only scheme', async () => {
    expect((await report({ gender: 'transgender' }, { gender: 'other' })).isEligible).toBe(true);
    expect((await report({ gender: 'transgender' }, { gender: 'female' })).isEligible).toBe(false);
  });

  it('skips a gate the profile cannot answer instead of failing it, and says what is missing', async () => {
    const body = await report({ gender: 'female', ageMin: 18 }, { age: '30' });
    expect(body.isEligible).toBe(true);
    expect(body.failedCriteria).toEqual([]);
    expect(body.unverifiedCriteria).toEqual(['Gender']);
  });
});

describe('POST /api/eligibility/report: an unset profile is "unknown", never an exclusion', () => {
  beforeEach(() => mockPrisma.scheme.findUnique.mockReset());

  it('an empty profile is not ineligible for a female-only SC-only scheme, and the unknowns are listed', async () => {
    const body = await report({ gender: 'female', category: 'sc' }, {});
    expect(body.isEligible).toBe(true);
    expect(body.failedCriteria).toEqual([]);
    expect(body.unverifiedCriteria).toEqual(['Gender', 'Social category']);
    expect(body.reasons.join(' ')).toMatch(/Gender, Social category/);
  });

  it('empty-string and whitespace values count as unset, not as a value to compare', async () => {
    const body = await report({ gender: 'female', category: 'sc', ageMin: 18 }, { gender: '', category: '  ', age: '' });
    expect(body.isEligible).toBe(true);
    expect(body.unverifiedCriteria).toEqual(['Age', 'Gender', 'Social category']);
  });

  it('a known value still fails while an unknown one is only noted', async () => {
    const body = await report({ gender: 'female', category: 'sc' }, { gender: 'male' });
    expect(body.isEligible).toBe(false);
    expect(body.failedCriteria).toEqual(['Gender must be female']);
    expect(body.unverifiedCriteria).toEqual(['Social category']);
  });

  it('when nothing can be checked, it shows no keyword-mismatch noise as "missing requirements" and no match percentage', async () => {
    const body = await report({ gender: 'female', category: 'sc' }, {}, ['Scheduled Caste', 'Girl Student', 'Scholarship']);
    expect(body.isEligible).toBe(true);
    expect(body.overallMatch).toBe(0);
    expect(body.failedCriteria).toEqual([]);
    expect(body.passedCriteria).toEqual([]);
    expect(body.unverifiedCriteria).toEqual(['Gender', 'Social category']);
  });

  it('a scheme with no criteria on file still uses the tag fallback and is not affected', async () => {
    mockPrisma.scheme.findUnique.mockResolvedValue({ id: 'scheme-1', name: 'Tag-only', tags: [{ name: 'Farmer' }], eligibilityCriteria: null });
    const res = await request(buildApp()).post('/api/eligibility/report').send({ profile: { occupation: 'farmer' }, schemeId: 'scheme-1' });
    expect(res.body.isEligible).toBe(true);
    expect(res.body.passedCriteria).toEqual(['Interest match: "Farmer"']);
    expect(res.body.unverifiedCriteria).toEqual([]);
  });

  it('a fully answered profile reports nothing unverified', async () => {
    const body = await report({ gender: 'female', category: 'sc' }, { gender: 'female', category: 'sc' });
    expect(body.unverifiedCriteria).toEqual([]);
  });
});
