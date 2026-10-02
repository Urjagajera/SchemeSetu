import type { Scheme, SchemeTranslation, Vocabulary } from '../types';

/** A minimal valid scheme; pass overrides for whatever a test cares about. */
export function makeScheme(overrides: Partial<Scheme> = {}): Scheme {
  return {
    id: 'scheme-1',
    name: 'Post Matric Scholarship',
    sourceUrl: 'https://example.gov.in/scheme-1',
    description: 'Details\nFinancial help for students.',
    level: 'Central',
    authorityName: 'Ministry of Education',
    tags: ['Student', 'Scholarship'],
    categories: ['Education'],
    category: 'Education',
    ministry: 'Ministry of Education',
    benefit: '',
    shortDesc: '',
    applyUrl: '',
    featured: false,
    ...overrides,
  };
}

export function makeTranslation(overrides: Partial<SchemeTranslation> = {}): SchemeTranslation {
  return { language: 'hi', status: 'ready', fields: {}, pendingFields: [], failedFields: [], ...overrides };
}

export function makeVocabulary(overrides: Partial<Vocabulary> = {}): Vocabulary {
  return { language: 'hi', names: {}, tags: {}, ...overrides };
}
