import { describe, it, expect, beforeEach } from 'vitest';
import { loadRecent, rememberViewed, clearRecent, MAX_RECENT, RECENT_KEY } from './recentlyViewed';

beforeEach(() => localStorage.clear());

describe('recently viewed schemes (on this device)', () => {
  it('newest first, each scheme once', () => {
    rememberViewed({ id: 'a', name: 'A', authorityName: 'Gujarat' }, 1);
    rememberViewed({ id: 'b', name: 'B' }, 2);
    rememberViewed({ id: 'a', name: 'A', authorityName: 'Gujarat' }, 3);
    expect(loadRecent().map((r) => [r.id, r.viewedAt])).toEqual([['a', 3], ['b', 2]]);
  });

  it(`keeps only the newest ${MAX_RECENT}`, () => {
    for (let i = 0; i < MAX_RECENT + 3; i++) rememberViewed({ id: `s${i}`, name: `S${i}` }, i);
    const list = loadRecent();
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0].id).toBe(`s${MAX_RECENT + 2}`);
  });

  it('survives broken storage and can be cleared', () => {
    localStorage.setItem(RECENT_KEY, '{not json');
    expect(loadRecent()).toEqual([]);
    rememberViewed({ id: 'a', name: 'A' });
    clearRecent();
    expect(loadRecent()).toEqual([]);
  });
});
