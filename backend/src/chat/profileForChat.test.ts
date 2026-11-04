import { describe, it, expect, vi } from 'vitest';
import type { Profile } from '@prisma/client';
import { profileForChat, CHAT_PROFILE_FIELDS } from './profileForChat.js';

const row = (over: Partial<Profile> = {}): Profile =>
  ({
    id: 'p1', userId: 'u1', age: '30', dob: null, gender: 'female', occupation: 'farmer', education: null, income: '90000',
    category: 'sc', state: 'Gujarat', district: 'Anand', residence: 'rural', minority: null, disability: 'no', farmer: 'yes',
    widow: null, veteran: null, land: 'yes', profileTags: ['Farmer'], documentsHeld: ['aadhaar'], createdAt: new Date(), updatedAt: new Date(),
    ...over,
  }) as Profile;

describe('profileForChat: only answers that decide eligibility reach SetuAI', () => {
  it('keeps the answered eligibility fields', () => {
    expect(profileForChat(row())).toEqual({
      age: '30', gender: 'female', occupation: 'farmer', income: '90000', category: 'sc', state: 'Gujarat',
      residence: 'rural', disability: 'no', farmer: 'yes', land: 'yes',
    });
  });

  it('never the district, date of birth, interests, documents or ids', () => {
    const out = JSON.stringify(profileForChat(row({ dob: '1990-05-01' })));
    for (const s of ['Anand', '1990-05-01', 'Farmer"', 'aadhaar', 'p1', 'u1']) expect(out, s).not.toContain(s);
  });

  it('the list of fields has nothing that names or reaches a person', () => {
    expect(CHAT_PROFILE_FIELDS.join(' ')).not.toMatch(/name|email|phone|address|district|dob|google|picture|aadhaar/i);
  });

  it('works the age out from a date of birth, so a stale saved age is not sent', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T12:00:00+05:30'));
    try {
      expect(profileForChat(row({ age: '30', dob: '1958-01-01' }))?.age).toBe('68');
    } finally {
      vi.useRealTimers();
    }
  });

  it('is null for no profile, or one with nothing answered', () => {
    expect(profileForChat(null)).toBeNull();
    const empty = Object.fromEntries(CHAT_PROFILE_FIELDS.map((f) => [f, null]));
    expect(profileForChat(row({ ...empty, district: 'Anand' } as Partial<Profile>))).toBeNull();
  });
});
