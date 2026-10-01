import { LanguageCode } from './languages.js';

/**
 * Proper names the model gets wrong when it translates them literally. Each entry fixes one rendering per
 * language. Only entries whose English term actually appears in the text are put in the prompt, and the
 * validator then checks the output contains either the fixed rendering or the English term.
 *
 * Add to this when a review or a live test turns up another name that gets mangled.
 */
export interface GlossaryEntry {
  en: string;
  hi: string;
  gu: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // Found in calibration: translated literally as "national faith" (राष्ट्रीय विश्वास / રાષ્ટ્રીય વિશ્વાસ).
  // It is the name of a statutory body, so it is transliterated.
  { en: 'National Trust', hi: 'नेशनल ट्रस्ट', gu: 'નેશનલ ટ્રસ્ટ' },
];

/** Entries whose English term appears (case-insensitively) in any of the given texts. */
export function glossaryHits(texts: string[], lang: LanguageCode): Array<{ en: string; target: string }> {
  const haystack = texts.join('\n').toLowerCase();
  return GLOSSARY.filter((g) => haystack.includes(g.en.toLowerCase())).map((g) => ({ en: g.en, target: g[lang] }));
}
