import { describe, it, expect } from 'vitest';
import { buildDemographicWhere } from './demographicFilters.js';

// The builder only produces Prisma conditions; that they select the right rows is checked against
// the real database (see the live-verification SQL comparison), these tests pin the construction.

describe('buildDemographicWhere', () => {
  it('adds nothing when no filter is given or every value is invalid', () => {
    expect(buildDemographicWhere({})).toEqual([]);
    expect(buildDemographicWhere({ gender: '', socialCategory: '  ', age: '', income: '' })).toEqual([]);
    expect(
      buildDemographicWhere({ gender: 'xyz', socialCategory: 'brahmin', age: 'abc', income: '-5' }),
    ).toEqual([]);
  });

  it('adds one clause per valid filter', () => {
    expect(buildDemographicWhere({ gender: 'female' })).toHaveLength(1);
    expect(buildDemographicWhere({ gender: 'female', socialCategory: 'sc', age: '30', income: '100000' })).toHaveLength(4);
  });

  it('always keeps unrestricted schemes: no criteria row, or that field unset', () => {
    const [clause] = buildDemographicWhere({ gender: 'female' });
    const text = JSON.stringify(clause);
    expect(text).toContain('"eligibilityCriteria":{"is":null}'); // no row at all
    expect(text).toContain('"is":{"gender":null}'); // row exists but gender unset
  });

  it('matches a value inside a comma-separated set only by exact forms, never as a substring', () => {
    const [clause] = buildDemographicWhere({ socialCategory: 'st' });
    const text = JSON.stringify(clause);
    for (const form of ['"equals":"st"', '"startsWith":"st,"', '"endsWith":",st"', '"contains":",st,"']) {
      expect(text).toContain(form);
    }
  });

  it('maps gender "other" to a transgender restriction, and is case/space tolerant', () => {
    expect(JSON.stringify(buildDemographicWhere({ gender: ' OTHER ' })[0])).toContain('transgender');
    expect(JSON.stringify(buildDemographicWhere({ socialCategory: ' SC ' })[0])).toContain('"equals":"sc"');
  });

  it('age keeps schemes whose min is at most the age and whose max is at least the age', () => {
    const text = JSON.stringify(buildDemographicWhere({ age: '30' })[0]);
    expect(text).toContain('{"ageMin":{"lte":30}}');
    expect(text).toContain('{"ageMax":{"gte":30}}');
    expect(text).toContain('{"ageMin":null}');
    expect(text).toContain('{"ageMax":null}');
  });

  it('income keeps schemes whose floor is at most the income and whose ceiling is at least the income', () => {
    const text = JSON.stringify(buildDemographicWhere({ income: '250000' })[0]);
    expect(text).toContain('{"incomeMinAnnual":{"lte":250000}}');
    expect(text).toContain('{"incomeMaxAnnual":{"gte":250000}}');
  });

  it('ignores impossible or non-whole numbers', () => {
    expect(buildDemographicWhere({ age: '121' })).toEqual([]);
    expect(buildDemographicWhere({ age: '30.5' })).toEqual([]);
    expect(buildDemographicWhere({ income: '1e3x' })).toEqual([]);
    expect(buildDemographicWhere({ age: '0' })).toHaveLength(1); // 0 is a valid age
  });
});

describe('buildDemographicWhere: state', () => {
  it('adds one clause for a real state, in any spelling, and ignores anything else', () => {
    expect(buildDemographicWhere({ state: 'Goa' })).toHaveLength(1);
    expect(buildDemographicWhere({ state: ' goa ' })).toHaveLength(1);
    expect(buildDemographicWhere({ state: 'Gujrat' })).toEqual([]);
    expect(buildDemographicWhere({ state: '' })).toEqual([]);
  });

  it('keeps schemes with no criteria, with no state limit, or whose list contains the state', () => {
    const [clause] = buildDemographicWhere({ state: 'Goa' });
    const text = JSON.stringify(clause);
    expect(text).toContain('"eligibilityCriteria":{"is":null}');
    expect(text).toContain('"is":{"state":null}');
    expect(text).toContain('"state":{"equals":"Goa"}');
    expect(text).toContain('"state":{"startsWith":"Goa,"}');
    expect(text).toContain('"state":{"endsWith":",Goa"}');
    expect(text).toContain('"state":{"contains":",Goa,"}');
  });

  it('uses the canonical spelling, so "dadra and nagar haveli and daman and diu" finds the stored name', () => {
    const text = JSON.stringify(buildDemographicWhere({ state: 'dadra and nagar haveli and daman and diu' }));
    expect(text).toContain('Dadra & Nagar Haveli and Daman & Diu');
  });
});
