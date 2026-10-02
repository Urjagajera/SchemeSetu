import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserProfile } from '../types';
import { ProfileSaveError } from '../contexts/AuthContext';

const mocks = vi.hoisted(() => ({
  user: { name: 'Asha Patel' } as { name: string } | null,
  profile: {} as Partial<UserProfile>,
  updateProfile: vi.fn(),
}));

// Keep the real ProfileSaveError (the page checks for it); replace only the hook that reads the live session.
vi.mock('../contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../contexts/AuthContext')>()),
  useAuth: () => ({ user: mocks.user, profile: mocks.profile, updateProfile: mocks.updateProfile }),
}));
vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key, language: 'en' }) }));
vi.mock('../hooks/useStates', () => ({ useStates: () => ['Gujarat', 'Kerala'] }));
vi.mock('../hooks/useVocabulary', () => ({ useVocabulary: () => ({ vocab: null, loading: false }) }));

import { Profile } from './Profile';

const SAVE = 'Save Changes';
const SUCCESS = 'Your eligibility profile has been successfully saved!';

const field = (container: HTMLElement, name: string) => container.querySelector(`input[name="${name}"]`) as HTMLInputElement;

function setup() {
  const view = render(<Profile />);
  return { ...view, user: userEvent.setup() };
}

beforeEach(() => {
  mocks.user = { name: 'Asha Patel' };
  mocks.profile = {};
  mocks.updateProfile.mockReset();
  mocks.updateProfile.mockResolvedValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {}); // the page logs the failures it shows
});

describe('Profile form: only the name is required', () => {
  it('saves with a name and every other answer left blank, sending the blanks as blanks', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: SAVE }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1));
    expect(mocks.updateProfile.mock.calls[0][0]).toMatchObject({ name: 'Asha Patel', age: '', gender: '', income: '', state: '', occupation: '', land: '' });
    expect(await screen.findByText(SUCCESS)).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sends a blank for a field the user emptied, so a value saved earlier is cleared', async () => {
    mocks.profile = { age: '30' };
    const { user, container } = setup();
    expect(field(container, 'age').value).toBe('30');
    await user.clear(field(container, 'age'));
    await user.click(screen.getByRole('button', { name: SAVE }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1));
    expect(mocks.updateProfile.mock.calls[0][0]).toMatchObject({ age: '' });
  });

  it('does not save a name that is too short, and says why', async () => {
    mocks.user = { name: 'A' };
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: SAVE }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Your profile was not saved');
    expect(alert.textContent).toContain('Name must be at least 2 characters');
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(screen.queryByText(SUCCESS)).toBeNull();
  });
});

describe('Profile form: what is filled in must be sensible', () => {
  it.each([
    ['age', '150', 'Age must be a whole number between 1 and 120'],
    ['age', '0', 'Age must be a whole number between 1 and 120'],
    ['dob', '2999-01-01', 'Enter a real date of birth that is not in the future'],
  ])('rejects %s = "%s"', async (name, value, message) => {
    const { user, container } = setup();
    fireEvent.change(field(container, name), { target: { value } });
    await user.click(screen.getByRole('button', { name: SAVE }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(message);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('accepts the edges of the allowed range', async () => {
    const { user, container } = setup();
    fireEvent.change(field(container, 'age'), { target: { value: '120' } });
    await user.click(screen.getByRole('button', { name: SAVE }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1));
    expect(mocks.updateProfile.mock.calls[0][0]).toMatchObject({ age: '120' });
  });
});

describe('Profile form: when the save fails', () => {
  it('shows the fields the server objected to, with its reasons', async () => {
    mocks.updateProfile.mockRejectedValue(new ProfileSaveError('Some profile fields are not valid', { state: 'State must be one of the listed states', income: 'Income must be a whole number' }));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: SAVE }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('The server did not accept your profile');
    expect(alert.textContent).toContain('State: State must be one of the listed states');
    expect(alert.textContent).toContain('Annual family income: Income must be a whole number');
    expect(screen.queryByText(SUCCESS)).toBeNull();
  });

  it('shows the server message when it gave no field reasons (for example, it could not be reached)', async () => {
    mocks.updateProfile.mockRejectedValue(new ProfileSaveError("We couldn't save your profile. Check your connection and try again."));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: SAVE }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("We couldn't save your profile. Check your connection and try again.");
  });

  it('shows a generic message for an unexpected error instead of failing silently', async () => {
    mocks.updateProfile.mockRejectedValue(new Error('boom'));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: SAVE }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("We couldn't save your profile. Please try again.");
  });

  it('clears the error and shows success after a retry works', async () => {
    mocks.updateProfile.mockRejectedValueOnce(new ProfileSaveError('nope')).mockResolvedValue(true);
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: SAVE }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: SAVE }));
    expect(await screen.findByText(SUCCESS)).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
