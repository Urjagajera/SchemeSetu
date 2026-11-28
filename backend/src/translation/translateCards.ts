/**
 * translateCards.ts
 * Translates the card text (title + short summary) of every scheme into one language ahead of time, so the
 * first Hindi or Gujarati search shows translated cards straight away instead of English for a few seconds.
 *
 * - Same service, translator, validation and storage as the on-demand path: nothing here is special.
 * - Safe to stop and rerun: anything already stored (and still matching the English) is skipped, so a daily
 *   run simply carries on where the last one stopped.
 * - Anything the validator rejects is stored as failed and stays English; it is retried by the on-demand path
 *   after 10 minutes, or by a rerun of this script.
 * - --max-tokens keeps the run inside a share of Groq's free daily allowance (200,000 tokens per model, shared
 *   with the live site): once that many tokens are used, no new chunk is started (a chunk already running
 *   finishes, so a run can go over by about one chunk per worker).
 *
 * Usage: npm run translate:cards -- gu [--max-tokens 120000] [--limit 100] [--chunk 20] [--parallel 2] [--titles-only]
 */
import prisma from '../db/prisma.js';
import config from '../config/env.js';
import { createGroqLlm, Llm } from './llm.js';
import { createTranslator } from './translator.js';
import { createTranslationService } from './service.js';
import { createTokenBudget, isDailyLimitError } from './tokenBudget.js';
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
  const chunkSize = flag('chunk', 20);
  const parallel = flag('parallel', 2);
  const maxTokens = flag('max-tokens', Number.MAX_SAFE_INTEGER);
  const fields: Array<'title' | 'summary'> = process.argv.includes('--titles-only') ? ['title'] : ['title', 'summary'];

  const budget = createTokenBudget(maxTokens);
  let rejected = 0;
  const why: Record<string, number> = {};
  const groq = createGroqLlm(config.GROQ_API_KEY, { onUsage: (u) => budget.add(u.totalTokens) });
  // The limit is checked before every model call, not only between chunks: on 2026-11-27 a 30,000-token run used
  // 68,081 because retries inside two chunks kept going. A call refused here leaves its text English (stored as
  // failed), and the next run picks it up again.
  // A second safety net: if Groq refuses many calls in a row (daily limit, outage), stop rather than marking every
  // remaining scheme as failed.
  const MAX_FAILS_IN_A_ROW = 15;
  let failsInARow = 0;
  const llm: Llm = async (req) => {
    if (budget.exhausted()) throw new Error('token limit for this run reached');
    try {
      const resp = await groq(req);
      failsInARow = 0;
      return resp;
    } catch (e) {
      if (isDailyLimitError(String((e as Error).message)) || ++failsInARow >= MAX_FAILS_IN_A_ROW) {
        if (!budget.exhausted()) console.log(`  Groq refused the call (${String((e as Error).message).slice(0, 90)}…): no new work will be started`);
        budget.stop();
      }
      throw e;
    }
  };
  const translator = createTranslator({
    llm,
    primaryModel: config.TRANSLATION_PRIMARY_MODEL,
    fallbackModel: config.TRANSLATION_FALLBACK_MODEL,
    onReject: ({ reasons }) => {
      rejected++;
      for (const r of reasons) {
        const k = r.replace(/\(.*$/s, '').replace(/:.*$/s, '').trim().slice(0, 70);
        why[k] = (why[k] ?? 0) + 1;
      }
      // Groq's daily allowance is used up: every further call would fail and mark a scheme as failed, so stop here.
      if (reasons.some(isDailyLimitError) && !budget.exhausted()) {
        console.log('  Groq says the daily token limit is reached: no new chunks will be started');
        budget.stop();
      }
    },
  });
  const service = createTranslationService({ db: prisma as never, translator });

  const schemes = await prisma.scheme.findMany({ select: { id: true, name: true, description: true }, orderBy: { name: 'asc' }, take: limit === Number.MAX_SAFE_INTEGER ? undefined : limit });
  const chunks: (typeof schemes)[] = [];
  for (let i = 0; i < schemes.length; i += chunkSize) chunks.push(schemes.slice(i, i + chunkSize));
  const cap = maxTokens === Number.MAX_SAFE_INTEGER ? 'no token limit' : `at most ${maxTokens.toLocaleString('en-IN')} tokens`;
  console.log(`${schemes.length} schemes in ${chunks.length} chunks of up to ${chunkSize}, ${parallel} at a time, into ${lang.name} (${fields.join(' + ')}), ${cap}`);

  const started = Date.now();
  let next = 0;
  let attempted = 0;
  let finished = 0;
  let stoppedForBudget = false;
  const worker = async () => {
    for (;;) {
      if (budget.exhausted()) {
        stoppedForBudget = true;
        return;
      }
      const mine = next++;
      if (mine >= chunks.length) return;
      attempted += await service.translateCards(chunks[mine], lang, fields);
      finished++;
      if (finished % 5 === 0 || finished === chunks.length) {
        const secs = Math.round((Date.now() - started) / 1000);
        console.log(`  ${finished}/${chunks.length} chunks, ${attempted} texts attempted, ${budget.used().toLocaleString('en-IN')} tokens, ${secs}s`);
      }
    }
  };
  await Promise.all(Array.from({ length: parallel }, worker));

  const rows = await prisma.schemeTranslation.groupBy({ by: ['field', 'status'], where: { languageCode: lang.code, field: { in: fields } }, _count: { _all: true } });
  const count = (field: string, status: string) => rows.find((r) => r.field === field && r.status === status)?._count._all ?? 0;
  console.log(
    `${stoppedForBudget ? 'stopped at the token limit' : 'done'} in ${Math.round((Date.now() - started) / 1000)}s: ${attempted} texts attempted, ` +
      `${budget.used().toLocaleString('en-IN')} tokens used, ${rejected} attempts rejected by validation`,
  );
  for (const f of fields) console.log(`  ${lang.name} ${f}: ${count(f, 'ok')} stored, ${count(f, 'failed')} failed, of ${schemes.length} schemes`);
  if (rejected > 0) console.log('  why attempts were rejected:', why);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
