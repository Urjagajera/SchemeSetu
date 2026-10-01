import { describe, it, expect } from 'vitest';
import { extractAge, extractIncome, parseEligibilityForScheme, parseCurrencyAmount } from './parseEligibility.js';

describe('parseCurrencyAmount', () => {
  it('parses lakh and crore amounts', () => {
    expect(parseCurrencyAmount('2 lakh')).toBe(200000);
    expect(parseCurrencyAmount('3.50 lakh')).toBe(350000);
    expect(parseCurrencyAmount('1 crore')).toBe(10000000);
  });

  it('parses comma-separated rupee amounts, tolerating a stray space after the comma', () => {
    expect(parseCurrencyAmount('2,00,000')).toBe(200000);
    expect(parseCurrencyAmount('2, 00,000')).toBe(200000);
  });
});

describe('extractAge — real scheme scenarios', () => {
  // Real case (link: myscheme.gov.in/schemes/apy — "Atal Pension Yojana"),
  // PHASE_A_LINKS baseline case in ingestEligibility.ts: "Straightforward age-only (18-40)".
  it('parses APY minimum/maximum joining age (18-40) from the real source sentence', () => {
    const result = extractAge(['The minimum age of joining APY is 18 years and maximum is 40 years.']);
    expect(result.min).toBe(18);
    expect(result.max).toBe(40);
  });

  it('ignores unrelated numeric sentences with no age anchor', () => {
    const result = extractAge(['The repayment period for the loan is up to 5 years.']);
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
  });

  it('does not abandon the rest of a scheme when an earlier sentence already matched', () => {
    // Regression case documented in the source: an earlier version returned
    // early on the first range match, silently dropping later sentences.
    const result = extractAge([
      'Applicants aged between 18 and 60 years may apply.',
      'Faculty above 50 years of age is not eligible to apply.',
    ]);
    expect(result.min).toBe(18);
    expect(result.max).toBe(60);
  });
});

describe('extractIncome — real scheme scenarios', () => {
  // Real case (link: myscheme.gov.in/schemes/kbpyy — "Krishak Bakri Palan Yojna",
  // Himachal Pradesh), a PHASE_A_LINKS baseline case in ingestEligibility.ts.
  it('parses a single real income ceiling (₹2 lakh/annum) with no dual-ceiling exclusion', () => {
    const result = extractIncome(['Persons with annual income not exceeding 2 lakh per annum.']);
    expect(result.maxAnnual).toBe(200000);
    expect(result.dualCeilingExcluded).toBe(false);
  });

  // Real case (link: myscheme.gov.in/schemes/mpkskkn-d — "Madhya Pradesh Kalakar
  // Evam Sahityakar Kalyan Kosh Niyam- Disability Assistance"), also a
  // PHASE_A_LINKS case. Two distinct monthly ceilings (own income vs. family
  // income) are category/relationship-segmented, not one true number — the
  // locked product decision is to exclude both from automatic parsing rather
  // than guess "the lower figure".
  it('excludes both income fields when the real source text carries two distinct ceilings', () => {
    const result = extractIncome([
      'The applicant’s monthly income from all sources, including spouse income, should not exceed ₹10,000.',
      'The total monthly family income, including dependents, should not exceed ₹20,000.',
    ]);
    expect(result.dualCeilingExcluded).toBe(true);
    expect(result.dualCeilingDistinctValues).toEqual([120000, 240000]);
    expect(result.maxAnnual).toBeNull();
    expect(result.minAnnual).toBeNull();
  });

  it('converts a monthly income figure to its annual equivalent', () => {
    const result = extractIncome(['Family income should not exceed ₹4,000 per month.']);
    expect(result.maxAnnual).toBe(48000);
  });

  it('skips an implausible figure above the 50 lakh sanity bound', () => {
    const result = extractIncome(['Annual income should not exceed ₹6,00,00,000.']);
    expect(result.maxAnnual).toBeNull();
    expect(result.skippedForSanity.length).toBe(1);
  });

  it('ignores company financial metrics that are not personal income', () => {
    const result = extractIncome(['Annual turnover should not exceed ₹50,00,000 with an income of ₹2,00,000.']);
    // The turnover guard rejects the whole sentence, including the genuine income figure in it.
    expect(result.maxAnnual).toBeNull();
  });
});

describe('parseEligibilityForScheme — end-to-end aggregation', () => {
  it('reports hasAnyCriteria = false for a scheme with no age/income signal', () => {
    const parsed = parseEligibilityForScheme('https://example.com/none', 'No Criteria Scheme', [
      'Applicant must be a resident of India.',
    ]);
    expect(parsed.hasAnyCriteria).toBe(false);
    expect(parsed.ageMin).toBeNull();
    expect(parsed.incomeMaxAnnual).toBeNull();
  });

  it('reports hasAnyCriteria = true and preserves dualCeilingExcluded at the aggregate level', () => {
    const parsed = parseEligibilityForScheme('https://www.myscheme.gov.in/schemes/mpkskkn-d', 'MP Kalakar Disability Assistance', [
      'The applicant should be a resident of Madhya Pradesh.',
      'The applicant should be 21 years of age or above.',
      'The applicant’s monthly income from all sources, including spouse income, should not exceed ₹10,000.',
      'The total monthly family income, including dependents, should not exceed ₹20,000.',
    ]);
    expect(parsed.hasAnyCriteria).toBe(true);
    expect(parsed.ageMin).toBe(21);
    expect(parsed.incomeMaxAnnual).toBeNull();
    expect(parsed.dualCeilingExcluded).toBe(true);
  });
});

describe('parseEligibilityForScheme: state gates', () => {
  it('a scheme whose only criterion is a state gets a row, with the state set', () => {
    const parsed = parseEligibilityForScheme('https://example.com/rpsy', 'State-only scheme', ['The applicant must be a permanent resident of Uttar Pradesh.']);
    expect(parsed.state).toBe('Uttar Pradesh');
    expect(parsed.hasAnyCriteria).toBe(true);
    expect(parsed.ageMin).toBeNull();
    expect(parsed.gender).toBeNull();
  });

  it('uses the authority to read "resident of the State"', () => {
    const parsed = parseEligibilityForScheme('https://example.com/x', 'X', ['The applicant must be a resident of the State.'], 'Bihar');
    expect(parsed.state).toBe('Bihar');
    expect(parseEligibilityForScheme('https://example.com/x', 'X', ['The applicant must be a resident of the State.'], 'Ministry Of Finance').state).toBeNull();
  });

  it('applies the reviewed exceptions by source URL', () => {
    const parsed = parseEligibilityForScheme('https://www.myscheme.gov.in/schemes/shssd', 'Student Housing', ['The applicant should be a resident of Chhattisgarh.'], 'Madhya Pradesh');
    expect(parsed.state).toBeNull();
    expect(parsed.hasAnyCriteria).toBe(false);
    expect(parsed.stateResult.suppressedValue).toBe('Chhattisgarh');
  });

  it('keeps age, gender and state together on one result', () => {
    const parsed = parseEligibilityForScheme('https://example.com/y', 'Y', ['The applicant must be a woman.', 'The applicant must be a resident of Goa.', 'Applicants aged between 18 and 40 years may apply.'], 'Goa');
    expect(parsed).toMatchObject({ gender: 'female', state: 'Goa', ageMin: 18, ageMax: 40 });
  });
});
