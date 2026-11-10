import { describe, it, expect } from 'vitest';
import { isNewScheme, NEW_FOR_YOU_DAYS } from './schemeService';

describe('isNewScheme', () => {
  const now = Date.parse('2026-11-15T12:00:00Z');
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();
  it(`is new for ${NEW_FOR_YOU_DAYS} days after SchemeSetu added it`, () => {
    expect(isNewScheme({ addedAt: daysAgo(1) }, now)).toBe(true);
    expect(isNewScheme({ addedAt: daysAgo(13.9) }, now)).toBe(true);
    expect(isNewScheme({ addedAt: daysAgo(14) }, now)).toBe(false);
    expect(isNewScheme({}, now)).toBe(false);
  });
});
