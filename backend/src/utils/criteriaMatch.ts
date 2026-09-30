/**
 * Matching of a profile value against a stored EligibilityCriteria string value.
 * Shared by POST /api/eligibility/report and POST /api/schemes/recommended so both
 * routes judge a profile identically.
 *
 * gender and category are stored as lowercase comma-separated SETS (for example
 * "sc,st" or "female", see ingestion/parseDemographics.ts), so the profile passes
 * when its value is IN the set. The other string fields (occupation, state,
 * landOwnership) are single values and still use a plain case-insensitive equality.
 */
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
