import { describe, it, expect } from 'vitest';
import { extractState, statesIn } from './parseState.js';

// Every sentence below is real text from Scheme.eligibilityRawText.

const NE = 'Arunachal Pradesh,Assam,Manipur,Meghalaya,Mizoram,Nagaland,Sikkim,Tripura';

describe('statesIn', () => {
  it('finds canonical names, and alternative spellings of them', () => {
    expect(statesIn('applicants from Kerala, Tamil Nadu & Karnataka')).toEqual(['Karnataka', 'Kerala', 'Tamil Nadu']);
    expect(statesIn('UTs of J&K and Ladakh')).toEqual(['Jammu and Kashmir', 'Ladakh']);
    expect(statesIn('Jammu & Kashmir')).toEqual(['Jammu and Kashmir']);
    expect(statesIn('Orissa and Pondicherry')).toEqual(['Odisha', 'Puducherry']);
    expect(statesIn('Dadra and Nagar Haveli')).toEqual(['Dadra & Nagar Haveli and Daman & Diu']);
    expect(statesIn('New Delhi')).toEqual(['Delhi']);
  });

  it('expands the North-Eastern region to its eight states', () => {
    expect(statesIn('any of the North-Eastern States').join(',')).toBe(NE);
    expect(statesIn('North East region').join(',')).toBe(NE);
    expect(statesIn('NER').join(',')).toBe(NE);
  });

  it('ignores a state name that is part of an organisation name', () => {
    expect(statesIn('Assam Rifles personnel')).toEqual([]);
    expect(statesIn('a loan from Punjab National Bank')).toEqual([]);
    expect(statesIn('University of Delhi')).toEqual([]);
    expect(statesIn('Bank of Maharashtra')).toEqual([]);
  });
});

