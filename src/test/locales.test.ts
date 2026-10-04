import { describe, it, expect } from 'vitest';
import en from '../../locales/en.json';
import hi from '../../locales/hi.json';
import gu from '../../locales/gu.json';

// The machine-translation wording must exist in every language. The Hindi and Gujarati wording is UNVERIFIED by a
// native speaker (see the Hindi quality label module).
describe('machine-translation wording in the locale files', () => {
  it.each([['en', en], ['hi', hi], ['gu', gu]] as Array<[string, Record<string, string>]>)('%s has both strings, non-empty', (_n, file) => {
    expect(file.machineTranslatedNote?.length).toBeGreaterThan(20);
    expect(file.machineTranslatedBadge?.length).toBeGreaterThan(3);
  });

  it('the Hindi and Gujarati strings are really in their own scripts, not copies of the English', () => {
    expect(hi.machineTranslatedNote).toMatch(/[ऀ-ॿ]/);
    expect(gu.machineTranslatedNote).toMatch(/[઀-૿]/);
    expect(hi.machineTranslatedBadge).toMatch(/[ऀ-ॿ]/);
    expect(gu.machineTranslatedBadge).toMatch(/[઀-૿]/);
    expect(hi.machineTranslatedNote).not.toBe(en.machineTranslatedNote);
    expect(gu.machineTranslatedBadge).not.toBe(en.machineTranslatedBadge);
  });
});
