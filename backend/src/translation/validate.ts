import { LanguageConfig } from './languages.js';

/**
 * Checks that a model's translation is actually a translation.
 *
 * Why this exists: in calibration the model returned valid JSON with the long "application process" text
 * (and once a description) copied back in English, with no error and finish_reason "stop". Nothing in the
 * API response says so, so every result is checked here before it is stored or shown:
 *   - it is not just the English copied back,
 *   - it is mostly in the target script,
 *   - every number, amount, URL and email survived,
 *   - multi-line text kept roughly its line structure,
 *   - lists kept exactly their item count,
 *   - required glossary renderings are present,
 *   - it was not cut off or wildly shorter/longer than the source.
 * A failure makes the caller retry on the fallback model; both failing leaves that field in English.
 */
export interface ValidationResult {
  ok: boolean;
  reasons: string[];
  /** For logs and tests. */
  nativePct: number;
}

import type { GlossaryRequirement } from './glossary.js';
export type { GlossaryRequirement };

const URL_OR_EMAIL = /https?:\/\/[^\s)]+|www\.[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+/g;

const stripUrls = (s: string): string => s.replace(URL_OR_EMAIL, ' ');

/** Removes every case-insensitive occurrence of a literal phrase (no regex, so no escaping to get wrong). */
function removeAll(text: string, phrase: string): string {
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let out = '';
  let i = 0;
  for (;;) {
    const j = lower.indexOf(needle, i);
    if (j < 0) return out + text.slice(i);
    out += text.slice(i, j) + ' ';
    i = j + needle.length;
  }
}

/** Letters and combining marks (Indic vowel signs are marks): the characters that carry a script. */
function scriptCounts(text: string, lang: LanguageConfig): { visible: number; native: number } {
  let visible = 0;
  let native = 0;
  for (const ch of stripUrls(text)) {
    if (!/[\p{L}\p{M}]/u.test(ch)) continue;
    visible++;
    const cp = ch.codePointAt(0)!;
    if (cp >= lang.script[0] && cp <= lang.script[1]) native++;
  }
  return { visible, native };
}

/** Latin words of 4+ letters that are not acronyms: if there are none, "unchanged" is a legitimate answer. */
function englishWordCount(text: string): number {
  return (stripUrls(text).match(/\b[A-Za-z]{4,}\b/g) || []).filter((w) => w !== w.toUpperCase()).length;
}

function toAsciiDigits(text: string, lang: LanguageConfig): string {
  let out = '';
  for (const ch of text) {
    const i = lang.digits.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out;
}

function numbersOf(text: string): string[] {
  const found = text.match(/\d[\d,]*(?:\.\d+)?/g) || [];
  return [...new Set(found.map((n) => n.replace(/,/g, '').replace(/\.$/, '')))];
}

function urlsOf(text: string): string[] {
  return [...new Set((text.match(URL_OR_EMAIL) || []).map((u) => u.replace(/[.,;:]+$/, '')))];
}

function lineCount(text: string): number {
  return text.split('\n').filter((l) => l.trim() !== '').length;
}

/** Shared checks for a text block (or the joined items of a list). */
function checkBlock(
  source: string,
  out: string,
  lang: LanguageConfig,
  glossary: GlossaryRequirement[],
  reasons: string[],
  checkLines: boolean,
): number {
  // Glossary names kept in English are allowed, so they must not count against the script percentage.
  const withoutKeptNames = glossary.reduce((t, g) => removeAll(t, g.en), out);
  const english = englishWordCount(source);
  const { visible, native } = scriptCounts(withoutKeptNames, lang);
  const nativePct = visible === 0 ? 0 : Math.round((native / visible) * 100);

  if (out.trim() === '') {
    reasons.push('empty output');
    return nativePct;
  }

  if (english > 0) {
    if (out.trim() === source.trim()) reasons.push('returned the English unchanged');

    // Threshold depends on how much text there is: short items are acronym-heavy ("PAN card").
    const minPct = visible >= 60 ? 60 : visible >= 15 ? 40 : 20;
    if (nativePct < minPct) reasons.push(`only ${nativePct}% of the text is in ${lang.name} script (need ${minPct}%)`);
  }

  // Numbers, amounts and dates must survive (native digits are accepted and normalised).
  const outDigits = toAsciiDigits(out, lang).replace(/(\d),(?=\d)/g, '$1');
  const missing = numbersOf(source).filter((n) => !outDigits.includes(n));
  if (missing.length > 0) reasons.push(`numbers missing from the translation: ${missing.slice(0, 5).join(', ')}`);

  // URLs and emails must be kept verbatim.
  const lostUrls = urlsOf(source).filter((u) => !out.includes(u));
  if (lostUrls.length > 0) reasons.push(`URLs/emails missing: ${lostUrls.slice(0, 3).join(', ')}`);

  // Multi-line text keeps its structure (the model sometimes merges or drops lines).
  if (checkLines) {
    const inLines = lineCount(source);
    if (inLines >= 3) {
      const outLines = lineCount(out);
      const allowed = Math.max(2, Math.ceil(inLines * 0.25));
      if (Math.abs(outLines - inLines) > allowed) reasons.push(`line count ${inLines} became ${outLines}`);
    }
  }

  // Required renderings of proper names.
  for (const g of glossary) {
    if (!source.toLowerCase().includes(g.en.toLowerCase())) continue;
    const wrong = (g.forbidden ?? []).find((f) => out.includes(f));
    if (wrong) {
      reasons.push(`"${g.en}" was mistranslated as "${wrong}"`);
      continue;
    }
    const accepted = [g.target, ...(g.acceptable ?? [])];
    if (!accepted.some((a) => out.includes(a)) && !out.toLowerCase().includes(g.en.toLowerCase())) {
      reasons.push(`"${g.en}" must be rendered as "${g.target}" (or kept in English)`);
    }
  }

  // Cut-off or runaway output.
  const ratio = out.length / Math.max(source.length, 1);
  if (source.length >= 80 && (ratio < 0.3 || ratio > 4)) reasons.push(`output length is ${ratio.toFixed(2)}x the source`);

  return nativePct;
}

export function validateText(source: string, out: unknown, lang: LanguageConfig, glossary: GlossaryRequirement[] = []): ValidationResult {
  const reasons: string[] = [];
  if (typeof out !== 'string') {
    return { ok: false, reasons: ['output is not a string'], nativePct: 0 };
  }
  const nativePct = checkBlock(source, out, lang, glossary, reasons, true);
  return { ok: reasons.length === 0, reasons, nativePct };
}

export function validateList(sourceItems: string[], out: unknown, lang: LanguageConfig, glossary: GlossaryRequirement[] = []): ValidationResult {
  const reasons: string[] = [];
  if (!Array.isArray(out) || out.some((x) => typeof x !== 'string')) {
    return { ok: false, reasons: ['output is not an array of strings'], nativePct: 0 };
  }
  if (out.length !== sourceItems.length) {
    return { ok: false, reasons: [`item count ${sourceItems.length} became ${out.length}`], nativePct: 0 };
  }
  const nativePct = checkBlock(sourceItems.join('\n'), (out as string[]).join('\n'), lang, glossary, reasons, false);

  // An individual item that still reads as English (and has English words to translate) is a skipped item.
  const skipped = sourceItems.filter((src, i) => englishWordCount(src) >= 2 && (out as string[])[i].trim() === src.trim()).length;
  const withEnglish = sourceItems.filter((src) => englishWordCount(src) >= 2).length;
  if (withEnglish > 0 && skipped / withEnglish > 0.25) reasons.push(`${skipped} of ${withEnglish} items were returned unchanged`);

  return { ok: reasons.length === 0, reasons, nativePct };
}
