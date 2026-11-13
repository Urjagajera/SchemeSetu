import { describe, it, expect } from 'vitest';
import { LANGUAGES, enabledLanguage } from './languages.js';

describe('which languages are switched on', () => {
  it('Hindi is on', () => {
    expect(enabledLanguage('hi')).toBe(LANGUAGES.hi);
  });

  it('Gujarati is on (owner decision, 2026-11-14), and never uses the fallback model', () => {
    expect(enabledLanguage('gu')).toBe(LANGUAGES.gu);
    expect(enabledLanguage(' GU ')).toBe(LANGUAGES.gu);
    expect(LANGUAGES.gu.useFallbackModel).toBe(false);
    expect(LANGUAGES.hi.useFallbackModel).toBe(true);
  });

  it('English and unknown languages are not translated', () => {
    expect(enabledLanguage('en')).toBeNull();
    expect(enabledLanguage('ta')).toBeNull();
    expect(enabledLanguage(undefined)).toBeNull();
  });
});
