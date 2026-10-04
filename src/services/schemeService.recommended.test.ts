import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import { schemeService, ELIGIBLE_PAGE_SIZE } from './schemeService';
import type { UserProfile } from '../types';

const profile = { age: '30', gender: 'female', state: 'Gujarat' } as UserProfile;
const row = (n: number) => ({ id: `s${n}`, name: `Scheme ${n}` });

beforeEach(() => {
  vi.mocked(axios.post).mockReset();
  localStorage.clear();
});

describe('schemeService.getEligibleSchemesPage', () => {
  it('sends the profile with the page and the page size, and reads the total and hasMore from the answer', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [row(1), row(2)], page: 2, limit: 20, total: 45, hasMore: true } });
    const result = await schemeService.getEligibleSchemesPage(profile, 2);
    expect(axios.post).toHaveBeenCalledWith('/api/schemes/recommended', { profile, page: 2, limit: ELIGIBLE_PAGE_SIZE }, { params: { lang: 'en' } });
    expect(result).toEqual({ data: [row(1), row(2)], total: 45, hasMore: true, page: 2 });
  });

  it('page size is 20', () => {
    expect(ELIGIBLE_PAGE_SIZE).toBe(20);
  });

  it('defaults to page 1', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [row(1)], total: 1, hasMore: false } });
    await schemeService.getEligibleSchemesPage(profile);
    expect(vi.mocked(axios.post).mock.calls[0][1]).toMatchObject({ page: 1 });
  });

  it('an older server answer without total or hasMore means "this is all of it"', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [row(1), row(2), row(3)] } });
    expect(await schemeService.getEligibleSchemesPage(profile)).toEqual({ data: [row(1), row(2), row(3)], total: 3, hasMore: false, page: 1 });
  });

  it('only a literal true counts as hasMore', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [row(1)], total: 9, hasMore: 'yes' } });
    expect((await schemeService.getEligibleSchemesPage(profile)).hasMore).toBe(false);
  });

  it('asks in the language that is set', async () => {
    localStorage.setItem('schemesetu_lang', 'hi');
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [], total: 0, hasMore: false } });
    await schemeService.getEligibleSchemesPage(profile);
    expect(vi.mocked(axios.post).mock.calls[0][2]).toEqual({ params: { lang: 'hi' } });
  });

  it('when the server cannot be reached, falls back to the local list and pages it the same way', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(axios.post).mockRejectedValue(new Error('offline'));
    const first = await schemeService.getEligibleSchemesPage(profile, 1, 2);
    expect(first.data.length).toBeLessThanOrEqual(2);
    expect(first.page).toBe(1);
    if (first.total > 2) {
      expect(first.hasMore).toBe(true);
      const second = await schemeService.getEligibleSchemesPage(profile, 2, 2);
      const ids = new Set(first.data.map((s) => s.id));
      for (const s of second.data) expect(ids.has(s.id), s.id).toBe(false);
    }
    const beyond = await schemeService.getEligibleSchemesPage(profile, 999, 2);
    expect(beyond.data).toEqual([]);
    expect(beyond.hasMore).toBe(false);
  });
});

describe('the offline fallback: exact page boundaries', () => {
  it('a page that ends exactly on the total has no more, one short of it has', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(axios.post).mockRejectedValue(new Error('offline'));
    const everything = await schemeService.getEligibleSchemesPage(profile, 1, 1000);
    const total = everything.total;
    expect(total).toBeGreaterThan(1);
    expect(everything.data).toHaveLength(total);
    expect(everything.hasMore).toBe(false);
    expect((await schemeService.getEligibleSchemesPage(profile, 1, total)).hasMore).toBe(false);
    expect((await schemeService.getEligibleSchemesPage(profile, 1, total - 1)).hasMore).toBe(true);
  });
});

describe('schemeService.getEligibleSchemes (what the dashboard uses)', () => {
  it('is the first page as a plain list', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { data: [row(1), row(2)], total: 30, hasMore: true } });
    expect(await schemeService.getEligibleSchemes(profile)).toEqual([row(1), row(2)]);
    expect(vi.mocked(axios.post).mock.calls[0][1]).toMatchObject({ page: 1 });
  });
});
