/**
 * The "Overall match" percentage, worked out ONE way for both the eligibility card (POST /api/eligibility/report)
 * and the order of the recommended list (POST /api/schemes/recommended), so a scheme the card calls 100% is
 * never listed below one it calls 20%.
 *
 *   - criteria on file and at least one answered: share of the answered hard criteria that pass
 *   - criteria on file but none answered: 0 (the card shows "—": nothing could be checked)
 *   - no criteria: share of the scheme's tags that match the profile's interests
 */
export interface MatchInput {
  /** Hard criteria the profile could answer. */
  structuredChecked: number;
  structuredPassed: number;
  /** Hard criteria on file that the profile left blank. */
  unverifiedCount: number;
  tagMatchCount: number;
  tagCount: number;
}

export function matchPercent(m: MatchInput): number {
  if (m.structuredChecked > 0) return Math.round((m.structuredPassed / m.structuredChecked) * 100);
  if (m.unverifiedCount > 0) return 0;
  return Math.round((m.tagMatchCount / (m.tagCount || 1)) * 100);
}
