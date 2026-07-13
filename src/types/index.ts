export interface Scheme {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  categoryTextColor: string;
  ministry: string;
  level: 'Central' | 'State';
  status: string;
  benefit: string;
  deadline: string;
  deadlineUrgent?: boolean;
  shortDesc: string;
  description: string;
  eligibility: string[];
  documents: string[];
  applyUrl: string;
  tags: string[];
  image: string;
  featured: boolean;
  totalBeneficiaries: string;
  disbursed: string;
  matchScore?: number;
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
