import { describe, it, expect } from 'vitest';
import { extractStatusGates } from './parseStatusGates.js';

// Real sentences from the scheme data, reviewed by hand in the 2026-11-10 dry run.
const gates = (...sentences: string[]) => extractStatusGates(sentences);

describe('government job', () => {
  it.each([
    ['The applicant must not be a government servant.', 'not-self'],
    ['Applicant who are already working in government services will not be given benefits.', 'not-self'],
    ['The applicant should not be retired or permanently employed in Central and State Government or in public sector undertakings.', 'not-self'],
    ['Families where no member is in Government job.', 'not-family'],
    ['No family member should be employed in government service (Class 1/2/3) or hold a high-ranking post.', 'not-family'],
    ['The parents of the applicant should not be a Government servant.', 'not-family'],
    ["Exclusions The applicant herself or her husband should be employed as a regular/permanent employee in the State Government.", 'not-family'],
    ['The applicant should be a government servant.', 'required'],
  ])('%s -> %s', (sentence, value) => expect(gates(sentence).govtJob.value).toBe(value));

  it.each([
    'The applicant must not be blacklisted by any Public Sector Undertaking of the Government of India.',
    'Note 2: If the parents are not government employees, an affidavit from a notary confirming the applicant is the only child is required.',
    'She/he should not be a dismissed Govt. employee.',
    'The applicant should not be receiving any pension from government service, family pension or social security pension.',
    'The deceased parents of the child beneficiary should not have been government servants.',
    'The programme is open to all Scientists including those currently employed in the Government of India.',
    'The applicant should be a government employee, pensioner, or dependent family member.',
  ])('not a job rule: %s', (sentence) => expect(gates(sentence).govtJob.value).toBeNull());
});

describe('income tax', () => {
  it.each([
    ['The applicant should not be an income tax payer.', 'not-self'],
    ["The applicant’s family should not be an income taxpayer.", 'not-family'],
    ['The mother/father/guardian/guardian of the student should not be an income taxpayer.', 'not-family'],
  ])('%s -> %s', (sentence, value) => expect(gates(sentence).incomeTax.value).toBe(value));

  it.each([
    'The applicant must ensure that the relations defined under section 56 of the Income Tax Act, 1961, are not counted as employees.',
    'Student guardians should not be income taxpayers in case of parent(s) are not alive.',
    'Widow (Kalyani) should be above 18 years of age and should not be an income taxpayer. (or)',
  ])('not a rule: %s', (sentence) => expect(gates(sentence).incomeTax.value).toBeNull());
});

describe('BPL', () => {
  it.each([
    ['The applicant should belong to a Below Poverty Line (BPL) family.', 'yes'],
    ["The applicant's name should be included in the list of families living Below Poverty Line.", 'yes'],
    ['The applicant should be Non BPL', 'no'],
  ])('%s -> %s', (sentence, value) => expect(gates(sentence).bpl.value).toBe(value));

  it.each([
    'The applicant’s family should either belong to the BPL or APL category.',
    '(b) the non-BPL category with annual income < ₹1,20,000/-.',
    'Only one member per family shall be considered for the benefit, except in the case of Below Poverty Line (BPL) families.',
    'General candidates holding BPL Cards (Below Poverty Line) may also be allowed.',
    'Farmers belonging to all categories like general/SC/ST/BPL/Women are eligible.',
    'The Fishers should preferably belong to the BPL Category.',
    'The applicant must have an annual family income less than ₹8,00,000/- if belonging to the Above Poverty Line (APL) category.',
  ])('not a gate: %s', (sentence) => expect(gates(sentence).bpl.value).toBeNull());

  it('two sentences that disagree leave it null', () => {
    const r = gates('The applicant should be from a Below Poverty Line (BPL) family.', 'The applicant should be Non BPL');
    expect(r.bpl.value).toBeNull();
    expect(r.bpl.nullReason).toMatch(/disagree/);
  });
});

describe('pension', () => {
  it.each([
    'The applicant should not be receiving pension benefits under any other social security scheme.',
    'The applicant must not be a Government servant or pensioner.',
  ])('%s -> no', (sentence) => expect(gates(sentence).pension.value).toBe('no'));

  it.each([
    'The applicant received gratuity and pension from previous companies should not exceed ₹30,000/-.',
    'The deceased fisherman must not have been a beneficiary of any pension.',
    'The veteran sportsmen/women getting any sports pension from Govt. of India will also be eligible for pension under this scheme.',
    'Pension can also be ceased by this Department if the pensioner is leading a comfortable life.',
  ])('not a rule: %s', (sentence) => expect(gates(sentence).pension.value).toBeNull());
});
