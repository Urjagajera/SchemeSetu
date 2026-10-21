import { describe, it, expect } from 'vitest';
import { makeScheme } from '../test/factories';
import { applyLocalFilters, localFilterCounts, schemeTopics } from './localFilters';

const edu = makeScheme({ id: 'e', name: 'Post Matric Scholarship', categories: ['Education'], category: 'Education', tags: ['Student'] });
const health = makeScheme({ id: 'h', name: 'Health Cover', categories: ['Healthcare'], category: 'Healthcare', tags: ['Insurance'] });
const goa = makeScheme({ id: 'g', name: 'Goa Farmer Aid', level: 'State', authorityName: 'Goa', categories: ['Agriculture'], category: 'Agriculture', tags: ['Farmer'] });
const all = [edu, health, goa];

describe('mock-mode Search filters', () => {
  it('reads topics from the demo categories and tags', () => {
    expect([...schemeTopics(health)].sort()).toEqual(['health', 'insurance']);
  });

  it('a scheme in ANY chosen topic stays', () => {
    expect(applyLocalFilters(all, { topic: 'health' }).map((s) => s.id)).toEqual(['h']);
    expect(applyLocalFilters(all, { topic: 'education,agriculture' }).map((s) => s.id)).toEqual(['e', 'g']);
  });

  it('a state keeps central schemes plus that state', () => {
    expect(applyLocalFilters(all, { state: 'Gujarat' }).map((s) => s.id)).toEqual(['e', 'h']);
    expect(applyLocalFilters(all, { state: 'Goa' })).toHaveLength(3);
  });

  it('occupation and free text narrow too', () => {
    expect(applyLocalFilters(all, { occupation: 'farmer' }).map((s) => s.id)).toEqual(['g']);
    expect(applyLocalFilters(all, { query: 'cover' }).map((s) => s.id)).toEqual(['h']);
  });

  it('counts each option on its own', () => {
    const counts = localFilterCounts(all);
    expect(counts.topics.find((t) => t.id === 'education')?.count).toBe(1);
    expect(counts.levels).toEqual([{ id: 'Central', count: 2 }, { id: 'State', count: 1 }]);
  });
});
