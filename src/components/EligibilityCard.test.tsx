import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../contexts/LanguageContext';
import { EligibilityCard } from './EligibilityCard';
import type { EligibilityReport } from '../services/eligibilityService';
import { hintText, EligibilityHint } from '../utils/eligibilityHints';
import { TRANSLATIONS } from '../constants/translations';

const base: EligibilityReport = {
  schemeId: 's1', schemeTitle: 'Test Scheme', overallMatch: 50, isEligible: false,
  passedCriteria: ['Age ≥ 18'], failedCriteria: ['Annual income must not exceed ₹200000'],
  unverifiedCriteria: ['Gender'], notes: ['This scheme is meant for farmers; your profile says student'],
  reasons: [], suggestions: [],
};

const renderCard = (report: EligibilityReport) =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <EligibilityCard report={report} applyUrl="https://example.org" />
      </LanguageProvider>
    </MemoryRouter>,
  );

const tIn = (lang: 'en' | 'hi' | 'gu') => (key: keyof typeof TRANSLATIONS['en']) => TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? String(key);

describe('hintText', () => {
  const t = tIn('en');
  const cases: Array<[EligibilityHint, string]> = [
    [{ kind: 'add', field: 'state' }, 'Add your state to your profile to check this rule.'],
    [{ kind: 'incomeMax', limit: 200000, yours: 250000 }, 'This scheme is for an annual income of up to ₹2,00,000; your profile says ₹2,50,000. If your income has changed, update your profile.'],
    [{ kind: 'ageMin', limit: 18, yours: 16 }, 'This scheme starts at age 18; your profile says 16.'],
    [{ kind: 'only', field: 'category', values: ['sc', 'st'] }, 'This scheme is only for the SC or ST category.'],
    [{ kind: 'only', field: 'state', values: ['Kerala', 'Tamil Nadu'] }, 'This scheme is only for residents of Kerala or Tamil Nadu.'],
    [{ kind: 'only', field: 'land', values: ['no'] }, 'This scheme is only for people who own no cultivable land.'],
    [{ kind: 'occupation', values: ['farmer'] }, 'This scheme is meant for farmers. If you are also one of these, it may still apply to you.'],
  ];
  it.each(cases)('words %j', (hint, text) => expect(hintText(hint, t)).toBe(text));

  it('every hint is worded in Hindi and Gujarati, with no placeholder left over', () => {
    for (const lang of ['hi', 'gu'] as const) {
      for (const [hint] of cases) {
        const line = hintText(hint, tIn(lang))!;
        expect(line).not.toMatch(/[{}]/);
        expect(line).not.toBe(hintText(hint, t));
      }
    }
  });

  it('shows an unknown value as it is and ignores a hint kind it does not know', () => {
    expect(hintText({ kind: 'only', field: 'gender', values: ['nonbinary'] }, t)).toBe('This scheme is only for nonbinary applicants.');
    expect(hintText({ kind: 'later' } as unknown as EligibilityHint, t)).toBeNull();
  });
});

describe('EligibilityCard: What would change my eligibility', () => {
  beforeEach(() => localStorage.clear());

  it('lists the hints with a profile link, instead of the older could-not-check and worth-checking boxes', () => {
    renderCard({ ...base, hints: [{ kind: 'incomeMax', limit: 200000, yours: 250000 }, { kind: 'add', field: 'gender' }] });
    const box = screen.getByRole('region', { name: 'What would change my eligibility' });
    expect(box.textContent).toContain('₹2,00,000');
    expect(box.textContent).toContain('Add your gender to your profile');
    expect(box.querySelector('a[href="/profile"]')).not.toBeNull();
    expect(screen.queryByText(/meant for farmers; your profile says student/)).toBeNull();
  });

  it('shows no hints box when the scheme has nothing to change', () => {
    renderCard({ ...base, failedCriteria: [], unverifiedCriteria: [], notes: [], hints: [] });
    expect(screen.queryByRole('region', { name: 'What would change my eligibility' })).toBeNull();
  });

  it('a report without hints (client-side fallback) keeps the older boxes', () => {
    renderCard(base);
    expect(screen.queryByRole('region', { name: 'What would change my eligibility' })).toBeNull();
    expect(screen.getByText(/meant for farmers; your profile says student/)).toBeTruthy();
  });
});
