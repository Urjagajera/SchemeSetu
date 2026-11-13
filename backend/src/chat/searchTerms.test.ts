import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test' } }));
const { searchTerms, searchGroups, stem } = await import('./findSchemes.js');

describe('SetuAI search words', () => {
  it('keeps a phrase whole and also looks for its separate words, so "farm machinery" finds "Farm Equipment"', () => {
    expect(searchTerms(['farm machinery'])).toEqual(['farm machinery', 'farm', 'machin']);
  });

  it('drops words that say nothing about the topic', () => {
    expect(searchTerms(['small farmer'])).toEqual(['small farmer', 'farmer']);
  });

  it('a single word is kept, plus its stem when that differs', () => {
    expect(searchTerms(['tractors'])).toEqual(['tractors', 'tractor']);
    expect(searchTerms(['pension'])).toEqual(['pension']);
  });

  it('a full scheme name stays whole, so it can still match the title exactly', () => {
    expect(searchTerms(['Pradhan Mantri Kisan Samman Nidhi'])[0]).toBe('pradhan mantri kisan samman nidhi');
  });

  it('ignores words shorter than three letters and repeats', () => {
    expect(searchTerms(['an', 'farmer', 'Farmer', 'farmers'])).toEqual(['farmer', 'farmers']);
  });

  it('writes out SC and ST, which are too short to search for ("sc" is inside "scheme")', () => {
    expect(searchGroups(['SC'])).toEqual([{ phrase: 'scheduled caste', parts: ['scheduled', 'caste'] }]);
    expect(searchGroups(['SC student'])).toEqual([{ phrase: 'sc student', parts: ['scheduled caste', 'student'] }]);
    expect(searchTerms(['ST'])).toContain('scheduled tribe');
  });

  it('one group per search word or phrase, so each counts once however many words it has', () => {
    expect(searchGroups(['Pradhan Mantri Kisan Samman Nidhi', 'tractor']).map((g) => g.phrase)).toEqual(['pradhan mantri kisan samman nidhi', 'tractor']);
  });

  it('stems plurals and "-ery" without breaking short words or "-ss" words', () => {
    expect(stem('farmers')).toBe('farmer');
    expect(stem('machinery')).toBe('machin');
    expect(stem('subsidies')).toBe('subsidy');
    expect(stem('class')).toBe('class');
    expect(stem('bus')).toBe('bus');
  });
});
