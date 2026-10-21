import { describe, it, expect } from 'vitest';
import { matchPercent } from './matchPercent.js';

describe('matchPercent', () => {
  const none = { structuredChecked: 0, structuredPassed: 0, unverifiedCount: 0, tagMatchCount: 0, tagCount: 0 };

  it('answered criteria decide it when there are any', () => {
    expect(matchPercent({ ...none, structuredChecked: 3, structuredPassed: 3, tagMatchCount: 0, tagCount: 9 })).toBe(100);
    expect(matchPercent({ ...none, structuredChecked: 3, structuredPassed: 2, unverifiedCount: 4 })).toBe(67);
  });

  it('criteria on file but none answered is 0, whatever the tags say', () => {
    expect(matchPercent({ ...none, unverifiedCount: 2, tagMatchCount: 5, tagCount: 5 })).toBe(0);
  });

  it('otherwise the share of tags matched, and 0 for a scheme with no tags', () => {
    expect(matchPercent({ ...none, tagMatchCount: 2, tagCount: 5 })).toBe(40);
    expect(matchPercent(none)).toBe(0);
  });
});
