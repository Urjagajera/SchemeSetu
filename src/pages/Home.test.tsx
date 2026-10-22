import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  getSchemes: vi.fn(),
  getFeaturedSchemes: vi.fn(),
  states: [] as string[],
}));

vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict.en[key] || key, language: 'en' }) };
});
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], toggleBookmark: () => {} }) }));
vi.mock('../hooks/useStates', () => ({ useStates: () => mocks.states }));
vi.mock('../services/schemeService', () => ({ schemeService: { getSchemes: mocks.getSchemes, getFeaturedSchemes: mocks.getFeaturedSchemes } }));
vi.mock('../components/Hero', () => ({ Hero: () => null }));
vi.mock('../components/SchemeCard', () => ({ SchemeCard: () => null }));

import { Home } from './Home';
import { TRANSLATIONS } from '../constants/translations';

const en = (TRANSLATIONS as unknown as Record<string, Record<string, string>>).en;

beforeEach(() => {
  mocks.getSchemes.mockReset();
  mocks.getFeaturedSchemes.mockReset();
  mocks.getFeaturedSchemes.mockResolvedValue([]);
  mocks.getSchemes.mockResolvedValue({ data: [], total: 4722 });
  mocks.states = Array.from({ length: 36 }, (_, i) => `State ${i + 1}`);
});

async function renderHome() {
  render(<MemoryRouter><Home /></MemoryRouter>);
  await act(async () => {});
}
const text = () => document.body.textContent ?? '';

describe('Home stats bar', () => {
  it('shows the real scheme total and the real number of states and union territories', async () => {
    await renderHome();
    expect(text()).toContain('4,722');
    expect(text()).toContain('36');
    expect(mocks.getSchemes).toHaveBeenCalledWith({ limit: 1 });
  });

  it('follows the data: a different total and list length show up', async () => {
    mocks.getSchemes.mockResolvedValue({ data: [], total: 12345 });
    mocks.states = ['A', 'B', 'C'];
    await renderHome();
    expect(text()).toContain('12,345');
    expect(text()).not.toContain('4,722');
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows no invented beneficiary or disbursement figures, and no old hardcoded counts', async () => {
    await renderHome();
    for (const old of ['9.8 Cr', '2.4L', '4500+', 'Beneficiaries', 'Disbursed', 'Never miss an update']) expect(text()).not.toContain(old);
  });

  it('shows no scheme figure at all when the total could not be loaded (rather than a made-up one)', async () => {
    mocks.getSchemes.mockRejectedValue(new Error('offline'));
    await renderHome();
    expect(text()).not.toMatch(/4,?500|4,?722/);
    expect(text()).toContain('36');
  });

  it('has no newsletter form', async () => {
    await renderHome();
    expect(document.querySelector('input[type="email"]')).toBeNull();
  });
});

describe('Home buttons open the public pages, not the login page', () => {
  const Where = () => {
    const { pathname, search } = useLocation();
    return <output data-testid="where">{pathname + search}</output>;
  };
  const where = () => screen.getByTestId('where').textContent;
  const renderWithWhere = async () => {
    render(<MemoryRouter><Home /><Where /></MemoryRouter>);
    await act(async () => {});
  };

  it('"View all schemes" opens Search', async () => {
    await renderWithWhere();
    fireEvent.click(screen.getByRole('button', { name: /View all/i }));
    expect(where()).toBe('/search');
  });

  it('"Find schemes for me" opens the eligibility checker', async () => {
    await renderWithWhere();
    fireEvent.click(screen.getByRole('button', { name: en.findForMeBtn }));
    expect(where()).toBe('/eligibility');
  });

  it.each([
    ['scholarships', 'education'],
    ['healthInsurance', 'health'],
    ['farmerLoans', 'agriculture'],
    ['housing', 'housing'],
    ['employment', 'jobs'],
    ['womenAndChild', 'women'],
    ['seniorCitizens', 'pension'],
  ])('the %s card opens Search on the %s topic', async (key, topic) => {
    await renderWithWhere();
    fireEvent.click(screen.getAllByText(en[key])[0]);
    expect(where()).toBe('/search?topic=' + topic);
  });
});
