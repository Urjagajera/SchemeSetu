// src/services/eligibilityEngine.ts
// Tag-based keyword matching engine — no numeric rules, no ML.
// Builds a keyword set from a Profile and scores each Scheme against it.

// ---- Vocabulary map for boolean Profile flags ----
// These are derived from inspecting the real 4,800-scheme CSV tag vocabulary.
export const BOOLEAN_FLAG_KEYWORDS: Record<string, string[]> = {
  farmer:     ['farmer', 'farmers', 'agriculture', 'agricultural', 'fisherman', 'fishermen', 'paddy', 'krishi', 'horticulture', 'animal husbandry', 'livestock', 'fish farming'],
  disability: ['disability', 'disabled', 'pwd', 'divyang', 'handicapped', 'differently abled'],
  minority:   ['scheduled caste', 'sc', 'obc', 'st', 'scheduled tribe', 'minority', 'backward class', 'bc', 'ews'],
  widow:      ['widow', 'widowed', 'widow pension'],
  veteran:    ['veteran', 'ex-serviceman', 'ex serviceman', 'defence', 'armed forces', 'military', 'army', 'navy', 'air force'],
};

// Occupation-to-keyword mapping derived from CSV tag vocabulary
const OCCUPATION_KEYWORDS: Record<string, string[]> = {
  student:       ['student', 'students', 'scholarship', 'education', 'fellowship', 'stipend', 'school', 'college', 'university', 'youth', 'internship'],
  farmer:        BOOLEAN_FLAG_KEYWORDS.farmer,
  entrepreneur:  ['entrepreneur', 'business', 'startup', 'start-up', 'msme', 'industry', 'self-employment', 'self employment', 'trader', 'retailer', 'enterprise'],
  'senior citizen': ['senior citizen', 'senior citizens', 'pension', 'old age', 'elderly'],
  unemployed:    ['unemployed', 'job seeker', 'unemployment', 'youth employment'],
};

export interface ProfileKeywords {
  keywords: Set<string>;
}

/**
 * Build a normalised lowercase keyword Set from a Profile object.
 * Called by the matching function with whatever profile fields exist.
 */
export function buildProfileKeywords(profile: {
  gender?: string;
  state?: string;
  category?: string;
  occupation?: string;
  education?: string;
  interests?: string[];
  minority?: boolean;
  disability?: boolean;
  farmer?: boolean;
  widow?: boolean;
  veteran?: boolean;
}): Set<string> {
  const kw = new Set<string>();

  // Interests / profile tags (user-selected keywords — highest signal)
  if (Array.isArray(profile.interests)) {
    profile.interests.forEach(i => kw.add(i.toLowerCase().trim()));
  }

  // Occupation
  if (profile.occupation) {
    const occ = profile.occupation.toLowerCase().trim();
    kw.add(occ);
    const mapped = OCCUPATION_KEYWORDS[occ];
    if (mapped) mapped.forEach(k => kw.add(k));
  }

  // Education
  if (profile.education) {
    kw.add(profile.education.toLowerCase().trim());
  }

  // Gender
  if (profile.gender) {
    const g = profile.gender.toLowerCase();
    if (g === 'female') {
      ['woman', 'women', 'girl', 'girls', 'female', 'mahila', 'kanya'].forEach(k => kw.add(k));
    }
  }

  // Profile category (e.g. "Student", "General") contributes directly
  if (profile.category) {
    kw.add(profile.category.toLowerCase().trim());
  }

  // Boolean flags
  if (profile.farmer)     BOOLEAN_FLAG_KEYWORDS.farmer.forEach(k => kw.add(k));
  if (profile.disability) BOOLEAN_FLAG_KEYWORDS.disability.forEach(k => kw.add(k));
  if (profile.minority)   BOOLEAN_FLAG_KEYWORDS.minority.forEach(k => kw.add(k));
  if (profile.widow)      BOOLEAN_FLAG_KEYWORDS.widow.forEach(k => kw.add(k));
  if (profile.veteran)    BOOLEAN_FLAG_KEYWORDS.veteran.forEach(k => kw.add(k));

  // State (contributes for location-based schemes)
  if (profile.state) {
    kw.add(profile.state.toLowerCase().trim());
  }

  return kw;
}

export interface SchemeMatchResult {
  schemeId: string;
  matchScore: number;       // number of distinct keyword hits
  matchedOn: string[];      // which keywords matched (deduped)
}

/**
 * Score a single scheme against a profile keyword set.
 * Checks (in order):
 *   1. Category names
 *   2. Tag names
 *   3. Eligibility string array (substring search)
 *   4. State/authority name match (bonus point)
 *
 * Returns null if matchScore === 0 (no match at all).
 */
export function scoreScheme(
  scheme: {
    id: string;
    authorityName: string;
    eligibility: string[];
    categories: Array<{ category: { name: string } }>;
    tags: Array<{ tag: { name: string } }>;
  },
  profileKeywords: Set<string>,
  profileState?: string
): SchemeMatchResult | null {
  const matched = new Set<string>();

  // 1. Category name match (case-insensitive)
  for (const sc of scheme.categories) {
    const catName = sc.category.name.toLowerCase();
    if (profileKeywords.has(catName)) {
      matched.add(sc.category.name);
    }
  }

  // 2. Tag name match — check if any profile keyword is a substring of the tag (or vice versa)
  for (const st of scheme.tags) {
    const tagName = st.tag.name.toLowerCase();
    for (const kw of profileKeywords) {
      if (tagName.includes(kw) || kw.includes(tagName)) {
        matched.add(st.tag.name);
        break;
      }
    }
  }

  // 3. Eligibility string array — substring match of profile keywords against each eligibility sentence
  for (const eligLine of scheme.eligibility) {
    const lineLower = eligLine.toLowerCase();
    for (const kw of profileKeywords) {
      if (lineLower.includes(kw)) {
        matched.add(kw); // record the keyword that matched, not the full sentence
        break;
      }
    }
  }

  // 4. State bonus: if user's state matches authorityName
  if (profileState && scheme.authorityName.toLowerCase().includes(profileState.toLowerCase())) {
    matched.add(`state:${scheme.authorityName}`);
  }

  if (matched.size === 0) return null;

  return {
    schemeId: scheme.id,
    matchScore: matched.size,
    matchedOn: Array.from(matched),
  };
}
