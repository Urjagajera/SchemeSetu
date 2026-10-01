import { LanguageCode } from './languages.js';

/**
 * Proper names the model gets wrong when it translates them literally.
 *
 * For each language an entry has:
 *   - `preferred`:  the rendering the prompt asks for,
 *   - `acceptable`: other correct renderings the validator also accepts (models often pick a natural
 *                   variant, and rejecting a correct translation just wastes a retry and leaves English),
 *   - `forbidden`:  known-wrong renderings; if one appears, the translation is rejected.
 * Keeping the English name is always accepted.
 *
 * Only entries whose English term appears in the text are put in the prompt. Add to this when a review or
 * a live test turns up another name that gets mangled.
 */
export interface GlossaryLang {
  preferred: string;
  acceptable?: string[];
  forbidden?: string[];
}

export interface GlossaryEntry {
  en: string;
  hi: GlossaryLang;
  gu: GlossaryLang;
}

export const GLOSSARY: GlossaryEntry[] = [
  // "National Trust" is the name of a statutory body. Found in calibration translated literally as "national
  // faith"; in the first live run both models chose "राष्ट्रीय ट्रस्ट", which is correct and in common use.
  {
    en: 'National Trust',
    hi: { preferred: 'नेशनल ट्रस्ट', acceptable: ['राष्ट्रीय ट्रस्ट', 'राष्ट्रीय न्यास'], forbidden: ['राष्ट्रीय विश्वास', 'नेशनल विश्वास'] },
    gu: { preferred: 'નેશનલ ટ્રસ્ટ', acceptable: ['રાષ્ટ્રીય ટ્રસ્ટ', 'રાષ્ટ્રીય ન્યાસ'], forbidden: ['રાષ્ટ્રીય વિશ્વાસ', 'નેશનલ વિશ્વાસ'] },
  },
];

export interface GlossaryRequirement {
  en: string;
  /** The rendering the prompt asks for. */
  target: string;
  acceptable?: string[];
  forbidden?: string[];
}

/** Entries whose English term appears (case-insensitively) in any of the given texts. */
export function glossaryHits(texts: string[], lang: LanguageCode): GlossaryRequirement[] {
  const haystack = texts.join('\n').toLowerCase();
  return GLOSSARY.filter((g) => haystack.includes(g.en.toLowerCase())).map((g) => ({
    en: g.en,
    target: g[lang].preferred,
    acceptable: g[lang].acceptable,
    forbidden: g[lang].forbidden,
  }));
}
