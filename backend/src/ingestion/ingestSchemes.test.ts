import { describe, it, expect, vi, beforeEach } from 'vitest';

// ingestSchemes.ts is a CLI script: it runs its ingestion loop as an
// unguarded top-level side effect on import (`runIngestion().catch().finally()`,
// not exported), because it's only ever meant to be invoked via `npm run
// ingest:schemes`. To exercise it in a test without changing that production
// entry point, each test re-imports it fresh (vi.resetModules) with the CSV
// parser, filesystem check, and Prisma client mocked, then waits for the
// mocked prisma.$disconnect() call that only happens once the async
// ingestion loop (and its .finally()) has actually completed.

const FIXTURE_SCHEMES = [
  {
    sourceUrl: 'https://example.com/schemes/a',
    authorityName: 'Ministry Of Testing',
    name: 'Scheme A',
    tags: ['Tag1', 'Tag2'],
    description: 'Desc A',
    benefits: ['Benefit A'],
    documentRequirements: [] as string[],
    applicationMode: ['Online'],
    applicationProcess: 'Process A',
    eligibilityRawText: ['Elig A'],
  },
  {
    sourceUrl: 'https://example.com/schemes/b',
    authorityName: 'Rajasthan',
    name: 'Scheme B',
    tags: ['Tag2'],
    description: 'Desc B',
    benefits: [] as string[],
    documentRequirements: ['Doc B'],
    applicationMode: [] as string[],
    applicationProcess: null as string | null,
    eligibilityRawText: [] as string[],
  },
];

const mockPrisma = vi.hoisted(() => ({
  scheme: { upsert: vi.fn().mockResolvedValue({ id: 'irrelevant' }) },
  $disconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  default: { existsSync: () => true },
  existsSync: () => true,
}));
vi.mock('./csvParser.js', () => ({
  parseCsvFile: () => ({
    schemes: FIXTURE_SCHEMES,
    totalRows: FIXTURE_SCHEMES.length,
    mojibakeModifiedRowCount: 0,
    mojibakeExamples: [],
    salvagedRowCount: 0,
    salvageExamples: [],
    duplicateLinks: [],
  }),
}));
vi.mock('../db/prisma.js', () => ({ default: mockPrisma }));

async function runIngestScript(): Promise<void> {
  vi.resetModules();
  await import('./ingestSchemes.js');
  await vi.waitFor(() => expect(mockPrisma.$disconnect).toHaveBeenCalled());
}

const expectedUpsertArgsFor = (scheme: (typeof FIXTURE_SCHEMES)[number], level: 'Central' | 'State') => {
  const categoryLink = {
    connectOrCreate: {
      where: { name: scheme.authorityName },
      create: {
        name: scheme.authorityName,
        level,
        stateName: level === 'State' ? scheme.authorityName : null,
      },
    },
  };
  const tagLink = {
    connectOrCreate: scheme.tags.map((tag) => ({ where: { name: tag }, create: { name: tag } })),
  };

  return {
    where: { sourceUrl: scheme.sourceUrl },
    update: {
      name: scheme.name,
      authorityName: scheme.authorityName,
      description: scheme.description,
      benefits: scheme.benefits,
      documentRequirements: scheme.documentRequirements,
      applicationMode: scheme.applicationMode,
      applicationProcess: scheme.applicationProcess,
      eligibilityRawText: scheme.eligibilityRawText,
      categories: { set: [], ...categoryLink },
      tags: { set: [], ...tagLink },
    },
    create: {
      sourceUrl: scheme.sourceUrl,
      name: scheme.name,
      authorityName: scheme.authorityName,
      description: scheme.description,
      benefits: scheme.benefits,
      documentRequirements: scheme.documentRequirements,
      applicationMode: scheme.applicationMode,
      applicationProcess: scheme.applicationProcess,
      eligibilityRawText: scheme.eligibilityRawText,
      categories: categoryLink,
      tags: tagLink,
    },
  };
};

describe('ingestSchemes (CLI script) — upsert idempotency', () => {
  beforeEach(() => {
    mockPrisma.scheme.upsert.mockClear();
    mockPrisma.$disconnect.mockClear();
  });

  it('upserts every row keyed on sourceUrl, with tags/categories linked via connectOrCreate (not blind create)', async () => {
    await runIngestScript();

    expect(mockPrisma.scheme.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.scheme.upsert).toHaveBeenNthCalledWith(1, expectedUpsertArgsFor(FIXTURE_SCHEMES[0], 'Central'));
    expect(mockPrisma.scheme.upsert).toHaveBeenNthCalledWith(2, expectedUpsertArgsFor(FIXTURE_SCHEMES[1], 'State'));
  });

  it('produces identical upsert arguments on a second run of the same CSV data (idempotent, no duplication)', async () => {
    await runIngestScript();
    const firstRunArgs = mockPrisma.scheme.upsert.mock.calls.map((c) => c[0]);

    mockPrisma.scheme.upsert.mockClear();
    mockPrisma.$disconnect.mockClear();

    await runIngestScript();
    const secondRunArgs = mockPrisma.scheme.upsert.mock.calls.map((c) => c[0]);

    expect(secondRunArgs).toEqual(firstRunArgs);
    // Re-running never grows the call count for the same input set — each
    // scheme is still one upsert, not an accumulating create.
    expect(secondRunArgs).toHaveLength(2);
  });
});
