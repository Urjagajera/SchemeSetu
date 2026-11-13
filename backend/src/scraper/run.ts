/**
 * The weekly myScheme check: find schemes on https://www.myscheme.gov.in that SchemeSetu does not have yet, read
 * them, and add them to the CSV and the database. Existing schemes are never changed or deleted.
 *
 *   npm run scrape:new-schemes -- --dry-run      reads everything, writes nothing, prints the report
 *   npm run scrape:new-schemes                    finds and reads new schemes, appends them to the CSV
 *   npm run scrape:new-schemes -- --sync-db       adds CSV schemes the database does not have yet (create only)
 *   npm run scrape:new-schemes -- --check-db      says whether DATABASE_URL works, in plain words (never fails the run)
 * Options: --limit=N (new schemes per run, default 200), --report=<file>,
 *          --preview=<file> (dry run: also write the rows that would be added to this separate CSV, to look at).
 *
 * The GitHub workflow (.github/workflows/new-schemes.yml) runs the second, commits the CSV, then runs the third.
 * The CSV is the record: if the database step ever fails, the next week's --sync-db adds what is missing, so the
 * two never stay apart.
 *
 * Steps of a run, and why:
 *   1. Self-check: 5 schemes already in the CSV are read again; if any differs, myScheme probably changed its pages,
 *      so the run stops before writing anything.
 *   2. List every scheme on myScheme; compare (after link clean-up) with the CSV and, when it is reachable, the database.
 *   3. Read up to --limit new schemes. A page that comes back incomplete, with an unknown way to apply, or with the
 *      title and ministry of a scheme we already have (a likely duplicate under another link) is NOT added: it is
 *      listed in the report, and tried again next run.
 *   4. Schemes in the CSV that myScheme no longer lists are opened once more; those really gone are listed. Nothing
 *      is changed for them.
 *   5. The new rows are appended to the CSV (existing bytes are checked to be unchanged).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { Page } from 'playwright';
import type { PrismaClient } from '@prisma/client';
import { CSV_HEADER, ScrapedScheme, encodeCsvRow, toCsvValues, appendCsvRows, checkAppendable, readCsvRecords } from './csvRow.js';
import { canonicalSchemeUrl } from './schemeUrl.js';
import { learnRelatedTags, withRelatedTags } from './relatedTags.js';
import { problems, selfCheckDiffs, titleKey } from './checks.js';
import { openBrowser, newSchemePage, readSchemePageWithRetry, listAllSchemeUrls, PAUSE_MS } from './myschemePage.js';
import { renderReport, RunReport } from './report.js';
import { cleanDatabaseUrl, databaseErrorReason, databaseUrlProblems } from './databaseCheck.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On a PC, DATABASE_URL comes from backend/.env; on GitHub it is a repository secret.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
export const CSV_PATH = path.resolve(__dirname, '../../data/final_data_without_process_mode_.csv');

/** Schemes read again at the start of every run (they matched the CSV exactly in the 2026-11-05 trial). */
export const SELF_CHECK_URLS = [
  'https://www.myscheme.gov.in/schemes/obdopmtig',
  'https://www.myscheme.gov.in/schemes/iwp',
  'https://www.myscheme.gov.in/schemes/nat',
  'https://www.myscheme.gov.in/schemes/isfepqiisaradocofics',
  'https://www.myscheme.gov.in/schemes/ccs-goa',
];
/** The listing must have at least this share of the total myScheme says it has, or "gone" checks are skipped. */
const LISTING_COMPLETE = 0.98;
/** At most this many "no longer listed" schemes are opened to confirm they are gone. */
const MAX_GONE_CHECKS = 150;
/** --sync-db refuses when more CSV schemes than this are missing from the database: it is probably the wrong database. */
export const MAX_SYNC = 300;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Options {
  mode: 'scrape' | 'sync-db' | 'check-db';
  dryRun: boolean;
  limit: number;
  reportPath: string | null;
  previewPath: string | null;
}

