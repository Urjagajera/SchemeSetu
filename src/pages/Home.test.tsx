import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
