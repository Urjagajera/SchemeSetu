import { describe, it, expect } from 'vitest';
import { ageFromDob } from './ageFromDob';

// Local dates, the way the browser sees "today".
const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('ageFromDob', () => {
  it('counts whole years, turning over on the birthday itself', () => {
    expect(ageFromDob('1990-05-01', on(2026, 4, 30))).toBe(35);
    expect(ageFromDob('1990-05-01', on(2026, 5, 1))).toBe(36);
    expect(ageFromDob('1990-05-01', on(2026, 5, 2))).toBe(36);
  });

  it('a later month this year is not a birthday yet, an earlier one is', () => {
    expect(ageFromDob('2000-12-31', on(2026, 6, 15))).toBe(25);
    expect(ageFromDob('2000-01-01', on(2026, 6, 15))).toBe(26);
  });

  it('a baby born this year is 0', () => {
    expect(ageFromDob('2026-01-10', on(2026, 10, 29))).toBe(0);
  });

  it('is null for a future date, an age over 150, or anything that is not YYYY-MM-DD', () => {
    expect(ageFromDob('2026-10-30', on(2026, 10, 29))).toBeNull();
    expect(ageFromDob('1850-01-01', on(2026, 10, 29))).toBeNull();
    for (const bad of ['', '12/05/1990', '1990-5-1', 'abc', null, undefined]) expect(ageFromDob(bad, on(2026, 10, 29))).toBeNull();
  });
});
