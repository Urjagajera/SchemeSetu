import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeScheme } from '../test/factories';
import type { Scheme } from '../types';

const mocks = vi.hoisted(() => ({
  language: 'en' as 'en' | 'hi' | 'gu',
  authed: false,
  getPage: vi.fn(),
  getReport: vi.fn(),
}));

const STABLE_PROFILE = vi.hoisted(() => ({ age: '30', state: 'Gujarat' }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: mocks.authed, profile: mocks.authed ? STABLE_PROFILE : {} }) }));
vi.mock('../components/Sidebar', () => ({ default: () => null }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], toggleBookmark: () => {} }) }));
vi.mock('../hooks/useStates', () => ({ useStates: () => ['Gujarat'] }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));
vi.mock('../services/schemeService', () => ({ schemeService: { getEligibleSchemesPage: mocks.getPage } }));
vi.mock('../services/eligibilityService', () => ({ eligibilityService: { getEligibilityReport: mocks.getReport } }));

import { Eligibility } from './Eligibility';

const scheme = (n: number): Scheme => makeScheme({ id: `s${n}`, name: `Scheme ${n}` });
const report = (_profile: unknown, s: Scheme) => Promise.resolve({ schemeId: s.id, schemeTitle: s.name, overallMatch: 100, isEligible: true, passedCriteria: [], failedCriteria: [], reasons: [], suggestions: [] });
const page = (nums: number[], total: number, hasMore: boolean, p = 1) => ({ data: nums.map(scheme), total, hasMore, page: p });

const text = () => document.body.textContent ?? '';
const cards = () => [...document.body.textContent!.matchAll(/Scheme \d+/g)].map((m) => m[0]);

beforeEach(() => {
  mocks.language = 'en';
  mocks.authed = false;
  mocks.getPage.mockReset();
  mocks.getReport.mockReset().mockImplementation(report);
});

// Fill the three guest steps and see the results.
async function reachResults() {
  const user = userEvent.setup();
  render(<MemoryRouter><Eligibility /></MemoryRouter>);
  await user.type(document.querySelector('input[type="number"]') as HTMLInputElement, '30');
  await user.click(screen.getByRole('button', { name: dictWord('next') }));
  await user.type(document.querySelector('input[type="number"]') as HTMLInputElement, '100000');
  await user.click(screen.getByRole('button', { name: dictWord('next') }));
  await user.click(screen.getByRole('button', { name: dictWord('find') }));
  await act(async () => {});
  return user;
}
const dictWord = (k: 'next' | 'find') => (mocks.language === 'hi' ? { next: 'अगला', find: 'योजनाएँ खोजें' }[k] : { next: 'Next', find: 'Find Schemes' }[k]);
const showMore = () => screen.queryByTestId('show-more') as HTMLButtonElement | null;

describe('Eligibility results: Show more', () => {
  it('shows the first page, how many there are in all, and a Show more button', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1, 2, 3], 5, true));
    await reachResults();
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3']);
    expect(showMore()?.textContent).toBe('Show more');
  });

  it('adds the next page under the first, asks for page 2 about the same profile, and drops the button when nothing is left', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1, 2, 3], 5, true)).mockResolvedValueOnce(page([4, 5], 5, false, 2));
    const user = await reachResults();
    await user.click(showMore()!);
    await act(async () => {});
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4', 'Scheme 5']);
    expect(mocks.getPage).toHaveBeenCalledTimes(2);
    expect(mocks.getPage.mock.calls[1][1]).toBe(2);
    expect(mocks.getPage.mock.calls[1][0]).toBe(mocks.getPage.mock.calls[0][0]); // the same profile
    expect(showMore()).toBeNull();
  });

  it('keeps asking for the next page number each time (2, then 3)', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1], 3, true)).mockResolvedValueOnce(page([2], 3, true, 2)).mockResolvedValueOnce(page([3], 3, false, 3));
    const user = await reachResults();
    await user.click(showMore()!);
    await act(async () => {});
    await user.click(showMore()!);
    await act(async () => {});
    expect(mocks.getPage.mock.calls.map((c) => c[1])).toEqual([1, 2, 3]);
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3']);
  });

  it('never shows a scheme twice, even if the server repeats one', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1, 2, 3], 5, true)).mockResolvedValueOnce(page([3, 4], 5, false, 2));
    const user = await reachResults();
    await user.click(showMore()!);
    await act(async () => {});
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4']);
    expect(mocks.getReport.mock.calls.map((c) => c[1].id)).toEqual(['s1', 's2', 's3', 's4']); // no report built twice for scheme 3
  });

  it('has no Show more button when everything fits on the first page', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1, 2], 2, false));
    await reachResults();
    expect(showMore()).toBeNull();
  });

  it('is disabled while the next page loads, so a double click asks once', async () => {
    let release: (v: ReturnType<typeof page>) => void = () => {};
    mocks.getPage.mockResolvedValueOnce(page([1], 2, true)).mockReturnValueOnce(new Promise((r) => { release = r; }));
    const user = await reachResults();
    await user.click(showMore()!);
    expect(showMore()!.disabled).toBe(true);
    expect(showMore()!.textContent).toBe('Loading…');
    await user.click(showMore()!);
    expect(mocks.getPage).toHaveBeenCalledTimes(2);
    await act(async () => { release(page([2], 2, false, 2)); });
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2']);
  });

  it('if the next page fails, the results already shown stay and the button is still there to try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getPage.mockResolvedValueOnce(page([1, 2], 4, true)).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page([3, 4], 4, false, 2));
    const user = await reachResults();
    await user.click(showMore()!);
    await act(async () => {});
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2']);
    expect(showMore()?.disabled).toBe(false);
    await user.click(showMore()!);
    await act(async () => {});
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4']);
  });

  it('the button is in the language', async () => {
    mocks.language = 'hi';
    mocks.getPage.mockResolvedValueOnce(page([1], 2, true));
    await reachResults();
    expect(showMore()?.textContent).toBe('और दिखाएँ');
  });
});

describe('Eligibility results when signed in: Show more', () => {
  beforeEach(() => { mocks.authed = true; });
  const header = () => text().match(/Available Matches \(([^)]*)\)/)?.[1];

  it('works out the saved profile at once, shows "3 / 5" and a Show more button', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1, 2, 3], 5, true));
    render(<MemoryRouter><Eligibility /></MemoryRouter>);
    await act(async () => {});
    expect(mocks.getPage.mock.calls[0][0]).toBe(STABLE_PROFILE);
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3']);
    expect(header()).toBe('3 / 5');
    expect(showMore()).not.toBeNull();
  });

  it('the count becomes "5" with the next page and the button goes', async () => {
    mocks.getPage.mockResolvedValueOnce(page([1, 2, 3], 5, true)).mockResolvedValueOnce(page([4, 5], 5, false, 2));
    const user = userEvent.setup();
    render(<MemoryRouter><Eligibility /></MemoryRouter>);
    await act(async () => {});
    await user.click(showMore()!);
    await act(async () => {});
    expect(cards()).toEqual(['Scheme 1', 'Scheme 2', 'Scheme 3', 'Scheme 4', 'Scheme 5']);
    expect(header()).toBe('5');
    expect(showMore()).toBeNull();
    expect(mocks.getPage.mock.calls[1][0]).toBe(STABLE_PROFILE);
  });
});
