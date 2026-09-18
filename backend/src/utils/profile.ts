/** Shape of UserProfile (src/types/index.ts) as received over the wire. Shared by
 * POST /api/eligibility/report and POST /api/schemes/recommended so both routes
 * score a scheme against a profile identically. */
export interface IncomingProfile {
  age?: string;
  gender?: string;
  state?: string;
  category?: string;
  occupation?: string;
  income?: string;
  land?: string;
  farmer?: string;
  education?: string;
  interests?: string[];
  profileTags?: string[];
}

export function buildInterestTags(profile: IncomingProfile): Set<string> {
  const interests = new Set<string>();
  (profile.interests ?? []).forEach((i) => interests.add(i.toLowerCase()));
  (profile.profileTags ?? []).forEach((i) => interests.add(i.toLowerCase()));
  if (profile.occupation) interests.add(profile.occupation.toLowerCase());
  if (profile.gender?.toLowerCase() === 'female') {
    interests.add('woman');
    interests.add('women');
  }
  if (profile.farmer?.toLowerCase() === 'yes') {
    interests.add('farmer');
    interests.add('farmers');
    interests.add('agriculture');
  }
  if (profile.education) interests.add(profile.education.toLowerCase());
  return interests;
}
