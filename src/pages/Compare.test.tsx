import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { makeScheme, makeVocabulary } from '../test/factories';
import type { Scheme, Vocabulary } from '../types';

const mocks = vi.hoisted(() => ({
  language: 'hi' as 'en' | 'hi' | 'gu',
  schemes: [] as Scheme[],
  vocab: null as Vocabulary | null,
  vocabLoading: false,
}));

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => ({ comparedSchemes: mocks.schemes, removeFromCompare: () => {}, clearCompare: () => {} }) }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: mocks.vocab, loading: mocks.vocabLoading }) }));

import { Compare } from './Compare';
import { ingestCardText } from '../services/titleTranslations';

const A = makeScheme({ id: 'a', name: 'Post Matric Scholarship', ministry: 'Ministry of Education', category: 'Education' });
const B = makeScheme({ id: 'b', name: 'Crop Insurance', ministry: 'Ministry of Agriculture', category: 'Agriculture' });
const text = () => document.body.textContent ?? '';
const view = () => render(<MemoryRouter><Compare /></MemoryRouter>);

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
});

describe('Compare page in Hindi', () => {
  it('shows the translated title, ministry and category', () => {
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति', b: 'फसल बीमा' });
    view();
    expect(text()).toContain('पोस्ट मैट्रिक छात्रवृत्ति');
    expect(text()).toContain('फसल बीमा');
    expect(text()).toContain('शिक्षा मंत्रालय');
    expect(text()).toContain('कृषि मंत्रालय');
    expect(text()).not.toContain('Post Matric Scholarship');
    expect(text()).not.toContain('Ministry of Education');
  });

  it('keeps English for a scheme whose title has not arrived, and translates the others', () => {
    mocks.schemes = [A, makeScheme({ id: 'c', name: 'Untranslated Scheme', ministry: 'Ministry of Education' })];
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति' });
    view();
    expect(text()).toContain('पोस्ट मैट्रिक छात्रवृत्ति');
    expect(text()).toContain('Untranslated Scheme');
  });

  it('shows the English ministry and category while the vocabulary is loading, and no tag-like blanks', () => {
    mocks.vocab = null;
    mocks.vocabLoading = true;
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति' });
    view();
    expect(text()).toContain('Ministry of Education');
    expect(text()).toContain('पोस्ट मैट्रिक छात्रवृत्ति');
  });

  it('shows the English ministry where the vocabulary has no entry for it', () => {
    mocks.vocab = makeVocabulary({ names: { 'Ministry of Education': 'शिक्षा मंत्रालय' } });
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति', b: 'फसल बीमा' });
    view();
    expect(text()).toContain('शिक्षा मंत्रालय');
    expect(text()).toContain('Ministry of Agriculture');
  });

  it('never asks the server for anything (so it can never start a translation)', async () => {
    mocks.schemes = [makeScheme({ id: 'never-seen', name: 'Never Seen Scheme' })];
    view();
    await new Promise((r) => setTimeout(r, 120)); // the card-text queue would send its request after ~30 ms
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(text()).toContain('Never Seen Scheme');
  });

  it('a title stored for Hindi is not shown in Gujarati', () => {
    mocks.language = 'gu';
    mocks.vocab = null;
    cardsShowed('hi', { a: 'केवल हिंदी शीर्षक' });
    view();
    expect(text()).not.toContain('केवल हिंदी शीर्षक');
    expect(text()).toContain('Post Matric Scholarship');
  });
});

describe('Compare page in English', () => {
  it('is unchanged: English title, ministry and category, even if Hindi text is stored', () => {
    mocks.language = 'en';
    mocks.vocab = null;
    cardsShowed('hi', { a: 'पोस्ट मैट्रिक छात्रवृत्ति' });
    view();
    expect(text()).toContain('Post Matric Scholarship');
    expect(text()).toContain('Ministry of Education');
    expect(text()).not.toContain('पोस्ट मैट्रिक छात्रवृत्ति');
  });
});
