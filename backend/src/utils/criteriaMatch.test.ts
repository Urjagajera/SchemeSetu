import { describe, it, expect } from 'vitest';
import { profileMatchesCriteria, describeCriteriaValue, evaluateCriteria, unverifiedLabels, CriteriaRow } from './criteriaMatch.js';

const row = (over: Partial<CriteriaRow>): CriteriaRow => ({
  ageMin: null, ageMax: null, incomeMinAnnual: null, incomeMaxAnnual: null,
  gender: null, category: null, occupation: null, state: null, landOwnership: null,
  ...over,
});

describe('evaluateCriteria: unknown is neither passed nor failed', () => {
  it('reports one "unknown" per field the profile cannot answer, even with both age bounds', () => {
    const results = evaluateCriteria(row({ ageMin: 18, ageMax: 40, gender: 'female' }), {});
    expect(results.map((r) => [r.label, r.status])).toEqual([
      ['Age', 'unknown'],
      ['Gender', 'unknown'],
    ]);
    expect(unverifiedLabels(results)).toEqual(['Age', 'Gender']);
  });

  it('treats empty strings, whitespace and non-numeric age/income as unset', () => {
    const results = evaluateCriteria(
      row({ ageMin: 18, incomeMaxAnnual: 200000, category: 'sc' }),
      { age: '', income: 'n/a', category: '   ' },
    );
    expect(unverifiedLabels(results)).toEqual(['Age', 'Annual income', 'Social category']);
    expect(results.every((r) => r.status === 'unknown')).toBe(true);
  });

  it('still evaluates the answered criteria next to unanswered ones', () => {
    const results = evaluateCriteria(row({ ageMin: 18, gender: 'female', category: 'sc,st' }), { age: '30', category: 'general' });
    const byLabel = Object.fromEntries(results.map((r) => [r.label, r.status]));
    expect(byLabel).toEqual({ Age: 'passed', Gender: 'unknown', 'Social category': 'failed' });
  });

  it('returns nothing for a row with no criteria', () => {
    expect(evaluateCriteria(row({}), { gender: 'male' })).toEqual([]);
  });
});

describe('profileMatchesCriteria: set membership for gender and category', () => {
  it('passes when the profile value is in the set', () => {
    expect(profileMatchesCriteria('category', 'sc,st', 'st')).toBe(true);
    expect(profileMatchesCriteria('category', 'sc,st', 'sc')).toBe(true);
    expect(profileMatchesCriteria('category', 'sc,st,obc', 'obc')).toBe(true);
    expect(profileMatchesCriteria('gender', 'female', 'female')).toBe(true);
  });

  it('fails when the profile value is not in the set', () => {
    expect(profileMatchesCriteria('category', 'sc,st', 'general')).toBe(false);
    expect(profileMatchesCriteria('category', 'sc,st', 'obc')).toBe(false);
    expect(profileMatchesCriteria('category', 'general', 'sc')).toBe(false);
    expect(profileMatchesCriteria('gender', 'female', 'male')).toBe(false);
  });

  it('is case- and whitespace-insensitive on both sides', () => {
    expect(profileMatchesCriteria('category', 'SC, ST', ' st ')).toBe(true);
    expect(profileMatchesCriteria('gender', 'Female', 'FEMALE')).toBe(true);
  });

  it('does not treat a substring or a bigger set as membership', () => {
    expect(profileMatchesCriteria('category', 'obc,sc', 'st')).toBe(false);
    expect(profileMatchesCriteria('category', 'sc', 'sc,st')).toBe(false);
  });

  it('matches profile gender "other" to a transgender restriction, and to nothing else', () => {
    expect(profileMatchesCriteria('gender', 'transgender', 'other')).toBe(true);
    expect(profileMatchesCriteria('gender', 'female', 'other')).toBe(false);
    expect(profileMatchesCriteria('gender', 'male', 'other')).toBe(false);
    expect(profileMatchesCriteria('gender', 'transgender', 'female')).toBe(false);
  });

  it('keeps plain case-insensitive equality for single-value fields (no comma splitting)', () => {
    expect(profileMatchesCriteria('occupation', 'Farmer', 'farmer')).toBe(true);
    expect(profileMatchesCriteria('state', 'Jammu, Kashmir', 'jammu')).toBe(false);
    expect(profileMatchesCriteria('landOwnership', 'yes', 'no')).toBe(false);
  });
});

describe('describeCriteriaValue', () => {
  it('reads naturally for the eligibility report', () => {
    expect(describeCriteriaValue('category', 'sc,st')).toBe('SC or ST');
    expect(describeCriteriaValue('category', 'sc,st,obc')).toBe('SC or ST or OBC');
    expect(describeCriteriaValue('category', 'general')).toBe('General');
    expect(describeCriteriaValue('gender', 'female')).toBe('female');
    expect(describeCriteriaValue('occupation', 'Farmer')).toBe('Farmer');
  });
});
