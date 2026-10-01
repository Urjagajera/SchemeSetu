/**
 * buildVocabulary.ts
 * Translates the ministry/state names and the commonly used tags into one language and writes
 * src/translation/vocabulary/<lang>.ts, plus a review file in reports/.
 *
 * - Reads the real names and tags from the database (read-only).
 * - Uses the same translator and validator as scheme content (fallback model, number/script checks).
 * - Keeps entries already in the file (so hand corrections survive); only missing ones are translated.
 *   Pass --force to translate everything again.
 * - Anything the validator rejects on both models is listed as failed and left out, never guessed.
 *
 * Usage: npm run translate:vocabulary -- hi [--force]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db/prisma.js';
import config from '../config/env.js';
import { createGroqLlm } from './llm.js';
import { createTranslator } from './translator.js';
import { LANGUAGES, LanguageCode } from './languages.js';
import { TAG_MIN_SCHEMES, VocabularyData } from './vocabulary.js';
import { translateTerms, renderVocabularyFile } from './vocabularyBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NAME_HINT: Record<LanguageCode, string> = {
  hi:
    "These strings are names of Indian government ministries, departments, states, union territories and public bodies. Use the official Hindi name where one exists (for example 'Ministry of Finance' -> 'वित्त मंत्रालय', 'Delhi' -> 'दिल्ली', 'Ministry of Jal Shakti' -> 'जल शक्ति मंत्रालय'). Transliterate proper names that have no official translation. The English may have odd capitalisation or missing spaces after commas; translate the meaning, not the typos.",
  gu:
    "These strings are names of Indian government ministries, departments, states, union territories and public bodies. Use the official Gujarati name where one exists. Transliterate proper names that have no official translation. The English may have odd capitalisation or missing spaces after commas; translate the meaning, not the typos.",
};
const TAG_HINT =
  "These strings are short topic tags for welfare schemes (like 'Women', 'Scholarship', 'Entrepreneur', 'Health'). Translate each into a short, natural word or phrase, not a sentence.";

async function main() {
  const langCode = (process.argv[2] ?? 'hi') as LanguageCode;
  const force = process.argv.includes('--force');
  const lang = LANGUAGES[langCode];
  if (!lang) throw new Error(`unknown language "${langCode}"`);
  if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set in backend/.env');

  const file = path.join(__dirname, 'vocabulary', `${langCode}.ts`);
  const existing: VocabularyData = force ? { names: {}, tags: {} } : (await import(`./vocabulary/${langCode}.js`))[langCode];

  const translator = createTranslator({
    llm: createGroqLlm(config.GROQ_API_KEY),
    primaryModel: config.TRANSLATION_PRIMARY_MODEL,
    fallbackModel: config.TRANSLATION_FALLBACK_MODEL,
    onReject: ({ model, reasons }) => console.log(`  rejected by validation (${model}): ${reasons.join('; ')}`),
  });

  // ── what needs translating ──
  // Category and ministry are the same 88 names in this dataset; read both so nothing is missed.
  const [cats, auths, tagRows] = await Promise.all([
    prisma.category.findMany({ select: { name: true } }),
    prisma.scheme.findMany({ select: { authorityName: true }, distinct: ['authorityName'] }),
    prisma.tag.findMany({ select: { name: true, _count: { select: { schemes: true } } } }),
  ]);
  const names = [...new Set([...cats.map((c) => c.name.trim()), ...auths.map((a) => a.authorityName.trim()), 'General'])].filter(Boolean).sort();
  const tags = tagRows
    .filter((t) => t._count.schemes >= TAG_MIN_SCHEMES)
    .sort((a, b) => b._count.schemes - a._count.schemes)
    .map((t) => t.name);
  console.log(`${names.length} names and ${tags.length} tags (used by >= ${TAG_MIN_SCHEMES} schemes) to cover`);

  const missingNames = names.filter((n) => !existing.names[n]);
  const missingTags = tags.filter((t) => !existing.tags[t]);
  console.log(`translating ${missingNames.length} names and ${missingTags.length} tags into ${lang.name}`);

  const nameRes = await translateTerms(missingNames, (items) => translator.translateList(items, lang, NAME_HINT[langCode]));
  console.log(`names: ${Object.keys(nameRes.translated).length} done, ${nameRes.failed.length} failed`);
  const tagRes = await translateTerms(missingTags, (items) => translator.translateList(items, lang, TAG_HINT));
  console.log(`tags: ${Object.keys(tagRes.translated).length} done, ${tagRes.failed.length} failed`);

  const mergedNames = { ...existing.names, ...nameRes.translated };
  const mergedTags = { ...existing.tags, ...tagRes.translated };
  fs.writeFileSync(file, renderVocabularyFile(langCode, mergedNames, mergedTags), 'utf8');
  console.log(`wrote ${path.relative(process.cwd(), file)}`);

  // ── review file ──
  const lines = [
    `# Vocabulary review: ${lang.name}`,
    '',
    `${Object.keys(mergedNames).length} names, ${Object.keys(mergedTags).length} tags. Names are proper names / official titles: please read them.`,
    'Edit src/translation/vocabulary/' + langCode + '.ts directly to correct one; a rerun keeps your edit.',
    '',
    '## Names (ministries, departments, states)',
    '',
    '| English (as stored) | Translation | Note |',
    '|---|---|---|',
    ...Object.keys(mergedNames)
      .sort()
      .map((n) => {
        const note = [nameRes.retried.includes(n) ? 'needed a retry' : '', nameRes.models[n]?.includes('+') ? 'fallback model used' : '']
          .filter(Boolean)
          .join(', ');
        return `| ${n} | ${mergedNames[n]} | ${note} |`;
      }),
    '',
    '## Failed (left untranslated)',
    '',
    ...[...nameRes.failed, ...tagRes.failed].map((f) => `- ${f.term}: ${f.error.slice(0, 200)}`),
    '',
    '## Tags (most used first)',
    '',
    '| English | Translation |',
    '|---|---|',
    ...tags.filter((t) => mergedTags[t]).map((t) => `| ${t} | ${mergedTags[t]} |`),
    '',
  ];
  const reports = path.join(__dirname, '..', '..', 'reports');
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, `vocabulary-${langCode}-review.md`), lines.join('\n'), 'utf8');
  console.log(`wrote reports/vocabulary-${langCode}-review.md`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
