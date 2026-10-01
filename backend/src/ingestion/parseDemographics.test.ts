import { describe, it, expect } from 'vitest';
import { extractGender, extractCategory } from './parseDemographics.js';

// Every sentence below is a real eligibility line from the dataset (see
// reports/demographics-dry-run.md); the wrong-decision cases are the ones the
// first drafts of the parser got wrong.

describe('extractGender', () => {
  it.each([
    [['The applicant must be a woman.'], 'female'],
    [['The applicant should be a pregnant woman.'], 'female'],
    [['The applicant must be an Individual woman involved in inland fisheries activities.'], 'female'],
    [['Only women farmers who are residents of Gujarat are eligible to apply.'], 'female'],
    [['All Scheduled Caste girl students who have passed Class 10 and are entering Class 11 are eligible for the scheme.'], 'female'],
    [['The applicant should be a male.'], 'male'],
    [['The applicant should be Transgender.'], 'transgender'],
    [['The applicant must be a transgender person.'], 'transgender'],
  ])('extracts a real gate: %j -> %s', (sentences, expected) => {
    expect(extractGender(sentences).value).toBe(expected);
  });

  it.each([
    ['a quota/participation line', ['Women Participation: 30%.']],
    ['an enumeration of beneficiary groups', ['Children aged 6 months to 6 years, pregnant women, lactating mothers, and malnourished children are eligible under the scheme.']],
    ['a widow OF someone else (a dependent)', ['The applicant must be an ex-serviceman, serving soldier, widow of a serviceman, or their dependent, and must have passed the 12th standard.']],
    ['a marriage clause', ['A man who marries a widow shall be free from the contract of first marriage.']],
    ['"woman-headed household" in an option list', ['The applicant should be a woman-headed household, a person with disabilities, or a beneficiary of the Pradhan Mantri Awas Yojana (PMAY).']],
    ['a list of groups that includes women', ['The applicant must belong to one of the following categories: Jail Inmates, Former Prisoners, Scheduled Castes, Women, Members of the Transgender Community.']],
    ['man or woman', ['The applicant must be a man or woman belonging to a minority community (Muslim, Sikh, Christian, Parsi, Buddhist, or Jain).']],
    ['a per-gender income tier', ['The annual family income should not exceed ₹6,00,000/- for boys.']],
    ['a one-third quota', ['Earmarking: One-third of the beneficiaries shall be women.']],
    ['a bare list item', ['Pregnant women.']],
    ['a heading that ends with a colon', ['Boys who have dropped out of school because a middle school is not available within a 3 km radius:']],
  ])('leaves gender null for %s', (_label, sentences) => {
    expect(extractGender(sentences).value).toBeNull();
  });

  it('leaves the whole scheme null for girl-child / daughter wording, even if other lines are clear', () => {
    const result = extractGender([
      'The applicant must be a woman.',
      'The girl child should be born on or after January 1, 2006.',
    ]);
    expect(result.value).toBeNull();
    expect(result.nullReason).toMatch(/girl-child/);
    expect(result.matchedSentences).toEqual([]);
  });

  it('treats separate sentences as separate requirements: conflicts become null', () => {
    const result = extractGender(['The applicant must be a woman.', 'The applicant should be a male.']);
    expect(result.value).toBeNull();
    expect(result.nullReason).toMatch(/conflict/);
  });

  it('records the sentences it rejected, with a reason', () => {
    const result = extractGender(['Women Participation: 30%.']);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toMatch(/not a gate|explicit rule/);
  });
});

