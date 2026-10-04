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
