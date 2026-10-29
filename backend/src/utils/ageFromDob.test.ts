import { describe, it, expect } from 'vitest';
import { ageFromDob, currentAge } from './ageFromDob.js';

describe('ageFromDob', () => {
  it('counts whole years, turning over on the birthday itself', () => {
    expect(ageFromDob('1990-05-01', new Date('2026-04-30T12:00:00+05:30'))).toBe(35);
    expect(ageFromDob('1990-05-01', new Date('2026-05-01T12:00:00+05:30'))).toBe(36);
  });

  it('uses India\'s date, not the server\'s: the birthday starts at midnight IST', () => {
    // 18:29 UTC on 30 April is 23:59 in India: still the day before.
    expect(ageFromDob('1990-05-01', new Date('2026-04-30T18:29:00Z'))).toBe(35);
    // 18:30 UTC on 30 April is already 1 May in India, though it is still 30 April in UTC.
    expect(ageFromDob('1990-05-01', new Date('2026-04-30T18:30:00Z'))).toBe(36);
  });

  it('a baby born this year is 0', () => {
    expect(ageFromDob('2026-01-10', new Date('2026-10-29T12:00:00+05:30'))).toBe(0);
  });

  it('is null for a future date, an age over 150, or anything that is not YYYY-MM-DD', () => {
    const now = new Date('2026-10-29T12:00:00+05:30');
    expect(ageFromDob('2026-10-30', now)).toBeNull();
    expect(ageFromDob('1850-01-01', now)).toBeNull();
    for (const bad of ['', '12/05/1990', 'abc', null, undefined]) expect(ageFromDob(bad, now)).toBeNull();
  });
});

describe('currentAge', () => {
  const now = new Date('2026-10-29T12:00:00+05:30');

  it('follows the birthdate when there is one, even if the saved age is out of date', () => {
    expect(currentAge({ age: '30', dob: '1990-05-01' }, now)).toBe('36');
  });

  it('keeps the saved age for a profile with no birthdate (saved before birthdates were asked)', () => {
    expect(currentAge({ age: '30', dob: null }, now)).toBe('30');
  });

  it('is null when neither is known', () => {
    expect(currentAge({ age: null, dob: null }, now)).toBeNull();
  });
});
