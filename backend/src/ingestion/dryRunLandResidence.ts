/**
 * dryRunLandResidence.ts
 * READ-ONLY dry run of the land-ownership (parseLand.ts) and rural/urban (parseResidence.ts) extractors.
 *
 * - Runs both over every Scheme's eligibilityRawText. No database writes at all.
 * - Prints dataset-wide counts and writes reports/land-residence-dry-run.md for manual review:
 *     A. every land gate ("yes" and "no") and every residence gate it would store (the numbers are small)
 *     B. rejected mentions, a few per reason
 *     C. possible misses: sentences that look like a gate but came out null
 *
 * Usage: npm run ingest:land-residence-dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { extractLand, LandExtractionResult } from './parseLand.js';
import { extractResidence, ResidenceExtractionResult } from './parseResidence.js';
import { splitIntoSentences } from './sentences.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Row {
  id: string;
  name: string;
  sourceUrl: string;
  authorityName: string;
  eligibilityRawText: string[];
  land: LandExtractionResult;
  residence: ResidenceExtractionResult;
  hasCriteriaRowToday: boolean;
}

function makeRng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}
function pick<T>(pool: T[], n: number, rnd: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}
function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[key(i)] = (out[key(i)] || 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}
const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n) + '…' : s);

function renderScheme(r: Row, kind: 'land' | 'residence'): string {
  const res = kind === 'land' ? r.land : r.residence;
  const lines: string[] = [`### ${r.name}`, `- ${r.authorityName} — ${r.sourceUrl}`, `- **Decision: ${kind === 'land' ? 'landOwnership' : 'residence'} = ${res.value ?? 'null'}**`];
  if (res.nullReason) lines.push(`- Left null because: ${res.nullReason}`);
  if (res.matchedSentences.length) {
    lines.push('- Driven by:');
    res.matchedSentences.forEach((s) => lines.push(`  - "${clip(s)}"`));
  }
  if (res.rejected.length) {
    lines.push('- Mentions REJECTED:');
    res.rejected.slice(0, 4).forEach((x) => lines.push(`  - "${clip(x.sentence, 220)}" — ${x.reason}`));
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const [schemes, existing] = await Promise.all([
    prisma.scheme.findMany({
      select: { id: true, name: true, sourceUrl: true, authorityName: true, eligibilityRawText: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.eligibilityCriteria.findMany({ select: { schemeId: true } }),
  ]);
  const hasRow = new Set(existing.map((e) => e.schemeId));

  const rows: Row[] = schemes.map((s) => ({
    ...s,
    land: extractLand(s.eligibilityRawText),
    residence: extractResidence(s.eligibilityRawText),
    hasCriteriaRowToday: hasRow.has(s.id),
  }));

  const landYes = rows.filter((r) => r.land.value === 'yes');
  const landNo = rows.filter((r) => r.land.value === 'no');
  const resRural = rows.filter((r) => r.residence.value === 'rural');
  const resUrban = rows.filter((r) => r.residence.value === 'urban');
  const withAny = rows.filter((r) => r.land.value || r.residence.value);
  const newRows = withAny.filter((r) => !r.hasCriteriaRowToday);
  const landConflicts = rows.filter((r) => r.land.nullReason);
  const resConflicts = rows.filter((r) => r.residence.nullReason);

  console.log(`Schemes evaluated: ${rows.length}`);
  console.log(`LAND: yes ${landYes.length}, no ${landNo.length}, conflicts ${landConflicts.length}`);
  console.log(`  rejected-mention reasons: ${JSON.stringify(tally(rows.flatMap((r) => r.land.rejected), (x) => x.reason))}`);
  console.log(`RESIDENCE: rural ${resRural.length}, urban ${resUrban.length}, conflicts ${resConflicts.length}`);
  console.log(`  rejected-mention reasons: ${JSON.stringify(tally(rows.flatMap((r) => r.residence.rejected), (x) => x.reason))}`);
  console.log(`Schemes with a land or residence gate: ${withAny.length}; of those with NO criteria row today (would get a new row): ${newRows.length}`);

  const rnd = makeRng(20261003);

  // possible misses
  const LAND_CUE = /\b(?:own(?:s|ed|ing)?|owners? of|ownership of|land ?holders?|land ?holding|land ?owners?|landless)\b/i;
  const landMisses = rows.filter((r) => !r.land.value && !r.land.nullReason && splitIntoSentences(r.eligibilityRawText).some((s) => LAND_CUE.test(s) && /\bland/i.test(s) && /\b(applicant|beneficiar\w+|farmer|household|famil\w+)\b/i.test(s)));
  const RES_CUE = /\b(?:resid\w*|liv(?:e|es|ing)|from|resident of|native of)\s+(?:(?:in|within|at)\s+)?(?:an?\s+|the\s+)?(?:rural|urban)\b/i;
  const resMisses = rows.filter((r) => !r.residence.value && !r.residence.nullReason && splitIntoSentences(r.eligibilityRawText).some((s) => RES_CUE.test(s)));

  const out: string[] = [];
  out.push('# Land ownership and rural/urban residence — dry run (no database writes)', '');
  out.push(`Schemes evaluated: ${rows.length}.`, '');
  out.push('| | Schemes |', '|---|---|');
  out.push(`| Land ownership "yes" (applicant must own farming land) | ${landYes.length} |`);
  out.push(`| Land ownership "no" (applicant must be landless) | ${landNo.length} |`);
  out.push(`| Residence "rural" | ${resRural.length} |`);
  out.push(`| Residence "urban" | ${resUrban.length} |`);
  out.push(`| Conflicting sentences (left null): land / residence | ${landConflicts.length} / ${resConflicts.length} |`);
  out.push(`| Schemes with a land or residence gate | ${withAny.length} |`);
  out.push(`| ...of which have NO criteria row today (would get a new row) | ${newRows.length} |`);
  out.push(`| Possible misses: land / residence | ${landMisses.length} / ${resMisses.length} |`, '');
  out.push('Everything the parsers would store is listed in section A (the numbers are small). Please look for (a) wrong decisions, (b) rejected sentences that should have counted (section B), (c) misses (section C).', '', '---', '');

  out.push(`## A1. Land ownership "no" — all ${landNo.length}`, '', ...landNo.map((r) => renderScheme(r, 'land')));
  out.push('---', '', `## A2. Land ownership "yes" — all ${landYes.length}`, '', ...landYes.map((r) => renderScheme(r, 'land')));
  out.push('---', '', `## A3. Residence "rural" — all ${resRural.length}`, '', ...resRural.map((r) => renderScheme(r, 'residence')));
  out.push('---', '', `## A4. Residence "urban" — all ${resUrban.length}`, '', ...resUrban.map((r) => renderScheme(r, 'residence')));

  for (const [title, kind] of [['B1. Land: rejected mentions, a few per reason', 'land'], ['B2. Residence: rejected mentions, a few per reason', 'residence']] as const) {
    out.push('---', '', `## ${title}`, '');
    const byReason = new Map<string, Array<{ r: Row; sentence: string }>>();
    for (const r of rows) for (const x of (kind === 'land' ? r.land : r.residence).rejected) (byReason.get(x.reason) ?? byReason.set(x.reason, []).get(x.reason)!).push({ r, sentence: x.sentence });
    for (const [reason, list] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
      out.push(`### ${reason} (${list.length} sentences)`, '');
      for (const { r, sentence } of pick(list, 6, rnd)) out.push(`- [${r.authorityName}] "${clip(sentence, 240)}"`);
      out.push('');
    }
  }

  out.push('---', '', `## C1. Land: possible misses (sample of ${Math.min(25, landMisses.length)} of ${landMisses.length})`, '');
  for (const r of pick(landMisses, 25, rnd)) {
    out.push(`### ${r.name}`, `- ${r.authorityName} — ${r.sourceUrl}`);
    splitIntoSentences(r.eligibilityRawText).filter((s) => LAND_CUE.test(s) && /\bland/i.test(s)).slice(0, 3).forEach((s) => out.push(`  - "${clip(s, 260)}"`));
    out.push('');
  }
  out.push('---', '', `## C2. Residence: possible misses (sample of ${Math.min(25, resMisses.length)} of ${resMisses.length})`, '');
  for (const r of pick(resMisses, 25, rnd)) {
    out.push(`### ${r.name}`, `- ${r.authorityName} — ${r.sourceUrl}`);
    splitIntoSentences(r.eligibilityRawText).filter((s) => RES_CUE.test(s)).slice(0, 3).forEach((s) => out.push(`  - "${clip(s, 260)}"`));
    r.residence.rejected.slice(0, 2).forEach((x) => out.push(`  - rejected: ${x.reason}`));
    out.push('');
  }

  const reportPath = path.join(__dirname, '..', '..', 'reports', 'land-residence-dry-run.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, out.join('\n'));
  console.log(`\nWrote review report to ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
