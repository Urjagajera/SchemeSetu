import { LanguageConfig } from './languages.js';
import { hi } from './vocabulary/hi.js';

/**
 * Translated labels for the short, repeated words around a scheme: the "category" badge and ministry line
 * (in this dataset both come from the same 88 names: ministries, states and a few bodies) and the tag chips.
 *
 * These are translated once, ahead of time, by `npm run translate:vocabulary`, reviewed, and committed in
 * vocabulary/<lang>.ts. Serving them is a plain lookup: no model call, no database, no waiting.
 *
 * Tags: only the ones used by at least TAG_MIN_SCHEMES schemes are translated (they cover about three
 * quarters of all tag usage). The long tail of rarely-used tags has no translation, and the frontend hides a
 * tag in Hindi/Gujarati mode when it has none, rather than showing an English chip among Hindi ones.
 */
export interface VocabularyData {
  /** Ministry, department and state names: English (exactly as stored) -> translation. */
  names: Record<string, string>;
  /** Tag name (exactly as stored) -> translation. */
  tags: Record<string, string>;
}

export interface Vocabulary extends VocabularyData {
  language: string;
}

export const TAG_MIN_SCHEMES = 10;

const DATA: Record<string, VocabularyData> = { hi };

/** The vocabulary for an enabled language; empty maps for English or a language that is not enabled. */
export function vocabularyFor(lang: LanguageConfig | null): Vocabulary {
  if (!lang) return { language: 'en', names: {}, tags: {} };
  const data = DATA[lang.code] ?? { names: {}, tags: {} };
  return { language: lang.code, names: data.names, tags: data.tags };
}
