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
