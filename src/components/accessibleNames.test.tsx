import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeScheme } from '../test/factories';

// The real dictionaries, so the names checked are the ones screen readers will read, in each language.
const mocks = vi.hoisted(() => ({ language: 'en' as 'en' | 'hi' | 'gu', setLanguage: vi.fn(), inCompare: false, theme: 'light' }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language, setLanguage: mocks.setLanguage }) };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Asha Patel' }, isAuthenticated: true, logout: () => {} }) }));
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => ({ isInCompare: () => mocks.inCompare, addToCompare: () => ({ success: true }), removeFromCompare: () => {} }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mocks.theme, toggleTheme: () => {} }) }));
// MainLayout's neighbours are not what is under test there.
vi.mock('./Footer', () => ({ Footer: () => null }));
vi.mock('./AIChatBubble', () => ({ AIChatBubble: () => null }));
vi.mock('./DataSourceBanner', () => ({ DataSourceBanner: () => null }));

import { TRANSLATIONS } from '../constants/translations';
import { BookmarkButton } from './BookmarkButton';
import { CompareButton } from './CompareButton';
import { ThemeToggle } from './ThemeProvider';
import { Pagination } from './Pagination';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

const dict = TRANSLATIONS as unknown as Record<'en' | 'hi' | 'gu', Record<string, string>>;
const inRouter = (ui: React.ReactElement, url = '/') => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

beforeEach(() => {
  mocks.language = 'en';
  mocks.inCompare = false;
  mocks.theme = 'light';
  mocks.setLanguage.mockReset();
});

describe.each(['en', 'hi', 'gu'] as const)('icon-only buttons have a name screen readers read (%s)', (lang) => {
  beforeEach(() => { mocks.language = lang; });
  const d = () => dict[lang];

  it('Save and Compare say what pressing them will do', () => {
    inRouter(<><BookmarkButton schemeId="s1" isBookmarked={false} onToggle={() => {}} /><CompareButton scheme={makeScheme()} /></>);
    expect(screen.getByRole('button', { name: d().shBmSave })).not.toBeNull();
    expect(screen.getByRole('button', { name: d().shCmpAdd })).not.toBeNull();
  });

  it('once saved and compared, they say they will remove', () => {
    mocks.inCompare = true;
    inRouter(<><BookmarkButton schemeId="s1" isBookmarked onToggle={() => {}} /><CompareButton scheme={makeScheme()} /></>);
    expect(screen.getByRole('button', { name: d().shBmRemove })).not.toBeNull();
    expect(screen.getByRole('button', { name: d().shCmpRemove })).not.toBeNull();
  });

  it('the theme button and the page arrows', () => {
    inRouter(<><ThemeToggle /><Pagination currentPage={2} totalPages={5} onPageChange={() => {}} /></>);
    expect(screen.getByRole('button', { name: d().shThemeDark })).not.toBeNull();
    expect(screen.getByRole('button', { name: d().shPrevPage })).not.toBeNull();
    expect(screen.getByRole('button', { name: d().shNextPage })).not.toBeNull();
  });

  it('Sign out, and the phone menu button, which also says whether the menu is open', () => {
    inRouter(<Navbar />);
    expect(screen.getAllByRole('button', { name: d().logout }).length).toBeGreaterThan(0);
    const menu = screen.getByRole('button', { name: d().openMenu });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(menu.getAttribute('aria-label')).toBe(d().closeMenu);
    expect(document.getElementById(menu.getAttribute('aria-controls')!)).not.toBeNull();
  });

  it('the sidebar collapse button says which way it goes', () => {
    inRouter(<Sidebar activePage="dashboard" />, '/dashboard');
    const toggle = screen.getByRole('button', { name: d().collapseSidebar });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: d().expandSidebar }).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('the language switcher', () => {
  it('is a named group whose buttons say which language is on, each read in its own language', () => {
    mocks.language = 'hi';
    inRouter(<LanguageSwitcher />);
    const group = screen.getByRole('group', { name: dict.hi.chooseLanguage });
    const [en, hi, gu] = within(group).getAllByRole('button');
    expect([en.getAttribute('lang'), hi.getAttribute('lang'), gu.getAttribute('lang')]).toEqual(['en', 'hi', 'gu']);
    expect([en, hi, gu].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    fireEvent.click(gu);
    expect(mocks.setLanguage).toHaveBeenCalledWith('gu');
  });
});

describe('Skip to main content', () => {
  it('is the first link on the page and points at the one main area, which can take focus', () => {
    inRouter(<MainLayout />);
    const skip = screen.getAllByRole('link')[0];
    expect(skip.textContent).toBe(dict.en.skipToContent);
    expect(skip.getAttribute('href')).toBe('#main-content');
    const main = screen.getByRole('main');
    expect(main.id).toBe('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(document.querySelectorAll('main')).toHaveLength(1);
  });

  it('dashboard pages, which sit inside it, still have only that one main area', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<p>dashboard page</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('dashboard page')).not.toBeNull();
    expect(document.querySelectorAll('main')).toHaveLength(1);
  });
});

describe('one main area per page', () => {
  it('no page or layout other than MainLayout has its own <main> (they all sit inside it)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const root = path.resolve(__dirname, '..');
    const files = (fs.readdirSync(root, { recursive: true }) as string[])
      .filter((f) => f.endsWith('.tsx') && !f.includes('.test.') && !f.includes('_archive') && !f.includes('landing'));
    const withMain = files.filter((f) => /<main\b/.test(fs.readFileSync(path.join(root, f), 'utf8')));
    expect(withMain.map((f) => f.split(path.sep).join('/'))).toEqual(['layouts/MainLayout.tsx']);
  });
});
