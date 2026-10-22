import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeScheme } from '../test/factories';

const mocks = vi.hoisted(() => ({ getSchemeById: vi.fn(), bookmarks: ['a'] as string[] }));

vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict.en[key] || key, language: 'en' }) };
});
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: mocks.bookmarks, toggleBookmark: () => {}, loading: false }) }));
vi.mock('../services/schemeService', () => ({ schemeService: { getSchemeById: mocks.getSchemeById } }));
vi.mock('../components/SchemeCard', () => ({ SchemeCard: ({ scheme }: { scheme: { name: string } }) => <div>{scheme.name}</div> }));

import { Bookmarks } from './Bookmarks';
import { TRANSLATIONS } from '../constants/translations';

const en = (TRANSLATIONS as unknown as Record<string, Record<string, string>>).en;
const view = async () => {
  render(<MemoryRouter><Bookmarks /></MemoryRouter>);
  await act(async () => {});
};

beforeEach(() => {
  mocks.bookmarks = ['a'];
  mocks.getSchemeById.mockReset().mockResolvedValue(makeScheme({ id: 'a', name: 'Saved Scheme' }));
});

describe('Bookmarks when the saved schemes cannot be loaded', () => {
  it('says so with Try again, and does not claim there are no saved schemes', async () => {
    mocks.getSchemeById.mockRejectedValueOnce(new Error('Network Error'));
    await view();
    expect(screen.getByRole('alert').textContent).toContain("Couldn't reach SchemeSetu");
    expect(screen.queryByText(en.noSavedSchemesTitle)).toBeNull();

    await act(async () => { screen.getByRole('button', { name: 'Try again' }).click(); });
    await act(async () => {});
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Saved Scheme')).toBeTruthy();
  });

  it('shows "no saved schemes" only when there really are none', async () => {
    mocks.bookmarks = [];
    await view();
    expect(screen.getByText(en.noSavedSchemesTitle)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
