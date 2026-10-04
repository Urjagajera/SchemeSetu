import { describe, it, expect } from 'vitest';
import { LANGUAGES, enabledLanguage } from './languages.js';

describe('which languages are switched on', () => {
  it('Hindi is on', () => {
    expect(enabledLanguage('hi')).toBe(LANGUAGES.hi);
  });

  it('Gujarati stays off until a native speaker has reviewed it (see the Gujarati audit)', () => {
    expect(LANGUAGES.gu.enabled).toBe(false);
    expect(enabledLanguage('gu')).toBeNull();
    expect(enabledLanguage(' GU ')).toBeNull();
  });
});
