import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// A plain function (not vi.fn) stands in for the report service: vi.fn reports a rejected promise it returns as an
// error of the test, even when the component catches it, which is exactly the case tested below.
const fake = vi.hoisted(() => ({
  calls: [] as unknown[][],
  result: (): Promise<void> => Promise.resolve(),
}));
vi.mock('../services/reportService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/reportService')>()),
  reportService: {
    send: (...args: unknown[]) => {
      fake.calls.push(args);
      return fake.result();
    },
  },
}));

import { ReportScheme } from './ReportScheme';

const click = (el: Element) => act(async () => { fireEvent.click(el); });

beforeEach(() => {
  fake.calls = [];
  fake.result = () => Promise.resolve();
});

describe('ReportScheme', () => {
  it('opens a short form; Send stays off until a kind of problem is chosen', async () => {
    render(<ReportScheme schemeId="abc" />);
    expect(screen.queryByRole('radio')).toBeNull();
    await click(screen.getByRole('button', { name: /rpButton/ }));
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect((screen.getByRole('button', { name: 'rpSend' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('rpNoteHint')).toBeTruthy(); // the "no personal details" hint is shown
  });

  it('sends the scheme, the chosen problem and the note, then thanks the person', async () => {
    render(<ReportScheme schemeId="abc" />);
    await click(screen.getByRole('button', { name: /rpButton/ }));
    await click(screen.getByLabelText('rpReason_documents'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'The 7/12 extract is also accepted.' } });
    await click(screen.getByRole('button', { name: 'rpSend' }));
    expect(fake.calls).toEqual([['abc', 'documents', 'The 7/12 extract is also accepted.']]);
    expect(screen.getByRole('status').textContent).toContain('rpThanks');
  });

  it('says so when it could not be sent, and keeps the form', async () => {
    fake.result = () => Promise.reject(new Error('offline'));
    render(<ReportScheme schemeId="abc" />);
    await click(screen.getByRole('button', { name: /rpButton/ }));
    await click(screen.getByLabelText('rpReason_closed'));
    await click(screen.getByRole('button', { name: 'rpSend' }));
    expect(screen.getByRole('alert').textContent).toContain('rpFailed');
    expect(screen.getByRole('button', { name: 'rpSend' })).toBeTruthy();
  });
});
