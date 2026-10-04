import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
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

describe('SchemeDetail machine-translation note', () => {
  const NOTE = 'machineTranslatedNote';

  it('is shown on a translated page, whether fully or partly translated', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'ready', fields: { title: 'हिंदी शीर्षक' } })));
    await renderPage();
    expect(screen.getByTestId('machine-translated-note').textContent).toBe(NOTE);
  });

  it('is shown when only part was translated', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'partial', fields: { title: 'हिंदी शीर्षक' }, failedFields: ['description'] })));
    await renderPage();
    expect(screen.queryByTestId('machine-translated-note')).not.toBeNull();
  });

  it('is not shown in English', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'ready', fields: { title: 'हिंदी शीर्षक' } })));
    await renderPage();
    expect(screen.queryByTestId('machine-translated-note')).toBeNull();
  });

  it('is not shown while the page is still English and being translated, or when translation is off', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'pending' })));
    await renderPage();
    expect(screen.queryByTestId('machine-translated-note')).toBeNull();
  });

  it('is not shown when translation is unavailable (the page is plain English)', async () => {
    mocks.getSchemeById.mockResolvedValue(schemeWith(makeTranslation({ status: 'unavailable' })));
    await renderPage();
    expect(screen.queryByTestId('machine-translated-note')).toBeNull();
  });
});

