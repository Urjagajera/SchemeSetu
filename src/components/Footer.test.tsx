import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ language: 'en' as 'en' | 'hi' | 'gu' }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});

import { Footer } from './Footer';

beforeEach(() => { mocks.language = 'en'; });
const renderFooter = () => render(<MemoryRouter initialEntries={['/search']}><Footer /></MemoryRouter>);

describe('Footer tells the truth', () => {
  it('has no contact details, because we have none to give', () => {
    const { container } = renderFooter();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/@|Toll-Free|1800|New Delhi|Contact/i);
    expect(container.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull();
  });

  it('links to the Privacy Policy and Terms pages, and to Help', () => {
    const { container } = renderFooter();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/privacy');
    expect(hrefs).toContain('/terms');
    expect(hrefs).toContain('/help');
  });

  it.each([
    ['en', 'independent information service, not a government website'],
    ['hi', 'स्वतंत्र सूचना सेवा है, सरकारी वेबसाइट नहीं'],
    ['gu', 'સ્વતંત્ર માહિતી સેવા છે, સરકારી વેબસાઇટ નથી'],
  ] as const)('%s: says it is an independent service, not a government site', (lang, phrase) => {
    mocks.language = lang;
    renderFooter();
    expect(document.body.textContent).toContain(phrase);
    expect(document.body.textContent).not.toMatch(/mock|Government of India|भारत सरकार/);
  });

  it('shows the copyright line without any government attribution', () => {
    renderFooter();
    expect(screen.getByText('© 2026 SchemeSetu. All rights reserved.')).toBeTruthy();
  });
});
