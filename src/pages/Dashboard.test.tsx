import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeScheme } from '../test/factories';

const mocks = vi.hoisted(() => ({ getSchemes: vi.fn(), getEligibleSchemes: vi.fn() }));

// An empty profile, so the page shows the latest schemes (not the recommendations).
const PROFILE = {};
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Asha' }, profile: PROFILE }) }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict.en[key] || key, language: 'en' }) };
});
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], toggleBookmark: () => {} }) }));
vi.mock('../services/schemeService', () => ({ schemeService: { getSchemes: mocks.getSchemes, getEligibleSchemes: mocks.getEligibleSchemes } }));
vi.mock('../components/SchemeCard', () => ({ SchemeCard: ({ scheme }: { scheme: { name: string } }) => <div>{scheme.name}</div> }));
vi.mock('../components/QuickProfileForm', () => ({ QuickProfileForm: () => null }));

import { Dashboard } from './Dashboard';

const view = async () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  await act(async () => {});
};

beforeEach(() => {
  mocks.getSchemes.mockReset().mockResolvedValue({ data: [makeScheme({ id: 'n', name: 'Newest Scheme' })], total: 1 });
  mocks.getEligibleSchemes.mockReset().mockResolvedValue([]);
});

describe('Dashboard when the latest schemes cannot be loaded', () => {
  it('says so in that card with Try again, which loads them', async () => {
    mocks.getSchemes.mockRejectedValueOnce(new Error('Network Error'));
    await view();
    expect(screen.getByRole('alert').textContent).toContain("Couldn't reach SchemeSetu");

    await act(async () => { screen.getByRole('button', { name: 'Try again' }).click(); });
    await act(async () => {});
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Newest Scheme')).toBeTruthy();
  });

  it('still asks for the recommendations when the latest schemes fail', async () => {
    mocks.getSchemes.mockRejectedValue(new Error('Network Error'));
    await view();
    expect(mocks.getEligibleSchemes).toHaveBeenCalled();
  });
});
