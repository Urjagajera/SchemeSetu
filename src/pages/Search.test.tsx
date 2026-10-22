import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { makeScheme } from '../test/factories';
import type { FilterOptions } from '../services/schemeService';

const mocks = vi.hoisted(() => ({
  getSchemes: vi.fn(),
  getFilterOptions: vi.fn(),
  location: '',
  authed: false,
  profile: {} as Record<string, string>,
}));

// A stable profile object per test, like the real context, so the page doesn't see a "new" profile every render.
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: mocks.authed, profile: mocks.profile }) }));
vi.mock('../components/Sidebar', () => ({ default: () => null }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict.en[key] || '', language: 'en' }) };
});
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], toggleBookmark: () => {} }) }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));
vi.mock('../components/SchemeCard', () => ({ SchemeCard: ({ scheme }: { scheme: { name: string } }) => <div>{scheme.name}</div> }));
vi.mock('../services/schemeService', () => ({ schemeService: { getSchemes: mocks.getSchemes, getFilterOptions: mocks.getFilterOptions } }));

import { Search } from './Search';

const OPTIONS: FilterOptions = {
  topics: [{ id: 'education', count: 1222 }, { id: 'health', count: 179 }],
  occupations: [{ id: 'farmer', count: 694 }, { id: 'student', count: 948 }],
  levels: [{ id: 'Central', count: 696 }, { id: 'State', count: 4026 }],
  states: ['Goa', 'Gujarat'],
  ministries: [{ name: 'Ministry Of Finance', count: 18 }],
  genders: ['male', 'female', 'other'],
  socialCategories: ['general', 'sc', 'st', 'obc'],
};

const LocationSpy = () => {
  mocks.location = useLocation().search;
  return null;
};

async function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Search />
      <LocationSpy />
    </MemoryRouter>,
  );
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
}

const lastQuery = () => mocks.getSchemes.mock.calls.at(-1)?.[0];
const desktop = () => screen.getAllByRole('complementary')[0];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mocks.getSchemes.mockReset().mockResolvedValue({ data: [makeScheme({ id: 'a', name: 'Scheme A' })], total: 41 });
  mocks.getFilterOptions.mockReset().mockResolvedValue(OPTIONS);
  mocks.authed = false;
  mocks.profile = {};
});

describe('Search page filters', () => {
  it('reads every filter from the URL and sends them all to the server, which does the filtering', async () => {
    await renderAt('/search?q=loan&topic=health,education&occupation=farmer&state=Goa&age=30&income=200000&ministry=Ministry%20Of%20Finance&page=2');
    expect(lastQuery()).toEqual({
      query: 'loan', topic: 'education,health', occupation: 'farmer', state: 'Goa', age: 30, income: 200000,
      ministry: 'Ministry Of Finance', level: undefined, gender: undefined, socialCategory: undefined, page: 2, limit: 15,
    });
    // the count is the server's total, not this page's length
    expect(screen.getByText(/41 schemes found/)).toBeTruthy();
  });

  it('shows topic chips with counts; clicking one filters, keeps it in the URL and goes back to page 1', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderAt('/search?page=3');
    const chip = within(desktop()).getByRole('button', { name: /Health & medical/ });
    expect(chip.textContent).toContain('179');
    await user.click(chip);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(lastQuery()).toMatchObject({ topic: 'health', page: 1 });
    expect(mocks.location).toBe('?topic=health');
  });

  it('an old ?category= link lands on the matching topic', async () => {
    await renderAt('/search?category=Healthcare');
    expect(lastQuery()).toMatchObject({ topic: 'health' });
  });

  it('shows a removable chip per active filter above the results', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderAt('/search?occupation=farmer&gender=female');
    const remove = screen.getByRole('button', { name: 'Remove filter: Farmer' });
    await user.click(remove);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(lastQuery()).toMatchObject({ occupation: undefined, gender: 'female' });
  });

  it('Clear all clears EVERY filter, ministry included, and keeps the search text', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderAt('/search?q=loan&ministry=Ministry%20Of%20Finance&state=Goa&topic=health');
    await user.click(within(desktop()).getByRole('button', { name: /Clear All/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(mocks.location).toBe('?q=loan');
    expect(lastQuery()).toMatchObject({ query: 'loan', ministry: undefined, state: undefined, topic: undefined });
  });

  it('choosing State schemes hides the ministry list and drops a chosen ministry', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderAt('/search?ministry=Ministry%20Of%20Finance');
    await user.selectOptions(within(desktop()).getByLabelText('Government Level'), 'State');
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(within(desktop()).queryByLabelText('Ministry')).toBeNull();
    expect(lastQuery()).toMatchObject({ level: 'State', ministry: undefined });
  });

  it('waits for typing to stop before asking the server', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderAt('/search');
    const calls = mocks.getSchemes.mock.calls.length;
    vi.useFakeTimers(); // no automatic time passing: only what we advance
    await user.type(within(desktop()).getByLabelText('Age (years)'), '45');
    expect(mocks.getSchemes.mock.calls.length).toBe(calls);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(mocks.getSchemes.mock.calls.length).toBe(calls + 1);
    expect(lastQuery()).toMatchObject({ age: 45 });
  });

  it('still filters when the option lists fail to load', async () => {
    mocks.getFilterOptions.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderAt('/search?state=Goa');
    expect(lastQuery()).toMatchObject({ state: 'Goa' });
  });
});

