import { describe, it, expect } from 'vitest';
import { chooseCanonical, isSamePhrase, planMerges, singularCandidates, typographicKey, type TagInfo } from './tagMerge.js';

const tag = (name: string, schemeCount: number, hindi?: string): TagInfo => ({ name, schemeCount, hindi });
const groupOf = (tags: TagInfo[], name: string) => planMerges(tags).groups.find((g) => g.members.some((m) => m.name === name));

describe('typographicKey', () => {
  it('ignores case, hyphens, slashes, ampersands and spacing', () => {
    const same = ['Self-Employment', 'Self Employment', 'self-employment', 'SELF  EMPLOYMENT'];
    expect(new Set(same.map(typographicKey)).size).toBe(1);
    expect(typographicKey('HIV / AIDS')).toBe(typographicKey('HIV & AIDS'));
    expect(typographicKey('Pre-Matric')).toBe(typographicKey('Pre Matric'));
  });

  it('keeps words that differ as different', () => {
    expect(typographicKey('Post Matric')).not.toBe(typographicKey('Pre Matric'));
    expect(typographicKey('Start Up')).not.toBe(typographicKey('Startup'));
    expect(typographicKey('Scheduled Caste')).not.toBe(typographicKey('Schedule Caste'));
  });
});

describe('singularCandidates', () => {
  it('only changes the last word', () => {
    expect(singularCandidates('senior citizens')).toContain('senior citizen');
    expect(singularCandidates('persons with disability')).toEqual([]);
  });

  it('offers the usual ways of making a word singular', () => {
    expect(singularCandidates('fisheries')).toContain('fishery');
    expect(singularCandidates('coaches')).toContain('coach');
    expect(singularCandidates('farmers')).toEqual(['farmer']);
  });

  it('leaves words that merely end in s alone', () => {
    expect(singularCandidates('business')).toEqual([]);
    expect(singularCandidates('class')).toEqual([]);
  });
});

describe('planMerges: typographic variants (real tags from the data)', () => {
  it('merges case and punctuation variants, keeping the most used spelling', () => {
    const g = groupOf([tag('Self-Employment', 23), tag('Self Employment', 67), tag('Self-employment', 82), tag('Loan', 244)], 'Self Employment')!;
    expect(g.canonical).toBe('Self-employment');
    expect(g.kind).toBe('typographic');
    expect(g.members.map((m) => m.name).sort()).toEqual(['Self Employment', 'Self-Employment', 'Self-employment']);
  });

  it('does not touch a tag that has no variant', () => {
    const plan = planMerges([tag('Loan', 244), tag('Scholarship', 437)]);
    expect(plan.groups).toEqual([]);
    expect(plan.renames).toEqual({});
  });

  it('merges "HIV / AIDS" and "HIV & AIDS"', () => {
    expect(groupOf([tag('HIV / AIDS', 1), tag('HIV & AIDS', 1)], 'HIV / AIDS')).toBeDefined();
  });
});

describe('planMerges: singular and plural', () => {
  it('merges a plural into the singular and the other way round, by use', () => {
    const farmers = planMerges([tag('Farmer', 388), tag('Farmers', 36)]);
    expect(farmers.groups[0].canonical).toBe('Farmer');
    expect(farmers.renames).toEqual({ Farmers: 'Farmer' });
    const incentives = planMerges([tag('Incentive', 111), tag('Incentives', 126)]);
    expect(incentives.groups[0].canonical).toBe('Incentives');
    expect(incentives.groups[0].kind).toBe('plural');
  });

  it('handles -ies and -es plurals', () => {
    expect(planMerges([tag('Fishery', 55), tag('Fisheries', 24)]).renames).toEqual({ Fisheries: 'Fishery' });
    expect(planMerges([tag('Subsidy', 519), tag('Subsidies', 8)]).renames).toEqual({ Subsidies: 'Subsidy' });
    expect(planMerges([tag('Tax', 5), tag('Taxes', 2)]).renames).toEqual({ Taxes: 'Tax' });
  });

  it('merges a plural in the last word only', () => {
    const plan = planMerges([tag('Senior Citizen', 85), tag('Senior Citizens', 6), tag('Person With Disability', 48), tag('Persons With Disability', 13)]);
    expect(plan.renames).toEqual({ 'Senior Citizens': 'Senior Citizen' });
  });

  it('leaves a truncated or misspelt form alone even though stripping a suffix from the plural produces it', () => {
    // "Enterprises" minus "es" is "Enterpris", "Classes" minus "s" is "Classe": neither is a plural of anything
    const plan = planMerges([tag('Enterprise', 214), tag('Enterprises', 5), tag('Enterpris', 1)]);
    expect(plan.renames).toEqual({ Enterprises: 'Enterprise' });
    expect(plan.leftAlone).toEqual([{ name: 'Enterpris', reason: 'truncated "Enterprise"' }]);
    const classes = planMerges([tag('Backward Class', 19), tag('Backward Classes', 23), tag('Backward Classe', 1)]);
    expect(classes.renames).toEqual({ 'Backward Class': 'Backward Classes' });
    expect(classes.leftAlone.map((t) => t.name)).toEqual(['Backward Classe']);
    const coaches = planMerges([tag('Coache', 1), tag('Coaches', 1)]);
    expect(coaches.groups).toEqual([]);
  });

  it('combines typographic and plural variants in one group', () => {
    const g = groupOf([tag('Pre-Matric', 23), tag('Pre Matric', 10), tag('Pre-Matrics', 1)], 'Pre-Matrics')!;
    expect(g.kind).toBe('typographic + plural');
    expect(g.canonical).toBe('Pre-Matric');
  });

  it('merges acronym plurals', () => {
    expect(planMerges([tag('SHG', 16), tag('SHGs', 6)]).renames).toEqual({ SHGs: 'SHG' });
  });
});

