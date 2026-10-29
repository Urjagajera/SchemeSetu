import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useTranslation } from './LanguageContext';

function Switch() {
  const { setLanguage } = useTranslation();
  return (
    <>
      <button onClick={() => setLanguage('hi')}>hi</button>
      <button onClick={() => setLanguage('gu')}>gu</button>
      <button onClick={() => setLanguage('en')}>en</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('the page language follows the chosen language (screen readers pick their voice from it)', () => {
  it('switches <html lang> to hi, gu and back to en', () => {
    render(<LanguageProvider><Switch /></LanguageProvider>);
    expect(document.documentElement.lang).toBe('en');
    act(() => screen.getByText('hi').click());
    expect(document.documentElement.lang).toBe('hi');
    act(() => screen.getByText('gu').click());
    expect(document.documentElement.lang).toBe('gu');
    act(() => screen.getByText('en').click());
    expect(document.documentElement.lang).toBe('en');
  });

  it('is right from the first render for a language saved from an earlier visit', () => {
    localStorage.setItem('schemesetu_lang', 'gu');
    render(<LanguageProvider><Switch /></LanguageProvider>);
    expect(document.documentElement.lang).toBe('gu');
  });
});
