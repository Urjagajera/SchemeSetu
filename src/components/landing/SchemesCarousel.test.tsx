import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeScheme } from '../../test/factories';

const getFeaturedSchemes = vi.hoisted(() => vi.fn());
vi.mock('../../services/schemeService', () => ({ schemeService: { getFeaturedSchemes } }));

import { SchemesCarousel } from './SchemesCarousel';

beforeEach(() => {
  // jsdom has no IntersectionObserver, which the scroll-into-view animation asks for
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  getFeaturedSchemes.mockReset();
});

describe('SchemesCarousel (landing page cards)', () => {
  it('does not open a card\'s text with the source "Details" heading', async () => {
    getFeaturedSchemes.mockResolvedValue([
      makeScheme({ id: 'a', name: 'Scholarship Scheme', shortDesc: 'Details\nHelp with fees for students...', description: 'Details\nHelp with fees for students.' }),
    ]);
    render(
      <MemoryRouter>
        <SchemesCarousel />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText('Scholarship Scheme')).not.toBeNull());
    expect(screen.queryByText('Help with fees for students...')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/Details\s*Help with fees/);
  });

  it('falls back to the start of the description, again without the heading', async () => {
    getFeaturedSchemes.mockResolvedValue([makeScheme({ id: 'b', name: 'Pension Scheme', shortDesc: '', description: 'Details\nMonthly pension for senior citizens.' })]);
    render(
      <MemoryRouter>
        <SchemesCarousel />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText('Pension Scheme')).not.toBeNull());
    expect(screen.queryByText('Monthly pension for senior citizens.')).not.toBeNull();
  });
});