describe('Search page: About you starts from the saved profile', () => {
  const PROFILE = { state: 'Gujarat', age: '34', gender: 'female', category: 'sc', occupation: 'farmer', income: '120000', residence: 'rural' };
  beforeEach(() => {
    mocks.authed = true;
    mocks.profile = PROFILE;
  });

  it('fills State, Age, Gender, Social category, Occupation and Income from the profile and searches with them', async () => {
    await renderAt('/search');
    expect(lastQuery()).toMatchObject({ state: 'Gujarat', age: 34, gender: 'female', socialCategory: 'sc', occupation: 'farmer', income: 120000 });
    expect((within(desktop()).getByLabelText('State') as HTMLSelectElement).value).toBe('Gujarat');
    expect(within(desktop()).getByText('Filled in from your profile')).toBeTruthy();
    expect(within(desktop()).queryByRole('button', { name: 'Use my profile' })).toBeNull();
  });

  it('keeps other filters from the link, such as a topic', async () => {
    await renderAt('/search?topic=health');
    expect(lastQuery()).toMatchObject({ topic: 'health', state: 'Gujarat', occupation: 'farmer' });
  });

  it('does not override About-you values the link already gives', async () => {
    await renderAt('/search?state=Goa');
    expect(lastQuery()).toMatchObject({ state: 'Goa', age: undefined, occupation: undefined });
  });

  it('leaves out profile answers the filter cannot use', async () => {
    mocks.profile = { state: 'Gujarat', occupation: 'other', age: 'abc' };
    await renderAt('/search');
    expect(lastQuery()).toMatchObject({ state: 'Gujarat', occupation: undefined, age: undefined });
  });

  it('Clear all stays cleared, and "Use my profile" puts the answers back', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderAt('/search');
    await user.click(within(desktop()).getByRole('button', { name: /Clear All/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(lastQuery()).toMatchObject({ state: undefined, occupation: undefined });
    await user.click(within(desktop()).getByRole('button', { name: 'Use my profile' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(lastQuery()).toMatchObject({ state: 'Gujarat', age: 34, occupation: 'farmer' });
  });

  it('a guest gets no prefill and no profile button', async () => {
    mocks.authed = false;
    await renderAt('/search');
    expect(lastQuery()).toMatchObject({ state: undefined, age: undefined });
    expect(within(desktop()).queryByRole('button', { name: 'Use my profile' })).toBeNull();
  });
});

describe('Search page when the schemes cannot be loaded', () => {
  it('says so with Try again instead of showing any schemes or a count, and Try again loads them', async () => {
    mocks.getSchemes.mockRejectedValueOnce(new Error('Network Error'));
    await renderAt('/search?q=loan');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain("Couldn't reach SchemeSetu");
    expect(screen.queryByText('Scheme A')).toBeNull();
    expect(screen.queryByText(/schemes found/)).toBeNull();

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Scheme A')).toBeTruthy();
    expect(screen.getByText(/41 schemes found/)).toBeTruthy();
    expect(lastQuery()).toMatchObject({ query: 'loan' });
  });

  it('Try again also asks for the filter options again', async () => {
    mocks.getSchemes.mockRejectedValueOnce(new Error('Network Error'));
    mocks.getFilterOptions.mockReset().mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(OPTIONS);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderAt('/search');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(mocks.getFilterOptions).toHaveBeenCalledTimes(2);
  });
});
