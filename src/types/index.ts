/** Which scheme fields the server has translated (GET /api/schemes/:id?lang=hi). Missing fields are still English. */
export type TranslatedFieldKey = 'title' | 'description' | 'benefits' | 'eligibility' | 'documents' | 'applicationProcess';

export interface SchemeTranslation {
  language: 'hi' | 'gu';
  /** pending: still translating (poll again); partial: some fields failed and stay English; unavailable: translation is off. */
  status: 'ready' | 'pending' | 'partial' | 'unavailable';
  fields: Partial<Record<TranslatedFieldKey, string | string[]>>;
  pendingFields: TranslatedFieldKey[];
  failedFields: TranslatedFieldKey[];
}

export interface Scheme {
  id: string;
  name: string;
  sourceUrl: string;
  description: string;
  level: 'STATE' | 'CENTRAL' | 'Central' | 'State';
  authorityName: string;
  tags: string[];
  categories?: string[];

  // Compatibility properties
  category: string;
  ministry: string;
  benefit: string;
  shortDesc: string;
  applyUrl: string;
  featured: boolean;
  matchScore?: number;
  eligibility?: string[];
  documents?: string[];

  // Real CSV-sourced detail fields, returned by GET /api/schemes/:id. Absent in
  // mock mode, where the demo catalogue doesn't carry them.
  benefits?: string[];
  eligibilityRawText?: string[];
  documentRequirements?: string[];
  applicationMode?: string[];
  applicationProcess?: string | null;

  /** Criteria on file for this scheme that the user's profile couldn't answer (empty fields), e.g. ["Gender"]. */
  unverifiedCriteria?: string[];

  /** Present only on the single-scheme response, when a non-English language was requested. */
  translation?: SchemeTranslation;
  categoryColor?: string;
  categoryTextColor?: string;
  image?: string;
  status?: string;
}

export interface UserProfile {
  name?: string;
  email?: string;
  picture?: string;
  role?: 'user';
  sub?: string;
  age: string;
  dob?: string;
  gender: string;
  state: string;
  district?: string;
  category: string;
  occupation: string;
  income: string;
  residence: string;
  land: string;
  education: string;
  minority?: string;
  disability?: string;
  farmer?: string;
  widow?: string;
  veteran?: string;
  interests?: string[];
  profileTags?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: string;
}
