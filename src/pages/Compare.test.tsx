import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { makeScheme, makeVocabulary, makeTranslation } from '../test/factories';
import type { Scheme, Vocabulary } from '../types';

const mocks = vi.hoisted(() => ({
  language: 'hi' as 'en' | 'hi' | 'gu',
  schemes: [] as Scheme[],
  vocab: null as Vocabulary | null,
  vocabLoading: false,
  getSchemeById: vi.fn(),
}));

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => ({ comparedSchemes: mocks.schemes, removeFromCompare: () => {}, clearCompare: () => {} }) }));
vi.mock('../services/schemeService', () => ({ schemeService: { getSchemeById: mocks.getSchemeById } }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: mocks.vocab, loading: mocks.vocabLoading }) }));

import { Compare } from './Compare';
import { ingestCardText } from '../services/titleTranslations';

const A = makeScheme({ id: 'a', name: 'Post Matric Scholarship', ministry: 'Ministry of Education', category: 'Education' });
const B = makeScheme({ id: 'b', name: 'Crop Insurance', ministry: 'Ministry of Agriculture', category: 'Agriculture' });
const text = () => document.body.textContent ?? '';
const view = async () => {
  const r = render(<MemoryRouter><Compare /></MemoryRouter>);
  await act(async () => {});
  return r;
};

// What a card does when it first shows a scheme: the list response carries the translated text and it is stored.
function cardsShowed(language: string, titles: Record<string, string>) {
  ingestCardText(language, { language, status: 'ready', titles, summaries: {} }, Object.keys(titles));
}

beforeEach(() => {
  mocks.language = 'hi';
  mocks.schemes = [A, B];
  mocks.vocab = makeVocabulary({ names: { 'Ministry of Education': 'शिक्षा मंत्रालय', 'Ministry of Agriculture': 'कृषि मंत्रालय', Education: 'शिक्षा', Agriculture: 'कृषि' } });
  mocks.vocabLoading = false;
  vi.mocked(axios.get).mockClear();
  mocks.getSchemeById.mockReset();
  mocks.getSchemeById.mockResolvedValue(null); // no detail: the list data is what shows
});

describe('Compare page in Hindi', () => {
  it('shows the translated title, ministry and category', async () => {
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति', b: 'फसल बीमा' });
    await view();
    expect(text()).toContain('पोस्ट मैट्रिक छात्रवृत्ति');
    expect(text()).toContain('फसल बीमा');
    expect(text()).toContain('शिक्षा मंत्रालय');
    expect(text()).toContain('कृषि मंत्रालय');
    expect(text()).not.toContain('Post Matric Scholarship');
    expect(text()).not.toContain('Ministry of Education');
  });

  it('keeps English for a scheme whose title has not arrived, and translates the others', async () => {
    mocks.schemes = [A, makeScheme({ id: 'c', name: 'Untranslated Scheme', ministry: 'Ministry of Education' })];
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति' });
    await view();
    expect(text()).toContain('पोस्ट मैट्रिक छात्रवृत्ति');
    expect(text()).toContain('Untranslated Scheme');
  });

  it('shows the English ministry and category while the vocabulary is loading, and no tag-like blanks', async () => {
    mocks.vocab = null;
    mocks.vocabLoading = true;
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति' });
    await view();
    expect(text()).toContain('Ministry of Education');
    expect(text()).toContain('पोस्ट मैट्रिक छात्रवृत्ति');
  });

  it('shows the English ministry where the vocabulary has no entry for it', async () => {
    mocks.vocab = makeVocabulary({ names: { 'Ministry of Education': 'शिक्षा मंत्रालय' } });
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति', b: 'फसल बीमा' });
    await view();
    expect(text()).toContain('शिक्षा मंत्रालय');
    expect(text()).toContain('Ministry of Agriculture');
  });

  it('never asks the card-text endpoint (which would start summary translations); titles come from what the cards fetched', async () => {
    mocks.schemes = [makeScheme({ id: 'never-seen', name: 'Never Seen Scheme' })];
    await view();
    await new Promise((r) => setTimeout(r, 120)); // the card-text queue would send its request after ~30 ms
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(text()).toContain('Never Seen Scheme');
  });

  it('a title stored for Hindi is not shown in Gujarati', async () => {
    mocks.language = 'gu';
    mocks.vocab = null;
    cardsShowed('hi', { a: 'केवल हिंदी शीर्षक' });
    await view();
    expect(text()).not.toContain('केवल हिंदी शीर्षक');
    expect(text()).toContain('Post Matric Scholarship');
  });
});

