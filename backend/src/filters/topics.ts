/**
 * Topics: what a scheme is ABOUT, for the Search page's "What you need" filter.
 *
 * The data has no topic column. The Category table only repeats the authority (a ministry or a state), so a
 * topic is defined here as a fixed list of tag names (matched case-insensitively). The tag names are the
 * spellings that survived the tag clean-up (see ingestion/tagRenames.ts); a scheme can sit in several topics.
 *
 * `aliases` are the old Home-page category values ("Education", "Healthcare"...) so links like
 * /search?category=Education still land on a topic instead of matching nothing.
 */
export interface Topic {
  id: string;
  tags: readonly string[];
  aliases: readonly string[];
}

export const TOPICS: readonly Topic[] = [
  {
    id: 'education',
    aliases: ['education', 'scholarships', 'student'],
    tags: [
      'Student', 'Learner', 'Scholarship', 'Stipend', 'Education', 'Schooling', 'School', 'Higher Education',
      'Post-Secondary Education', 'Fellowship', 'Study', 'College', 'Pre-Matric', 'Post-Matric', 'Coaching', 'Tutoring',
      'Hostel', 'Girl Student', 'Female Student', 'Graduation', 'Undergraduate', 'Post-Graduation', 'Postgraduate',
      'Post Graduate', 'Tuition Fee', 'Education Loan', 'Student Finance', 'Diploma', 'Technical Education', 'ITI',
    ],
  },
  {
    id: 'agriculture',
    aliases: ['agriculture', 'farmer', 'farming'],
    tags: [
      'Farmer', 'Agriculture', 'Cultivator', 'Farming', 'Animal Husbandry', 'Livestock Rearing', 'Livestock', 'Fishery',
      'Fishermen', 'Fish', 'Fisherfolk', 'Fish Farming', 'Aquaculture', 'Fish Farmer', 'Aquaculture Farmer',
      'Fish Production', 'Fisherman', 'Horticulture', 'Fruit & Vegetable Farming', 'Crop', 'Seed', 'Irrigation',
      'Poultry Farming', 'Milk Production',
    ],
  },
  {
    id: 'business',
    aliases: ['business', 'entrepreneur'],
    tags: [
      'Business', 'Enterprise', 'Entrepreneurship', 'Business Startup', 'MSMEs', 'Entrepreneur', 'Self-employment',
      'Businessperson', 'Micro Small Medium Enterprises', 'Industry', 'Manufacturing', 'Start Up', 'Startup',
      'Capital Investment', 'Innovation', 'Novel Idea', 'Company', 'Trade Fair', 'Marketing', 'Business & Entrepreneurship',
    ],
  },
  {
    id: 'jobs',
    aliases: ['employment', 'jobs'],
    tags: [
      'Employment', 'Job', 'Training', 'Skill Development', 'Vocational Training', 'Internship', 'Apprenticeship', 'Skill',
      'Vocational Skill', 'Unemployed', 'Jobless', 'Livelihood',
    ],
  },
  {
    id: 'workers',
    aliases: ['workers', 'labour'],
    tags: ['Construction Worker', 'Building Worker', 'Labour', 'Workforce', 'Worker', 'Labourer', 'Employee'],
  },
  {
    id: 'health',
    aliases: ['health', 'healthcare'],
    tags: [
      'Health', 'Healthcare', 'Medical', 'Hospital', 'Disease', 'Medical Facility', 'Medical Treatment', 'Patient',
      'Treatment',
    ],
  },
  {
    id: 'insurance',
    aliases: ['insurance'],
    tags: ['Insurance', 'Coverage', 'Accident', 'Mishap', 'Death', 'Demise', 'Funeral', 'Last Rites'],
  },
  {
    id: 'pension',
    aliases: ['senior citizens', 'pension', 'pensions'],
    tags: ['Pension', 'Retirement Benefit', 'Social Security', 'Senior Citizen', 'Old Age Person', 'Old Age'],
  },
  {
    id: 'women',
    aliases: ['women & child', 'women and child', 'women'],
    tags: [
      'Women', 'Woman', 'Widow', 'Widowed Woman', 'Girl Child', 'Girl', 'Daughter', 'Children', 'Child', 'Maternity',
      'Motherhood', 'Pregnant', 'Pregnancy', 'Female', 'Women Empowerment',
    ],
  },
  {
    id: 'disability',
    aliases: ['disability'],
    tags: [
      'Disability', 'Handicap', 'Differently Abled', 'Person With Disability', 'Differently Abled Person',
      'Persons With Disability', 'Divyang', 'PensionPwD',
    ],
  },
  {
    id: 'housing',
    aliases: ['housing'],
    tags: ['Housing', 'Shelter', 'House'],
  },
  {
    id: 'culture',
    aliases: ['culture', 'sports'],
    tags: [
      'Artist', 'Artiste', 'Culture', 'Cultural', 'Artisan', 'Handicraft', 'Craftsperson', 'Weaver', 'Handloom', 'Music',
      'Heritage', 'Sports', 'Athletics', 'Sportsperson',
    ],
  },
  {
    id: 'loans',
    aliases: ['loans', 'credit', 'farmer loans'],
    tags: ['Loan', 'Credit', 'Interest Subsidy', 'Interest Rebate', 'Education Loan', 'Banking'],
  },
  {
    id: 'welfare',
    aliases: ['social welfare'],
    tags: [
      'Social Welfare', 'Upliftment', 'Below Poverty Line', 'BPL', 'Scheduled Caste', 'SC', 'Scheduled Tribe', 'ST',
      'Backward Classes', 'Other Backward Class', 'OBC', 'Minority', 'Minority Community', 'Tribal', 'Tribal Welfare',
      'Inter Caste', 'Transgender', 'Third Gender', 'Destitute', 'Orphan', 'Marriage', 'Wedding',
    ],
  },
  {
    id: 'research',
    aliases: ['research', 'awards'],
    tags: [
      'Research', 'Research Grant', 'Researcher', 'Scientist', 'Science', 'Scientific', 'Award', 'Prize', 'Cash Prize',
      'Contest', 'Competition',
    ],
  },
  {
    id: 'exservicemen',
    aliases: ['ex-servicemen', 'defence'],
    tags: ['Ex-Serviceman', 'Ex-servicemen', 'Veteran', 'Sainik'],
  },
];

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));
const BY_ALIAS = new Map(TOPICS.flatMap((t) => t.aliases.map((a) => [a, t] as const)));

/** The topic a filter value names (its id, or an old category alias), or null. */
export function findTopic(value: unknown): Topic | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  return BY_ID.get(key) ?? BY_ALIAS.get(key) ?? null;
}
