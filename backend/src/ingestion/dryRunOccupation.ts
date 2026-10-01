/**
 * dryRunOccupation.ts
 * READ-ONLY dry run of the occupation extractor (parseOccupation.ts).
 *
 * - Runs the extractor over every Scheme's eligibilityRawText. No database writes at all.
 * - Prints counts and writes reports/occupation-dry-run.md for manual review:
 *     A. what would be stored (counts, every rare value, samples of the common ones)
 *     B. impact preview: for each profile occupation, how many schemes would be boosted or demoted
 *     C. rejected mentions, a few per reason
 *     D. possible misses
 *
 * Usage: npm run ingest:occupation-dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { extractOccupation, OccupationExtractionResult } from './parseOccupation.js';
import { splitIntoSentences } from './sentences.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Row {
  id: string;
  name: string;
  sourceUrl: string;
  authorityName: string;
  eligibilityRawText: string[];
  occ: OccupationExtractionResult;
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

function render(r: Row): string {
  const lines = [`### ${r.name}`, `- ${r.authorityName} — ${r.sourceUrl}`, `- **Decision: occupation = ${r.occ.value ?? 'null'}**`];
  if (r.occ.nullReason) lines.push(`- Left null because: ${r.occ.nullReason}`);
  r.occ.matchedSentences.forEach((s) => lines.push(`  - "${clip(s)}"`));
  r.occ.rejected.slice(0, 3).forEach((x) => lines.push(`  - rejected: "${clip(x.sentence, 200)}" — ${x.reason}`));
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
  const rows: Row[] = schemes.map((s) => ({ ...s, occ: extractOccupation(s.eligibilityRawText), hasCriteriaRowToday: hasRow.has(s.id) }));

  const withOcc = rows.filter((r) => r.occ.value);
  const newRows = withOcc.filter((r) => !r.hasCriteriaRowToday);
  const conflicts = rows.filter((r) => r.occ.nullReason);
  const byValue = tally(withOcc, (r) => r.occ.value!);

  // impact preview: the profile offers these occupations (plus "senior citizen" and "other", which never match or mismatch)
  const profiles = ['farmer', 'student', 'entrepreneur', 'employee', 'unemployed'];
  const impact = profiles.map((p) => ({
    profile: p,
    boosted: withOcc.filter((r) => r.occ.values.includes(p as never)).length,
    demoted: withOcc.filter((r) => !r.occ.values.includes(p as never)).length,
  }));

  console.log(`Schemes evaluated: ${rows.length}`);
  console.log(`Occupation requirement extracted: ${withOcc.length}; of those with NO criteria row today (would get a new row): ${newRows.length}; conflicts: ${conflicts.length}`);
  console.log('  values:', JSON.stringify(byValue));
  console.log('  rejected-mention reasons:', JSON.stringify(tally(rows.flatMap((r) => r.occ.rejected), (x) => x.reason.replace(/\(".*?"\)/, '("…")'))));
  console.log('  impact:', JSON.stringify(impact));

  const rnd = makeRng(20261004);
  const MISS_CUE = /\b(?:must|should|shall)\s+be\s+(?:an?\s+|the\s+)?(?:[A-Za-z-]+\s+){0,3}(?:farmers?|students?|entrepreneurs?|unemployed|employees?|self[- ]employed|cultivators?)\b/i;
  const misses = rows.filter((r) => !r.occ.value && !r.occ.nullReason && splitIntoSentences(r.eligibilityRawText).some((s) => MISS_CUE.test(s) && /\b(applicant|beneficiar\w+|candidate)\b/i.test(s)));

  const out: string[] = [];
  out.push('# Occupation requirement extraction — dry run (no database writes)', '');
  out.push(`Schemes evaluated: ${rows.length}.`, '');
  out.push('| | Schemes |', '|---|---|');
  for (const [v, n] of Object.entries(byValue)) out.push(`| occupation = ${v} | ${n} |`);
  out.push(`| **Total with an occupation requirement** | **${withOcc.length}** |`);
  out.push(`| ...of which have NO criteria row today (would get a new row) | ${newRows.length} |`);
  out.push(`| Conflicting sentences (left null) | ${conflicts.length} |`);
  out.push(`| Possible misses (applicant-must-be sentence, left null) | ${misses.length} |`, '');
  out.push('## Impact preview: what the SOFT ranking would do', '');
  out.push('Soft means: a match raises a scheme\'s ranking, a mismatch lowers it and adds a note ("this scheme is for farmers; your profile says student"), and **nothing is ever excluded**. A blank profile occupation or "other" changes nothing.', '');
  out.push('| Profile occupation | Schemes boosted (match) | Schemes demoted + noted (mismatch) |', '|---|---|---|');
  for (const i of impact) out.push(`| ${i.profile} | ${i.boosted} | ${i.demoted} |`);
  out.push('', '---', '');

  out.push('## A. What would be stored', '');
  const rare = withOcc.filter((r) => !['farmer', 'student'].includes(r.occ.value!));
  out.push(`### A1. Every value other than plain "farmer" / "student" (${rare.length})`, '', ...rare.map(render));
  out.push(`### A2. Sample of "farmer" (${Math.min(15, byValue['farmer'] ?? 0)} of ${byValue['farmer'] ?? 0})`, '', ...pick(withOcc.filter((r) => r.occ.value === 'farmer'), 15, rnd).map(render));
  out.push(`### A3. Sample of "student" (${Math.min(15, byValue['student'] ?? 0)} of ${byValue['student'] ?? 0})`, '', ...pick(withOcc.filter((r) => r.occ.value === 'student'), 15, rnd).map(render));

  out.push('---', '', '## C. Rejected mentions, a few per reason', '');
  const byReason = new Map<string, Array<{ r: Row; sentence: string }>>();
  for (const r of rows) for (const x of r.occ.rejected) {
    const key = x.reason.replace(/\(".*?"\)/, '("…")');
    (byReason.get(key) ?? byReason.set(key, []).get(key)!).push({ r, sentence: x.sentence });
  }
  for (const [reason, list] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
    out.push(`### ${reason} (${list.length} sentences)`, '');
    for (const { r, sentence } of pick(list, 7, rnd)) out.push(`- [${r.authorityName}] "${clip(sentence, 240)}"`);
    out.push('');
  }

  out.push('---', '', `## D. Possible misses (sample of ${Math.min(25, misses.length)} of ${misses.length})`, '');
  for (const r of pick(misses, 25, rnd)) {
    out.push(`### ${r.name}`, `- ${r.authorityName} — ${r.sourceUrl}`);
    splitIntoSentences(r.eligibilityRawText).filter((s) => MISS_CUE.test(s)).slice(0, 2).forEach((s) => out.push(`  - "${clip(s, 260)}"`));
    r.occ.rejected.slice(0, 2).forEach((x) => out.push(`  - rejected: ${x.reason}`));
    out.push('');
  }

  const reportPath = path.join(__dirname, '..', '..', 'reports', 'occupation-dry-run.md');
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
