import { describe, it, expect } from 'vitest';
import { profileMatchesCriteria, describeCriteriaValue } from './criteriaMatch.js';

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
