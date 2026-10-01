import { createHash } from 'node:crypto';

/**
 * The six scheme fields that get translated, and how each one is read from a scheme.
 * Bump PROMPT_VERSION to make every stored translation count as stale (for example after changing the
 * prompt or the validation rules in a way that should regenerate existing output).
 */
export const PROMPT_VERSION = '1';

export type FieldKey = 'title' | 'description' | 'benefits' | 'eligibility' | 'documents' | 'applicationProcess';

export const FIELD_KEYS: readonly FieldKey[] = ['title', 'description', 'benefits', 'eligibility', 'documents', 'applicationProcess'];

/** The slice of a Scheme the translation needs (Prisma field names). */
export interface SchemeSource {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  eligibilityRawText: string[];
  documentRequirements: string[];
  applicationProcess: string | null;
}

export const isListField = (f: FieldKey): boolean => f === 'benefits' || f === 'eligibility' || f === 'documents';

/** The English source for a field, or null when there is nothing to translate. */
export function sourceFor(scheme: SchemeSource, field: FieldKey): string | string[] | null {
  switch (field) {
    case 'title':
      return scheme.name.trim() ? scheme.name : null;
    case 'description':
      return scheme.description.trim() ? scheme.description : null;
    case 'benefits':
      return scheme.benefits.length > 0 ? scheme.benefits : null;
    case 'eligibility':
      return scheme.eligibilityRawText.length > 0 ? scheme.eligibilityRawText : null;
    case 'documents':
      return scheme.documentRequirements.length > 0 ? scheme.documentRequirements : null;
    case 'applicationProcess':
      return scheme.applicationProcess && scheme.applicationProcess.trim() ? scheme.applicationProcess : null;
  }
}

/** Identifies the exact English text (and prompt version) a translation was made from. */
export function sourceHash(source: string | string[]): string {
  return createHash('sha256').update(`${PROMPT_VERSION}\u0000${JSON.stringify(source)}`).digest('hex').slice(0, 32);
}

const SUMMARY_MAX_CHARS = 200;
const SUMMARY_MIN_CHARS = 60;

/**
 * The short English text a card shows under the title, and the source of the translated "summary" field:
 * the description without its leading "Details" heading, on one line, cut at a sentence end when there is
 * one in range, otherwise at a word boundary with "...". Null when there is no description.
 */
export function summarySource(description: string): string | null {
  const text = description.replace(/^\s*details\s*[:\-]?\s*/i, '').replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  if (text.length <= SUMMARY_MAX_CHARS) return text;
  const window = text.slice(0, SUMMARY_MAX_CHARS);
  const ends = [...window.matchAll(/[.!?](?=\s|$)/g)].map((m) => m.index! + 1);
  const lastEnd = ends.filter((e) => e >= SUMMARY_MIN_CHARS).pop();
  if (lastEnd) return window.slice(0, lastEnd).trim();
  const lastSpace = window.lastIndexOf(' ');
  return `${window.slice(0, lastSpace > 0 ? lastSpace : SUMMARY_MAX_CHARS).trim()}...`;
}
