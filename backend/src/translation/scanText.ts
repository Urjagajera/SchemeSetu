import { LanguageConfig } from './languages.js';
import { GLOSSARY } from './glossary.js';
import { strayScripts } from './validate.js';

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

const range = (lang: LanguageConfig): string => `${String.fromCodePoint(lang.script[0])}-${String.fromCodePoint(lang.script[1])}`;

export function forbiddenFor(lang: LanguageConfig): string[] {
  const out = new Set<string>();
  for (const g of GLOSSARY) for (const f of g[lang.code]?.forbidden ?? []) out.add(f);
  return [...out];
}

export function scanText(text: string, lang: LanguageConfig): TextProblem[] {
  const problems: TextProblem[] = [];
  for (const s of strayScripts('', text, lang)) problems.push({ kind: 'stray-script', detail: s });

  // a Latin letter directly touching a native letter, with nothing (not even a hyphen or bracket) between; the whole
  // run of letters around it is reported
  const native = range(lang);
  const glued = new RegExp(`[A-Za-z${native}]*(?:[${native}][A-Za-z]|[A-Za-z][${native}])[A-Za-z${native}]*`, 'gu');
  for (const m of text.matchAll(glued)) problems.push({ kind: 'latin-in-word', detail: m[0] });

  for (const f of forbiddenFor(lang)) if (text.includes(f)) problems.push({ kind: 'forbidden', detail: f });
  return problems;
}

/** Strings inside a stored value (a string, or an array of strings). */
export function textsOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}