describe('Compare page in English', () => {
  it('is unchanged: English title, ministry and category, even if Hindi text is stored', async () => {
    mocks.language = 'en';
    mocks.vocab = null;
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति' });
    await view();
    expect(text()).toContain('Post Matric Scholarship');
    expect(text()).toContain('Ministry of Education');
    expect(text()).not.toContain('पोस्ट मैट्रिक छात्रवृत्ति');
  });
});

// ---------------------------------------------------------------- details

const EN = {
  benefits: ['Cash award of one lakh', 'Free hostel stay', 'Travel allowance', 'Books grant'],
  eligibility: ['Must be a student', 'Family income below 2 lakh', 'Resident of Gujarat', 'Aged 18 to 25'],
  documents: ['Aadhaar card', 'Income certificate', 'Bank passbook', 'Passport photo'],
};
const HI = {
  benefits: ['एक लाख का नकद पुरस्कार', 'निःशुल्क छात्रावास', 'यात्रा भत्ता', 'पुस्तक अनुदान'],
  eligibility: ['विद्यार्थी होना चाहिए', 'पारिवारिक आय 2 लाख से कम', 'गुजरात का निवासी', 'आयु 18 से 25'],
  documents: ['आधार कार्ड', 'आय प्रमाणपत्र', 'बैंक पासबुक', 'पासपोर्ट फोटो'],
};
const detail = (id: string, translation?: ReturnType<typeof makeTranslation>) =>
  makeScheme({ id, name: 'Post Matric Scholarship', ministry: 'Ministry of Education', category: 'Education', benefits: EN.benefits, eligibilityRawText: EN.eligibility, documentRequirements: EN.documents, translation });

