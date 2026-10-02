import { describe, it, expect } from 'vitest';
import { stateLabel } from './stateLabel';
import { makeVocabulary } from '../test/factories';

// t() answers with the key itself when a language has no entry, which is what the real one does.
const localeWith = (entries: Record<string, string>) => (key: string) => entries[key] ?? key;

describe('stateLabel', () => {
  it('prefers the translated name from the server vocabulary', () => {
    const vocab = makeVocabulary({ names: { Gujarat: 'गुजरात' } });
    expect(stateLabel('Gujarat', vocab, localeWith({ state_gujarat: 'ગુજરાત' }))).toBe('गुजरात');
  });

  it('ignores stray spaces around the stored name', () => {
    const vocab = makeVocabulary({ names: { Gujarat: 'गुजरात' } });
    expect(stateLabel('  Gujarat ', vocab, localeWith({}))).toBe('गुजरात');
  });

  it('falls back to a locale-file translation when the vocabulary has none', () => {
    expect(stateLabel('Gujarat', makeVocabulary(), localeWith({ state_gujarat: 'ગુજરાત' }))).toBe('ગુજરાત');
    expect(stateLabel('Gujarat', null, localeWith({ state_gujarat: 'ગુજરાત' }))).toBe('ગુજરાત');
  });

  it('builds the locale key from multi-word names', () => {
    expect(stateLabel('Tamil   Nadu', null, localeWith({ state_tamil_nadu: 'தமிழ்நாடு' }))).toBe('தமிழ்நாடு');
  });

  it('shows the English name when nothing translates it', () => {
    // the real t() returns the key, which must not leak onto the page
    expect(stateLabel('Tamil Nadu', makeVocabulary(), localeWith({}))).toBe('Tamil Nadu');
    expect(stateLabel('Tamil Nadu', null, () => '')).toBe('Tamil Nadu');
  });
});