describe('planMerges: pairs that mean something different are held back, not merged', () => {
  it.each([
    ['Aid', 'AIDS'],
    ['Art', 'Arts'],
    ['Saving', 'Savings'],
    ['Pulse', 'Pulses'],
    ['Spectacle', 'Spectacles'],
    ['Trade', 'Trades'],
  ])('%s and %s', (singular, plural) => {
    const plan = planMerges([tag(singular, 5), tag(plural, 3)]);
    expect(plan.groups).toEqual([]);
    expect(plan.heldBack).toEqual([expect.objectContaining({ singular, plural })]);
  });

  it('only holds back the exact pair: "Hearing Aid" and "Hearing Aids" still merge', () => {
    const plan = planMerges([tag('Hearing Aid', 4), tag('Hearing Aids', 1), tag('Aid', 1), tag('AIDS', 3)]);
    expect(plan.renames).toEqual({ 'Hearing Aids': 'Hearing Aid' });
    expect(plan.heldBack.map((h) => h.singular)).toEqual(['Aid']);
  });
});

describe('planMerges: spellings and synonyms are left alone', () => {
  it('does not merge different spellings, compounds or synonyms', () => {
    const plan = planMerges([
      tag('Entrepreneur', 114),
      tag('Enterpreneur', 4),
      tag('Scheduled Caste', 258),
      tag('Schedule Caste', 7),
      tag('Start Up', 67),
      tag('Startup', 51),
      tag('Farmer', 388),
      tag('Cultivator', 319),
      tag('Financial Assistance', 1232),
      tag('Monetary Aid', 1065),
    ]);
    expect(plan.groups).toEqual([]);
  });

  it('does not merge words that only end in s', () => {
    expect(planMerges([tag('Business', 10), tag('Busines', 1)]).groups).toEqual([]);
    expect(planMerges([tag('Class', 3), tag('Clas', 1)]).groups).toEqual([]);
  });

  it('ignores a tag that is only symbols', () => {
    expect(planMerges([tag('---', 1), tag('???', 1)]).groups).toEqual([]);
  });
});

describe('chooseCanonical: which form is kept', () => {
  it('prefers the form with a Hindi vocabulary entry, even if it is used less', () => {
    const members = [tag('Entrepreneurs', 21), tag('Entrepreneur', 114, 'उद्यमी'), tag('Entrepreneurs', 21)];
    expect(chooseCanonical(members).name).toBe('Entrepreneur');
    const lessUsed = [tag('Loan', 244), tag('Loans', 3, 'ऋण')];
    expect(chooseCanonical(lessUsed).name).toBe('Loans');
  });

  it('among members with a Hindi entry, takes the most used', () => {
    expect(chooseCanonical([tag('A', 5, 'क'), tag('B', 9, 'ख')]).name).toBe('B');
  });

  it('with no Hindi entry, takes the most used', () => {
    expect(chooseCanonical([tag('Post Matric', 15), tag('Post-Matric', 19), tag('Post-matric', 1)]).name).toBe('Post-Matric');
  });

  it('breaks a tie towards Title Case, then alphabetically', () => {
    expect(chooseCanonical([tag('self help', 2), tag('Self Help', 2)]).name).toBe('Self Help');
    expect(chooseCanonical([tag('Beta Tag', 2), tag('Alpha Tag', 2)]).name).toBe('Alpha Tag');
  });

  it('gives the same answer whatever order the members arrive in', () => {
    const members = [tag('Fisheries', 24), tag('Fishery', 55), tag('Fishery', 55)];
    expect(chooseCanonical([...members].reverse()).name).toBe(chooseCanonical(members).name);
  });
});

