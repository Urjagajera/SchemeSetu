import { describe, it, expect } from 'vitest';
import { extractOccupation } from './parseOccupation.js';

// Every sentence below is real text from Scheme.eligibilityRawText.
const occ = (...sentences: string[]) => extractOccupation(sentences).value;

describe('extractOccupation: sentences that ARE an occupation requirement', () => {
  it('a farmer, in its usual forms', () => {
    expect(occ('The applicant must be a farmer.')).toBe('farmer');
    expect(occ('The applicant should be a Farmer.')).toBe('farmer');
    expect(occ('The beneficiary should be a Farmer.')).toBe('farmer');
    expect(occ('2. The applicant should be a bonafide farmer engaged in agriculture.')).toBe('farmer');
    expect(occ('The applicant must be a farmer actively engaged in cultivating their own land.')).toBe('farmer');
    expect(occ('The applicant should be a ryot farmer.')).toBe('farmer');
  });

  it('qualifiers do not change the occupation', () => {
    expect(occ('The applicant must be a Small or Marginal Farmer from Uttarakhand who has lost their milk, agricultural, or haulage animals due to a notified natural disaster.')).toBe('farmer');
    expect(occ('The applicant should be a differently abled student.')).toBe('student');
    expect(occ('The applicant must be a girl student.')).toBe('student');
    expect(occ('The applicant should be a regular student in a government or recognized educational institution.')).toBe('student');
    expect(occ('The applicant should be a first-generation entrepreneur.')).toBe('entrepreneur');
  });

  it('student, unemployed, entrepreneur and employee', () => {
    expect(occ('The applicant should be a Student.')).toBe('student');
    expect(occ('The applicant must be a student.')).toBe('student');
    expect(occ('The applicant must be unemployed.')).toBe('unemployed');
    expect(occ('The applicant should be unemployed and looking to start a self-employment unit.')).toBe('unemployed');
    expect(occ('The applicant must be an Entrepreneur')).toBe('entrepreneur');
    expect(occ('The applicant should be a prospective entrepreneur willing to start a coir industry.')).toBe('entrepreneur');
    expect(occ('The applicant must be an employee of a plantation or a tea factory in the state of Assam.')).toBe('employee');
  });

  it('a list where EVERY alternative is one we model becomes a set', () => {
    expect(occ('The applicant should be self-employed or a student pursuing senior higher secondary education.')).toBe('student,entrepreneur');
    expect(occ('The applicant should be a farmer or an entrepreneur.')).toBe('farmer,entrepreneur');
  });

  it('separate sentences are separate requirements: intersected', () => {
    expect(occ('The applicant should be a farmer or an entrepreneur.', 'The applicant must be a farmer.')).toBe('farmer');
    const clash = extractOccupation(['The applicant must be a farmer.', 'The applicant must be a student.']);
    expect(clash.value).toBeNull();
    expect(clash.nullReason).toMatch(/do not overlap/);
  });
});

describe('extractOccupation: sentences that are NOT a clean occupation requirement', () => {
  const nothing = (s: string) => {
    const r = extractOccupation([s]);
    expect(r.value, s).toBeNull();
    return r;
  };

  it('an alternative we cannot model', () => {
    expect(nothing('The applicant should be a farmer, entrepreneur, or member of SHG.').rejected[0].reason).toMatch(/cannot model/);
    nothing('The applicant must be a student, guardian or heir of the student.');
    nothing('The applicant should be a farmer or landowner.');
    nothing('The applicant must be a graduate or postgraduate student, researcher, or farmer from subjects such as Biotechnology.');
    nothing('The applicant should be a government employee, pensioner, or dependent family member.');
  });

  it('a relative or dependent, not the applicant', () => {
    nothing('The applicant should be a Ward of an Unemployed ESM / Ward of the Widow of an ESM.');
    nothing('The applicant should be a child of a registered farmer.');
  });

  it('negations and exclusions', () => {
    nothing("No member of the applicant's family should be an employee of the State/Central/ Government Public Sector Units.");
    nothing('None of the family members of the applicant should be a government employee.');
    nothing('The applicant should not be a farmer.');
  });

  it('the occupation as the subject of a sentence (conditions, exclusions, process): ignored', () => {
    nothing('Farmers who have taken advantage of the scheme in the last three years will not be given the benefit of the scheme this year.');
    nothing('The farmer should cultivate one of the 21 listed crops.');
    nothing('The entrepreneur should have a vaccination Scheme in place for the birds.');
    nothing('The student must have secured minimum 75% marks in class 10th.');
  });

  it('an organisation or group', () => {
    nothing('The applicant organization must be a farmer producer group.');
  });

  it('benefit tiers and headings', () => {
    nothing('Preference will be given to applicants who should be a farmer.');
  });

  it('a sentence that is about something else entirely', () => {
    expect(occ('The applicant must be a citizen of India.')).toBeNull();
    expect(occ('The applicant should be above 18 years of age.')).toBeNull();
    expect(occ('The applicant must be a resident of Gujarat.')).toBeNull();
  });
});

