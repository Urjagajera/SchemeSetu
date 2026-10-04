import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeScheme } from '../test/factories';

const mocks = vi.hoisted(() => ({
  language: 'en',
  cardText: { titles: {} as Record<string, string>, summaries: {} as Record<string, string> },
}));

vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key, language: mocks.language }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('../contexts/CompareContext', () => ({ useCompare: () => ({ isInCompare: () => false, addToCompare: () => ({ success: true }), removeFromCompare: () => {} }) }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));
vi.mock('../services/titleTranslations', () => ({ useCardText: () => mocks.cardText }));

import { SchemeCard } from './SchemeCard';

const BODY = 'The scheme aims to provide additional financial assistance to students.';
// What the server really sends: the first 150 characters of the raw description, which opens with "Details".
const SERVER_SHORT_DESC = `Details\n${BODY} It is run by the Directorate of Social Welfare and the application is online...`;

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter>
      <SchemeCard scheme={makeScheme({ shortDesc: SERVER_SHORT_DESC, description: `Details\n${BODY}`, ...overrides })} isBookmarked={false} onToggleBookmark={() => {}} />
    </MemoryRouter>,
  );
}

const cardText = (container: HTMLElement) => container.textContent ?? '';

beforeEach(() => {
  mocks.language = 'en';
  mocks.cardText = { titles: {}, summaries: {} };
});

describe('SchemeCard description', () => {
  it('does not start the English card text with the "Details" heading', () => {
    const { container } = renderCard();
    expect(cardText(container)).toContain(BODY);
    expect(screen.queryByText(/^Details/)).toBeNull();
    expect(cardText(container)).not.toMatch(/Details\s*The scheme/);
  });

  it('does not show it either while a Hindi card waits for its translated summary (English text meanwhile)', () => {
    mocks.language = 'hi';
    const { container } = renderCard();
    expect(cardText(container)).toContain(BODY);
    expect(screen.queryByText(/^Details/)).toBeNull();
  });

  it('shows the translated summary once it has arrived', () => {
    mocks.language = 'hi';
    mocks.cardText = { titles: {}, summaries: { 'scheme-1': 'यह योजना छात्रों को अतिरिक्त वित्तीय सहायता देती है।' } };
    const { container } = renderCard();
    expect(cardText(container)).toContain('यह योजना छात्रों को अतिरिक्त वित्तीय सहायता देती है।');
    expect(cardText(container)).not.toContain(BODY);
  });
});

describe('SchemeCard machine-translation badge', () => {
  it('is shown when a translated title has arrived in Hindi mode', () => {
    mocks.language = 'hi';
    mocks.cardText = { titles: { 'scheme-1': 'हिंदी शीर्षक' }, summaries: {} };
    renderCard();
    expect(screen.getByTestId('machine-translated-badge').textContent).toBe('machineTranslatedBadge');
    expect(screen.getByTestId('machine-translated-badge').getAttribute('title')).toBe('machineTranslatedNote');
  });

  it('is shown when only the summary has arrived', () => {
    mocks.language = 'hi';
    mocks.cardText = { titles: {}, summaries: { 'scheme-1': 'सारांश' } };
    renderCard();
    expect(screen.queryByTestId('machine-translated-badge')).not.toBeNull();
  });

  it('is not shown while the card is still English in Hindi mode', () => {
    mocks.language = 'hi';
    renderCard();
    expect(screen.queryByTestId('machine-translated-badge')).toBeNull();
  });

  it('is not shown in English, even if translated text is lying around', () => {
    mocks.language = 'en';
    mocks.cardText = { titles: { 'scheme-1': 'हिंदी शीर्षक' }, summaries: {} };
    renderCard();
    expect(screen.queryByTestId('machine-translated-badge')).toBeNull();
  });
});