describe('planMerges: groups that need a person to look at them are flagged', () => {
  it('flags a close call between two forms', () => {
    const g = planMerges([tag('MSME', 65), tag('MSMEs', 75)]).groups[0];
    expect(g.flags.join(' ')).toMatch(/close call/);
  });

  it('flags a tie', () => {
    const g = planMerges([tag('Group Marriage', 5), tag('Group Marriages', 5)]).groups[0];
    expect(g.flags.join(' ')).toMatch(/tied/);
  });

  it('flags when the Hindi entry decided over usage', () => {
    const g = planMerges([tag('Loan', 244), tag('Loans', 3, 'ऋण')]).groups[0];
    expect(g.canonical).toBe('Loans');
    expect(g.flags.join(' ')).toMatch(/because it has the Hindi entry/);
  });

  it('flags two different Hindi entries in one group', () => {
    const g = planMerges([tag('Art', 11, 'कला'), tag('ART', 2, 'चित्रकला')]).groups[0];
    expect(g.flags.join(' ')).toMatch(/Hindi entry, and they differ/);
  });

  it('does not flag a clear-cut group', () => {
    expect(planMerges([tag('Farmer', 388), tag('Farmers', 36)]).groups[0].flags).toEqual([]);
  });
});

describe('planMerges: bookkeeping', () => {
  it('maps every merged-away name to the kept one, and never maps the kept one', () => {
    const plan = planMerges([tag('Pre-Matric', 23), tag('Pre Matric', 10), tag('Pre-matric', 4), tag('Loan', 1)]);
    expect(plan.renames).toEqual({ 'Pre Matric': 'Pre-Matric', 'Pre-matric': 'Pre-Matric' });
    expect(Object.values(plan.renames)).not.toContain('Pre Matric');
  });

  it('does not depend on the order the tags arrive in', () => {
    const tags = [tag('Fishery', 55), tag('Fisheries', 24), tag('Pre-Matric', 23), tag('Pre Matric', 10), tag('Farmer', 388), tag('Farmers', 36)];
    expect(planMerges([...tags].reverse()).renames).toEqual(planMerges(tags).renames);
  });

  it('is idempotent: planning again on the result finds nothing more to merge', () => {
    const tags = [tag('Farmer', 388), tag('Farmers', 36), tag('Fishery', 55), tag('Fisheries', 24), tag('Pre-Matric', 23), tag('Pre Matric', 10)];
    const plan = planMerges(tags);
    const survivors = tags.filter((t) => !(t.name in plan.renames));
    expect(planMerges(survivors).groups).toEqual([]);
  });
});

describe('isSamePhrase: the rule every rename must satisfy', () => {
  it.each([
    ['Micro Small Medium Enterprise', 'Micro Small Medium Enterprises'],
    ['Construction Workers', 'Construction Worker'],
    ['Building Workers', 'Building Worker'],
    ['Scheduled Castes', 'Scheduled Caste'],
    ['Scheduled Tribes', 'Scheduled Tribe'],
    ['Self Employment', 'Self-employment'],
    ['ARTISTS', 'Artists'],
    ['Pre-Matrics', 'Pre Matric'],
    ['HIV & AIDS', 'HIV / AIDS'],
  ])('%s and %s are the same phrase', (a, b) => {
    expect(isSamePhrase(a, b)).toBe(true);
    expect(isSamePhrase(b, a)).toBe(true);
  });

  it.each([
    ['Workers', 'Construction Workers'], // a short tag into a longer, different one
    ['Enterprise', 'Micro Small Medium Enterprises'],
    ['Castes', 'Scheduled Castes'],
    ['Farmer', 'Cultivator'],
    ['Enterpreneur', 'Entrepreneur'],
    ['Schedule Caste', 'Scheduled Caste'],
    ['Start Up', 'Startup'],
    ['Person With Disability', 'Persons With Disability'], // plural in a word other than the last
    ['Enterpris', 'Enterprise'],
    ['Backward Classe', 'Backward Classes'],
    ['', 'Farmer'],
  ])('%s and %s are NOT the same phrase', (a, b) => {
    expect(isSamePhrase(a, b)).toBe(false);
    expect(isSamePhrase(b, a)).toBe(false);
  });

  it('holds for every rename a plan produces', () => {
    const plan = planMerges([
      tag('Farmer', 388), tag('Farmers', 36), tag('Fishery', 55), tag('Fisheries', 24), tag('Pre-Matric', 23), tag('Pre Matric', 10), tag('Pre-Matrics', 1),
      tag('Enterprise', 214), tag('Enterprises', 5), tag('Enterpris', 1), tag('Self-employment', 82), tag('Self Employment', 67), tag('Workers', 3), tag('Worker', 100),
      tag('Construction Worker', 259), tag('Construction Workers', 44), tag('Aid', 1), tag('AIDS', 3),
    ]);
    expect(Object.keys(plan.renames).length).toBeGreaterThan(5);
    for (const [variant, canonical] of Object.entries(plan.renames)) expect(isSamePhrase(variant, canonical), `${variant} => ${canonical}`).toBe(true);
  });
});
