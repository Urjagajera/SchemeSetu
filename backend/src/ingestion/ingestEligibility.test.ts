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

describe('ingestEligibility.runIngestion — gender and category', () => {
  const DEMOGRAPHIC_SCHEMES = [
    {
      id: 'scheme-girls-sc',
      sourceUrl: 'https://example.com/schemes/girls-sc',
      name: 'Kanya Saksharta style scheme (demographics only)',
      eligibilityRawText: [
        'The applicant should be a girl student.',
        'The girl student should belong to the Scheduled Caste category.',
      ],
    },
    {
      id: 'scheme-age-and-st',
      sourceUrl: 'https://example.com/schemes/age-and-st',
      name: 'Age plus category scheme',
      eligibilityRawText: [
        'The minimum age of joining is 18 years and maximum is 40 years.',
        'The applicant must belong to the Scheduled Tribe category.',
      ],
    },
    {
      id: 'scheme-tier-only',
      sourceUrl: 'https://example.com/schemes/tier-only',
      name: 'Mentions SC/ST and women only as benefit tiers',
      eligibilityRawText: ['Women, SC, and ST beneficiaries are eligible for 60% assistance of the unit cost.'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.scheme.findMany.mockResolvedValue(DEMOGRAPHIC_SCHEMES);
    mockPrisma.eligibilityCriteria.upsert.mockImplementation(({ where }: { where: { schemeId: string } }) =>
      Promise.resolve({ id: `criteria-for-${where.schemeId}` }),
    );
    mockPrisma.eligibilityCriteria.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('creates a row for a scheme whose only criteria are gender and category', async () => {
    const summary = await runIngestion('B');
    const call = mockPrisma.eligibilityCriteria.upsert.mock.calls
      .map((c) => c[0])
      .find((c) => c.where.schemeId === 'scheme-girls-sc');
    expect(call).toBeDefined();
    expect(call.create).toMatchObject({ gender: 'female', category: 'sc', ageMin: null, incomeMaxAnnual: null });
    expect(call.update).toMatchObject({ gender: 'female', category: 'sc' });
    expect(summary.items.find((i) => i.link.endsWith('/girls-sc'))!.rowAction).toBe('CREATED');
  });

  it('keeps age and adds category on the same row for a scheme that has both', async () => {
    await runIngestion('B');
    const calls = mockPrisma.eligibilityCriteria.upsert.mock.calls.map((c) => c[0]);
    const call = calls.find((c) => c.where.schemeId === 'scheme-age-and-st');
    expect(call.create).toMatchObject({ ageMin: 18, ageMax: 40, category: 'st', gender: null });
    // one upsert per scheme keyed on schemeId: no second row for the same scheme
    expect(calls.filter((c) => c.where.schemeId === 'scheme-age-and-st')).toHaveLength(1);
  });

  it('does not create a row (and cleans up any old one) when a scheme only mentions groups as benefit tiers', async () => {
    const summary = await runIngestion('B');
    expect(mockPrisma.eligibilityCriteria.upsert.mock.calls.map((c) => c[0].where.schemeId)).not.toContain('scheme-tier-only');
    expect(mockPrisma.eligibilityCriteria.deleteMany).toHaveBeenCalledWith({ where: { schemeId: 'scheme-tier-only' } });
    expect(summary.genderRestricted).toBe(1);
    expect(summary.categoryRestricted).toBe(2);
  });
});
