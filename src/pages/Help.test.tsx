import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { Help } from './Help';

const question = () => screen.getByRole('button', { name: 'faqQ1' });

describe('Help FAQ', () => {
  it('each question is a button that says whether its answer is open, and which answer it controls', () => {
    render(<Help />);
    expect(question().getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(question());
    expect(question().getAttribute('aria-expanded')).toBe('true');
    const answer = document.getElementById(question().getAttribute('aria-controls')!);
    expect(answer?.textContent).toBe('faqA1');
    fireEvent.click(question());
    expect(question().getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('faqA1')).toBeNull();
  });

  it('clicking inside an open answer (to select or copy it) does not close it', () => {
    render(<Help />);
    fireEvent.click(question());
    fireEvent.click(screen.getByText('faqA1'));
    expect(screen.getByText('faqA1')).not.toBeNull();
  });
});
