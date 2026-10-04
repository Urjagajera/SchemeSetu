import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  language: 'en' as 'en' | 'hi' | 'gu',
  logout: vi.fn(),
  downloadMyData: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language, setLanguage: () => {} }) };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Asha' }, logout: mocks.logout }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: () => {} }) }));
vi.mock('../services/accountService', () => ({ accountService: { downloadMyData: mocks.downloadMyData, deleteMyAccount: mocks.deleteMyAccount } }));

import { Settings } from './Settings';
import { TRANSLATIONS } from '../constants/translations';

const dict = TRANSLATIONS as unknown as Record<'en' | 'hi' | 'gu', Record<string, string>>;
const originalLocation = window.location;

beforeEach(() => {
  mocks.language = 'en';
  mocks.logout.mockReset().mockResolvedValue(undefined);
  mocks.downloadMyData.mockReset().mockResolvedValue(undefined);
  mocks.deleteMyAccount.mockReset().mockResolvedValue(undefined);
  localStorage.setItem('schemesetu_lang', 'en');
  localStorage.setItem('schemesetu_bookmarks', '[1]');
  Object.defineProperty(window, 'location', { value: { href: 'http://localhost/settings' }, writable: true, configurable: true });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true });
  localStorage.clear();
});

const open = async () => {
  const user = userEvent.setup();
  render(<Settings />);
  await user.click(screen.getByRole('button', { name: dict[mocks.language].acDeleteBtn }));
  return user;
};
const confirmButton = () => screen.getByRole('button', { name: dict[mocks.language].acConfirmGo }) as HTMLButtonElement;

describe.each(['en', 'hi', 'gu'] as const)('Settings: download and delete, in %s', (lang) => {
  beforeEach(() => { mocks.language = lang; });
  const d = dict[lang];

  it('shows both buttons with their explanations in the language', () => {
    render(<Settings />);
    for (const k of ['acExportTitle', 'acExportDesc', 'acExportBtn', 'acDeleteTitle', 'acDeleteDesc', 'acDeleteBtn']) expect(document.body.textContent, k).toContain(d[k]);
  });

  it('asks for a typed confirmation before deleting, in the language', async () => {
    await open();
    expect(document.body.textContent).toContain(d.acConfirmPrompt);
    expect(confirmButton().disabled).toBe(true);
    expect(mocks.deleteMyAccount).not.toHaveBeenCalled();
  });
});

describe('download my data', () => {
  it('asks the service for the file', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(mocks.downloadMyData).toHaveBeenCalledTimes(1);
    expect(mocks.deleteMyAccount).not.toHaveBeenCalled();
  });

  it('says so when it fails, and changes nothing else', async () => {
    mocks.downloadMyData.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect((await screen.findByRole('alert')).textContent).toBe(dict.en.acExportFail);
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(localStorage.getItem('schemesetu_bookmarks')).toBe('[1]');
  });
});

describe('delete my account', () => {
  it('does nothing until the confirmation is opened and the word is typed exactly', async () => {
    const user = await open();
    const input = screen.getByRole('textbox');
    expect(confirmButton().disabled).toBe(true);
    for (const wrong of ['delete', 'DELET', 'DELETE NOW', 'x']) {
      await user.clear(input);
      await user.type(input, wrong);
      expect(confirmButton().disabled, wrong).toBe(true);
    }
    await user.clear(input);
    await user.type(input, 'DELETE');
    expect(confirmButton().disabled).toBe(false);
    expect(mocks.deleteMyAccount).not.toHaveBeenCalled();
  });

  it('Cancel closes the confirmation and forgets what was typed', async () => {
    const user = await open();
    await user.type(screen.getByRole('textbox'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('delete-confirm')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    expect(mocks.deleteMyAccount).not.toHaveBeenCalled();
  });

  it('deletes, clears what this browser kept, signs out and goes home', async () => {
    const user = await open();
    await user.type(screen.getByRole('textbox'), 'DELETE');
    await user.click(confirmButton());
    await act(async () => {});
    expect(mocks.deleteMyAccount).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('schemesetu_bookmarks')).toBeNull();
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/');
  });

  it('when the server refuses, nothing local is cleared, the user stays signed in, and the error is shown', async () => {
    mocks.deleteMyAccount.mockRejectedValue(new Error('500'));
    const user = await open();
    await user.type(screen.getByRole('textbox'), 'DELETE');
    await user.click(confirmButton());
    expect((await screen.findByRole('alert')).textContent).toBe(dict.en.acDeleteFail);
    expect(localStorage.getItem('schemesetu_bookmarks')).toBe('[1]');
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(window.location.href).toBe('http://localhost/settings');
    // and it can be tried again
    expect(confirmButton().disabled).toBe(false);
  });

  it('presses on a disabled button do nothing', async () => {
    await open();
    fireEvent.click(confirmButton());
    expect(mocks.deleteMyAccount).not.toHaveBeenCalled();
  });
});
