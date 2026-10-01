/**
 * dryRunState.ts
 * READ-ONLY dry run of the state-residency extractor (parseState.ts).
 *
 * - Runs the extractor over every Scheme's eligibilityRawText (no DB writes at all).
 * - Prints dataset-wide counts and writes reports/state-dry-run.md for manual review:
 *     A. schemes whose text names a different state than their authority (the "text wins" cases)
 *     B. EVERY central scheme that would get a state gate
 *     C. a sample of the state schemes that would get one, by kind
 *     D. rejected mentions, a few per reason
 *     E. possible misses: state schemes with residency wording where the extractor stayed null
 *
 * Usage: npm run ingest:state-dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { extractState, StateExtractionResult } from './parseState.js';
import { canonicalState } from '../utils/states.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Row {
  id: string;
  name: string;
  sourceUrl: string;
  authorityName: string;
  eligibilityRawText: string[];
  authorityState: string | null;
  res: StateExtractionResult;
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

const RESIDENCY_WORDS = /\b(resident|residents|residing|reside|resides|domicile|domiciled|native|inhabitant|inhabitants)\b/i;
const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n) + '…' : s);

function renderScheme(r: Row, why: string): string {
  const lines: string[] = [];
  const kind = r.authorityState ? `state scheme (${r.authorityState})` : `central scheme (${r.authorityName})`;
  lines.push(`### ${r.name}`);
  lines.push(`- ${kind} — ${r.sourceUrl}`);
  lines.push(`- Why it is here: ${why}`);
  lines.push(`- **Decision: state = ${r.res.value ?? 'null'}**`);
  const flags = [
    r.res.usedImplicit ? '"resident of the State" resolved to the scheme\'s own state' : '',
    r.res.yearsQualifier ? 'asks for a number of years of residence (not modelled)' : '',
    r.res.districtLevel ? 'district-level wording: the set is a superset of who qualifies' : '',
    r.res.differsFromAuthority ? '**TEXT NAMES A DIFFERENT STATE THAN THE AUTHORITY**' : '',
  ].filter(Boolean);
  if (flags.length) lines.push(`- Flags: ${flags.join('; ')}`);
  if (r.res.nullReason) lines.push(`- Left null because: ${r.res.nullReason}`);
  if (r.res.matchedSentences.length) {
    lines.push('- Driven by:');
    r.res.matchedSentences.forEach((s) => lines.push(`  - "${clip(s)}"`));
  }
  if (r.res.rejected.length) {
    lines.push('- Mentions REJECTED:');
    r.res.rejected.slice(0, 6).forEach((x) => lines.push(`  - "${clip(x.sentence, 220)}" — ${x.reason}`));
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const schemes = await prisma.scheme.findMany({
    select: { id: true, name: true, sourceUrl: true, authorityName: true, eligibilityRawText: true },
    orderBy: { createdAt: 'asc' },
  });

  const rows: Row[] = schemes.map((s) => {
    const authorityState = canonicalState(s.authorityName);
    return { ...s, authorityState, res: extractState(s.eligibilityRawText, s.authorityName) };
  });

  const withState = rows.filter((r) => r.res.value);
  const central = rows.filter((r) => !r.authorityState);
  const stateSchemes = rows.filter((r) => r.authorityState);
  const centralWith = central.filter((r) => r.res.value);
  const stateWith = stateSchemes.filter((r) => r.res.value);
  const differs = rows.filter((r) => r.res.differsFromAuthority);
  const implicit = rows.filter((r) => r.res.usedImplicit);
  const years = withState.filter((r) => r.res.yearsQualifier);
  const district = withState.filter((r) => r.res.districtLevel);
  const multi = withState.filter((r) => r.res.values.length > 1);
  const conflicts = rows.filter((r) => r.res.nullReason);

  const missed = stateSchemes.filter(
    (r) => !r.res.value && r.eligibilityRawText.some((t) => RESIDENCY_WORDS.test(t) && /\b(resident|domicile|native|inhabitant)s?\s+(of|in)\b|\bresid(e|es|ing)\s+(in|within)\b/i.test(t)),
  );

  console.log(`Schemes evaluated: ${rows.length}  (state authority: ${stateSchemes.length}, central: ${central.length})`);
  console.log(`State gate extracted: ${withState.length}  (state schemes ${stateWith.length}, central ${centralWith.length})`);
  console.log(`  via implicit "resident of the State": ${implicit.length}; with a years-of-residence qualifier: ${years.length}; district-level: ${district.length}; multi-state sets: ${multi.length}`);
  console.log(`  text names a DIFFERENT state than the authority: ${differs.length}; conflicting sentences (null): ${conflicts.length}`);
  console.log(`  possible misses (state scheme, residency wording, extractor null): ${missed.length}`);
  console.log('  rejected-mention reasons:', JSON.stringify(tally(rows.flatMap((r) => r.res.rejected), (x) => x.reason)));
  console.log('  set sizes:', JSON.stringify(tally(withState, (r) => String(r.res.values.length))));

  const rnd = makeRng(20261002);
  const used = new Set<string>();
  const take = (pool: Row[], n: number, why: string) => {
    const chosen = pick(pool.filter((r) => !used.has(r.id)), n, rnd);
    chosen.forEach((r) => used.add(r.id));
    return chosen.map((r) => ({ r, why }));
  };

  const sampleC = [
    ...take(stateWith.filter((r) => !r.res.usedImplicit && !r.res.yearsQualifier && !r.res.districtLevel && r.res.values.length === 1), 14, 'state scheme, explicit "resident of <own state>"'),
    ...take(stateWith.filter((r) => r.res.usedImplicit), 6, 'state scheme, "resident of the State" (implicit)'),
    ...take(stateWith.filter((r) => r.res.yearsQualifier), 8, 'state scheme, with a years-of-residence qualifier'),
    ...take(stateWith.filter((r) => r.res.values.length > 1), 6, 'state scheme, MORE THAN ONE state in the set'),
    ...take(stateWith.filter((r) => r.res.districtLevel), 4, 'state scheme, district-level wording'),
  ];

  // rejected mentions: a few per reason family
  const byReason = new Map<string, Array<{ r: Row; sentence: string }>>();
  for (const r of rows) for (const x of r.res.rejected) (byReason.get(x.reason) ?? byReason.set(x.reason, []).get(x.reason)!).push({ r, sentence: x.sentence });

  const reportPath = path.join(__dirname, '..', '..', 'reports', 'state-dry-run.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const out: string[] = [];
  out.push('# State residency extraction — dry run (no database writes)', '');
  out.push(`Schemes evaluated: ${rows.length} (state authority ${stateSchemes.length}, central ${central.length}).`, '');
  out.push('| | Schemes |', '|---|---|');
  out.push(`| State gate extracted (total) | ${withState.length} |`);
  out.push(`| ...state-authority schemes | ${stateWith.length} |`);
  out.push(`| ...central schemes | ${centralWith.length} |`);
  out.push(`| ...via implicit "resident of the State" | ${implicit.length} |`);
  out.push(`| ...with a years-of-residence qualifier (gate kept, duration ignored) | ${years.length} |`);
  out.push(`| ...district-level wording (set is a superset) | ${district.length} |`);
  out.push(`| ...sets with more than one state | ${multi.length} |`);
  out.push(`| **Text names a different state than the authority** | **${differs.length}** |`);
  out.push(`| Conflicting gates in different sentences (left null) | ${conflicts.length} |`);
  out.push(`| Possible misses (state scheme, residency wording, left null) | ${missed.length} |`);
  out.push(`| State-authority schemes with NO gate (stay authority-only, as agreed) | ${stateSchemes.length - stateWith.length} |`, '');
  out.push(`Set sizes: ${JSON.stringify(tally(withState, (r) => String(r.res.values.length)))}`, '');
  out.push('Please look for (a) wrong decisions, (b) rejected sentences that should have counted, (c) misses in section E.', '', '---', '');

  out.push(`## A. Text names a different state than the authority (${differs.length}) — text wins, as decided`, '');
  out.push(...differs.map((r) => renderScheme(r, 'text and authority disagree')));
  out.push('---', '', `## B. Every central scheme that would get a state gate (${centralWith.length})`, '');
  out.push(...centralWith.map((r) => renderScheme(r, 'central scheme with a state gate')));
  out.push('---', '', `## C. Sample of state schemes that would get a gate (${sampleC.length})`, '');
  out.push(...sampleC.map(({ r, why }) => renderScheme(r, why)));
  out.push('---', '', '## D. Rejected mentions, a few per reason', '');
  for (const [reason, list] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
    out.push(`### ${reason} (${list.length} sentences)`, '');
    for (const { r, sentence } of pick(list, 6, rnd)) out.push(`- [${r.authorityState ?? r.authorityName}] "${clip(sentence, 240)}"`);
    out.push('');
  }
  out.push('---', '', `## E. Possible misses: state schemes with residency wording where the extractor stayed null (sample of ${Math.min(25, missed.length)} of ${missed.length})`, '');
  for (const r of pick(missed, 25, rnd)) {
    out.push(`### ${r.name}`, `- state scheme (${r.authorityState}) — ${r.sourceUrl}`);
    const cues = r.eligibilityRawText.filter((t) => RESIDENCY_WORDS.test(t)).slice(0, 3);
    cues.forEach((t) => out.push(`  - "${clip(t.replace(/\s+/g, ' '), 260)}"`));
    r.res.rejected.slice(0, 3).forEach((x) => out.push(`  - rejected: ${x.reason}`));
    if (r.res.nullReason) out.push(`  - null because: ${r.res.nullReason}`);
    out.push('');
  }
  fs.writeFileSync(reportPath, out.join('\n'));
  console.log(`\nWrote review report to ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
