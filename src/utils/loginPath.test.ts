import { describe, it, expect } from 'vitest';
import { loginPath } from './loginPath';

describe('loginPath', () => {
  it('carries the page and its query, encoded, so login brings you back to the same search', () => {
    expect(loginPath('/search', '?q=farmer&topic=education')).toBe('/login?redirect=%2Fsearch%3Fq%3Dfarmer%26topic%3Deducation');
  });

  it('carries a scheme page', () => {
    expect(loginPath('/schemes/abc-123')).toBe('/login?redirect=%2Fschemes%2Fabc-123');
  });

  it('is plain on the home and login pages, where there is nothing to come back to', () => {
    for (const p of ['/', '/login', '/register']) expect(loginPath(p, '?redirect=%2Fhelp')).toBe('/login');
  });
});
