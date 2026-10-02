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
 * An entry with `forbidOnly` enforces only its `forbidden` list: `preferred` still goes into the prompt as
 * guidance, but a translation that uses some other acceptable word is not rejected for it.
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
  forbidOnly?: boolean;
}

/**
 * Words for a person with a disability. "अपाहिज" (also अपाहिजता, अपाहिजों: the check is a substring test) is widely
 * considered demeaning, and the product uses दिव्यांग; the Qwen fallback model produced it in 7 of ~210 lines in the
 * Hindi audit, and 42 stored titles already contain it. The Gujarati renderings are unverified (Gujarati is off).
 * विकलांग is deliberately not forbidden: it is the older official wording and appears in source schemes.
 */
const DISABILITY_TERMS: Array<{ en: string; hi: string; gu: string }> = [
  { en: 'differently abled', hi: 'दिव्यांग', gu: 'દિવ્યાંગ' },
  { en: 'specially abled', hi: 'दिव्यांग', gu: 'દિવ્યાંગ' },
  { en: 'physically challenged', hi: 'दिव्यांग', gu: 'દિવ્યાંગ' },
  { en: 'handicapped', hi: 'दिव्यांग', gu: 'દિવ્યાંગ' },
  { en: 'disabled', hi: 'दिव्यांग', gu: 'દિવ્યાંગ' },
  { en: 'divyang', hi: 'दिव्यांग', gu: 'દિવ્યાંગ' },
  { en: 'disability', hi: 'दिव्यांगता', gu: 'દિવ્યાંગતા' },
  { en: 'disabilities', hi: 'दिव्यांगता', gu: 'દિવ્યાંગતા' },
  { en: 'disablement', hi: 'दिव्यांगता', gu: 'દિવ્યાંગતા' },
];

export const GLOSSARY: GlossaryEntry[] = [
  // "National Trust" is the name of a statutory body. Found in calibration translated literally as "national
  // faith"; in the first live run both models chose "राष्ट्रीय ट्रस्ट", which is correct and in common use.
  {
    en: 'National Trust',
    hi: { preferred: 'नेशनल ट्रस्ट', acceptable: ['राष्ट्रीय ट्रस्ट', 'राष्ट्रीय न्यास'], forbidden: ['राष्ट्रीय विश्वास', 'नेशनल विश्वास'] },
    gu: { preferred: 'નેશનલ ટ્રસ્ટ', acceptable: ['રાષ્ટ્રીય ટ્રસ્ટ', 'રાષ્ટ્રીય ન્યાસ'], forbidden: ['રાષ્ટ્રીય વિશ્વાસ', 'નેશનલ વિશ્વાસ'] },
  },
  ...DISABILITY_TERMS.map((t): GlossaryEntry => ({
    en: t.en,
    hi: { preferred: t.hi, forbidden: ['अपाहिज'] },
    gu: { preferred: t.gu },
    forbidOnly: true,
  })),
];

export interface GlossaryRequirement {
  en: string;
  /** The rendering the prompt asks for. */
  target: string;
  acceptable?: string[];
  forbidden?: string[];
  /** Only `forbidden` is enforced (see GlossaryEntry). */
  forbidOnly?: boolean;
}

/** Entries whose English term appears (case-insensitively) in any of the given texts. */
export function glossaryHits(texts: string[], lang: LanguageCode): GlossaryRequirement[] {
  const haystack = texts.join('\n').toLowerCase();
  return GLOSSARY.filter((g) => haystack.includes(g.en.toLowerCase())).map((g) => ({
    en: g.en,
    target: g[lang].preferred,
    acceptable: g[lang].acceptable,
    forbidden: g[lang].forbidden,
    forbidOnly: g.forbidOnly,
  }));
}