export function parseOptions(argv: string[]): Options {
  const value = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const limit = Number(value('limit') ?? 200);
  return {
    mode: argv.includes('--sync-db') ? 'sync-db' : argv.includes('--check-db') ? 'check-db' : 'scrape',
    dryRun: argv.includes('--dry-run'),
    limit: Number.isInteger(limit) && limit > 0 ? limit : 200,
    reportPath: value('report') ?? null,
    previewPath: value('preview') ?? null,
  };
}

type CsvRecord = Record<string, string>;
const listOf = (r: CsvRecord, prefix: string, n: number) => Array.from({ length: n }, (_, i) => r[`${prefix}_${i + 1}`] ?? '').filter(Boolean);

const readCsv = (): CsvRecord[] => readCsvRecords(fs.readFileSync(CSV_PATH));

async function openDatabase(): Promise<PrismaClient | null> {
  // Spaces, quotes or a "psql '...'" around the secret are removed, so a slightly mis-pasted secret still works.
  const url = cleanDatabaseUrl(process.env.DATABASE_URL);
  if (!url) return null;
  // Its own connection: the job needs only DATABASE_URL, not the web server's settings (config/env.ts).
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient({ datasources: { db: { url } } });
}

/** --check-db: whether the database can be used, in plain words. Never shows the connection string. */
export async function checkDatabase(): Promise<{ ok: boolean; text: string }> {
  const shape = databaseUrlProblems(process.env.DATABASE_URL);
  const prisma = await openDatabase();
  if (!prisma) return { ok: false, text: `## Database check: NOT SET\n\n- ${shape.join('\n- ')}\n` };
  try {
    const schemes = await prisma.scheme.count();
    const notes = shape.length > 0 ? `\n\nNote about the DATABASE_URL secret:\n- ${shape.join('\n- ')}` : '';
    return { ok: true, text: `## Database check: OK\n\nConnected; the database has ${schemes} schemes.${notes}\n` };
  } catch (e) {
    const hints = shape.length > 0 ? `\n\nWhat looks wrong with the DATABASE_URL secret:\n- ${shape.join('\n- ')}` : '';
    return {
      ok: false,
      text: `## Database check: FAILED\n\nThe DATABASE_URL secret did not work: ${databaseErrorReason(e)}.${hints}\n\nNew schemes are still found and saved to the CSV; they reach the database on the first run after this is fixed. To fix: Neon > your project > Connect > copy the connection string, then GitHub > Settings > Secrets and variables > Actions > Repository secrets > DATABASE_URL > Update.\n`,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function readFull(page: Page, url: string, rules: ReturnType<typeof learnRelatedTags>): Promise<ScrapedScheme | 'removed'> {
  const res = await readSchemePageWithRetry(page, url);
  if (res.removed) return 'removed';
  const { pageTags, ...rest } = res.scheme;
  return { url, tags: withRelatedTags(pageTags, rules), ...rest };
}

export async function scrape(opts: Options): Promise<RunReport> {
  const log = (m: string) => console.log(m);
  const report: RunReport = {
    date: new Date().toISOString().slice(0, 10),
    dryRun: opts.dryRun,
    status: 'ok',
    selfCheck: [],
    siteTotal: null,
    listed: 0,
    newFound: 0,
    added: [],
    heldBack: [],
    failedToRead: [],
    gone: [],
    goneCheckSkipped: null,
    leftForNextRun: 0,
    database: 'added by the next step (--sync-db)',
  };

  const records = readCsv();
  if (!opts.dryRun) checkAppendable(CSV_PATH); // fail before hours of reading, not after
  const csvUrls = new Set(records.map((r) => canonicalSchemeUrl(r.url)).filter((u): u is string => !!u));
  const known = new Set(csvUrls);
  const knownTitles = new Map(records.map((r) => [titleKey(r.TITLE, r['OFFERED BY']), r.url]));
  const rules = learnRelatedTags(records.map((r) => listOf(r, 'tag', 9)));
  log(`CSV: ${records.length} schemes; ${rules.size} related-tag rules learned.`);

  // Schemes only in the database (should be none) are known too, so they are never added twice.
  // If the database cannot be used, the run still goes on from the CSV (the record): the database only adds schemes
  // that should not exist (in the database but not the CSV). The --sync-db step reports the database problem.
  const prisma = await openDatabase();
  if (prisma) {
    try {
      for (const { sourceUrl } of await prisma.scheme.findMany({ select: { sourceUrl: true } })) {
        const u = canonicalSchemeUrl(sourceUrl);
        if (u) known.add(u);
      }
    } catch (e) {
      const reason = databaseErrorReason(e);
      log(`Database not checked (${reason}); going on with the CSV only.`);
      report.database = `could not be used this run (${reason}); new schemes were found from the CSV and reach the database once it works`;
    } finally {
      await prisma.$disconnect();
    }
  }

  const browser = await openBrowser();
  try {
    const page = await newSchemePage(browser);

    // 1. Self-check.
    const byUrl = new Map(records.map((r) => [canonicalSchemeUrl(r.url), r]));
    for (const url of SELF_CHECK_URLS) {
      const r = byUrl.get(url);
      if (!r) throw new Error(`self-check scheme ${url} is not in the CSV`);
      let differs: string[];
      try {
        const got = await readFull(page, url, rules);
        differs =
          got === 'removed'
            ? ['removed from myScheme']
            : selfCheckDiffs(got, { title: r.TITLE, ministry: r['OFFERED BY'], details: r.DETAILS, eligibility: listOf(r, 'eligibility', 15), documents: listOf(r, 'document_requirement', 15) });
      } catch (e) {
        differs = [`could not be read (${String((e as Error).message ?? e).split('\n')[0]})`];
      }
      report.selfCheck.push({ url, differs });
      await pause(PAUSE_MS);
    }
    if (report.selfCheck.some((c) => c.differs.length > 0)) {
      report.status = 'stopped: self-check failed, nothing written';
      return report;
    }
    log('Self-check passed.');

    // 2. Everything myScheme lists.
    const listing = await listAllSchemeUrls(page, log);
    report.siteTotal = listing.siteTotal;
    report.listed = listing.urls.length;
    log(`myScheme lists ${listing.urls.length} schemes (it says ${listing.siteTotal ?? '?'}).`);
    if (listing.urls.length === 0) {
      report.status = 'stopped: myScheme listed no schemes, nothing written';
      return report;
    }
    const newUrls = listing.urls.filter((u) => !known.has(u));
    report.newFound = newUrls.length;
    report.leftForNextRun = Math.max(0, newUrls.length - opts.limit);

    // 3. Read the new ones.
    const accepted: ScrapedScheme[] = [];
    const acceptedTitles = new Set<string>();
    const batch = newUrls.slice(0, opts.limit);
    for (const [i, url] of batch.entries()) {
      log(`[${i + 1}/${batch.length}] ${url}`);
      try {
        const s = await readFull(page, url, rules);
        if (s === 'removed') {
          report.failedToRead.push({ url, reason: 'listed, but the page says "not found"' });
        } else {
          const why = problems(s);
          const key = titleKey(s.title, s.ministry);
          if (knownTitles.has(key)) why.push(`same title and ministry as ${knownTitles.get(key)} (likely the same scheme under another link)`);
          else if (acceptedTitles.has(key)) why.push('same title and ministry as another new scheme in this run');
          if (why.length > 0) report.heldBack.push({ url, title: s.title, reasons: why });
          else {
            accepted.push(s);
            acceptedTitles.add(key);
          }
        }
      } catch (e) {
        report.failedToRead.push({ url, reason: String((e as Error).message ?? e).split('\n')[0] });
      }
      await pause(PAUSE_MS);
    }

    // 4. In the CSV but no longer listed: confirm, report, change nothing.
    const complete = listing.siteTotal !== null && listing.urls.length >= listing.siteTotal * LISTING_COMPLETE;
    if (!complete) {
      report.goneCheckSkipped = `not checked: the list from myScheme looked incomplete (${listing.urls.length} of ${listing.siteTotal ?? '?'})`;
    } else {
      const listed = new Set(listing.urls);
      const missing = [...csvUrls].filter((u) => !listed.has(u));
      if (missing.length > MAX_GONE_CHECKS) report.goneCheckSkipped = `${missing.length} are not listed; the first ${MAX_GONE_CHECKS} were checked`;
      for (const url of missing.slice(0, MAX_GONE_CHECKS)) {
        try {
          if ((await readSchemePageWithRetry(page, url)).removed) report.gone.push({ url, title: byUrl.get(url)?.TITLE ?? '' });
        } catch {
          /* could not tell: not reported as gone */
        }
        await pause(PAUSE_MS);
      }
    }

    // 5. Append to the CSV.
    report.added = accepted.map((s) => ({ url: s.url, title: s.title, ministry: s.ministry }));
    if (opts.dryRun) {
      report.database = 'not written (dry run)';
      if (opts.previewPath) fs.writeFileSync(opts.previewPath, encodeCsvRow(CSV_HEADER) + accepted.map((s) => encodeCsvRow(toCsvValues(s))).join(''));
    } else appendCsvRows(CSV_PATH, accepted.map(toCsvValues));
    return report;
  } finally {
    await browser.close();
  }
}

/** Adds CSV schemes the database does not have (create only; the same processing as the original import). */
export async function syncDatabase(): Promise<string> {
  const prisma = await openDatabase();
  if (!prisma) throw new Error('DATABASE_URL is not set');
  try {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      throw new Error(`Could not use the database (DATABASE_URL secret): ${databaseErrorReason(e)}. The CSV is safe; the next run adds its schemes once the secret works.`);
    }
    const { parseCsvFile } = await import('../ingestion/csvParser.js');
    const { addNewSchemes } = await import('./addToDatabase.js');
    const inDb = new Set((await prisma.scheme.findMany({ select: { sourceUrl: true } })).map((s) => s.sourceUrl));
    const missing = parseCsvFile(CSV_PATH).schemes.filter((s) => !inDb.has(s.sourceUrl));
    if (missing.length === 0) return 'the database already has every CSV scheme';
    if (missing.length > MAX_SYNC) {
      throw new Error(`${missing.length} CSV schemes are missing from the database (more than ${MAX_SYNC}); it looks like the wrong or an empty database, so nothing was added`);
    }
    const r = await addNewSchemes(prisma, missing);
    return `added ${r.added} scheme(s) to the database (eligibility read for ${r.withCriteria})`;
  } finally {
    await prisma.$disconnect();
  }
}

function write(text: string, reportPath: string | null) {
  console.log('\n' + text);
  if (reportPath) fs.writeFileSync(reportPath, text);
  // GitHub shows this on the run's page.
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
}

// Run from the command line (not when imported by a test).
if (process.argv[1] && /scraper[\\/]run\.(ts|js)$/.test(process.argv[1])) {
  const opts = parseOptions(process.argv.slice(2));
  if (opts.mode === 'check-db') {
    // Informational: it never fails the run, so the myScheme step still runs when the database is down.
    checkDatabase()
      .then((r) => write(r.text, null))
      .catch((e) => write(`## Database check: FAILED\n\n${databaseErrorReason(e)}\n`, null))
      .finally(() => process.exit(0));
  } else {
  const job =
    opts.mode === 'sync-db'
      ? syncDatabase().then((msg) => {
          write(`## Database\n\n${msg}\n`, null);
          return 0;
        })
      : scrape(opts).then((report) => {
          write(renderReport(report), opts.reportPath);
          return report.status === 'ok' ? 0 : 1;
        });
  job
    .then((code) => process.exit(code))
    .catch((e) => {
      write(`# myScheme check: FAILED\n\n${(e as Error).message ?? e}\n\nNothing was added to the ${opts.mode === 'sync-db' ? 'database' : 'CSV'}.\n`, opts.mode === 'scrape' ? opts.reportPath : null);
      process.exit(1);
    });
  }
}
