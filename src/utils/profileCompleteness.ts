import type { UserProfile } from '../types';
import type { TRANSLATIONS } from '../constants/translations';

/**
 * The profile answers the eligibility check needs. ONE list for the dashboard's completeness bar and for the
 * Eligibility page, which asks for these before it shows any results.
 */
export const ELIGIBILITY_FIELDS = ['age', 'gender', 'state', 'category', 'occupation', 'income', 'residence'] as const;

export type EligibilityField = (typeof ELIGIBILITY_FIELDS)[number];

/** What each field is called on screen (locale keys). */
export const ELIGIBILITY_FIELD_LABELS: Record<EligibilityField, keyof (typeof TRANSLATIONS)['en']> = {
  age: 'pfAge',
  gender: 'genderLabel',
  state: 'stateLabel',
  category: 'socialCategory',
  occupation: 'occupationLabel',
  income: 'pfFIncome',
  residence: 'residence',
};

export interface Completeness {
  percentage: number;
  missing: EligibilityField[];
  isComplete: boolean;
}

export function profileCompleteness(profile: Partial<UserProfile> | null | undefined): Completeness {
  const missing = ELIGIBILITY_FIELDS.filter((f) => {
    const value = profile?.[f];
    return value === undefined || value === null || String(value).trim() === '';
  });
  const percentage = Math.round(((ELIGIBILITY_FIELDS.length - missing.length) / ELIGIBILITY_FIELDS.length) * 100);
  return { percentage, missing, isComplete: missing.length === 0 };
}
