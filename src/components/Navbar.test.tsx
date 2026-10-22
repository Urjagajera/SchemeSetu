import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ language: 'en' as 'en' | 'hi' | 'gu' }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language, setLanguage: () => {} }) };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false, logout: () => {} }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));

import { Navbar } from './Navbar';
import { TRANSLATIONS } from '../constants/translations';

const dict = TRANSLATIONS as unknown as Record<'en' | 'hi' | 'gu', Record<string, string>>;
beforeEach(() => { mocks.language = 'en'; });

describe.each(['en', 'hi', 'gu'] as const)('Navbar in %s', (lang) => {
  it('names the Dashboard link and the language row in the language', () => {
    mocks.language = lang;
    render(<MemoryRouter initialEntries={['/login']}><Navbar /></MemoryRouter>);
    expect(document.body.textContent).toContain(dict[lang].shDashboard);
    // the language row is inside the phone menu
    const inPhoneBar = [...document.querySelectorAll('button')].filter((b) => (b.parentElement?.className ?? '').includes('md:hidden'));
    fireEvent.click(inPhoneBar[inPhoneBar.length - 1]);
    expect(screen.queryAllByText(dict[lang].shLanguage).length).toBeGreaterThan(0);
  });
});

describe('the Login button remembers the page you are on', () => {
  const loginHrefs = () => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('/login'));

  it('on a search, both Login links (desktop and phone menu) come back to that search', () => {
    render(<MemoryRouter initialEntries={['/search?q=farmer']}><Navbar /></MemoryRouter>);
    const inPhoneBar = [...document.querySelectorAll('button')].filter((b) => (b.parentElement?.className ?? '').includes('md:hidden'));
    fireEvent.click(inPhoneBar[inPhoneBar.length - 1]);
    const hrefs = loginHrefs();
    expect(hrefs.length).toBe(2);
    for (const h of hrefs) expect(h).toBe('/login?redirect=%2Fsearch%3Fq%3Dfarmer');
  });

  it('on the home page, Login is plain', () => {
    render(<MemoryRouter initialEntries={['/']}><Navbar /></MemoryRouter>);
    expect(loginHrefs()).toEqual(['/login']);
  });
});
