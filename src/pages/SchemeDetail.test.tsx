import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Scheme, SchemeTranslation } from '../types';
import { makeScheme, makeTranslation } from '../test/factories';

// The page's own logic is what is under test, so everything it reads from the outside is replaced.
const mocks = vi.hoisted(() => ({
  language: 'hi',
  getSchemeById: vi.fn(),
  getSchemes: vi.fn(),
}));

vi.mock('../services/schemeService', () => ({ schemeService: { getSchemeById: mocks.getSchemeById, getSchemes: mocks.getSchemes } }));
vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key, language: mocks.language }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: {}, isAuthenticated: true }) }));
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => ({ isInCompare: () => false, addToCompare: () => ({ success: true }), removeFromCompare: () => {} }) }));
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], toggleBookmark: () => {} }) }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));
vi.mock('../services/titleTranslations', () => ({ useCardText: () => ({ titles: {}, summaries: {} }) }));

import { SchemeDetail } from './SchemeDetail';

const TRANSLATING = 'translatingNotice';
const PARTIAL = 'translationPartialNote';

function schemeWith(translation?: SchemeTranslation, overrides: Partial<Scheme> = {}): Scheme {
  return makeScheme({ id: 'abc', name: 'English Title', translation, ...overrides });
}

async function renderPage() {
  render(
    <MemoryRouter initialEntries={['/schemes/abc']}>
      <Routes>
        <Route path="/schemes/:id" element={<SchemeDetail />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const shown = (text: string) => screen.queryByText(text) !== null;

beforeEach(() => {
  vi.useFakeTimers();
  mocks.language = 'hi';
  mocks.getSchemeById.mockReset();
  mocks.getSchemes.mockReset();
  mocks.getSchemes.mockResolvedValue({ data: [], total: 0 });
});

describe('SchemeDetail translation notices', () => {
  it('shows no notice once the page is fully translated, and shows the translated title', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'ready', fields: { title: 'हिंदी शीर्षक' } })));
    await renderPage();
    expect(shown(TRANSLATING)).toBe(false);
    expect(shown(PARTIAL)).toBe(false);
    expect(screen.getAllByText('हिंदी शीर्षक').length).toBeGreaterThan(0);
  });

  it('shows no notice in English, whatever the server said', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'pending' })));
    await renderPage();
    expect(shown(TRANSLATING)).toBe(false);
    expect(shown(PARTIAL)).toBe(false);
  });

  it('says "translating" while the server is still working, and keeps English text meanwhile', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'pending' })));
    await renderPage();
    expect(shown(TRANSLATING)).toBe(true);
    expect(shown(PARTIAL)).toBe(false);
    expect(screen.getAllByText('English Title').length).toBeGreaterThan(0);
  });

  it('asks again every 3 seconds and swaps the notice for the translated page when it finishes', async () => {
    mocks.getSchemeById
      .mockResolvedValueOnce(schemeWith(makeTranslation({ status: 'pending' })))
      .mockResolvedValue(schemeWith(makeTranslation({ status: 'ready', fields: { title: 'हिंदी शीर्षक' } })));
    await renderPage();
    expect(mocks.getSchemeById).toHaveBeenCalledTimes(1);
    await advance(3000);
    expect(mocks.getSchemeById).toHaveBeenCalledTimes(2);
    expect(shown(TRANSLATING)).toBe(false);
    expect(screen.getAllByText('हिंदी शीर्षक').length).toBeGreaterThan(0);
    await advance(30_000);
    expect(mocks.getSchemeById).toHaveBeenCalledTimes(2); // stopped polling
  });

  it('says some sections stayed in English when part of the translation failed', async () => {
    mocks.getSchemeById.mockResolvedValue(
      schemeWith(makeTranslation({ status: 'partial', fields: { title: 'हिंदी शीर्षक' }, failedFields: ['description'] })),
    );
    await renderPage();
    expect(shown(PARTIAL)).toBe(true);
    expect(shown(TRANSLATING)).toBe(false);
    expect(screen.getAllByText('हिंदी शीर्षक').length).toBeGreaterThan(0); // what did translate is still shown
  });

  it('stops saying "translating" if the translation never finishes, and says what happened instead', async () => {
    // the bug this guards against: after the page gave up asking, "translating…" stayed on screen for good
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'pending' })));
    await renderPage();
    expect(shown(TRANSLATING)).toBe(true);

    await advance(170_000); // still inside the ~3 minutes the page keeps asking for
    expect(shown(TRANSLATING)).toBe(true);
    expect(shown(PARTIAL)).toBe(false);

    await advance(20_000); // past it
    expect(shown(TRANSLATING)).toBe(false);
    expect(shown(PARTIAL)).toBe(true);

    const calls = mocks.getSchemeById.mock.calls.length;
    await advance(60_000);
    expect(mocks.getSchemeById.mock.calls.length).toBe(calls); // and it really stopped asking
  });

  it('shows no notice when translation is switched off on the server (English is simply shown)', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'unavailable' })));
    await renderPage();
    expect(shown(TRANSLATING)).toBe(false);
    expect(shown(PARTIAL)).toBe(false);
  });
});

describe('SchemeDetail description heading', () => {
  // The source descriptions open with a one-word heading line, "Details", which only gets in the way.
  const DETAILS_ONLY = /^(Details|विवरण)$/;

  it('does not open the English description with the "Details" heading', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(schemeWith(undefined, { description: 'Details\nFinancial help for students.' }));
    await renderPage();
    expect(screen.queryByText('Financial help for students.')).not.toBeNull();
    expect(screen.queryByText(DETAILS_ONLY)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Details\s*Financial help/);
  });

  it('does not open the translated description with its translated heading either', async () => {
    mocks.getSchemeById.mockResolvedValue(
      schemeWith(makeTranslation({ status: 'ready', fields: { description: 'विवरण\nछात्रों के लिए वित्तीय सहायता।' } })),
    );
    await renderPage();
    expect(screen.queryByText('छात्रों के लिए वित्तीय सहायता।')).not.toBeNull();
    expect(screen.queryByText(DETAILS_ONLY)).toBeNull();
  });

  it('does not start the cards in the related-schemes list with it', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(schemeWith());
    mocks.getSchemes.mockResolvedValue({
      data: [makeScheme({ id: 'rel-1', name: 'Related Scheme', shortDesc: 'Details\nRelated body text that follows the heading.', description: 'Details\nRelated body text that follows the heading.' })],
      total: 1,
    });
    await renderPage();
    expect(screen.queryByText('Related body text that follows the heading.')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/Details\s*Related body text/);
  });
});

describe('SchemeDetail when the scheme does not exist', () => {
  it('shows the not-found message instead of an empty page', async () => {
    mocks.getSchemeById.mockResolvedValue(null);
    await renderPage();
    expect(shown('schemeNotFound')).toBe(true);
  });
});
