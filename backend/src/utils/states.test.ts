import { describe, it, expect } from 'vitest';
import { INDIAN_STATES_AND_UTS, canonicalState, isStateName } from './states.js';
import { deriveLevel, levelWhereClause } from './schemeLevel.js';

describe('INDIAN_STATES_AND_UTS', () => {
  it('has the 28 states and 8 union territories, each once', () => {
    expect(INDIAN_STATES_AND_UTS).toHaveLength(36);
    expect(new Set(INDIAN_STATES_AND_UTS).size).toBe(36);
  });
});

describe('canonicalState', () => {
  it('returns the canonical spelling whatever the case or spacing', () => {
    expect(canonicalState('Gujarat')).toBe('Gujarat');
    expect(canonicalState('  gujarat ')).toBe('Gujarat');
    expect(canonicalState('TAMIL   NADU')).toBe('Tamil Nadu');
    expect(canonicalState('jammu AND kashmir')).toBe('Jammu and Kashmir');
  });

  it('reads "&" and "and" as the same word', () => {
    expect(canonicalState('Dadra and Nagar Haveli and Daman and Diu')).toBe('Dadra & Nagar Haveli and Daman & Diu');
    expect(canonicalState('dadra&nagar haveli and daman&diu')).toBe('Dadra & Nagar Haveli and Daman & Diu');
  });

  it('returns null for blanks, typos, ministries and non-strings (never guesses)', () => {
    for (const bad of ['', '   ', 'Gujrat', 'Ministry Of Finance', 'India', null, undefined, 42]) {
      expect(canonicalState(bad as never)).toBeNull();
      expect(isStateName(bad as never)).toBe(false);
    }
  });
});

describe('deriveLevel', () => {
  it('is State for every state and union territory', () => {
    for (const name of INDIAN_STATES_AND_UTS) expect(deriveLevel(name)).toBe('State');
  });

  it('is Central for ministries and for central bodies that are not called ministry or department', () => {
    for (const name of [
      'Ministry Of Finance',
      'Department of Posts',
      'NITI Aayog (National Institution for Transforming India)',
      'The Lokpal of India',
      'Comptroller And Auditor General Of India',
    ]) {
      expect(deriveLevel(name)).toBe('Central');
    }
  });
});

describe('levelWhereClause', () => {
  it('State matches exactly the 36 names, case-insensitively; Central is the negation', () => {
    const state = levelWhereClause('State') as { OR: Array<{ authorityName: { equals: string; mode: string } }> };
    expect(state.OR).toHaveLength(36);
    expect(state.OR.every((c) => c.authorityName.mode === 'insensitive')).toBe(true);
    expect(state.OR.map((c) => c.authorityName.equals)).toEqual([...INDIAN_STATES_AND_UTS]);
    expect(levelWhereClause('central')).toEqual({ NOT: state });
  });

  it('ignores anything else', () => {
    expect(levelWhereClause(undefined)).toBeUndefined();
    expect(levelWhereClause('regional')).toBeUndefined();
  });
});
