/**
 * Matching of a profile against stored EligibilityCriteria.
 * Shared by POST /api/eligibility/report and POST /api/schemes/recommended so both
 * routes judge a profile identically.
 *
 * gender and category are stored as lowercase comma-separated SETS (for example
 * "sc,st" or "female", see ingestion/parseDemographics.ts), so the profile passes
 * when its value is IN the set. The other string fields (occupation, state,
 * landOwnership) are single values and still use a plain case-insensitive equality.
 *
 * UNKNOWN IS NOT A FAILURE. A criterion the profile can't answer (the field is
 * empty or missing) is reported as "unknown": it never excludes a scheme, and the
 * routes surface it as a note ("set your profile to check this") instead.
 */
import { IncomingProfile } from './profile.js';

export type CriteriaStringField = 'gender' | 'category' | 'occupation' | 'state' | 'landOwnership';

const SET_FIELDS: ReadonlySet<CriteriaStringField> = new Set(['gender', 'category']);

function splitSet(criteriaValue: string): string[] {
  return criteriaValue
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the profile value satisfies the stored criteria value for this field. */
export function profileMatchesCriteria(field: CriteriaStringField, criteriaValue: string, profileValue: string): boolean {
  const profile = profileValue.trim().toLowerCase();

  if (!SET_FIELDS.has(field)) {
    return criteriaValue.trim().toLowerCase() === profile;
  }

  const allowed = splitSet(criteriaValue);
  const candidates = [profile];
  // The profile form only offers male / female / other; "other" is how a transgender user is recorded.
  if (field === 'gender' && profile === 'other') candidates.push('transgender');
  return allowed.some((a) => candidates.includes(a));
}

const CATEGORY_LABELS: Record<string, string> = { sc: 'SC', st: 'ST', obc: 'OBC', general: 'General' };

/** Human-readable form of a stored value for the eligibility report ("SC or ST", "female"). */
export function describeCriteriaValue(field: CriteriaStringField, criteriaValue: string): string {
  if (!SET_FIELDS.has(field)) return criteriaValue;
  const parts = splitSet(criteriaValue).map((v) => (field === 'category' ? CATEGORY_LABELS[v] ?? v : v));
  return parts.join(' or ');
}

/** The EligibilityCriteria columns the evaluator reads. */
export interface CriteriaRow {
  ageMin: number | null;
  ageMax: number | null;
  incomeMinAnnual: number | null;
  incomeMaxAnnual: number | null;
  gender: string | null;
  category: string | null;
  occupation: string | null;
  state: string | null;
  landOwnership: string | null;
}

export interface CriterionResult {
  /** What the profile would need to supply, e.g. "Gender", "Age". */
  label: string;
  status: 'passed' | 'failed' | 'unknown';
  message: string;
}

const hasValue = (v: string | undefined | null): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * Evaluates every criterion on file against the profile. Criteria the profile
 * can't answer come back as 'unknown' (one entry per field, not per bound).
 */
export function evaluateCriteria(criteria: CriteriaRow, profile: IncomingProfile): CriterionResult[] {
  const out: CriterionResult[] = [];
  const unknown = (label: string): CriterionResult => ({
    label,
    status: 'unknown',
    message: `${label}: add this to your profile to check`,
  });

  // ── age ──
  if (criteria.ageMin !== null || criteria.ageMax !== null) {
    const age = parseInt(profile.age ?? '', 10);
    if (isNaN(age)) {
      out.push(unknown('Age'));
    } else {
      if (criteria.ageMin !== null) {
        out.push(
          age >= criteria.ageMin
            ? { label: 'Age', status: 'passed', message: `Age ≥ ${criteria.ageMin}` }
            : { label: 'Age', status: 'failed', message: `Age must be at least ${criteria.ageMin}` },
        );
      }
      if (criteria.ageMax !== null) {
        out.push(
          age <= criteria.ageMax
            ? { label: 'Age', status: 'passed', message: `Age ≤ ${criteria.ageMax}` }
            : { label: 'Age', status: 'failed', message: `Age must be at most ${criteria.ageMax}` },
        );
      }
    }
  }

  // ── income ──
  if (criteria.incomeMinAnnual !== null || criteria.incomeMaxAnnual !== null) {
    const income = parseInt(profile.income ?? '', 10);
    if (isNaN(income)) {
      out.push(unknown('Annual income'));
    } else {
      if (criteria.incomeMinAnnual !== null) {
        out.push(
          income >= criteria.incomeMinAnnual
            ? { label: 'Annual income', status: 'passed', message: 'Income meets minimum' }
            : { label: 'Annual income', status: 'failed', message: `Annual income must be at least ₹${criteria.incomeMinAnnual}` },
        );
      }
      if (criteria.incomeMaxAnnual !== null) {
        out.push(
          income <= criteria.incomeMaxAnnual
            ? { label: 'Annual income', status: 'passed', message: 'Income within limit' }
            : { label: 'Annual income', status: 'failed', message: `Annual income must not exceed ₹${criteria.incomeMaxAnnual}` },
        );
      }
    }
  }

  // ── string fields ──
  const stringChecks: Array<[CriteriaStringField, string | null, string | undefined, string]> = [
    ['gender', criteria.gender, profile.gender, 'Gender'],
    ['category', criteria.category, profile.category, 'Social category'],
    ['occupation', criteria.occupation, profile.occupation, 'Occupation'],
    ['state', criteria.state, profile.state, 'State residency'],
    ['landOwnership', criteria.landOwnership, profile.land, 'Land ownership'],
  ];
  for (const [field, criteriaValue, profileValue, label] of stringChecks) {
    if (criteriaValue === null) continue;
    if (!hasValue(profileValue)) {
      out.push(unknown(label));
      continue;
    }
    const wanted = describeCriteriaValue(field, criteriaValue);
    out.push(
      profileMatchesCriteria(field, criteriaValue, profileValue)
        ? { label, status: 'passed', message: `${label} matches (${wanted})` }
        : { label, status: 'failed', message: `${label} must be ${wanted}` },
    );
  }

  return out;
}

/** Distinct labels of the criteria the profile couldn't answer. */
export function unverifiedLabels(results: CriterionResult[]): string[] {
  return Array.from(new Set(results.filter((r) => r.status === 'unknown').map((r) => r.label)));
}
