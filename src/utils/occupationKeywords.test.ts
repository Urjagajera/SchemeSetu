import { describe, it, expect } from 'vitest';
import { ENTREPRENEUR_KEYWORDS, matchesEntrepreneur } from './occupationKeywords';

describe('entrepreneur keywords after the tag clean-up', () => {
  // [tag as stored before the merge, tag as stored after]
  const merged: Array<[string, string]> = [
    ['MSME', 'MSMEs'],
    ['Start-up', 'Start Up'],
    ['Startups', 'Startup'],
    ['Micro Enterprise', 'Micro Enterprises'],
  ];

  it.each(merged)('a scheme tagged "%s" still matches once the tag is "%s"', (before, after) => {
    expect(matchesEntrepreneur([before.toLowerCase()], 'x', 'x')).toBe(true);
    expect(matchesEntrepreneur([after.toLowerCase()], 'x', 'x')).toBe(true);
  });

  it('does not match an unrelated scheme', () => {
    expect(matchesEntrepreneur(['scholarship'], 'merit award', 'for students')).toBe(false);
  });

  it('only adds keywords: the original ones are all still there', () => {
    for (const kw of ['entrepreneur', 'business', 'start-up', 'startups', 'industry', 'industries', 'msme', 'micro enterprise', 'self employment', 'self-employment', 'retailer', 'trader']) {
      expect(ENTREPRENEUR_KEYWORDS).toContain(kw);
    }
  });
});
