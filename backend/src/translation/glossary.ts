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
  /** True when no native speaker has checked this rendering. Every Gujarati entry is unverified. */
  unverified?: boolean;
  acceptable?: string[];
  forbidden?: string[];
}

export interface GlossaryEntry {
  en: string;
  /** A language with no entry is simply not constrained for this term. */
  hi?: GlossaryLang;
  gu?: GlossaryLang;
  forbidOnly?: boolean;
  /** Match the English term only as a whole word (plural s allowed): "pig" must not fire on "pigeon" or "piggery". */
  wholeWord?: boolean;
}

/** True when `term` occurs in `text` (case-insensitively; as a whole word when asked). */
export function mentions(text: string, term: string, wholeWord?: boolean): boolean {
  const t = text.toLowerCase();
  const needle = term.toLowerCase();
  if (!wholeWord) return t.includes(needle);
  for (let i = t.indexOf(needle); i >= 0; i = t.indexOf(needle, i + 1)) {
    const before = t[i - 1];
    const after = t.slice(i + needle.length).match(/^(es|s)?(?![a-z])/)?.[0] !== undefined;
    if ((before === undefined || !/[a-z]/.test(before)) && after) return true;
  }
  return false;
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

/**
 * Gujarati terms from the back-translation audit (backend/reports/gujarati-gptoss-audit.md), where the models turned
 * these into something else: pig into "unintelligible", piglets into jewellery, Sewing Machine into "tank machine",
 * Interest Subvention into "cooking subvention", trimester into months, free into "liberated", Scheduled Tribe into
 * "certified caste", Denotified/Nomadic into "tribal"/"honourable", partnership concern into "partnership worries".
 *
 * EVERY rendering here is UNVERIFIED: written from the audit by a non-speaker. A native Gujarati speaker must check
 * them before Gujarati is switched on. `forbidden` lists are substring tests, so they hold only wrong words that
 * cannot sit inside a correct one (મુક્ત, for instance, is inside વિમુક્ત "denotified", so "free" is enforced by
 * requiring મફત instead of forbidding મુક્ત). Hindi is not constrained by these entries.
 */
const unverified = (g: GlossaryLang): GlossaryLang => ({ ...g, unverified: true });
const GUJARATI_AUDIT_TERMS: GlossaryEntry[] = [
  { en: 'free of charge', gu: unverified({ preferred: 'મફત', acceptable: ['નિઃશુલ્ક', 'વિનામૂલ્યે', 'નિ:શુલ્ક'] }) },
  { en: 'free of cost', gu: unverified({ preferred: 'મફત', acceptable: ['નિઃશુલ્ક', 'વિનામૂલ્યે', 'નિ:શુલ્ક'] }) },
  { en: 'Scheduled Caste', gu: unverified({ preferred: 'અનુસૂચિત જાતિ', acceptable: ['શેડ્યુલ્ડ કાસ્ટ'], forbidden: ['પ્રમાણિત જાતિ', 'નિર્ધારિત જાતિ'] }) },
  { en: 'Scheduled Tribe', gu: unverified({ preferred: 'અનુસૂચિત જનજાતિ', acceptable: ['શેડ્યુલ્ડ ટ્રાઇબ'], forbidden: ['પ્રમાણિત જાતિ', 'સ્થાનિક જાતિ'] }) },
  { en: 'Backward Class', gu: unverified({ preferred: 'પછાત વર્ગ', forbidden: ['પાછળ પડેલા', 'પાછળની વર્ગ'] }) },
  { en: 'Denotified', gu: unverified({ preferred: 'વિમુક્ત', acceptable: ['ડિનોટિફાઇડ'], forbidden: ['આદિવાસી'] }) },
  { en: 'Nomadic', gu: unverified({ preferred: 'વિચરતી', acceptable: ['વિચરતા', 'વિચરતું', 'નોમેડિક'], forbidden: ['નામદાર'] }) },
  { en: 'trimester', gu: unverified({ preferred: 'ત્રિમાસિક', acceptable: ['ટ્રાઇમેસ્ટર'] }) },
  { en: 'interest subvention', gu: unverified({ preferred: 'વ્યાજ સહાય', acceptable: ['વ્યાજ સબવેન્શન', 'વ્યાજ સબસિડી', 'વ્યાજ રાહત'], forbidden: ['રસોઈ'] }) },
  { en: 'buffalo', gu: unverified({ preferred: 'ભેંસ', forbidden: ['બફેલો', 'હાથી', 'મોઢા'] }) },
  { en: 'piglet', wholeWord: true, gu: unverified({ preferred: 'ડુક્કરનું બચ્ચું', acceptable: ['ડુક્કરના બચ્ચા', 'બચ્ચા', 'પિગલેટ'], forbidden: ['ઘરેણી'] }) },
  { en: 'pig', wholeWord: true, gu: unverified({ preferred: 'ડુક્કર', forbidden: ['સૂરિયા', 'ઘરેણી'] }) },
  { en: 'pulses', wholeWord: true, gu: unverified({ preferred: 'કઠોળ', forbidden: ['ડાળિયા'] }) },
  { en: 'sewing machine', gu: unverified({ preferred: 'સિલાઈ મશીન', acceptable: ['સિલાઇ મશીન', 'સીવણ મશીન', 'સીવવાનું મશીન'], forbidden: ['ટાંકી'] }) },
  { en: 'partnership firm', gu: unverified({ preferred: 'ભાગીદારી પેઢી', forbidden: ['સાહોદરિક'] }) },
  { en: 'partnership concern', gu: unverified({ preferred: 'ભાગીદારી પેઢી', acceptable: ['ભાગીદારી પેઢી'], forbidden: ['ચિંતા'] }) },
  { en: 'age relaxation', gu: unverified({ preferred: 'ઉંમરમાં છૂટછાટ', acceptable: ['વય મર્યાદામાં છૂટછાટ', 'વયમાં છૂટછાટ', 'છૂટછાટ', 'છૂટ'], forbidden: ['મુલતવી'] }) },
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
  ...GUJARATI_AUDIT_TERMS,
];

export interface GlossaryRequirement {
  en: string;
  /** The rendering the prompt asks for. */
  target: string;
  acceptable?: string[];
  forbidden?: string[];
  /** Only `forbidden` is enforced (see GlossaryEntry). */
  forbidOnly?: boolean;
  wholeWord?: boolean;
}

/** Entries whose English term appears in any of the given texts, for entries that constrain this language. */
export function glossaryHits(texts: string[], lang: LanguageCode): GlossaryRequirement[] {
  const haystack = texts.join(' ');
  const out: GlossaryRequirement[] = [];
  for (const g of GLOSSARY) {
    const l = g[lang];
    if (!l || !mentions(haystack, g.en, g.wholeWord)) continue;
    out.push({ en: g.en, target: l.preferred, acceptable: l.acceptable, forbidden: l.forbidden, forbidOnly: g.forbidOnly, wholeWord: g.wholeWord });
  }
  return out;
}
