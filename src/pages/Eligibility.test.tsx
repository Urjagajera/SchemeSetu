import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  language: 'en' as 'en' | 'hi' | 'gu',
  getEligibleSchemes: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, profile: {} }) }));
// The real dictionaries, so the test reads the wording people actually see.
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});
vi.mock('../hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], toggleBookmark: () => {} }) }));
vi.mock('../hooks/useStates', () => ({ useStates: () => ['Gujarat'] }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));
vi.mock('../services/schemeService', () => ({ schemeService: { getEligibleSchemes: mocks.getEligibleSchemes } }));
vi.mock('../services/eligibilityService', () => ({ eligibilityService: { getEligibilityReport: vi.fn() } }));

import { Eligibility } from './Eligibility';

const WORDS = {
  en: { title: 'Find Matching Schemes', next: 'Next', age: 'Enter Your Age', gender: 'Gender', state: 'Select Your State', occupation: 'Select Your Occupation', income: 'Declared Annual Income (₹)', category: 'Social Category', residence: 'Residence Area', land: 'Own Cultivable Land?', prev: 'Previous', find: 'Find Schemes', none: "No matching welfare schemes found. Let's adjust criteria.", guest: 'Guest Eligibility Matches', male: 'Male', select: 'Select…', yes: 'Yes', rural: 'Rural' },
  hi: { title: 'अपने लिए योजनाएँ खोजें', next: 'अगला', age: 'अपनी आयु दर्ज करें', gender: 'लिंग', state: 'अपना राज्य चुनें', occupation: 'अपना व्यवसाय चुनें', income: 'घोषित वार्षिक आय (₹)', category: 'सामाजिक श्रेणी', residence: 'निवास क्षेत्र', land: 'क्या खेती योग्य भूमि के मालिक हैं?', prev: 'पिछला', find: 'योजनाएँ खोजें', none: 'कोई मेल खाती कल्याणकारी योजना नहीं मिली। आइए मानदंड बदलकर देखें।', guest: 'अतिथि पात्रता परिणाम', male: 'पुरुष', select: 'चुनें…', yes: 'हाँ', rural: 'ग्रामीण' },
  gu: { title: 'તમારા માટે યોજનાઓ શોધો', next: 'આગળ', age: 'તમારી ઉંમર દાખલ કરો', gender: 'લિંગ', state: 'તમારું રાજ્ય પસંદ કરો', occupation: 'તમારો વ્યવસાય પસંદ કરો', income: 'જાહેર કરેલી વાર્ષિક આવક (₹)', category: 'સામાજિક વર્ગ', residence: 'રહેઠાણ વિસ્તાર', land: 'શું ખેતીલાયક જમીન ધરાવો છો?', prev: 'પાછળ', find: 'યોજનાઓ શોધો', none: 'કોઈ મેળ ખાતી કલ્યાણ યોજના મળી નથી. ચાલો માપદંડ બદલીએ.', guest: 'મહેમાન પાત્રતા પરિણામો', male: 'પુરુષ', select: 'પસંદ કરો…', yes: 'હા', rural: 'ગ્રામીણ' },
} as const;

beforeEach(() => {
  mocks.language = 'en';
  mocks.getEligibleSchemes.mockReset();
  mocks.getEligibleSchemes.mockResolvedValue([]);
});

const text = () => document.body.textContent ?? '';

async function walk(lang: 'en' | 'hi' | 'gu') {
  mocks.language = lang;
  const w = WORDS[lang];
  const user = userEvent.setup();
  render(<MemoryRouter><Eligibility /></MemoryRouter>);
  // step 1
  expect(text()).toContain(w.title);
  expect(text()).toContain(w.age);
  expect(text()).toContain(w.gender);
  const seen: string[] = [text()];
  await user.type(document.querySelector('input[type="number"]') as HTMLInputElement, '30');
  await user.click(screen.getByRole('button', { name: w.next }));
  // step 2
  seen.push(text());
  expect(text()).toContain(w.state);
  expect(text()).toContain(w.occupation);
  expect(text()).toContain(w.income);
  expect(text()).toContain(w.select);
  await user.type(document.querySelector('input[type="number"]') as HTMLInputElement, '100000');
  await user.click(screen.getByRole('button', { name: w.next }));
  // step 3
  seen.push(text());
  expect(text()).toContain(w.category);
  expect(text()).toContain(w.residence);
  expect(text()).toContain(w.land);
  expect(text()).toContain(w.rural);
  expect(text()).toContain(w.yes);
  expect(screen.getByRole('button', { name: w.prev })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: w.find }));
  await act(async () => {});
  expect(text()).toContain(w.guest);
  expect(text()).toContain(w.none);
  seen.push(text());
  return seen.join(' ');
}

describe('Eligibility wizard: every step and the results screen in each language', () => {
  it.each(['en', 'hi', 'gu'] as const)('%s', async (lang) => {
    await walk(lang);
    expect(mocks.getEligibleSchemes).toHaveBeenCalledTimes(1);
  });

  it('Hindi and Gujarati show none of the old hardcoded English wording', async () => {
    for (const lang of ['hi', 'gu'] as const) {
      const all = await walk(lang);
      for (const english of ['Find Matching Schemes', 'Enter Your Age', 'Select Your State', 'Declared Annual Income', 'Own Cultivable Land', 'Previous', 'Find Schemes', 'Guest Eligibility Matches', 'Select…']) {
        expect(all, `${lang}: ${english}`).not.toContain(english);
      }
      document.body.innerHTML = '';
    }
  });

  it('the answers still go to the matcher as the same plain values, whatever the language', async () => {
    await walk('hi');
    const sent = mocks.getEligibleSchemes.mock.calls[0][0];
    expect(sent.age).toBe('30');
    expect(sent.income).toBe('100000');
  });
});
