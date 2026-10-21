/**
 * The Search filter vocabulary on the app side. The real lists (with scheme counts) come from
 * GET /api/schemes/filters; these are the fallbacks for mock mode or a failed request, and the old
 * Home-page category values that a /search?category=... link may still carry.
 *
 * Topic ids and aliases MUST stay the same as backend/src/filters/topics.ts (a test compares them).
 */
export const TOPIC_IDS = [
  'education', 'agriculture', 'business', 'jobs', 'workers', 'health', 'insurance', 'pension',
  'women', 'disability', 'housing', 'culture', 'loans', 'welfare', 'research', 'exservicemen',
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

/** Old category values (lower-case) -> topic. Same aliases as the backend. */
export const TOPIC_ALIASES: Record<string, TopicId> = {
  education: 'education', scholarships: 'education', student: 'education',
  agriculture: 'agriculture', farmer: 'agriculture', farming: 'agriculture',
  business: 'business', entrepreneur: 'business',
  employment: 'jobs', jobs: 'jobs',
  workers: 'workers', labour: 'workers',
  health: 'health', healthcare: 'health',
  insurance: 'insurance',
  'senior citizens': 'pension', pension: 'pension', pensions: 'pension',
  'women & child': 'women', 'women and child': 'women', women: 'women',
  disability: 'disability',
  housing: 'housing',
  culture: 'culture', sports: 'culture',
  loans: 'loans', credit: 'loans', 'farmer loans': 'loans',
  'social welfare': 'welfare',
  research: 'research', awards: 'research',
  'ex-servicemen': 'exservicemen', defence: 'exservicemen',
};

export function toTopicId(value: string): TopicId | null {
  const key = value.trim().toLowerCase();
  if ((TOPIC_IDS as readonly string[]).includes(key)) return key as TopicId;
  return TOPIC_ALIASES[key] ?? null;
}

/** The profile form's occupations that the filter can use ("other" never narrowed anything). */
export const OCCUPATION_IDS = ['student', 'farmer', 'entrepreneur', 'employee', 'unemployed', 'senior citizen'] as const;

export const GENDER_IDS = ['male', 'female', 'other'] as const;
export const SOCIAL_CATEGORY_IDS = ['general', 'sc', 'st', 'obc'] as const;

/** Same upper bound the backend accepts. */
export const MAX_FILTER_AGE = 120;
