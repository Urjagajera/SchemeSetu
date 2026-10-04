import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LinkedText } from './LinkedText';

describe('LinkedText', () => {
  it('renders an address as a link that opens in a new tab without giving the other site access', () => {
    const { container } = render(<p><LinkedText text="Apply at https://www.standupmitra.in/Login/Register." /></p>);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://www.standupmitra.in/Login/Register');
    expect(a.getAttribute('target')).toBe('_blank');
    const rel = (a.getAttribute('rel') ?? '').split(/\s+/);
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    expect(a.textContent).toBe('https://www.standupmitra.in/Login/Register');
  });

  it('keeps the sentence\'s full stop outside the link, and the text around it unchanged', () => {
    const { container } = render(<p><LinkedText text="Apply at https://jeevanpramaan.gov.in." /></p>);
    expect(container.querySelector('a')!.textContent).toBe('https://jeevanpramaan.gov.in');
    expect(container.textContent).toBe('Apply at https://jeevanpramaan.gov.in.');
  });

  it('links every address, and only those that are http or https', () => {
    const { container } = render(
      <p>
        <LinkedText text={'One https://a.gov.in/x two www.b.gov.in three javascript:alert(1) four http://c.gov.in/y, five ftp://d.gov.in/z'} />
      </p>,
    );
    expect([...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://a.gov.in/x', 'http://c.gov.in/y']);
  });

  it('never turns scheme text into markup', () => {
    const { container } = render(<p><LinkedText text={'<img src=x onerror=alert(1)> <b>bold</b> https://a.gov.in/x'} /></p>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)> <b>bold</b>');
    expect(container.querySelectorAll('a')).toHaveLength(1);
  });

  it('renders text without any address as it is', () => {
    const { container } = render(<p><LinkedText text={'Step 1: Register.\nStep 2: Apply.'} /></p>);
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toBe('Step 1: Register.\nStep 2: Apply.');
  });
});
