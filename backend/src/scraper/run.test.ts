import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({ inDb: [] as string[], csv: [] as Array<{ sourceUrl: string }>, add: vi.fn() }));
vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    scheme = { findMany: async () => db.inDb.map((sourceUrl) => ({ sourceUrl })) };
    $disconnect = async () => {};
    $queryRaw = async () => [{ ok: 1 }];
  },
}));
vi.mock('../ingestion/csvParser.js', async (orig) => ({ ...(await orig<object>()), parseCsvFile: () => ({ schemes: db.csv }) }));
vi.mock('./addToDatabase.js', () => ({ addNewSchemes: db.add }));

const { parseOptions, syncDatabase, MAX_SYNC, SELF_CHECK_URLS } = await import('./run.js');
const { readCsvRecords } = await import('./csvRow.js');
const fs = await import('fs');

const url = (i: number) => `https://www.myscheme.gov.in/schemes/s${i}`;

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://test';
  db.add.mockReset().mockImplementation(async (_p: unknown, list: unknown[]) => ({ added: list.length, withCriteria: 0 }));
});

describe('parseOptions', () => {
  it('defaults to finding new schemes, 200 at most, writing for real', () => {
    expect(parseOptions([])).toEqual({ mode: 'scrape', dryRun: false, limit: 200, reportPath: null, previewPath: null });
  });

  it('reads --dry-run, --limit, --report and --sync-db; a bad limit falls back to 200', () => {
    expect(parseOptions(['--dry-run', '--limit=40', '--report=r.md'])).toEqual({ mode: 'scrape', dryRun: true, limit: 40, reportPath: 'r.md', previewPath: null });
    expect(parseOptions(['--sync-db']).mode).toBe('sync-db');
    expect(parseOptions(['--limit=abc']).limit).toBe(200);
    expect(parseOptions(['--limit=-5']).limit).toBe(200);
  });
});

describe('syncDatabase: adds CSV schemes the database lacks, and nothing else', () => {
  it('adds exactly the missing ones', async () => {
    db.csv = [1, 2, 3].map((i) => ({ sourceUrl: url(i) }));
    db.inDb = [url(1), url(2)];
    expect(await syncDatabase()).toMatch(/added 1 scheme/);
    expect(db.add.mock.calls[0][1]).toEqual([{ sourceUrl: url(3) }]);
  });

  it('does nothing when the database already has every CSV scheme', async () => {
    db.csv = [{ sourceUrl: url(1) }];
    db.inDb = [url(1)];
    expect(await syncDatabase()).toMatch(/already has every CSV scheme/);
    expect(db.add).not.toHaveBeenCalled();
  });

  it(`refuses when more than ${MAX_SYNC} are missing: probably the wrong or an empty database`, async () => {
    db.csv = Array.from({ length: MAX_SYNC + 1 }, (_, i) => ({ sourceUrl: url(i) }));
    db.inDb = [];
    await expect(syncDatabase()).rejects.toThrow(/wrong or an empty database/);
    expect(db.add).not.toHaveBeenCalled();
  });

  it('refuses without a database address', async () => {
    delete process.env.DATABASE_URL;
    await expect(syncDatabase()).rejects.toThrow(/DATABASE_URL/);
  });
});

describe('the self-check schemes', () => {
  it('are all in the CSV', async () => {
    const path = await import('path');
    const csv = readCsvRecords(fs.readFileSync(path.resolve(__dirname, '../../data/final_data_without_process_mode_.csv')));
    const urls = new Set(csv.map((r) => r.url));
    for (const u of SELF_CHECK_URLS) expect(urls.has(u), u).toBe(true);
  });
});
