import { describe, it, expect, vi, beforeEach } from 'vitest';

// runIngestion writes a dual-ceiling-exclusions report to disk (backend/reports/)
// whenever any exclusion is found — which our mpkskkn-d fixture deliberately
// triggers. Mock fs so the test never touches the real reports/ directory
// (which also holds real Phase A/B output from actual ingestion runs).
vi.mock('fs', () => ({
  default: { mkdirSync: vi.fn(), writeFileSync: vi.fn() },
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Fixture schemes are the exact PHASE_A_LINKS "baseline comparison" cases from
// ingestEligibility.ts, using the real eligibilityRawText sentences from
// backend/data/final_data_without_process_mode_.csv for each:
//   - apy:        "Straightforward age-only (18-40)"
//   - kbpyy:      "Straightforward income-only (2 lakh)"
//   - mpkskkn-d:  dual-ceiling income exclusion (own vs. family income)
// A fourth, synthetic "no criteria" scheme is added to exercise the
// SKIPPED_NO_CRITERIA / cleanup deleteMany path (not itself a verified real case).
const FIXTURE_SCHEMES = [
  {
    id: 'scheme-apy',
    sourceUrl: 'https://www.myscheme.gov.in/schemes/apy',
    name: 'Atal Pension Yojana',
    eligibilityRawText: ['The minimum age of joining APY is 18 years and maximum is 40 years.'],
  },
  {
    id: 'scheme-kbpyy',
    sourceUrl: 'https://www.myscheme.gov.in/schemes/kbpyy',
    name: 'Krishak Bakri Palan Yojna',
    eligibilityRawText: [
      'Farmers belonging to all categories like general/SC/ST/BPL/Women and Landless persons of Himachal Pradesh are eligible.',
      'Persons with annual income not exceeding 2 lakh per annum.',
    ],
  },
  {
    id: 'scheme-mpkskkn-d',
    sourceUrl: 'https://www.myscheme.gov.in/schemes/mpkskkn-d',
    name: 'Madhya Pradesh Kalakar Evam Sahityakar Kalyan Kosh Niyam- Disability Assistance',
    eligibilityRawText: [
      'The applicant should be 21 years of age or above.',
      'The applicant’s monthly income from all sources, including spouse income, should not exceed ₹10,000.',
      'The total monthly family income, including dependents, should not exceed ₹20,000.',
    ],
  },
  {
    id: 'scheme-no-criteria',
    sourceUrl: 'https://example.com/schemes/no-criteria',
    name: 'Synthetic No-Criteria Scheme',
    eligibilityRawText: ['Applicant must be a resident of India.'],
  },
];

const mockPrisma = vi.hoisted(() => ({
  scheme: { findMany: vi.fn() },
  eligibilityCriteria: { upsert: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

const { runIngestion } = await import('./ingestEligibility.js');

describe('ingestEligibility.runIngestion — upsert idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.scheme.findMany.mockResolvedValue(FIXTURE_SCHEMES);
    mockPrisma.eligibilityCriteria.upsert.mockImplementation(({ where }: { where: { schemeId: string } }) =>
      Promise.resolve({ id: `criteria-for-${where.schemeId}` }),
    );
    mockPrisma.eligibilityCriteria.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('derives the correct real criteria for each fixture scheme on a single run', async () => {
    const summary = await runIngestion('A');

    const apyItem = summary.items.find((i) => i.link.endsWith('/apy'))!;
    expect(apyItem.parsed.ageMin).toBe(18);
    expect(apyItem.parsed.ageMax).toBe(40);
    expect(apyItem.rowAction).toBe('CREATED');

    const kbpyyItem = summary.items.find((i) => i.link.endsWith('/kbpyy'))!;
    expect(kbpyyItem.parsed.incomeMaxAnnual).toBe(200000);
    expect(kbpyyItem.parsed.dualCeilingExcluded).toBe(false);

    const dualItem = summary.items.find((i) => i.link.endsWith('/mpkskkn-d'))!;
    expect(dualItem.parsed.dualCeilingExcluded).toBe(true);
    expect(dualItem.parsed.incomeMaxAnnual).toBeNull();
    expect(summary.dualCeilingExclusions).toHaveLength(1);
    expect(summary.dualCeilingExclusions[0].distinctCeilings).toEqual([120000, 240000]);

    const noCriteriaItem = summary.items.find((i) => i.link.endsWith('/no-criteria'))!;
    expect(noCriteriaItem.rowAction).toBe('SKIPPED_NO_CRITERIA');
  });

  it('produces byte-for-byte identical upsert arguments across two consecutive runs (idempotent)', async () => {
    const firstRunSummary = await runIngestion('A');
    const firstRunUpsertCalls = mockPrisma.eligibilityCriteria.upsert.mock.calls.map((c) => c[0]);
    const firstRunDeleteCalls = mockPrisma.eligibilityCriteria.deleteMany.mock.calls.map((c) => c[0]);

    vi.clearAllMocks();
    mockPrisma.scheme.findMany.mockResolvedValue(FIXTURE_SCHEMES);
    mockPrisma.eligibilityCriteria.upsert.mockImplementation(({ where }: { where: { schemeId: string } }) =>
      Promise.resolve({ id: `criteria-for-${where.schemeId}` }),
    );
    mockPrisma.eligibilityCriteria.deleteMany.mockResolvedValue({ count: 0 });

    const secondRunSummary = await runIngestion('A');
    const secondRunUpsertCalls = mockPrisma.eligibilityCriteria.upsert.mock.calls.map((c) => c[0]);
    const secondRunDeleteCalls = mockPrisma.eligibilityCriteria.deleteMany.mock.calls.map((c) => c[0]);

    // Same number of upserts each run (3 schemes with criteria) — a second run
    // must not accumulate extra calls or extra rows.
    expect(firstRunUpsertCalls).toHaveLength(3);
    expect(secondRunUpsertCalls).toHaveLength(3);
    expect(secondRunUpsertCalls).toEqual(firstRunUpsertCalls);

    // Every upsert keys on the natural key (schemeId), which is what makes a
    // re-run update the same row instead of creating a duplicate. `create`
    // additionally carries schemeId itself (redundant with `where` on update,
    // since Prisma's `update` payload never repeats the unique key it's
    // already targeting) — everything else must match between the two branches.
    for (const call of secondRunUpsertCalls) {
      expect(call.where).toHaveProperty('schemeId');
      const { schemeId: _schemeId, ...createRest } = call.create;
      expect(call.update).toEqual(createRest);
    }

    // The no-criteria cleanup path is equally idempotent — same deleteMany key both runs.
    expect(secondRunDeleteCalls).toEqual(firstRunDeleteCalls);
    expect(secondRunDeleteCalls).toEqual([{ where: { schemeId: 'scheme-no-criteria' } }]);

    expect(secondRunSummary.rowsCreatedOrUpdated).toBe(firstRunSummary.rowsCreatedOrUpdated);
    expect(secondRunSummary.dualCeilingExclusions).toEqual(firstRunSummary.dualCeilingExclusions);
  });
});
