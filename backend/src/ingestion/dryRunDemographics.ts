/**
 * dryRunDemographics.ts
 * READ-ONLY dry run of the gender/category extractors (parseDemographics.ts).
 *
 * - Runs both extractors over every Scheme's eligibilityRawText (no DB writes).
 * - Prints dataset-wide counts so the scale is known before any ingestion.
 * - Writes reports/demographics-dry-run.md: a 40-scheme review sample showing each
 *   decision next to the exact source sentences that drove it (and the sentences
 *   that were mentioned but rejected, with the reason), for manual review.
 *
 * Usage: npx tsx src/ingestion/dryRunDemographics.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import { extractGender, extractCategory, DemographicExtractionResult } from './parseDemographics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Row {
  id: string;
  name: string;
  sourceUrl: string;
  eligibilityRawText: string[];
  gender: DemographicExtractionResult<any>;
  category: DemographicExtractionResult<any>;
}

// Deterministic sampler so the same 40 schemes come up on every run.
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

const MENTION_GENDER = /\b(woman|women|female|girl|girls|widow|male|men|boy|boys|transgender|pregnant)\b/i;
const MENTION_CATEGORY = /\b(SC|ST|OBC|Scheduled Castes?|Scheduled Tribes?|Other Backward Class(es)?|general category|unreserved)\b/;

function tally<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[key(i)] = (out[key(i)] || 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

function renderScheme(r: Row, why: string): string {
  const lines: string[] = [];
  lines.push(`### ${r.name}`);
  lines.push(`- Link: ${r.sourceUrl}`);
  lines.push(`- Why it is in the sample: ${why}`);
  lines.push(`- **Decision: gender = ${r.gender.value ?? 'null'}, category = ${r.category.value ?? 'null'}**`);
  if (r.gender.nullReason) lines.push(`- Gender left null because: ${r.gender.nullReason}`);
  if (r.category.nullReason) lines.push(`- Category left null because: ${r.category.nullReason}`);
  const show = (label: string, res: DemographicExtractionResult<any>) => {
    if (res.matchedSentences.length) {
      lines.push(`- ${label} driven by:`);
      res.matchedSentences.forEach((s) => lines.push(`  - "${s}"`));
    }
    if (res.rejected.length) {
      lines.push(`- ${label} mentions REJECTED:`);
      res.rejected.forEach((x) => lines.push(`  - "${x.sentence.slice(0, 260)}" — ${x.reason}`));
    }
  };
  show('Gender', r.gender);
  show('Category', r.category);
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const schemes = await prisma.scheme.findMany({
    select: { id: true, name: true, sourceUrl: true, eligibilityRawText: true },
    orderBy: { createdAt: 'asc' },
  });

  const rows: Row[] = schemes.map((s) => ({
    ...s,
    gender: extractGender(s.eligibilityRawText),
    category: extractCategory(s.eligibilityRawText),
  }));

  const withG = rows.filter((r) => r.gender.value);
  const withC = rows.filter((r) => r.category.value);
  const both = rows.filter((r) => r.gender.value && r.category.value);
  const mentionG = rows.filter((r) => r.eligibilityRawText.some((t) => MENTION_GENDER.test(t)));
  const mentionC = rows.filter((r) => r.eligibilityRawText.some((t) => MENTION_CATEGORY.test(t)));

  console.log(`Schemes evaluated: ${rows.length}`);
  console.log(`\nGENDER   restricted: ${withG.length}  (mention gender words: ${mentionG.length})`);
  console.log('  values:', JSON.stringify(tally(withG, (r) => r.gender.value!)));
  console.log('  null-by-rule reasons:', JSON.stringify(tally(rows.filter((r) => r.gender.nullReason), (r) => r.gender.nullReason!)));
  console.log('  rejected-mention reasons:', JSON.stringify(tally(rows.flatMap((r) => r.gender.rejected), (x) => x.reason)));
  console.log(`\nCATEGORY restricted: ${withC.length}  (mention category words: ${mentionC.length})`);
  console.log('  values:', JSON.stringify(tally(withC, (r) => r.category.value!)));
  console.log('  null-by-rule reasons:', JSON.stringify(tally(rows.filter((r) => r.category.nullReason), (r) => r.category.nullReason!)));
  console.log('  rejected-mention reasons:', JSON.stringify(tally(rows.flatMap((r) => r.category.rejected), (x) => x.reason)));
  console.log(`\nSchemes with both a gender and a category restriction: ${both.length}`);

  // ── 40-scheme review sample ──
  const rnd = makeRng(20261001);
  const used = new Set<string>();
  const take = (pool: Row[], n: number, why: string) => {
    const fresh = pool.filter((r) => !used.has(r.id));
    const chosen = pick(fresh, n, rnd);
    chosen.forEach((r) => used.add(r.id));
    return chosen.map((r) => ({ r, why }));
  };

  const sample = [
    ...take(withG.filter((r) => r.gender.value === 'female'), 7, 'gender = female'),
    ...take(withG.filter((r) => r.gender.value === 'male'), 2, 'gender = male'),
    ...take(withG.filter((r) => r.gender.value === 'transgender'), 3, 'gender = transgender'),
    ...take(withC.filter((r) => r.category.value === 'sc'), 3, 'category = sc'),
    ...take(withC.filter((r) => r.category.value === 'st'), 3, 'category = st'),
    ...take(withC.filter((r) => r.category.value === 'sc,st'), 3, 'category = sc,st'),
    ...take(withC.filter((r) => r.category.value === 'obc'), 2, 'category = obc'),
    ...take(withC.filter((r) => (r.category.value ?? '').split(',').length >= 3 || r.category.value === 'sc,obc'), 2, 'category = multi-set (obc combos)'),
    ...take(withC.filter((r) => (r.category.value ?? '').includes('general')), 2, 'category includes general'),
    ...take(both, 3, 'has BOTH a gender and a category restriction'),
    // negatives: mention the words but the extractor stays null, one per reason family
    ...take(rows.filter((r) => !r.gender.value && r.gender.nullReason?.includes('girl-child')), 2, 'NEGATIVE: girl-child/daughter scheme (gender null by design)'),
    ...take(rows.filter((r) => !r.gender.value && r.gender.rejected.some((x) => x.reason.includes('list of groups'))), 1, 'NEGATIVE: gender is one option in a list of groups'),
    ...take(rows.filter((r) => !r.category.value && r.category.rejected.some((x) => x.reason.includes('relaxation'))), 2, 'NEGATIVE: SC/ST/OBC only appears as a relaxation/priority/reservation'),
    ...take(rows.filter((r) => !r.category.value && r.category.rejected.some((x) => x.reason.includes('groups outside'))), 2, 'NEGATIVE: category list includes groups we do not model (DNT, minority, landless...)'),
    ...take(rows.filter((r) => !r.category.value && r.category.rejected.some((x) => x.reason.includes('marriage'))), 1, 'NEGATIVE: marriage/partner context'),
    ...take(rows.filter((r) => !r.category.value && r.category.rejected.some((x) => x.reason.includes('not phrased'))), 2, 'NEGATIVE: mentions a category but not phrased as a rule on the applicant'),
  ];

  const reportPath = path.join(__dirname, '..', '..', 'reports', 'demographics-dry-run.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const header = [
    '# Gender / category extraction — dry run (no database writes)',
    '',
    `Schemes evaluated: ${rows.length}. Sample below: ${sample.length} schemes chosen deterministically.`,
    '',
    '| | Schemes | Share |',
    '|---|---|---|',
    `| Gender restriction extracted | ${withG.length} | ${((withG.length / rows.length) * 100).toFixed(1)}% |`,
    `| Category restriction extracted | ${withC.length} | ${((withC.length / rows.length) * 100).toFixed(1)}% |`,
    `| Both | ${both.length} | ${((both.length / rows.length) * 100).toFixed(1)}% |`,
    '',
    `Gender values: ${JSON.stringify(tally(withG, (r) => r.gender.value!))}`,
    '',
    `Category values: ${JSON.stringify(tally(withC, (r) => r.category.value!))}`,
    '',
    'For each scheme: the decision, the sentences that drove it, and the sentences that mention gender/category but were REJECTED (with the reason). Please look for (a) wrong decisions and (b) rejected sentences that should have counted.',
    '',
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(reportPath, header + sample.map(({ r, why }) => renderScheme(r, why)).join('\n'));
  console.log(`\nWrote ${sample.length}-scheme review report to ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
