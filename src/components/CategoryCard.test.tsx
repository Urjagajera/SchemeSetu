import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryCard } from './CategoryCard';

const renderCard = (props: Partial<React.ComponentProps<typeof CategoryCard>> = {}) =>
  render(
    <MemoryRouter>
      <CategoryCard iconName="school" label="Education" categoryValue="Education & Learning" {...props} />
    </MemoryRouter>,
  );

describe('CategoryCard', () => {
  it('is a link to Search for its category by default', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Education' }).getAttribute('href')).toBe('/search?category=Education%20%26%20Learning');
  });

  it('goes where it is told to', () => {
    renderCard({ to: '/search?topic=education' });
    expect(screen.getByRole('link', { name: 'Education' }).getAttribute('href')).toBe('/search?topic=education');
  });

  it('a decorative copy is skipped by the keyboard and hidden from screen readers', () => {
    const { container } = renderCard({ decorative: true });
    const link = container.querySelector('a')!;
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(link.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('a normal card can be tabbed to', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Education' });
    expect(link.hasAttribute('tabindex')).toBe(false);
    expect(link.hasAttribute('aria-hidden')).toBe(false);
  });
});