describe('SchemeDetail per-section English / translated switch', () => {
  const SECTIONS = ['benefits', 'eligibility', 'howToApply', 'documents'] as const;
  const EN = {
    benefits: 'Cash award of one lakh',
    eligibility: 'Must be a student',
    documents: 'Aadhaar card',
    applicationProcess: 'Apply online at the portal.',
  };
  const HI = {
    benefits: ['एक लाख का नकद पुरस्कार'],
    eligibility: ['विद्यार्थी होना चाहिए'],
    documents: ['आधार कार्ड'],
    applicationProcess: 'पोर्टल पर ऑनलाइन आवेदन करें।',
  };
  const full = () =>
    schemeWith(makeTranslation({ status: 'ready', fields: { title: 'हिंदी शीर्षक', benefits: HI.benefits, eligibility: HI.eligibility, documents: HI.documents, applicationProcess: HI.applicationProcess } }), {
      benefits: [EN.benefits],
      eligibilityRawText: [EN.eligibility],
      documentRequirements: [EN.documents],
      applicationProcess: EN.applicationProcess,
    });
  const text = () => document.body.textContent ?? '';
  const click = (id: string) => act(async () => { screen.getByTestId(id).click(); });

  it('shows a switch on each of the four sections, with the translation selected first', async () => {
    mocks.getSchemeById.mockResolvedValue(full());
    await renderPage();
    for (const key of SECTIONS) {
      expect(screen.getByTestId('toggle-' + key)).toBeTruthy();
      expect(screen.getByTestId('toggle-' + key + '-translated').getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByTestId('toggle-' + key + '-en').getAttribute('aria-pressed')).toBe('false');
    }
    expect(screen.getByTestId('toggle-benefits-translated').textContent).toBe('हिन्दी');
    expect(text()).toContain(HI.benefits[0]);
    expect(text()).not.toContain(EN.benefits);
  });

  it('switches one section to its English original and leaves the others translated', async () => {
    mocks.getSchemeById.mockResolvedValue(full());
    await renderPage();
    await click('toggle-eligibility-en');
    expect(text()).toContain(EN.eligibility);
    expect(text()).not.toContain(HI.eligibility[0]);
    expect(screen.getByTestId('toggle-eligibility-en').getAttribute('aria-pressed')).toBe('true');
    // the other three are untouched
    expect(text()).toContain(HI.benefits[0]);
    expect(text()).toContain(HI.documents[0]);
    expect(text()).toContain(HI.applicationProcess);
  });

  it('several sections can show English at the same time', async () => {
    mocks.getSchemeById.mockResolvedValue(full());
    await renderPage();
    await click('toggle-benefits-en');
    await click('toggle-documents-en');
    expect(text()).toContain(EN.benefits);
    expect(text()).toContain(EN.documents);
    expect(text()).toContain(HI.eligibility[0]);
  });

  it.each([
    ['benefits', EN.benefits, HI.benefits[0]],
    ['eligibility', EN.eligibility, HI.eligibility[0]],
    ['documents', EN.documents, HI.documents[0]],
    ['howToApply', EN.applicationProcess, HI.applicationProcess],
  ])('the %s switch shows the English original and switches back', async (key, en, hi) => {
    mocks.getSchemeById.mockResolvedValue(full());
    await renderPage();
    await click('toggle-' + key + '-en');
    expect(text()).toContain(en);
    expect(text()).not.toContain(hi);
    await click('toggle-' + key + '-translated');
    expect(text()).toContain(hi);
    expect(text()).not.toContain(en);
  });

  it('shows no switch in English', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(full());
    await renderPage();
    for (const key of SECTIONS) expect(screen.queryByTestId('toggle-' + key)).toBeNull();
  });

  it('shows no switch on a section that was not translated (it is English already)', async () => {
    mocks.getSchemeById.mockResolvedValue(
      schemeWith(makeTranslation({ status: 'partial', fields: { title: 'हिंदी शीर्षक', benefits: HI.benefits }, failedFields: ['eligibility'] }), {
        benefits: [EN.benefits],
        eligibilityRawText: [EN.eligibility],
        documentRequirements: [EN.documents],
        applicationProcess: EN.applicationProcess,
      }),
    );
    await renderPage();
    expect(screen.queryByTestId('toggle-benefits')).not.toBeNull();
    for (const key of ['eligibility', 'documents', 'howToApply']) expect(screen.queryByTestId('toggle-' + key), key).toBeNull();
    expect(text()).toContain(EN.eligibility);
  });

  it('goes back to the translation when you open another scheme from the same page', async () => {
    mocks.getSchemeById.mockResolvedValue(full());
    mocks.getSchemes.mockResolvedValue({ data: [makeScheme({ id: 'rel-1', name: 'Related Scheme', category: 'Education', categories: ['Education'] })], total: 1 });
    await renderPage();
    await click('toggle-benefits-en');
    expect(text()).toContain(EN.benefits);
    await act(async () => { screen.getByText('Related Scheme').click(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mocks.getSchemeById).toHaveBeenCalledWith('rel-1');
    expect(text()).toContain(HI.benefits[0]);
    expect(text()).not.toContain(EN.benefits);
  });

  it('does not remember the choice: a different page starts translated again', async () => {
    mocks.getSchemeById.mockResolvedValue(full());
    await renderPage();
    await click('toggle-benefits-en');
    expect(text()).toContain(EN.benefits);
    cleanup();
    await renderPage();
    expect(text()).toContain(HI.benefits[0]);
    expect(text()).not.toContain(EN.benefits);
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

describe('SchemeDetail "How to apply" links', () => {
  // The page has other new-tab links (the official-website button), so look only inside the How to apply section.
  const howToApply = () => screen.getByText('howToApply').closest('section')!;
  const stepLinks = () => [...howToApply().querySelectorAll('a[target="_blank"]')];
  const STEPS = 'Application Process\nStep 1: Visit https://www.standupmitra.in/Login/Register.\nStep 2: Fill the form (see https://jeevanpramaan.gov.in).';

  it('makes the web addresses clickable, opening in a new tab', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(schemeWith(undefined, { applicationProcess: STEPS }));
    await renderPage();
    const anchors = stepLinks();
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(['https://www.standupmitra.in/Login/Register', 'https://jeevanpramaan.gov.in']);
    anchors.forEach((a) => expect((a.getAttribute('rel') ?? '')).toMatch(/noopener.*noreferrer|noreferrer.*noopener/));
    // the sentence's full stop and bracket stay as ordinary text next to the link
    expect(document.body.textContent).toContain('Visit https://www.standupmitra.in/Login/Register.');
    expect(document.body.textContent).toContain('(see https://jeevanpramaan.gov.in).');
  });

  it('does the same in the translated text', async () => {
    mocks.getSchemeById.mockResolvedValue(
      schemeWith(makeTranslation({ status: 'ready', fields: { applicationProcess: 'आवेदन प्रक्रिया\nचरण 1: https://www.standupmitra.in/Login/Register पर जाएँ।' } })),
    );
    await renderPage();
    expect(stepLinks().map((a) => a.getAttribute('href'))).toEqual(['https://www.standupmitra.in/Login/Register']);
  });

  it('shows plain steps with no address as plain text', async () => {
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValue(schemeWith(undefined, { applicationProcess: 'Visit the office and submit the form.' }));
    await renderPage();
    expect(screen.queryByText('Visit the office and submit the form.')).not.toBeNull();
    expect(stepLinks()).toHaveLength(0);
  });
});

describe('SchemeDetail when the scheme does not exist', () => {
  it('shows the not-found message instead of an empty page', async () => {
    mocks.getSchemeById.mockResolvedValue(null);
    await renderPage();
    expect(shown('schemeNotFound')).toBe(true);
  });
});
