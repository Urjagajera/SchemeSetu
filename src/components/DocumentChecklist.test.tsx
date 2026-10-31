import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  documentsHeld: [] as string[],
  get: vi.fn(),
  save: vi.fn(),
}));

vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS.en as unknown as Record<string, string>;
  return { useTranslation: () => ({ t: (key: string) => dict[key] ?? key, language: 'en' }) };
});
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated, profile: { documentsHeld: mocks.documentsHeld } }),
}));
vi.mock('../services/checklistService', () => ({ checklistService: { get: mocks.get, save: mocks.save } }));

import { DocumentChecklist } from './DocumentChecklist';

// A real list from the data, with a heading and a catch-all line.
const LINES = [
  'For the Application of the Welfare Scheme:',
  'Aadhaar Card.',
  'Caste Certificate',
  'Copy of tractor registration certificate (R.C.)',
  'Any other documents as required',
];

async function renderList(shown: string[] = LINES, url = '/schemes/s1') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <DocumentChecklist schemeId="s1" lines={LINES} shown={shown} />
    </MemoryRouter>,
  );
  await act(async () => {});
}
const box = (name: string) => screen.getByRole('checkbox', { name: new RegExp(name.replace(/[.()]/g, '\\$&')) }) as HTMLInputElement;
const ready = () => screen.getByTestId('docs-ready').textContent;

beforeEach(() => {
  mocks.isAuthenticated = true;
  mocks.documentsHeld = [];
  mocks.get.mockReset().mockResolvedValue({ checked: [], unchecked: [] });
  mocks.save.mockReset().mockImplementation(async (_id: string, ticks: unknown) => ticks);
});

describe('DocumentChecklist', () => {
  it('gives each document a tick box and counts only real documents, not the heading or the catch-all', async () => {
    await renderList();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByText('For the Application of the Welfare Scheme:')).not.toBeNull();
    expect(screen.getByText('Any other documents as required')).not.toBeNull();
    expect(ready()).toBe('0 of 3 ready');
  });

  it('ticks lines that match My documents, and says why', async () => {
    mocks.documentsHeld = ['aadhaar'];
    await renderList();
    expect(box('Aadhaar Card').checked).toBe(true);
    expect(box('Caste Certificate').checked).toBe(false);
    expect(screen.getByText('You said you have this')).not.toBeNull();
    expect(ready()).toBe('1 of 3 ready');
  });

  it('unticking a matched line saves it as unticked on purpose, so it stays unticked', async () => {
    mocks.documentsHeld = ['aadhaar'];
    await renderList();
    await act(async () => { fireEvent.click(box('Aadhaar Card')); });
    expect(mocks.save).toHaveBeenCalledWith('s1', { checked: [], unchecked: ['Aadhaar Card.'] });
    expect(box('Aadhaar Card').checked).toBe(false);
    expect(screen.queryByText('You said you have this')).toBeNull();
    expect(ready()).toBe('0 of 3 ready');
  });

  it('ticking a line by hand saves it, and unticking it again takes it off', async () => {
    await renderList();
    await act(async () => { fireEvent.click(box('Caste Certificate')); });
    expect(mocks.save).toHaveBeenLastCalledWith('s1', { checked: ['Caste Certificate'], unchecked: [] });
    expect(ready()).toBe('1 of 3 ready');
    await act(async () => { fireEvent.click(box('Caste Certificate')); });
    expect(mocks.save).toHaveBeenLastCalledWith('s1', { checked: [], unchecked: [] });
  });

  it('shows the ticks saved earlier', async () => {
    mocks.documentsHeld = ['aadhaar'];
    mocks.get.mockResolvedValue({ checked: ['Caste Certificate'], unchecked: ['Aadhaar Card.'] });
    await renderList();
    expect(mocks.get).toHaveBeenCalledWith('s1');
    expect(box('Caste Certificate').checked).toBe(true);
    expect(box('Aadhaar Card').checked).toBe(false);
  });

  it('puts the tick back and says so when saving fails', async () => {
    mocks.save.mockRejectedValue(new Error('offline'));
    await renderList();
    await act(async () => { fireEvent.click(box('Caste Certificate')); });
    expect(box('Caste Certificate').checked).toBe(false);
    expect(screen.getByRole('alert').textContent).toBe("Couldn't save your tick. Try again.");
  });

  it('for a guest, ticks work on the page but nothing is loaded or saved, and it offers to log in', async () => {
    mocks.isAuthenticated = false;
    await renderList(LINES, '/schemes/s1?x=1');
    await act(async () => { fireEvent.click(box('Caste Certificate')); });
    expect(box('Caste Certificate').checked).toBe(true);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Log in to keep your ticks.' }).getAttribute('href')).toBe('/login?redirect=%2Fschemes%2Fs1%3Fx%3D1');
  });

  it('a signed-in person with no My documents is pointed to them', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: /Add My documents/ }).getAttribute('href')).toBe('/profile?section=documents');
  });

  it('shows translated lines when they line up, but saves against the scheme\'s own lines', async () => {
    const hindi = ['आवेदन के लिए:', 'आधार कार्ड।', 'जाति प्रमाण पत्र', 'ट्रैक्टर पंजीकरण प्रमाणपत्र की प्रति', 'आवश्यकतानुसार अन्य दस्तावेज़'];
    await renderList(hindi);
    await act(async () => { fireEvent.click(box('जाति प्रमाण पत्र')); });
    expect(mocks.save).toHaveBeenCalledWith('s1', { checked: ['Caste Certificate'], unchecked: [] });
  });

  it('falls back to the scheme\'s own lines when the translation does not line up', async () => {
    await renderList(['only one translated line']);
    expect(screen.queryByText('only one translated line')).toBeNull();
    expect(box('Caste Certificate')).not.toBeNull();
  });

  it('on paper, lists what is still needed', async () => {
    mocks.documentsHeld = ['aadhaar'];
    await renderList();
    const missing = screen.getByTestId('docs-missing-print');
    expect(missing.className).toContain('print:block');
    expect(missing.textContent).toBe('Still neededCaste CertificateCopy of tractor registration certificate (R.C.)');
  });
});
