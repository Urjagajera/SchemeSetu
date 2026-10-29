import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import type { UserProfile } from '../types';
import { ProfileSaveError } from '../contexts/AuthContext';

const mocks = vi.hoisted(() => ({
  profile: {} as Partial<UserProfile>,
  updateProfile: vi.fn(),
}));

vi.mock('../contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../contexts/AuthContext')>()),
  useAuth: () => ({ profile: mocks.profile, updateProfile: mocks.updateProfile }),
}));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict.en[key] || key, language: 'en' }) };
});
vi.mock('../hooks/useStates', () => ({ useStates: () => ['Gujarat', 'Kerala'] }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));

import { QuickProfileForm } from './QuickProfileForm';

const SAVE = 'Save and see my schemes';
const ui = () => <MemoryRouter><QuickProfileForm /></MemoryRouter>;

beforeEach(() => {
  mocks.profile = {};
  mocks.updateProfile.mockReset().mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('QuickProfileForm: answer the missing profile questions in place', () => {
  it('asks only what is missing', () => {
    mocks.profile = { age: '30', state: 'Gujarat', name: 'Asha' } as Partial<UserProfile>;
    render(ui());
    for (const label of ['Gender', 'Social Category', 'Occupation', 'Annual family income', 'Residence']) expect(screen.getByLabelText(label)).not.toBeNull();
    expect(screen.queryByLabelText('Age')).toBeNull();
    expect(screen.queryByLabelText('State')).toBeNull();
    expect(screen.getByText(/29% Complete/)).not.toBeNull();
  });

  it('saves to the profile only the answers given, leaving everything else as it is', async () => {
    const user = userEvent.setup();
    render(ui());
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '1990-05-01' } });
    await user.selectOptions(screen.getByLabelText('State'), 'Kerala');
    await user.selectOptions(screen.getByLabelText('Occupation'), 'farmer');
    await user.type(screen.getByLabelText('Annual family income'), '120000');
    await user.click(screen.getByRole('button', { name: SAVE }));
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
    expect(mocks.updateProfile.mock.calls[0][0]).toEqual({ dob: '1990-05-01', state: 'Kerala', occupation: 'farmer', income: '120000' });
  });

  it('shows the age a date of birth gives, without asking for it to be typed', () => {
    render(ui());
    expect(screen.queryByText(/^Age: /)).toBeNull();
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: `${new Date().getFullYear() - 30}-01-01` } });
    expect(screen.getByText('Age: 30 · Calculated from your date of birth')).not.toBeNull();
  });

  it('checks the date of birth and income like the profile form does, and saves nothing until they are right', async () => {
    const user = userEvent.setup();
    render(ui());
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '2999-01-01' } });
    await user.type(screen.getByLabelText('Annual family income'), '12.5');
    await user.click(screen.getByRole('button', { name: SAVE }));
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a real date of birth that is not in the future')).not.toBeNull();
    expect(screen.getByText('Income must be a whole number of rupees, 0 or more')).not.toBeNull();
  });

  it('says so when nothing was answered', async () => {
    const user = userEvent.setup();
    render(ui());
    await user.click(screen.getByRole('button', { name: SAVE }));
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Answer at least one question to save.');
  });

  it('shows a failed save, and the field the server objected to', async () => {
    mocks.updateProfile.mockRejectedValue(new ProfileSaveError('bad', { dob: 'Date of birth must be a real date' }));
    const user = userEvent.setup();
    render(ui());
    fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '1985-02-10' } });
    await user.click(screen.getByRole('button', { name: SAVE }));
    expect(screen.getByRole('alert').textContent).toBe("We couldn't save your profile. Please try again.");
    expect(screen.getByText('Date of birth must be a real date')).not.toBeNull();
  });

  it('disappears once the profile has every answer', () => {
    const { rerender } = render(ui());
    expect(screen.getByTestId('quick-profile')).not.toBeNull();
    mocks.profile = { age: '30', gender: 'female', state: 'Gujarat', category: 'sc', occupation: 'student', income: '1', residence: 'rural' };
    rerender(ui());
    expect(screen.queryByTestId('quick-profile')).toBeNull();
  });

  it('offers exactly the option values the full profile form saves', () => {
    const profileSource = fs.readFileSync(path.resolve(__dirname, '../pages/Profile.tsx'), 'utf8');
    render(ui());
    for (const label of ['Gender', 'Social Category', 'Occupation', 'Residence']) {
      const values = [...(screen.getByLabelText(label) as HTMLSelectElement).options].map((o) => o.value).filter(Boolean);
      expect(values.length).toBeGreaterThan(1);
      for (const v of values) expect(profileSource, `${label}: ${v}`).toContain(`value="${v}"`);
    }
  });
});