describe('Compare page details', () => {
  it('fetches the detail of each compared scheme, three at most', async () => {
    mocks.language = 'en';
    mocks.schemes = [A, B, makeScheme({ id: 'c' })];
    await view();
    expect(mocks.getSchemeById.mock.calls.map((c) => c[0]).sort()).toEqual(['a', 'b', 'c']);
  });

  it('shows a loading state in the three detail rows until the detail arrives, then every benefit, the eligibility and the documents', async () => {
    mocks.language = 'en';
    mocks.schemes = [A];
    let release: (s: Scheme) => void = () => {};
    mocks.getSchemeById.mockReturnValue(new Promise<Scheme>((r) => { release = r; }));
    await view();
    expect(document.querySelectorAll('[data-testid="compare-loading"]')).toHaveLength(3);
    expect(text()).not.toContain('Aadhaar card');
    await act(async () => { release(detail('a')); });
    expect(document.querySelectorAll('[data-testid="compare-loading"]')).toHaveLength(0);
    for (const b of EN.benefits) expect(text(), b).toContain(b);
    for (const e of EN.eligibility.slice(0, 3)) expect(text(), e).toContain(e);
    expect(text()).not.toContain('Aged 18 to 25');
    expect(text()).toContain('+1');
    for (const d of EN.documents.slice(0, 3)) expect(text(), d).toContain(d);
  });

  it('falls back to the list data when the detail cannot be loaded, instead of loading forever', async () => {
    mocks.language = 'en';
    mocks.schemes = [makeScheme({ id: 'x', name: 'Offline Scheme', benefit: 'Refer to official portal' })];
    mocks.getSchemeById.mockRejectedValue(new Error('offline'));
    await view();
    expect(document.querySelectorAll('[data-testid="compare-loading"]')).toHaveLength(0);
    expect(text()).toContain('Refer to official portal');
  });

  it('shows the Hindi text of each section that is translated, and English for the rest', async () => {
    mocks.schemes = [A];
    mocks.getSchemeById.mockResolvedValue(detail('a', makeTranslation({ status: 'partial', fields: { benefits: HI.benefits, documents: HI.documents }, failedFields: ['eligibility'] })));
    await view();
    expect(text()).toContain(HI.benefits[3]);
    expect(text()).toContain(HI.documents[0]);
    expect(text()).not.toContain(EN.benefits[0]);
    expect(text()).toContain(EN.eligibility[0]);
    expect(text()).not.toContain(HI.eligibility[0]);
  });

  describe('while the server is still translating', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('shows English first, asks again every few seconds, and swaps in the Hindi when it is ready', async () => {
      mocks.schemes = [A];
      mocks.getSchemeById
        .mockResolvedValueOnce(detail('a', makeTranslation({ status: 'pending', pendingFields: ['benefits', 'eligibility', 'documents'] })))
        .mockResolvedValue(detail('a', makeTranslation({ status: 'ready', fields: { benefits: HI.benefits, eligibility: HI.eligibility, documents: HI.documents } })));
      await view();
      expect(text()).toContain(EN.eligibility[0]);
      expect(mocks.getSchemeById).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
      expect(mocks.getSchemeById).toHaveBeenCalledTimes(1); // not before about 3 seconds
      await act(async () => { await vi.advanceTimersByTimeAsync(600); });
      expect(mocks.getSchemeById).toHaveBeenCalledTimes(2);
      expect(text()).toContain(HI.eligibility[0]);
      expect(text()).not.toContain(EN.eligibility[0]);
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(mocks.getSchemeById).toHaveBeenCalledTimes(2);
    });

    it('gives up after about a minute and leaves the English', async () => {
      mocks.schemes = [A];
      mocks.getSchemeById.mockResolvedValue(detail('a', makeTranslation({ status: 'pending' })));
      await view();
      await act(async () => { await vi.advanceTimersByTimeAsync(3000 * 40); });
      expect(mocks.getSchemeById.mock.calls.length).toBeLessThanOrEqual(22);
      expect(text()).toContain(EN.eligibility[0]);
    });

    it('stops asking when the page is left', async () => {
      mocks.schemes = [A];
      mocks.getSchemeById.mockResolvedValue(detail('a', makeTranslation({ status: 'pending' })));
      const { unmount } = await view();
      unmount();
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(mocks.getSchemeById).toHaveBeenCalledTimes(1);
    });

    it('does not poll at all in English', async () => {
      mocks.language = 'en';
      mocks.schemes = [A];
      mocks.getSchemeById.mockResolvedValue(detail('a', makeTranslation({ status: 'pending' })));
      await view();
      await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
      expect(mocks.getSchemeById).toHaveBeenCalledTimes(1);
    });
  });

  it('switching the language fetches again and drops the old text', async () => {
    mocks.schemes = [A];
    mocks.getSchemeById.mockResolvedValueOnce(detail('a', makeTranslation({ status: 'ready', fields: { eligibility: HI.eligibility } })));
    const { rerender } = await view();
    expect(text()).toContain(HI.eligibility[0]);
    mocks.language = 'en';
    mocks.getSchemeById.mockResolvedValueOnce(detail('a'));
    await act(async () => { rerender(<MemoryRouter><Compare /></MemoryRouter>); });
    expect(mocks.getSchemeById).toHaveBeenCalledTimes(2);
    expect(text()).toContain(EN.eligibility[0]);
    expect(text()).not.toContain(HI.eligibility[0]);
  });

  it('does not keep showing the old language while the new one loads', async () => {
    mocks.schemes = [A];
    mocks.getSchemeById.mockResolvedValueOnce(detail('a', makeTranslation({ status: 'ready', fields: { eligibility: HI.eligibility } })));
    const { rerender } = await view();
    expect(text()).toContain(HI.eligibility[0]);
    mocks.language = 'en';
    mocks.getSchemeById.mockReturnValueOnce(new Promise(() => {})); // the English answer has not come yet
    await act(async () => { rerender(<MemoryRouter><Compare /></MemoryRouter>); });
    expect(text()).not.toContain(HI.eligibility[0]);
    expect(document.querySelectorAll('[data-testid="compare-loading"]').length).toBe(3);
  });

  it('English mode shows English even when the server sends a translation', async () => {
    mocks.language = 'en';
    mocks.vocab = null;
    mocks.schemes = [A];
    mocks.getSchemeById.mockResolvedValue(detail('a', makeTranslation({ status: 'ready', fields: { eligibility: HI.eligibility } })));
    await view();
    expect(text()).toContain(EN.eligibility[0]);
    expect(text()).not.toContain(HI.eligibility[0]);
  });
});