describe('extractOccupation: fixes from the dry-run review', () => {
  it('a bracket does not hide a second alternative after it', () => {
    expect(occ('The applicant should be self-employed (including in agriculture and allied activities) or wage/salary employed for a minimum period of one year, and must have passed at least class 8.')).toBeNull();
  });

  it('a relative who can also qualify, later in the sentence, makes it a larger set', () => {
    expect(occ('The applicant should be a regular employee in service of the Government of Sikkim or the dependent family members of such employee (spouse; brother and sister).')).toBeNull();
  });

  it('an "or" inside an ordinary qualifier is still fine', () => {
    expect(occ('The applicant should be a regular student in a government or recognized educational institution.')).toBe('student');
    expect(occ('The applicant must be unemployed (employment even in the private sector or government would bar an applicant).')).toBe('unemployed');
  });
});

describe('extractOccupation: the second round of fixes', () => {
  it('a sentence ending in a colon is still a rule when it says "must be a ..."; a bare heading is not', () => {
    expect(occ('The applicant must be a farmer:')).toBe('farmer');
    expect(occ('The applicant should be a student studying in:')).toBe('student');
    expect(occ('The applicant should be an unemployed youth, including:')).toBe('unemployed');
    expect(occ('For farmers:')).toBeNull();
  });

  it('descriptive words in front of the noun do not stop it counting', () => {
    expect(occ('The applicant should be a landholding farmer.')).toBe('farmer');
    expect(occ('The beneficiary should be a maize-growing farmer.')).toBe('farmer');
    expect(occ('The applicant should be a government school student.')).toBe('student');
  });

  it('a description AFTER the noun does not stop it counting', () => {
    expect(occ('The applicant must be a farmer owning agricultural land up to 1 hectare.')).toBe('farmer');
    expect(occ('The applicant must be a farmer and hold a Udhyan Card.')).toBe('farmer');
    expect(occ('The applicant should be unemployed but professionally educated (e.g., doctor, engineer, lawyer, CA, etc.).')).toBe('unemployed');
    expect(occ('The applicant should be involved in shrimp farming and be a farmer.')).toBeNull();
  });

  it('negation is judged BEFORE the occupation only', () => {
    expect(occ('The applicant should be an educated unemployed youth who is no longer eligible for government service due to the age limit.')).toBe('unemployed');
    expect(occ('The applicant must be a student of Classes 1 to 8 studying in any government or non-government aided school.')).toBe('student');
    expect(occ('The applicant should not be a farmer.')).toBeNull();
  });

  it('a mark or disability threshold is not a benefit tier, but a quota of beneficiaries is', () => {
    expect(occ('The applicant should be a student with first class or 60% marks in the previous examination.')).toBe('student');
    expect(occ('The applicant must be a student with a benchmark disability (40% or more) as defined.')).toBe('student');
    expect(occ('Note 03: 30% of the beneficiaries under the scheme shall be women entrepreneurs.')).toBeNull();
  });

  it('"and other matters" is not another group; "or the dependent family members" is', () => {
    expect(occ('Applicant should be unemployed and should be under career-break due to family commitments or other related matters, at the time of application.')).toBe('unemployed');
    expect(occ('The applicant should be a regular employee in service of the Government of Sikkim or the dependent family members of such employee.')).toBeNull();
  });
});
