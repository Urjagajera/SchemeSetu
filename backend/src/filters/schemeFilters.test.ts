import { describe, it, expect } from 'vitest';
import { buildSchemeWhere, occupationWhere, parseSchemeFilters, topicWhere } from './schemeFilters.js';
import { TOPICS, findTopic } from './topics.js';
import { OCCUPATIONS, findOccupation } from './occupations.js';

// These pin how filters are read and which Prisma conditions they build; that the conditions select the right
// rows was checked against the real database (topic/occupation counts in the module's live check).

describe('parseSchemeFilters', () => {
  it('returns nothing for an empty query, blank values or values that are not real options', () => {
    expect(parseSchemeFilters({})).toEqual({});
    expect(parseSchemeFilters({ q: '  ', topic: '', level: 'county', state: 'Gujrat', occupation: 'astronaut' })).toEqual({});
    expect(parseSchemeFilters({ gender: 'x', socialCategory: 'brahmin', age: '121', income: '-1' })).toEqual({});
  });

  it('reads every filter and normalises its spelling', () => {
    expect(
      parseSchemeFilters({
        q: ' scholarship ',
        topic: 'Education',
        level: 'state',
        ministry: ' Ministry Of Finance ',
        state: ' gujarat ',
        occupation: 'Senior_Citizen',
        gender: 'FEMALE',
        socialCategory: ' SC ',
        age: '30',
        income: '250000',
      }),
    ).toEqual({
      query: 'scholarship',
      topics: ['education'],
      level: 'State',
      ministry: 'Ministry Of Finance',
      state: 'Gujarat',
      occupation: 'senior citizen',
      gender: 'female',
      socialCategory: 'sc',
      age: 30,
      income: 250000,
    });
  });

  it('accepts `query` as well as `q`, and caps its length', () => {
    expect(parseSchemeFilters({ query: 'loan' }).query).toBe('loan');
    expect(parseSchemeFilters({ q: 'x'.repeat(500) }).query).toHaveLength(200);
  });

  it('takes several topics, comma-separated or repeated, de-duplicated and in a fixed order', () => {
    expect(parseSchemeFilters({ topic: 'health,education' }).topics).toEqual(['education', 'health']);
    expect(parseSchemeFilters({ topic: ['health', 'education', 'health', 'nope'] }).topics).toEqual(['education', 'health']);
  });

  it('maps the old Home-page category values onto topics and ignores a category that is no topic', () => {
    expect(parseSchemeFilters({ category: 'Healthcare' }).topics).toEqual(['health']);
    expect(parseSchemeFilters({ category: 'Women & Child' }).topics).toEqual(['women']);
    expect(parseSchemeFilters({ category: 'Senior Citizens', topic: 'housing' }).topics).toEqual(['pension', 'housing']);
    expect(parseSchemeFilters({ category: 'Gujarat' })).toEqual({});
  });

  it('uses the first value when a single-value filter is repeated', () => {
    expect(parseSchemeFilters({ gender: ['male', 'female'] }).gender).toBe('male');
  });
});

describe('buildSchemeWhere', () => {
  it('is an empty condition (every scheme) when there are no filters', () => {
    expect(buildSchemeWhere({})).toEqual({});
  });

  it('adds one AND clause per filter', () => {
    const where = buildSchemeWhere(parseSchemeFilters({ q: 'x', topic: 'health', level: 'central', ministry: 'M', occupation: 'farmer' }));
    expect(where.AND).toHaveLength(5);
  });

  it('free text also matches tag names', () => {
    expect(JSON.stringify(buildSchemeWhere({ query: 'divyang' }))).toContain('"tags":{"some":{"name":{"contains":"divyang"');
  });

  it('a state adds the authority rule AND the "limited to other states" rule', () => {
    const text = JSON.stringify(buildSchemeWhere({ state: 'Goa' }));
    expect(text).toContain('{"authorityName":{"equals":"Goa","mode":"insensitive"}}');
    expect(text).toContain('"state":{"equals":"Goa"}');
  });

  it('keeps the demographic rules: unrestricted schemes always stay', () => {
    const text = JSON.stringify(buildSchemeWhere({ gender: 'female', age: 30, income: 100000, socialCategory: 'st' }));
    expect(text).toContain('"eligibilityCriteria":{"is":null}');
    expect(text).toContain('{"ageMin":{"lte":30}}');
    expect(text).toContain('{"incomeMaxAnnual":{"gte":100000}}');
    expect(text).toContain('"equals":"st"');
  });
});

describe('topics', () => {
  it('ids, aliases and tags are unique within the list', () => {
    const ids = TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const aliases = TOPICS.flatMap((t) => t.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
    for (const t of TOPICS) expect(new Set(t.tags.map((x) => x.toLowerCase())).size).toBe(t.tags.length);
  });

  it('aliases are lower-case so the lookup can find them', () => {
    for (const a of TOPICS.flatMap((t) => t.aliases)) expect(a).toBe(a.toLowerCase());
  });

  it('finds a topic by id or alias, any case', () => {
    expect(findTopic('HEALTH')?.id).toBe('health');
    expect(findTopic(' scholarships ')?.id).toBe('education');
    expect(findTopic('nothing')).toBeNull();
    expect(findTopic(undefined)).toBeNull();
  });

  it('topicWhere matches a scheme carrying any tag of any chosen topic, case-insensitively', () => {
    const where = topicWhere(['housing', 'health']);
    const names = (where.tags as { some: { name: { in: string[]; mode: string } } }).some.name;
    expect(names.mode).toBe('insensitive');
    expect(names.in).toEqual(expect.arrayContaining(['Housing', 'Shelter', 'Health', 'Hospital']));
    expect(names.in).not.toContain('Farmer');
  });
});

describe('occupations', () => {
  it('finds an occupation in the spellings the app sends', () => {
    expect(findOccupation('Farmer')?.id).toBe('farmer');
    expect(findOccupation('senior_citizen')?.id).toBe('senior citizen');
    expect(findOccupation('senior-citizen')?.id).toBe('senior citizen');
    expect(findOccupation('other')).toBeNull();
  });

  it('matches the parsed criteria OR the tags', () => {
    const text = JSON.stringify(occupationWhere('farmer'));
    expect(text).toContain('"occupation":{"equals":"farmer"}');
    expect(text).toContain('"occupation":{"contains":",farmer,"}');
    expect(text).toContain('"Cultivator"');
  });

  it('an occupation the parser never produces is matched on tags only', () => {
    expect(JSON.stringify(occupationWhere('senior citizen'))).not.toContain('eligibilityCriteria');
  });

  it('every occupation has at least one tag', () => {
    for (const o of OCCUPATIONS) expect(o.tags.length).toBeGreaterThan(0);
  });
});
