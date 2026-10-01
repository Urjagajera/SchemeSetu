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
    expect(profileMatchesCriteria('residence', 'rural,urban', 'rural')).toBe(false);
    expect(profileMatchesCriteria('landOwnership', 'yes', 'no')).toBe(false);
  });
});

describe('describeCriteriaValue', () => {
  it('reads naturally for the eligibility report', () => {
    expect(describeCriteriaValue('category', 'sc,st')).toBe('SC or ST');
    expect(describeCriteriaValue('category', 'sc,st,obc')).toBe('SC or ST or OBC');
    expect(describeCriteriaValue('category', 'general')).toBe('General');
    expect(describeCriteriaValue('gender', 'female')).toBe('female');
    expect(describeCriteriaValue('occupation', 'farmer')).toBe('farmers');
    expect(describeCriteriaValue('occupation', 'farmer,entrepreneur')).toBe('farmers or entrepreneurs (self-employed)');
  });
});

describe('state is a set of states', () => {
  it('passes when the profile state is one of the listed states, in any letter case', () => {
    expect(profileMatchesCriteria('state', 'Kerala,Tamil Nadu', 'Kerala')).toBe(true);
    expect(profileMatchesCriteria('state', 'Kerala,Tamil Nadu', 'tamil nadu')).toBe(true);
    expect(profileMatchesCriteria('state', 'Kerala,Tamil Nadu', 'Karnataka')).toBe(false);
  });

  it('never matches a state by part of its name', () => {
    expect(profileMatchesCriteria('state', 'Uttar Pradesh', 'Uttarakhand')).toBe(false);
    expect(profileMatchesCriteria('state', 'Madhya Pradesh,Uttar Pradesh', 'Pradesh')).toBe(false);
  });

  it('evaluateCriteria: pass, fail and unknown', () => {
    const c = row({ state: 'Kerala,Tamil Nadu,Karnataka' });
    expect(evaluateCriteria(c, { state: 'Kerala' })[0]).toMatchObject({ label: 'State residency', status: 'passed' });
    expect(evaluateCriteria(c, { state: ' kerala ' })[0].status).toBe('passed');
    const failed = evaluateCriteria(c, { state: 'Goa' })[0];
    expect(failed.status).toBe('failed');
    expect(failed.message).toBe('State residency must be Kerala or Tamil Nadu or Karnataka');
  });

  it('a state the app does not recognise is unknown, never a failure', () => {
    const c = row({ state: 'Kerala' });
    for (const state of [undefined, '', '  ', 'Gujrat', 'Mars']) {
      expect(evaluateCriteria(c, { state })[0].status, String(state)).toBe('unknown');
    }
  });

  it('describes a short list with "or" and a long list as "one of these N"', () => {
    expect(describeCriteriaValue('state', 'Kerala,Tamil Nadu')).toBe('Kerala or Tamil Nadu');
    const ne = 'Arunachal Pradesh,Assam,Manipur,Meghalaya,Mizoram,Nagaland,Sikkim,Tripura';
    expect(describeCriteriaValue('state', ne)).toBe('one of these 8 states / union territories: ' + ne.split(',').join(', '));
  });
});

describe('land ownership and rural / urban residence', () => {
  const find = (c: CriteriaRow, profile: Record<string, string>, label: RegExp) => evaluateCriteria(c, profile).find((r) => label.test(r.label));

  it('land "yes": owns cultivable land passes, no fails, blank is unknown', () => {
    const c = row({ landOwnership: 'yes' });
    expect(find(c, { land: 'yes' }, /Land/)).toMatchObject({ status: 'passed', message: 'Land ownership matches (owns cultivable land)' });
    expect(find(c, { land: 'no' }, /Land/)).toMatchObject({ status: 'failed', message: 'Owning cultivable land is required' });
    expect(find(c, {}, /Land/)?.status).toBe('unknown');
    expect(find(c, { land: '  ' }, /Land/)?.status).toBe('unknown');
  });

  it('land "no": the applicant must be landless', () => {
    const c = row({ landOwnership: 'no' });
    expect(find(c, { land: 'no' }, /Land/)).toMatchObject({ status: 'passed', message: 'Land ownership matches (landless)' });
    expect(find(c, { land: 'yes' }, /Land/)).toMatchObject({ status: 'failed', message: 'The applicant must be landless (own no cultivable land)' });
  });

  it('residence: rural / urban pass or fail, blank is unknown', () => {
    const c = row({ residence: 'rural' });
    expect(find(c, { residence: 'rural' }, /Residence/)).toMatchObject({ status: 'passed', label: 'Residence (rural / urban)' });
    expect(find(c, { residence: 'Urban' }, /Residence/)).toMatchObject({ status: 'failed', message: 'Residence (rural / urban) must be rural' });
    expect(find(c, {}, /Residence/)?.status).toBe('unknown');
  });

  it('a scheme with no land or residence requirement says nothing about them', () => {
    const results = evaluateCriteria(row({ gender: 'female' }), { gender: 'female', land: 'yes', residence: 'rural' });
    expect(results.map((r) => r.label)).toEqual(['Gender']);
  });

  it('rows from before the residence column existed still work', () => {
    const old: CriteriaRow = { ageMin: null, ageMax: null, incomeMinAnnual: null, incomeMaxAnnual: null, gender: 'female', category: null, occupation: null, state: null, landOwnership: null };
    expect(evaluateCriteria(old, { gender: 'female', residence: 'rural' })).toHaveLength(1);
  });
});

describe('occupation is SOFT', () => {
  const occ = (criteria: string, profile: Record<string, string>) => evaluateCriteria(row({ occupation: criteria }), profile);

  it('a match is a soft pass, a mismatch is a soft fail with a plain note, never a plain failure', () => {
    expect(occ('farmer', { occupation: 'farmer' })[0]).toMatchObject({ status: 'passed', soft: true, label: 'Occupation' });
    const miss = occ('farmer', { occupation: 'student' })[0];
    expect(miss).toMatchObject({ status: 'failed', soft: true });
    expect(miss.message).toBe('This scheme is meant for farmers; your profile says student');
  });

  it('a set matches when the profile is any one of them', () => {
    expect(occ('farmer,entrepreneur', { occupation: 'Entrepreneur' })[0].status).toBe('passed');
    expect(occ('farmer,entrepreneur', { occupation: 'student' })[0].message).toBe('This scheme is meant for farmers or entrepreneurs (self-employed); your profile says student');
  });

  it('a blank, "other" or "senior citizen" profile occupation says nothing at all: no result, no add-to-profile note', () => {
    for (const occupation of [undefined, '', '  ', 'other', 'senior citizen', 'astronaut']) {
      const results = evaluateCriteria(row({ occupation: 'farmer' }), { occupation });
      expect(results, String(occupation)).toEqual([]);
      expect(unverifiedLabels(results)).toEqual([]);
    }
  });

  it('only the occupation result is soft; other criteria stay hard', () => {
    const results = evaluateCriteria(row({ occupation: 'farmer', gender: 'female' }), { occupation: 'student', gender: 'male' });
    expect(results.find((r) => r.label === 'Gender')?.soft).toBeUndefined();
    expect(results.find((r) => r.label === 'Occupation')?.soft).toBe(true);
  });
});