describe('extractCategory', () => {
  it.each([
    [['The applicant must belong to the Scheduled Caste category.'], 'sc'],
    [['The beneficiary should belong to the Scheduled Tribe (ST) category.'], 'st'],
    [['The applicant must belong to the SC/ST community.'], 'sc,st'],
    [['The applicant should belong to Scheduled Castes (SC), Scheduled Tribes (ST), or Other Backward Classes (OBC).'], 'sc,st,obc'],
    [['The applicant should belong to the Socially and Educationally Backward Class (SEBC).'], 'obc'],
    [['Beneficiary must belong to the General category.'], 'general'],
    [['The applicant must belong to a Scheduled Castes and Tribes community.'], 'sc,st'],
    [['The scholarships will be open to Indian nationals belonging to the General Category (Other than Schedule Caste, Schedule Tribe and Other Backward Classes).'], 'general'],
  ])('extracts a real gate: %j -> %s', (sentences, expected) => {
    expect(extractCategory(sentences).value).toBe(expected);
  });

  it.each([
    ['a relaxation', ['The age of the applicant should be between 18 to 40 years (a relaxation of 5 years in the upper age limit for ST/SC candidates).']],
    ['a benefit-tier fragment', ['General Category: 78.56%.']],
    ['a benefit tier that names women', ['Women, SC, and ST beneficiaries are eligible for 60% assistance of the unit cost.']],
    ['general listed with every other category', ['The applicant should belong to the General, Other Backward Class, Scheduled Caste, or Scheduled Tribe category.']],
    ['a list that includes EWS', ['The applicant must belong to the General, Scheduled Caste, Scheduled Tribe, and Economically Weaker Section.']],
    ['a list with groups we do not model', ['The applicant must be a student belonging to a Scheduled Caste, Denotified Nomadic, Semi Nomadic Tribe, Landless Agricultural Labourer, or a Traditional Artisan.']],
    ['plural unmodelled groups (OBCs/EBCs/DNTs)', ['Only those candidates who belong to OBCs/EBCs/DNTs so specified in relation to the State/UT are eligible.']],
    ['an inter-caste marriage clause', ['The applicant must be part of an inter-caste marriage where one partner belongs to Scheduled Castes or Scheduled Tribes.']],
    ['a certificate requirement', ['The applicant must produce a proper Below Poverty Line or a Scheduled Caste/Scheduled Tribe certificate.']],
    ['an alternative route (BPL) in the same list', ['The applicant should belong to Scheduled Castes (SC), Scheduled Tribes (ST), Primitive Tribes, or be a Below Poverty Line (BPL) family.']],
    ['a rule about someone else (the martyr)', ['The shaheed should belong to a Scheduled Tribe or Scheduled Caste.']],
    ['a representation requirement', ['The applicant must ensure the representation of the Scheduled Castes and Other Backward Classes community and the especially abled in the team.']],
    ['the ordinary word "general"', ['The applicant must not be receiving any other general or special scholarship from the State Government.']],
    ['a fragment naming the scheme a category tier', ['Scheduled Castes: 20%.']],
  ])('leaves category null for %s', (_label, sentences) => {
    expect(extractCategory(sentences).value).toBeNull();
  });

  it('does not read "(SC)" after "backward classes" as Scheduled Caste', () => {
    const result = extractCategory(['The applicant must belong to the Rabari or Bharwad caste, classified under socially and educationally backward classes (SC).']);
    expect(result.value).toBe('obc');
  });

  it.each([
    ['a heading that ends with a colon (segment of a multi-group scheme)', ['For students belonging to SCs and OBCs Category:']],
    ['a heading about a CGPA threshold', ['SC/ST/Physically Challenged/Sponsored candidates must have a minimum CGPA of:']],
    ['an alternative group written in the plural (Nav-Buddhists)', ['The applicant should be from Scheduled Caste or should be a Nav-Buddhists.']],
    ['an organisation applicant serving a community', ['The applicant organization should be a registered voluntary organization (VO) / non-governmental organization (NGO) engaged in welfare work among Scheduled Tribes.']],
  ])('leaves category null for %s', (_label, sentences) => {
    expect(extractCategory(sentences).value).toBeNull();
  });

  it('still accepts an individual applicant when the sentence also contains organisation-like words later on', () => {
    const result = extractCategory([
      'Only those students who belong to OBCs so specified and notified in relation to the State and who have passed from a recognized institution are eligible.',
    ]);
    expect(result.value).toBe('obc');
  });

  it('intersects separate sentences: SC/ST in one line and SC in another means SC', () => {
    const result = extractCategory([
      'The applicant must belong to the SC/ST community.',
      'The applicant should belong to the Scheduled Caste category.',
    ]);
    expect(result.value).toBe('sc');
  });

  it('gives null when separate sentences do not overlap', () => {
    const result = extractCategory([
      'The applicant should belong to the Scheduled Caste category.',
      'The applicant should belong to the Scheduled Tribe category.',
    ]);
    expect(result.value).toBeNull();
    expect(result.nullReason).toMatch(/do not overlap/);
  });

  it('returns a sorted, comma-separated lowercase set', () => {
    const result = extractCategory(['The applicant should belong to Other Backward Classes (OBC), Scheduled Tribes (ST), or Scheduled Castes (SC).']);
    expect(result.value).toBe('sc,st,obc');
    expect(result.values).toEqual(['sc', 'st', 'obc']);
  });
});