describe('extractState: sentences that ARE a residency gate', () => {
  const ok = (sentences: string[], expected: string, authority?: string) => {
    const r = extractState(sentences, authority);
    expect(r.value, sentences.join(' | ')).toBe(expected);
    return r;
  };

  it('"resident of <state>" in its usual forms', () => {
    ok(['The applicant must be a permanent resident of Gujarat.'], 'Gujarat');
    ok(['The applicant should be a resident of Gujarat.'], 'Gujarat');
    ok(['1. The applicant should be a native of Chhattisgarh.'], 'Chhattisgarh');
    ok(['The applicant should be an original resident of Madhya Pradesh to qualify for the award.'], 'Madhya Pradesh');
    ok(['The Chief Minister Health Insurance Scheme is available to all permanent and indigenous residents of Nagaland. They are divided into two categories:'], 'Nagaland');
    ok(['The applicant must be a permanent resident of Uttar Pradesh.'], 'Uttar Pradesh', 'Ministry Of Rural Development');
  });

  it('"residing within the State of ..." (a name with an ampersand)', () => {
    ok(['The applicant should be the Claimant/Head of the Displaced Person (DP) family or his/her successor or heir residing within the State of Jammu & Kashmir.'], 'Jammu and Kashmir');
  });

  it('a list of states becomes a set', () => {
    ok(['The applicant must be located in one of the seven participating states, namely Gujarat, Haryana, Karnataka, Madhya Pradesh, Maharashtra, Rajasthan, or Uttar Pradesh.'], 'Gujarat,Haryana,Karnataka,Madhya Pradesh,Maharashtra,Rajasthan,Uttar Pradesh');
    ok(['The applicant should be a small cardamom grower from Kerala, Tamil Nadu, or Karnataka.'], 'Karnataka,Kerala,Tamil Nadu');
    ok(['1. The applicant should belong to Kerala, Tamil Nadu & Karnataka.'], 'Karnataka,Kerala,Tamil Nadu');
    ok(['The applicant should belong to Kerala or Tamil Nadu and undertake Small Cardamom replanting/new planting activities under the scheme.'], 'Kerala,Tamil Nadu');
  });

  it('a region becomes its states', () => {
    ok(['The applicant must be a permanent resident of any of the North-Eastern States.'], NE);
  });

  it('domicile of union territories', () => {
    ok(['Candidates should be domicile of Union Territories of J&K and Ladakh.'], 'Jammu and Kashmir,Ladakh');
  });

  it('"from the following ..." lists', () => {
    const r = extractState([
      'All eligible girls (who submit an online scholarship form) from the following 13 Union Territories and North Eastern States i.e., Andaman and Nicobar Islands (UT), Jammu and Kashmir (UT), Ladakh (UT), Dadra and Nagar Haveli (UT), Lakshadweep (UT), Sikkim, Assam.',
    ]);
    expect(r.values).toEqual(expect.arrayContaining(['Andaman and Nicobar Islands', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Sikkim', 'Assam', 'Manipur']));
  });

  it('a residence qualifier in years keeps the gate and is flagged', () => {
    const r = ok(['Applicant must be resident of Rajasthan or living in Rajasthan for 3 years before re-marriage.'], 'Rajasthan');
    expect(r.yearsQualifier).toBe(true);
  });

  it('a district-level restriction is flagged as a superset', () => {
    const r = ok(['The applicant should be a large cardamom grower located in Sikkim, Darjeeling and Kalimpong districts of West Bengal, or other North Eastern States.'], 'Arunachal Pradesh,Assam,Manipur,Meghalaya,Mizoram,Nagaland,Sikkim,Tripura,West Bengal');
    expect(r.districtLevel).toBe(true);
  });

  it('"resident of the State" with no name is resolved to the scheme\'s own state', () => {
    const r = ok(['The applicant must be a resident of the State.'], 'Gujarat', 'Gujarat');
    expect(r.usedImplicit).toBe(true);
  });

  it('a paperwork sentence after the rule does not cancel the rule', () => {
    ok(['The applicant must be a resident of Gujarat and must possess a ration card.'], 'Gujarat');
  });

  it('separate sentences are separate requirements: they are intersected', () => {
    ok(['The applicant should be a resident of Kerala, Tamil Nadu or Karnataka.', 'The applicant must be a permanent resident of Kerala.'], 'Kerala');
    const clash = extractState(['The applicant must be a resident of Goa.', 'The applicant must be a resident of Kerala.']);
    expect(clash.value).toBeNull();
    expect(clash.nullReason).toMatch(/do not overlap/);
  });
});

describe('extractState: text wins over the authority, and the difference is flagged', () => {
  it('a Madhya Pradesh scheme whose text says Himachal Pradesh', () => {
    const r = extractState(['The applicant should be a resident of Himachal Pradesh'], 'Madhya Pradesh');
    expect(r.value).toBe('Himachal Pradesh');
    expect(r.differsFromAuthority).toBe(true);
  });

  it('is not flagged when the text names the authority state', () => {
    expect(extractState(['The applicant must be a resident of Gujarat.'], 'Gujarat').differsFromAuthority).toBe(false);
  });

  it('an explicit state beats "the State" elsewhere in the scheme', () => {
    const r = extractState(['The applicant should be a resident of Himachal Pradesh.', 'Applicant must be a resident of the State.'], 'Madhya Pradesh');
    expect(r.value).toBe('Himachal Pradesh');
    expect(r.rejected.some((x) => /implicit/.test(x.reason))).toBe(true);
  });
});

describe('extractState: sentences that are NOT a residency gate', () => {
  const nothing = (sentence: string, authority?: string) => {
    const r = extractState([sentence], authority);
    expect(r.value, sentence).toBeNull();
    return r;
  };

  it('a state scheme with no residency sentence stays null: the authority is not used to invent a gate', () => {
    nothing('The applicant must be above 18 years of age.', 'Gujarat');
    expect(extractState(['The applicant must have a bank account.'], 'Goa').value).toBeNull();
  });

  it('benefit tiers and preferences', () => {
    nothing('In the case of exporters belonging to North-Eastern states, difficult areas namely Himalayan and land-locked states, Island Union Territories, SC/ST, and women beneficiaries, the assistance will be up to 75% for all activities.');
    nothing('Special focus on SC/ST and beneficiaries from the North Eastern Region (NER).');
    nothing('Preference will be given to residents of Gujarat.');
  });

  it('where an institution, business or hospital is', () => {
    nothing('A full-time bonafide student studying in any UG/PG Program in a department/institute/center of the University of Delhi (UoD).');
    nothing('Candidates must have passed 12th examination from JKBOSE or CBSE affiliated schools located in UTs of J&K and Ladakh.');
    nothing('The applicant must own a business unit in Goa and provide Logistics And Warehousing services in Goa.');
    nothing('Government Arignar Anna Memorial Cancer Hospital, Kancheepuram, Tamil Nadu.');
  });

  it('open-ended or exclusionary lists', () => {
    nothing('The applicants from Karnataka and other states having potential areas suitable for Small Cardamom cultivation are eligible to apply under the scheme.');
    nothing('All districts of north-eastern states (except Assam) with at least 5000 ha area under rice have been selected.');
    nothing('The applicant should be a resident of any state other than Delhi.');
  });

  it('another route to eligibility', () => {
    nothing('The applicant must be a resident of Gujarat or studying in Gujarat.');
  });

  it('certificates and bare place names', () => {
    nothing('The applicant should possess an Indigenous Inhabitant Certificate (IIC) or Permanent Resident Certificate (PRC) issued after 2016, along with an Aadhaar card and valid mobile number.');
    nothing('Mizoram');
    nothing('At multiple locations in the North-Eastern Region (NER).');
    nothing('Domicile certificate of Gujarat.');
  });

  it('belonging to something that is not a state', () => {
    nothing('The applicant should belong to the Below Poverty Line (BPL) category.', 'Bihar');
    nothing('The applicant should belong to the Scheduled Tribes Category.', 'Himachal Pradesh');
  });

  it('"resident of the State" in a central scheme: which state is unknown', () => {
    const r = nothing('The applicant must be a resident of the State.', 'Ministry Of Finance');
    expect(r.rejected[0].reason).toMatch(/authority is not a state/);
  });

  it('headings that introduce a list', () => {
    nothing('For residents of Gujarat:');
  });
});

// Cases found while reviewing the first dry run (each sentence is real text).
describe('extractState: fixes from the dry-run review', () => {
  const state = (sentences: string[], authority?: string) => extractState(sentences, authority);

  it('keeps a list that follows "i.e." together (the full-stop is not a sentence end)', () => {
    const r = state(['All eligible girls (who submit online scholarship form) from the following 13 Union Territories and North Eastern States i.e. Andaman and Nicobar Islands (UT), Jammu and Kashmir (UT), Ladakh (UT), Dadra and Nagar Haveli & Daman and Diu (UT), Lakshadweep (UT), Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim & Tripura will be eligible.']);
    expect(r.values).toHaveLength(13);
    expect(r.values).toEqual(expect.arrayContaining(['Andaman and Nicobar Islands', 'Ladakh', 'Dadra & Nagar Haveli and Daman & Diu', 'Tripura']));
  });

  it('a place that belongs to an institution is not where the person lives', () => {
    expect(state(['The applicant must be a student from an Educational Institute in Goa.'], 'Puducherry').value).toBeNull();
  });

  it('an inclusion list is not a gate', () => {
    const r = state(['All weavers, whether male or female, between the age group of 18 and 59 years are eligible to be covered under the scheme, including minorities, women weavers, and weavers belonging to NER.'], 'Odisha');
    expect(r.value).toBeNull();
    expect(r.rejected[0].reason).toMatch(/inclusion list/);
  });

  it('"Government of <state>" is the scheme\'s owner, not a place of residence', () => {
    expect(state(['Belong to a socially and educationally backward class as recognized by the Government of Gujarat'], 'Gujarat').value).toBeNull();
  });

  it('years of age are not years of residence', () => {
    const r = state(['The applicant should be 18 to 60 years of age and a resident of Haryana.']);
    expect(r.value).toBe('Haryana');
    expect(r.yearsQualifier).toBe(false);
  });

  it('short fragments that are just the residency rule count', () => {
    for (const [line, expected] of [
      ['A native of the Rajasthan state.', 'Rajasthan'],
      ['Domicile of Uttar Pradesh.', 'Uttar Pradesh'],
      ['Residents of Punjab.', 'Punjab'],
      ['Original residents of Chhattisgarh.', 'Chhattisgarh'],
      ['• a permanent resident of Assam and presently residing in Assam', 'Assam'],
    ] as const) {
      expect(state([line]).value, line).toBe(expected);
    }
  });

  it('"is a resident" and "meant for" are rules even without a modal verb', () => {
    expect(state(['The applicant is a bonafide resident of Odisha.']).value).toBe('Odisha');
    expect(state(['The person is a resident of West Bengal on the date of making an application under the Scheme.']).value).toBe('West Bengal');
    expect(state(['The scheme is meant for the residents of the State of Assam, who are 60 years or above in age.']).value).toBe('Assam');
    expect(state(['All women of 60 years and above residing in the State of Punjab can avail of the benefits under the scheme.']).value).toBe('Punjab');
  });

  it('a sentence ending in a colon is a rule when it has a modal, a heading when it does not', () => {
    expect(state(['an applicant must be a bonafide resident of Himachal Pradesh and fulfil the below academic criteria:']).value).toBe('Himachal Pradesh');
    expect(state(['For residents of Gujarat:']).value).toBeNull();
  });

  it('"irrespective of" something other than the state does not open the gate', () => {
    expect(state(['The applicant must be a girl student domiciled in Assam irrespective of economic status.']).value).toBe('Assam');
    expect(state(['The applicant must be a resident of Haryana, irrespective of the place of study.']).value).toBe('Haryana');
    expect(state(['A person must be a resident of Mizoram, representing any state of the union, the Sports Control Boards, or the Country.']).value).toBe('Mizoram');
    expect(state(['Open to candidates irrespective of state, who are residents of Goa.']).value).toBeNull();
  });

  it('"or" inside a different clause is not an alternative route', () => {
    expect(state(['The applicant must be a resident of Uttarakhand and interested in starting or expanding a business in the state.']).value).toBe('Uttarakhand');
    expect(state(['The applicant should be a native of Gujarat or should have been studying, residing, working, or doing business in Gujarat for the past 2 years.']).value).toBeNull();
  });

  it('"only to natives of" is a gate, not a benefit tier', () => {
    expect(state(['The benefit of this scheme will be given only to natives of Gujarat state.']).value).toBe('Gujarat');
  });

  it('a broader range of applicants counts as the person', () => {
    expect(state(['Only day scholars belonging to West Bengal can apply for this scholarship.']).value).toBe('West Bengal');
  });
});

describe('extractState: second round of review fixes', () => {
  const state = (s: string, authority?: string) => extractState([s], authority).value;

  it('"U.T." and "N.C.T." do not end the clause', () => {
    expect(state('The applicants should have been residing in U.T. Chandigarh for at least three years immediately before the submission.')).toBe('Chandigarh');
    expect(state('The applicant should be a resident of the U.T. of Dadra and Nagar Haveli & Daman and Diu.')).toBe('Dadra & Nagar Haveli and Daman & Diu');
  });

  it('"resident family of", "resident/ domicile of" and "will be a permanent resident of"', () => {
    expect(state('Any resident family of Haryana.')).toBe('Haryana');
    expect(state('He/ She is a permanent resident/ domicile of Odisha.')).toBe('Odisha');
    expect(state('1. The applicant will be a permanent resident of Kerala State.')).toBe('Kerala');
  });

  it('a preference for residents is still not a gate', () => {
    expect(state('Weightage will be given to residents of Gujarat.')).toBeNull();
    expect(state('Preference will be given to residents of Gujarat.')).toBeNull();
  });
});

describe('extractState: "mandatory" is a rule word', () => {
  it('It is mandatory for the student to be a permanent resident of the state of Assam.', () => {
    expect(extractState(['It is mandatory for the student to be a permanent resident of the state of Assam.']).value).toBe('Assam');
  });
});

describe('extractState: the 3 schemes reviewed by hand and judged source-data errors', () => {
  const cases: Array<[string, string, string, string]> = [
    ['https://www.myscheme.gov.in/schemes/maternalnutritionuk', 'Uttarakhand', 'The beneficiary must be a resident of Odisha.', 'Odisha'],
    ['https://www.myscheme.gov.in/schemes/matbhpbocwwb', 'Madhya Pradesh', 'The applicant should be a resident of Himachal Pradesh', 'Himachal Pradesh'],
    ['https://www.myscheme.gov.in/schemes/shssd', 'Madhya Pradesh', 'The applicant should be a resident of Chhattisgarh.', 'Chhattisgarh'],
  ];

  it.each(cases)('%s: no state is stored, and the report still shows what the text said', (url, authority, sentence, said) => {
    const r = extractState([sentence], authority, url);
    expect(r.value).toBeNull();
    expect(r.values).toEqual([]);
    expect(r.suppressedValue).toBe(said);
    expect(r.suppressedReason).toMatch(/source-data error/);
    expect(r.differsFromAuthority).toBe(false);
  });

  it.each(cases)('%s: the general "text wins" rule is unchanged for any other scheme with the same text', (_url, authority, sentence, said) => {
    expect(extractState([sentence], authority).value).toBe(said);
    expect(extractState([sentence], authority, 'https://www.myscheme.gov.in/schemes/some-other-scheme').value).toBe(said);
  });

  it('a listed scheme with no state text is simply null, with nothing suppressed', () => {
    const r = extractState(['The applicant must be above 18 years.'], 'Madhya Pradesh', 'https://www.myscheme.gov.in/schemes/shssd');
    expect(r.value).toBeNull();
    expect(r.suppressedReason).toBeNull();
  });
});
