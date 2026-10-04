import { describe, it, expect } from 'vitest';
import { canonicalTagName, canonicalTags } from './tagCanonical.js';
import { TAG_RENAMES } from './tagRenames.js';
import { isSamePhrase } from './tagMerge.js';

const R = { Loans: 'Loan', Farmers: 'Farmer' };

describe('canonicalTagName', () => {
  it('turns a merged-away spelling into the kept one and leaves other tags alone', () => {
    expect(canonicalTagName('Loans', R)).toBe('Loan');
    expect(canonicalTagName('Loan', R)).toBe('Loan');
    expect(canonicalTagName('Scholarship', R)).toBe('Scholarship');
  });
  it('does not treat object-prototype names as renames', () => {
    expect(canonicalTagName('constructor', R)).toBe('constructor');
    expect(canonicalTagName('toString', R)).toBe('toString');
  });
});

describe('canonicalTags', () => {
  it('collapses two spellings on one scheme to a single tag, keeping order', () => {
    expect(canonicalTags(['Farmers', 'Loans', 'Loan', 'Farmer'], R)).toEqual(['Farmer', 'Loan']);
  });
});

describe('the committed rename map', () => {
  it('is not empty, never chains, and only renames to the same phrase', () => {
    const entries = Object.entries(TAG_RENAMES);
    expect(entries.length).toBeGreaterThan(300);
    for (const [from, to] of entries) {
      expect(to in TAG_RENAMES, `${from} => ${to} is chained`).toBe(false);
      expect(isSamePhrase(from, to), `${from} => ${to}`).toBe(true);
    }
  });
});
