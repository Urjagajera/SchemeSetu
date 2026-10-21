import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { EMPTY_FILTERS, countActiveFilters, filtersFromParams, paramsFromFilters } from './useSearchFilters';
import { TOPIC_ALIASES, TOPIC_IDS, toTopicId } from '../constants/searchFilters';

describe('Search filters in the URL', () => {
  it('an empty URL is no filters, and no filters is an empty URL', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(EMPTY_FILTERS);
    expect(paramsFromFilters(EMPTY_FILTERS).toString()).toBe('');
  });

  it('every filter survives a round trip through the URL (so reload and shared links keep them)', () => {
    const f = {
      query: 'scholarship', topics: ['education', 'health'], level: 'Central', ministry: 'Ministry Of Finance', state: 'Gujarat',
      occupation: 'senior citizen', gender: 'female', socialCategory: 'sc', age: '30', income: '250000',
    };
    expect(filtersFromParams(paramsFromFilters(f))).toEqual(f);
  });

  it('writes topics as one value in a fixed order, and the page only past page 1', () => {
    const p = paramsFromFilters({ ...EMPTY_FILTERS, topics: ['health', 'education'] }, 3);
    expect(p.get('topic')).toBe('education,health');
    expect(p.get('page')).toBe('3');
    expect(paramsFromFilters(EMPTY_FILTERS, 1).has('page')).toBe(false);
  });

  it('reads an old ?category= link as a topic and drops values that are no topic', () => {
    expect(filtersFromParams(new URLSearchParams('category=Healthcare')).topics).toEqual(['health']);
    expect(filtersFromParams(new URLSearchParams('category=Women%20%26%20Child&topic=housing,nope')).topics).toEqual(['women', 'housing']);
    expect(paramsFromFilters(filtersFromParams(new URLSearchParams('category=Education'))).toString()).toBe('topic=education');
  });

  it('counts each filter that is on, each topic once, and not the search text', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, query: 'x' })).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, ministry: 'M', age: '20', topics: ['jobs', 'housing'] })).toBe(4);
  });
});

describe('topic ids and aliases match the backend (backend/src/filters/topics.ts)', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../backend/src/filters/topics.ts'), 'utf8');
  const backendIds = [...source.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  const backendAliases = new Map<string, string>();
  for (const m of source.matchAll(/id: '([^']+)',\s*aliases: \[([^\]]*)\]/g)) {
    for (const a of m[2].matchAll(/'([^']+)'/g)) backendAliases.set(a[1], m[1]);
  }

  it('same topic ids, same order', () => {
    expect(backendIds.length).toBeGreaterThan(10);
    expect([...TOPIC_IDS]).toEqual(backendIds);
  });

  it('same aliases, pointing at the same topics', () => {
    expect(backendAliases.size).toBeGreaterThan(10);
    expect(new Map(Object.entries(TOPIC_ALIASES))).toEqual(backendAliases);
  });

  it('every topic has its words in the locale file', async () => {
    const en = (await import('../../locales/en.json')).default as Record<string, string>;
    for (const id of TOPIC_IDS) expect(en[`topic_${id}`], id).toBeTruthy();
  });

  it('toTopicId takes an id or an alias, any case', () => {
    expect(toTopicId(' Housing ')).toBe('housing');
    expect(toTopicId('Senior Citizens')).toBe('pension');
    expect(toTopicId('Gujarat')).toBeNull();
  });
});
