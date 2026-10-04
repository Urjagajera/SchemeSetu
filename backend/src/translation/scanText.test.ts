import { describe, it, expect } from 'vitest';
import { scanText, textsOf, forbiddenFor } from './scanText.js';
import { LANGUAGES } from './languages.js';

const hi = LANGUAGES.hi;
const gu = LANGUAGES.gu;
const kinds = (t: string, l = hi) => scanText(t, l).map((p) => p.kind);

// Real stored Hindi titles/summaries that carried a stray letter (found 2026-10-04).
const REAL: Array<[string, string, string]> = [
  ['Japanese', 'मैटर्निटी बेनेフィット (ANBOCWWB)', 'フィット'],
  ['Korean', 'चिकीय यन्त्रों (Medical Devices)의 देशी निर्माण प्रोतारण हेतु उत्पादन-संयुक्त प्रोतारण योजना', '의'],
  ['Cyrillic', 'पीएमएमएसवाई : कूल स्टोराज / आйс प्लांट आधुनिकीकरण - गुजरात', 'йс'],
  ['Bengali', 'पीएमएमएसवाई: मीन कियोस्क, जिसमें अक्वैরিয়म/सजावटी मीन कियोस्क शामिल हों, निर्माण - हरयाणा', 'রিয়'],
  ['Arabic', 'मध्या प्रदेश सरकार کے सैलानी मंडल द्वारा', 'ک'],
  ['Cyrillic', 'पост ग्रेजुएट अध्ययन के लिए राष्ट्रीय छात्रवृत्ति', 'о'],
];

describe('scanText: stray scripts', () => {
  it.each(REAL)('flags %s in a real stored Hindi text', (_name, text, ch) => {
    const found = scanText(text, hi).filter((p) => p.kind === 'stray-script');
    expect(found.length, text).toBeGreaterThan(0);
    expect(found.map((f) => f.detail).join(' ')).toContain(ch);
  });

  it('flags Devanagari inside Gujarati and Gujarati inside Hindi', () => {
    expect(kinds('યુવા અને खेल મંત્રાલય', gu)).toContain('stray-script');
    expect(kinds('मुख्यमंत्री આર્થિક योजना')).toContain('stray-script');
  });

  it('does not flag clean text, English words, acronyms, digits or the danda', () => {
    expect(scanText('प्रधानमंत्री आवास योजना (PMAY) - ग्रामीण, 2024। Medical Devices के लिए 10 टन', hi)).toEqual([]);
  });
});

describe('scanText: Latin letters inside a Hindi word', () => {
  it('flags a Latin letter stuck to a Devanagari letter', () => {
    expect(scanText('मैटर्निटी बेनेFIT योजना', hi)).toEqual([{ kind: 'latin-in-word', detail: 'बेनेFIT' }]);
    expect(kinds('KYCकरें')).toEqual(['latin-in-word']);
  });

  it('allows a Latin word next to a space, bracket, hyphen or slash', () => {
    for (const t of ['आधार (UIDAI) कार्ड', 'ई-KYC करें', 'PAN/आधार', 'SC/ST वर्ग', 'ISO प्रमाणपत्र']) expect(scanText(t, hi), t).toEqual([]);
  });

  it('a purely Latin or purely Hindi token is never flagged', () => {
    expect(scanText('Pension Scheme पेंशन योजना', hi)).toEqual([]);
  });
});

describe('scanText: forbidden renderings', () => {
  it('flags अपाहिज (and its forms) in Hindi but allows दिव्यांग and विकलांग', () => {
    expect(kinds('अपाहिज व्यक्तियों के लिए योजना')).toEqual(['forbidden']);
    expect(kinds('अपाहिजों को सहायता')).toEqual(['forbidden']);
    expect(scanText('दिव्यांग व्यक्तियों के लिए योजना', hi)).toEqual([]);
    expect(scanText('विकलांग पेंशन योजना', hi)).toEqual([]);
  });

  it('uses the language\'s own forbidden list', () => {
    expect(forbiddenFor(hi)).toContain('अपाहिज');
    expect(forbiddenFor(gu)).toContain('ઘરેણી');
    expect(forbiddenFor(gu)).not.toContain('अपाहिज');
  });
});

describe('textsOf', () => {
  it('reads a string, a list of strings, and ignores anything else', () => {
    expect(textsOf('a')).toEqual(['a']);
    expect(textsOf(['a', 'b'])).toEqual(['a', 'b']);
    expect(textsOf(['a', 3, null])).toEqual(['a']);
    expect(textsOf(null)).toEqual([]);
  });
});
