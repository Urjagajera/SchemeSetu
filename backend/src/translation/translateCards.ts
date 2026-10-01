/**
 * translateCards.ts
 * Translates the card text (title + short summary) of every scheme into one language ahead of time, so the
 * first Hindi search shows Hindi straight away instead of English for a few seconds.
 *
 * - Same service, translator, validation and storage as the on-demand path: nothing here is special.
 * - Safe to stop and rerun: anything already stored (and still matching the English) is skipped.
 * - Anything the validator rejects on both models is stored as failed and stays English; it is retried
 *   by the on-demand path after 10 minutes, or by a rerun of this script.
 *
 * Usage: npm run translate:cards -- hi [--limit 100] [--chunk 40] [--parallel 3]
 */
import prisma from '../db/prisma.js';
import config from '../config/env.js';
import { translationService } from './index.js';
import { LANGUAGES, LanguageCode } from './languages.js';

function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const n = i > 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  const langCode = (process.argv[2] ?? 'hi') as LanguageCode;
  const lang = LANGUAGES[langCode];
  if (!lang) throw new Error(`unknown language "${langCode}"`);
  if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set in backend/.env');

  const limit = flag('limit', Number.MAX_SAFE_INTEGER);
  const chunkSize = flag('chunk', 40);
  const parallel = flag('parallel', 3);

  const schemes = await prisma.scheme.findMany({ select: { id: true, name: true, description: true }, orderBy: { name: 'asc' }, take: limit === Number.MAX_SAFE_INTEGER ? undefined : limit });
  const chunks: (typeof schemes)[] = [];
  for (let i = 0; i < schemes.length; i += chunkSize) chunks.push(schemes.slice(i, i + chunkSize));
  console.log(`${schemes.length} schemes in ${chunks.length} chunks of up to ${chunkSize}, ${parallel} at a time, into ${lang.name}`);

  const started = Date.now();
  let next = 0;
  let attempted = 0;
  let finished = 0;
  const worker = async () => {
    for (;;) {
      const mine = next++;
      if (mine >= chunks.length) return;
      attempted += await translationService.translateCards(chunks[mine], lang);
      finished++;
      if (finished % 5 === 0 || finished === chunks.length) {
        const secs = Math.round((Date.now() - started) / 1000);
        console.log(`  ${finished}/${chunks.length} chunks, ${attempted} texts attempted, ${secs}s`);
      }
    }
  };
  await Promise.all(Array.from({ length: parallel }, worker));
  console.log(`done in ${Math.round((Date.now() - started) / 1000)}s, ${attempted} texts attempted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
