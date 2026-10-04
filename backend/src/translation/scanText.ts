import { LanguageConfig } from './languages.js';
import { GLOSSARY } from './glossary.js';
import { strayScripts, gluedLatinWords } from './validate.js';

/**
 * Finds the faults that must never sit in a stored translation, without needing the English source:
 *   - stray-script: letters from another script (Japanese, Korean, Bengali, Cyrillic, Arabic ...),
 *   - latin-in-word: a Latin letter stuck to a native-script letter with nothing between them ("बेनेFIT"),
 *   - forbidden: a rendering the glossary forbids for the language (for Hindi: अपाहिज).
 * Latin words and acronyms standing on their own, in brackets or after a hyphen are fine.
 */
export type ProblemKind = 'stray-script' | 'latin-in-word' | 'forbidden';
export interface TextProblem {
  kind: ProblemKind;
  detail: string;
}

export function forbiddenFor(lang: LanguageConfig): string[] {
  const out = new Set<string>();
  for (const g of GLOSSARY) for (const f of g[lang.code]?.forbidden ?? []) out.add(f);
  return [...out];
}

export function scanText(text: string, lang: LanguageConfig): TextProblem[] {
  const problems: TextProblem[] = [];
  for (const s of strayScripts('', text, lang)) problems.push({ kind: 'stray-script', detail: s });

  // Latin letters stuck to the language's own letters (the rule, and its Gujarati exemption, are in validate.ts)
  for (const w of gluedLatinWords(text, lang)) problems.push({ kind: 'latin-in-word', detail: w });

  for (const f of forbiddenFor(lang)) if (text.includes(f)) problems.push({ kind: 'forbidden', detail: f });
  return problems;
}

/** Strings inside a stored value (a string, or an array of strings). */
export function textsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}
