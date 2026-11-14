import { describe, it, expect } from 'vitest';
import { buildVocabulary, correctWord, correctWords, editDistance } from './spelling.js';

// A small vocabulary standing in for the scheme data: "disablity" is a typo that appears once in the data.
const vocab = buildVocabulary([
  ...Array.from({ length: 30 }, () => 'Post Matric Scholarship for students with disability'),
  ...Array.from({ length: 20 }, () => 'Old age pension for widows and farmers in Gujarat; tractor subsidy, housing loan'),
  'Assistance for persons with disablity',
]);

describe('editDistance', () => {
  it('counts changes, and a swap of two neighbouring letters as one', () => {
    expect(editDistance('pention', 'pension', 2)).toBe(1);
    expect(editDistance('pnesion', 'pension', 2)).toBe(1);
    expect(editDistance('scolarship', 'scholarship', 2)).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBe(2); // stops early: anything above the limit is limit + 1
  });
});

describe('correctWord: typos are fixed, real words never changed', () => {
  it.each([
    ['scolarship', 'scholarship'],
    ['skolarship', 'scholarship'],
    ['pention', 'pension'],
    ['tracter', 'tractor'],
    ['housng', 'housing'],
    ['studnet', 'students'],
    ['gujrat', 'gujarat'],
  ])('%s -> %s', (typo, fix) => {
    expect(correctWord(typo, vocab)).toBe(fix);
  });

  it('leaves real words and the start of a real word alone', () => {
    for (const w of ['pension', 'farmer', 'farm', 'scholar', 'tractor']) expect(correctWord(w, vocab)).toBeNull();
  });

  it('fixes a typo that is in the data only rarely, when the right word is far more common', () => {
    expect(correctWord('disablity', vocab)).toBe('disability');
  });

  it('leaves short words, numbers, other scripts and words with nothing close', () => {
    for (const w of ['pm', 'sc', 'loan2', 'पेंशन', 'zzzzzzzz']) expect(correctWord(w, vocab)).toBeNull();
  });
});

describe('correctWords', () => {
  it('fixes only the misspelt words and says whether anything changed', () => {
    expect(correctWords(['pention', 'widow'], vocab)).toEqual({ words: ['pension', 'widow'], corrected: true });
    expect(correctWords(['pension', 'widow'], vocab)).toEqual({ words: ['pension', 'widow'], corrected: false });
  });
});
