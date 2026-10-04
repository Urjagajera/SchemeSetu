import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Scheme } from '../types';
import { makeScheme } from '../test/factories';

const mocks = vi.hoisted(() => ({
  language: 'en' as 'en' | 'hi' | 'gu',
  theme: 'light' as 'light' | 'dark',
  compare: { isInCompare: (_id: string): boolean => false, addToCompare: (_s: Scheme): { success: boolean; message: string } => ({ success: false, message: 'shCmpMax' }), removeFromCompare: (_id: string) => {} },
}));

// The real dictionaries, so these tests read the wording people actually see.
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mocks.theme, toggleTheme: () => {} }), ThemeProvider: ({ children }: { children: unknown }) => children }));
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => mocks.compare }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));
vi.mock('./Navbar', () => ({ Navbar: () => null }));
vi.mock('./AIChatBubble', () => ({ AIChatBubble: () => null }));
vi.mock('./DataSourceBanner', () => ({ DataSourceBanner: () => null }));

import { Pagination } from './Pagination';
import { NotFound } from '../pages/NotFound';
import { ProfileCompletion } from './ProfileCompletion';
import { BookmarkButton } from './BookmarkButton';
import { CompareButton } from './CompareButton';
import { ThemeToggle } from './ThemeProvider';
import { EligibilityCard } from './EligibilityCard';
import { FilterSidebar, type FilterState } from './FilterSidebar';
import { MainLayout } from '../layouts/MainLayout';
import { Footer } from './Footer';
import { TRANSLATIONS } from '../constants/translations';

const dict = TRANSLATIONS as unknown as Record<'en' | 'hi' | 'gu', Record<string, string>>;
const LANGS = ['en', 'hi', 'gu'] as const;
const text = () => document.body.textContent ?? '';
const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => { mocks.language = 'en'; mocks.theme = 'light'; });
afterEach(() => { vi.restoreAllMocks(); });

describe.each(LANGS)('shared parts in %s', (lang) => {
  beforeEach(() => { mocks.language = lang; });
  const d = dict[lang];

  it('pagination', () => {
    const { container } = render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />);
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe(d.shPagination);
    const titles = [...container.querySelectorAll('button')].map((b) => b.getAttribute('title'));
    expect(titles).toContain(d.shPrevPage);
    expect(titles).toContain(d.shNextPage);
  });

  it('the 404 page', () => {
    wrap(<NotFound />);
    expect(text()).toContain(d.shNotFoundTitle);
    expect(text()).toContain(d.shNotFoundBody);
    expect(text()).toContain(d.shGoHome);
  });

  it('the profile completion bar', () => {
    wrap(<ProfileCompletion percentage={40} missingFields={['Age', 'Gender']} />);
    expect(text()).toContain(`40% ${d.shComplete}`);
    expect(text()).toContain(d.shMissing);
  });

  it('the bookmark and compare button hints', () => {
    const { container, rerender } = wrap(<BookmarkButton schemeId="s1" isBookmarked={false} onToggle={() => {}} />);
    expect(container.querySelector('button')?.getAttribute('title')).toBe(d.shBmSave);
    rerender(<MemoryRouter><BookmarkButton schemeId="s1" isBookmarked onToggle={() => {}} /></MemoryRouter>);
    expect(container.querySelector('button')?.getAttribute('title')).toBe(d.shBmRemove);
    rerender(<MemoryRouter><CompareButton scheme={makeScheme()} /></MemoryRouter>);
    expect(container.querySelector('button')?.getAttribute('title')).toBe(d.shCmpAdd);
    mocks.compare.isInCompare = () => true;
    rerender(<MemoryRouter><CompareButton scheme={makeScheme()} /></MemoryRouter>);
    expect(container.querySelector('button')?.getAttribute('title')).toBe(d.shCmpRemove);
    mocks.compare.isInCompare = () => false;
  });

  it('the compare alert is said in the language', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    for (const key of ['shCmpAlready', 'shCmpMax']) {
      mocks.compare.addToCompare = () => ({ success: false, message: key });
      const { container, unmount } = wrap(<CompareButton scheme={makeScheme()} />);
      (container.querySelector('button') as HTMLButtonElement).click();
      expect(alert).toHaveBeenLastCalledWith(d[key]);
      unmount();
    }
  });

  it('the theme toggle hints', () => {
    const { container, rerender } = render(<ThemeToggle />);
    expect(container.querySelector('button')?.getAttribute('title')).toBe(d.shThemeDark);
    mocks.theme = 'dark';
    rerender(<ThemeToggle />);
    expect(container.querySelector('button')?.getAttribute('title')).toBe(d.shThemeLight);
  });

  it('the eligibility card sentences', () => {
    const base = { schemeId: 's', schemeTitle: 'T', overallMatch: 100, isEligible: true, reasons: [], suggestions: [] };
    wrap(<EligibilityCard report={{ ...base, passedCriteria: [], failedCriteria: [] }} applyUrl="" />);
    expect(text()).toContain(d.shEcAnalysis);
    expect(text()).toContain(`${d.shEcVerified} (0)`);
    expect(text()).toContain(d.shEcNone);
    expect(text()).toContain(d.shEcAllMet);
  });

  it('the filter sidebar group names and the General category', () => {
    const filters: FilterState = { category: '', state: '', occupation: '', gender: '', socialCategory: '', income: null, age: '', level: '', sidebarQuery: '', ministry: '' };
    wrap(<FilterSidebar filters={filters} categories={[]} ministries={[]} states={[]} occupations={[]} onFilterChange={() => {}} onClear={() => {}} />);
    expect(text()).toContain(d.shFilterScope);
    expect(text()).toContain(d.shFilterDemo);
    expect([...document.querySelectorAll('option')].map((o) => o.textContent)).toContain(d.shCatGeneral);
  });

  it('the bottom tab bar', () => {
    wrap(<MainLayout />);
    for (const k of ['shTabHome', 'shTabSearch', 'shTabAssistant', 'shTabAccount']) expect(text()).toContain(d[k]);
  });

  it('the footer', () => {
    wrap(<Footer />);
    for (const k of ['shTagline', 'shExplore', 'shAllSchemes', 'shAiLink', 'shEligLink', 'shSupport']) expect(text()).toContain(d[k]);
  });
});

describe('Hindi and Gujarati show none of the old hardcoded English', () => {
  it.each(['hi', 'gu'] as const)('%s', (lang) => {
    mocks.language = lang;
    wrap(<><Footer /><NotFound /><ProfileCompletion percentage={10} missingFields={[]} /><MainLayout /></>);
    for (const english of ['Explore', 'All Government Schemes', 'Support & Legal', 'Go Home', 'Page Not Found', '% Complete', 'Missing:', 'Account', 'Search']) {
      expect(text(), english).not.toContain(english);
    }
  });
});
