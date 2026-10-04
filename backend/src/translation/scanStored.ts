/**
 * scanStored.ts: read-only scan of every stored translation for stray-script letters, Latin letters stuck inside
 * native words, and forbidden renderings (see scanText.ts).
 *
 * Usage: npm run scan:translations -- [hi|gu] [--list]
 */
import prisma from '../db/prisma.js';
import { LANGUAGES, LanguageCode } from './languages.js';
import { scanText, textsOf } from './scanText.js';

async function main() {
  const code = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'hi') as LanguageCode;
  const lang = LANGUAGES[code];
  if (!lang) throw new Error(`unknown language "${code}"`);
  const list = process.argv.includes('--list');

  const rows = await prisma.schemeTranslation.findMany({
    where: { languageCode: code, status: 'ok' },
    select: { schemeId: true, field: true, value: true, scheme: { select: { name: true } } },
  });
  const counts: Record<string, Record<string, number>> = {};
  const affected = new Set<string>();
  for (const r of rows) {
    const problems = textsOf(r.value).flatMap((t) => scanText(t, lang));
    if (problems.length === 0) continue;
    affected.add(`${r.schemeId}:${r.field}`);
    const c = (counts[r.field] ??= {});
    for (const kind of new Set(problems.map((p) => p.kind))) c[kind] = (c[kind] ?? 0) + 1;
    if (list) console.log(`${r.field}\t${r.schemeId}\t${r.scheme.name}\t${problems.map((p) => `${p.kind}:${p.detail}`).join(' ')}`);
  }
  console.log(`${rows.length} stored ${lang.name} rows scanned; ${affected.size} rows have a problem`);
  console.log('rows with each problem, by field:', JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
