import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict.en[key] || key, language: 'en' }) };
});

import { Hero } from './Hero';
import { TRANSLATIONS } from '../constants/translations';

const en = (TRANSLATIONS as unknown as Record<string, Record<string, string>>).en;
const Where = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
};
const renderHero = () => render(<MemoryRouter><Hero /><Where /></MemoryRouter>);
const where = () => screen.getByTestId('where').textContent;

describe('the home page search box and chips open Search, not the login page', () => {
  it('searches for what was typed', () => {
    renderHero();
    const box = document.querySelector('form input') as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'widow pension' } });
    fireEvent.submit(box.closest('form')!);
    expect(where()).toBe('/search?q=widow%20pension');
  });

  it('opens plain Search when nothing was typed', () => {
    renderHero();
    fireEvent.submit(document.querySelector('form')!);
    expect(where()).toBe('/search');
  });

  it.each([
    ['scholarships', '/search?topic=education'],
    ['pensions', '/search?topic=pension'],
    ['farmerLoans', '/search?topic=agriculture'],
    ['healthInsurance', '/search?topic=health'],
  ])('the %s chip opens that topic', (key, path) => {
    renderHero();
    fireEvent.click(screen.getByRole('button', { name: en[key] }));
    expect(where()).toBe(path);
  });
});
