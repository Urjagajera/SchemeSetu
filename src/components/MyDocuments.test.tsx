import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ language: 'en' as 'en' | 'hi' | 'gu', documentsHeld: [] as string[], updateProfile: vi.fn() }));

vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] ?? key, language: mocks.language }) };
});
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { documentsHeld: mocks.documentsHeld }, updateProfile: mocks.updateProfile }),
}));

import { MyDocuments } from './MyDocuments';

const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

beforeEach(() => {
  mocks.language = 'en';
  mocks.documentsHeld = ['ration'];
  mocks.updateProfile.mockReset().mockResolvedValue(true);
});

describe('My documents', () => {
  it('lists the 12 common documents, with the ones already held ticked', () => {
    render(<MyDocuments />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
    expect(box('Ration card').checked).toBe(true);
    expect(box('Aadhaar card').checked).toBe(false);
  });

  it('saves each tick straight away, adding and removing', async () => {
    render(<MyDocuments />);
    await act(async () => { fireEvent.click(box('Aadhaar card')); });
    expect(mocks.updateProfile).toHaveBeenLastCalledWith({ documentsHeld: ['ration', 'aadhaar'] });
    await act(async () => { fireEvent.click(box('Ration card')); });
    expect(mocks.updateProfile).toHaveBeenLastCalledWith({ documentsHeld: ['aadhaar'] });
  });

  it('puts the tick back and says so when saving fails', async () => {
    mocks.updateProfile.mockRejectedValue(new Error('offline'));
    render(<MyDocuments />);
    await act(async () => { fireEvent.click(box('Aadhaar card')); });
    expect(box('Aadhaar card').checked).toBe(false);
    expect(screen.getByRole('alert')).not.toBeNull();
  });

  it.each([['hi', 'आधार कार्ड'], ['gu', 'આધાર કાર્ડ']] as const)('is in %s too', (lang, aadhaar) => {
    mocks.language = lang;
    render(<MyDocuments />);
    expect(box(aadhaar)).not.toBeNull();
  });
});
