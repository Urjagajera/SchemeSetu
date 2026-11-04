import type { Profile } from '@prisma/client';
import { currentAge } from '../utils/ageFromDob.js';

/**
 * The profile details SetuAI may use (and send to Groq) to suggest schemes: only answers that decide eligibility.
 * Never the name, email, Google id, photo, date of birth (the age is enough) or district (the state is enough);
 * none of those live on Profile except dob and district, and this list is the only way profile data reaches the chat.
 */
export const CHAT_PROFILE_FIELDS = [
  'age',
  'gender',
  'state',
  'residence',
  'category',
  'occupation',
  'income',
  'education',
  'minority',
  'disability',
  'farmer',
  'widow',
  'veteran',
  'land',
] as const;

export type ChatProfile = Partial<Record<(typeof CHAT_PROFILE_FIELDS)[number], string>>;

/** The answered eligibility fields of a stored profile; null when none are answered. */
export function profileForChat(row: Profile | null): ChatProfile | null {
  if (!row) return null;
  const out: ChatProfile = {};
  for (const field of CHAT_PROFILE_FIELDS) {
    const value = field === 'age' ? currentAge(row) : row[field];
    if (typeof value === 'string' && value.trim() !== '') out[field] = value.trim();
  }
  return Object.keys(out).length > 0 ? out : null;
}
