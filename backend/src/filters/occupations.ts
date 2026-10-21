/**
 * The Search page's occupation filter: "schemes meant for people who do this".
 *
 * Unlike gender or age (where a scheme stays unless its criteria rule the person OUT), occupation is a
 * relevance filter: picking "farmer" shows schemes FOR farmers. A scheme counts when either
 *   - its parsed criteria name that occupation (EligibilityCriteria.occupation, a comma-separated set), or
 *   - it carries one of the occupation's tags (case-insensitive).
 * Before this the filter guessed from keywords in the browser, one page at a time, so the count was wrong.
 *
 * The values are the profile form's occupations (Profile.tsx). "other" is not offered: it never narrowed
 * anything useful (it meant "matches none of the other keywords").
 */
export interface OccupationFilter {
  id: string;
  /** Value stored in EligibilityCriteria.occupation, when the parser can produce it. */
  criteriaValue: string | null;
  tags: readonly string[];
}

export const OCCUPATIONS: readonly OccupationFilter[] = [
  {
    id: 'student',
    criteriaValue: 'student',
    tags: ['Student', 'Learner', 'Scholarship', 'Girl Student', 'Female Student', 'Student Finance', 'Pre-Matric', 'Post-Matric'],
  },
  {
    id: 'farmer',
    criteriaValue: 'farmer',
    tags: ['Farmer', 'Cultivator', 'Farming', 'Agriculture', 'Fishermen', 'Fisherfolk', 'Fish Farmer', 'Fisherman', 'Aquaculture Farmer', 'Animal Husbandry'],
  },
  {
    id: 'entrepreneur',
    criteriaValue: 'entrepreneur',
    tags: ['Entrepreneur', 'Entrepreneurship', 'Business', 'Businessperson', 'Business Startup', 'MSMEs', 'Start Up', 'Startup', 'Self-employment', 'Enterprise'],
  },
  {
    id: 'employee',
    criteriaValue: 'employee',
    tags: ['Employee', 'Worker', 'Construction Worker', 'Building Worker', 'Labourer', 'Labour'],
  },
  {
    id: 'unemployed',
    criteriaValue: 'unemployed',
    tags: ['Unemployed', 'Jobless'],
  },
  {
    id: 'senior citizen',
    criteriaValue: null,
    tags: ['Senior Citizen', 'Old Age Person', 'Old Age'],
  },
];

const BY_ID = new Map(OCCUPATIONS.map((o) => [o.id, o]));

export function findOccupation(value: unknown): OccupationFilter | null {
  if (typeof value !== 'string') return null;
  return BY_ID.get(value.trim().toLowerCase().replace(/[_-]+/g, ' ')) ?? null;
}
