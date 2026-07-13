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
  title: string;
  category: string;
  ministry: string;
  benefit: string;
  deadline: string;
  deadlineUrgent?: boolean;
  shortDesc: string;
  applyUrl: string;
  featured: boolean;
  totalBeneficiaries: string;
  disbursed: string;
  matchScore?: number;
  eligibility?: string[];
  documents?: string[];
  categoryColor?: string;
  categoryTextColor?: string;
  image?: string;
  status?: string;
}

export interface UserProfile {
  name?: string;
  email?: string;
  picture?: string;
  role?: 'user' | 'admin';
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
