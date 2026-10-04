import { describe, it, expect } from 'vitest';
import { validateText, gluedLatinWords } from './validate.js';
import { LANGUAGES } from './languages.js';
import { glossaryHits, mentions } from './glossary.js';

const gu = LANGUAGES.gu;
const hi = LANGUAGES.hi;

// Real lines from the Gujarati audits (backend/reports/gujarati-reaudit-fresh-sheet.txt and the first two audits).
const GLUED_REAL: Array<[string, string, string, string]> = [
  [
    '"coconut" written with Latin letters inside the Gujarati word (Qwen)',
    '"Integrated Farming for Productivity Improvement Scheme" by the Coconut Development Board',
    'કોconut વિકાસ બોર્ડ દ્વારા "ઉત્પાદકતા સુધારણા માટે સંકલિત ખેતી યોજના"',
    'કોconut',
  ],
  [
    'an English phrase fused onto a Gujarati word (gpt-oss)',
    'The Awardees will be reimbursed to and fro airfare through the shortest route from the place of stay to the place of the award ceremony and back.',
    'પુરસ્કાર પ્રાપ્તકર્તાઓને તેમના નિવાસસ્થાનથી પુરસ્કાર સમારંભ સ્થળ સુધી અને પાછાShortest route દ્વારા એરફેર પરત આપવામાં આવશે.',
    'પાછાShortest',
  ],
];

// Real Gujarati lines where an ending is written straight onto an English word. These are correct Gujarati.
const SUFFIX_REAL: Array<[string, string]> = [
  ['Students studying in Class XI and XII of the state higher secondary schools', 'રાજ્યની હાયર સેકન્ડરી સ્કૂલોમાં કક્ષા XI અને XIIમાં અભ્યાસ કરતા વિદ્યાર્થીઓને પ્રતિ વર્ષ સહાય'],
  ['Interest subsidy to beneficiaries with a Kishan Credit Card', 'લાભાર્થી Kishan Credit Cardને વ્યાજ સબસિડી પ્રદાન કરવા માટે'],
  ['PRL Vikram Sarabhai Postdoctoral Fellowship (VISHWAS)', 'PRLનું વિક્રમ સારાભાઈ પોસ્ટડોક્ટરલ ફેલોશિપ (VISHWAS)'],
  ['The amount is returned to the Women & Child Development Corporation, Bihar.', 'રકમ બિહારની Women & Child Development Corporationને પરત કરવામાં આવે છે.'],
];

describe('Latin letters stuck inside a Gujarati word', () => {
  it.each(GLUED_REAL)('rejects %s', (_what, source, out, word) => {
    const r = validateText(source, out, gu);
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toContain('Latin letters stuck inside Gujarati words');
    expect(r.reasons.join(' ')).toContain(word);
  });

  it.each(SUFFIX_REAL)('does not reject an ending on an English word: %s', (source, out) => {
    expect(gluedLatinWords(out, gu)).toEqual([]);
    expect(validateText(source, out, gu).reasons.join(' ')).not.toContain('Latin letters stuck');
  });

  it('gluedLatinWords finds the fused word and only that', () => {
    expect(gluedLatinWords('અને પાછાShortest route દ્વારા', gu)).toEqual(['પાછાShortest']);
    expect(gluedLatinWords('કોconut વિકાસ બોર્ડ', gu)).toEqual(['કોconut']);
  });

  it('lets English words, acronyms, numbers and addresses stand on their own or after a space, hyphen, slash or bracket', () => {
    for (const t of ['PMAY યોજના', 'ESM/વિધવા', 'SC-કેટેગરી', 'RTGS/ NEFT દ્વારા', '(PAN) કાર્ડ', 'Udyam portal માં નોંધાયેલ', '₹50,000/- સુધી', 'વેબસાઇટ https://example.gov.in/યોજના જુઓ']) {
      expect(gluedLatinWords(t, gu), t).toEqual([]);
    }
  });

  it('is not fooled by Gujarati digits or punctuation next to Latin letters', () => {
    expect(gluedLatinWords('૨૦૨૪ Scheme', gu)).toEqual([]);
    expect(gluedLatinWords('૫kg ચોખા', gu)).toEqual([]); // a digit is not a letter
  });

  it('in Hindi a Latin letter on either side of a native letter is flagged (Hindi puts endings in a separate word)', () => {
    expect(gluedLatinWords('पoultry फार्मिंग योजना', hi)).toEqual(['पoultry']);
    expect(gluedLatinWords('Uttarakंड', hi)).toEqual(['Uttarakंड']);
    expect(gluedLatinWords('PMAY योजना (APIs) के लिए', hi)).toEqual([]);
  });
});

describe('glossary: pulse (singular) and marginal', () => {
  const PULSE_SRC = 'Training Program: Training on advanced pulse production techniques.';
  const MARGINAL_SRC = 'Small/marginal category farmers are given a 75 percent subsidy for a maximum of 4000 square meters.';

  it('"pulse" in the singular was written as ડાળિયા in the audit: rejected, and કઠોળ accepted', () => {
    const hits = glossaryHits([PULSE_SRC], 'gu');
    expect(hits.map((h) => h.en)).toEqual(['pulse']);
    const bad = validateText(PULSE_SRC, 'શિક્ષણ કાર્યક્રમ: અદ્યતન ડાળિયાના ઉત્પાદનની તકનીકો પર તાલીમ.', gu, hits);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/mistranslated as "ડાળિયા"/);
    expect(validateText(PULSE_SRC, 'તાલીમ કાર્યક્રમ: અદ્યતન કઠોળ ઉત્પાદન તકનીકો પર તાલીમ.', gu, hits).reasons).toEqual([]);
  });

  it('"pulses" still works through the same entry', () => {
    expect(glossaryHits(['Farmers growing pulses crops'], 'gu').map((h) => h.en)).toEqual(['pulse']);
  });

  it('"Pulse Polio" and pulse rate are not about the crop', () => {
    for (const t of ['Pulse Polio immunisation drive', 'Check the pulse rate and oxygen level', 'Pulse oximeter for patients']) {
      expect(glossaryHits([t], 'gu'), t).toEqual([]);
    }
    expect(mentions('Pulse Polio and pulse crops', 'pulse', true, ['pulse polio'])).toBe(true); // a real crop mention still counts
  });

  it('"marginal" was written as કિનારીવાળા (with edges) in the audit: rejected, and સીમાંત accepted', () => {
    const hits = glossaryHits([MARGINAL_SRC], 'gu');
    expect(hits.map((h) => h.en)).toEqual(['marginal']);
    const bad = validateText(MARGINAL_SRC, 'નાના/કિનારીવાળા વર્ગના ખેડૂતોને મહત્તમ 4000 ચોરસ મીટર માટે 75 ટકા સબસિડી આપવામાં આવે છે.', gu, hits);
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(' ')).toMatch(/mistranslated as "કિનારી"/);
    const good = validateText(MARGINAL_SRC, 'નાના/સીમાંત વર્ગના ખેડૂતોને મહત્તમ 4000 ચોરસ મીટર માટે 75 ટકા સબસિડી આપવામાં આવે છે.', gu, hits);
    expect(good.reasons).toEqual([]);
  });

  it('they apply to Gujarati only, are marked unverified, and do not fire inside other words', () => {
    expect(glossaryHits([PULSE_SRC, MARGINAL_SRC], 'hi')).toEqual([]);
    expect(glossaryHits(['Impulse buying', 'marginalised groups'], 'gu')).toEqual([]);
  });
});
