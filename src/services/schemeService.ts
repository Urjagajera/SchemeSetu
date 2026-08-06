import axios from 'axios';
import { Scheme, UserProfile } from '../types';
import { SCHEMES } from '../constants/schemesData';

const API_URL = '/api/schemes';
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

/**
 * Guards against Vite's SPA HTML fallback being mistaken for valid API data.
 */
function assertJsonArray<T>(data: unknown, context: string): T[] {
  if (
    data === null ||
    data === undefined ||
    typeof data === 'string' ||
    !Array.isArray(data)
  ) {
    throw new Error(
      `[schemeService.${context}] Invalid response — expected JSON array, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T[];
}

function assertJsonObject<T>(data: unknown, context: string): T {
  if (
    data === null ||
    data === undefined ||
    typeof data === 'string' ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error(
      `[schemeService.${context}] Invalid response — expected JSON object, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T;
}

function enrichScheme(scheme: Scheme): Scheme {
  const isState = scheme.level === 'STATE' || scheme.level === 'State' || scheme.authorityName?.toLowerCase() === 'gujarat';

  // Generate stable deadline
  let deadline = scheme.deadline;
  if (!deadline || deadline === 'Ongoing') {
    let hash = 0;
    const idStr = scheme.id || '';
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const days = Math.abs(hash % 28) + 1;
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthStr = months[Math.abs(hash >> 4) % 12];
    const years = [2026, 2027];
    const year = years[Math.abs(hash >> 8) % 2];
    const dayStr = days < 10 ? `0${days}` : `${days}`;
    deadline = `${dayStr}-${monthStr}-${year}`;
  }

  // Generate eligibility keys
  const eligibility: string[] = [];
  if (isState) {
    eligibility.push('residentOfGujarat');
  } else {
    eligibility.push('citizenOfIndia');
  }

  const categoryLower = (scheme.category || '').toLowerCase();
  const tagsLower = (scheme.tags || []).map((t: string) => t.toLowerCase());

  if (categoryLower === 'student' || tagsLower.includes('student') || tagsLower.includes('students')) {
    eligibility.push('enrolledInInstitution');
    eligibility.push('maintainAttendance');
  } else if (categoryLower === 'farmer' || tagsLower.includes('farmer') || tagsLower.includes('farmers') || tagsLower.includes('agriculture')) {
    eligibility.push('activeFarmer');
    eligibility.push('validFarmerCard');
  } else if (categoryLower === 'woman' || categoryLower === 'women & child' || tagsLower.includes('woman') || tagsLower.includes('women')) {
    eligibility.push('femaleOnly');
  }

  if (tagsLower.includes('disability') || tagsLower.includes('pwd') || tagsLower.includes('disabled')) {
    eligibility.push('disabilityCertificate');
  }

  eligibility.push('incomeLimit');

  // Generate required document keys
  const documents: string[] = ['aadhaarCard', 'passportPhoto'];
  if (isState) {
    documents.push('domicileProof');
  } else {
    documents.push('identityProof');
  }
  
  documents.push('incomeCertificate');

  if (categoryLower === 'student' || tagsLower.includes('student') || tagsLower.includes('students')) {
    documents.push('schoolId');
    documents.push('marksheet');
    documents.push('feeReceipt');
  } else if (categoryLower === 'farmer' || tagsLower.includes('farmer') || tagsLower.includes('farmers') || tagsLower.includes('agriculture')) {
    documents.push('landRecords');
    documents.push('farmerCard');
  }

  if (tagsLower.includes('disability') || tagsLower.includes('pwd') || tagsLower.includes('disabled')) {
    documents.push('disabilityCard');
  }
  
  documents.push('bankPassbook');

  return {
    ...scheme,
    deadline,
    eligibility,
    documents
  };
}

function mapDbSchemeToFrontend(dbScheme: any): Scheme {
  const tags = dbScheme.tags?.map((t: any) => t.tag?.name || t.name || t) || [];
  const categories = dbScheme.categories?.map((c: any) => c.category?.name || c.name || c) || [];
  const category = categories[0] || 'General';

  return enrichScheme({
    id: dbScheme.id,
    name: dbScheme.name,
    title: dbScheme.name,
    description: dbScheme.description,
    shortDesc: dbScheme.description.substring(0, 150) + (dbScheme.description.length > 150 ? '...' : ''),
    level: dbScheme.level === 'STATE' || dbScheme.level === 'State' ? 'State' : 'Central',
    authorityName: dbScheme.authorityName,
    ministry: dbScheme.authorityName,
    sourceUrl: dbScheme.sourceUrl,
    applyUrl: dbScheme.sourceUrl,
    tags,
    categories,
    category,
    categoryColor: 'zinc-100',
    categoryTextColor: 'zinc-800',
    benefit: 'Refer to official portal',
    deadline: 'Ongoing',
    featured: false,
    totalBeneficiaries: 'N/A',
    disbursed: 'N/A',
    matchScore: dbScheme.matchScore
  });
}

function getLocalSchemes(filters?: { query?: string; category?: string; level?: string; sort?: string }): Scheme[] {
  let result = [...SCHEMES].map(enrichScheme);

  if (filters?.category && filters.category !== '') {
    const catLower = filters.category.toLowerCase();
    result = result.filter(s => s.categories?.some(c => c.toLowerCase() === catLower) || s.category.toLowerCase() === catLower);
  }

  if (filters?.query && filters.query !== '') {
    const q = filters.query.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.authorityName.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  if (filters?.level && filters.level !== '') {
    const lvlLower = filters.level.toLowerCase();
    result = result.filter(s => s.level.toLowerCase() === lvlLower);
  }

  if (filters?.sort) {
    if (filters.sort === 'Deadline Approaching') {
      result.sort((a, b) => {
        if (a.deadlineUrgent && !b.deadlineUrgent) return -1;
        if (!a.deadlineUrgent && b.deadlineUrgent) return 1;
        return a.deadline.localeCompare(b.deadline);
      });
    }
  }

  return result;
}

function getLocalSchemeById(id: string): Scheme | null {
  const localScheme = SCHEMES.find(s => s.id === id) ?? null;
  return localScheme ? enrichScheme(localScheme) : null;
}

function getLocalFeaturedSchemes(): Scheme[] {
  return SCHEMES.filter(s => s.featured).map(enrichScheme);
}

function getLocalCategories(): string[] {
  const cats = new Set<string>();
  SCHEMES.forEach(s => {
    if (s.categories) {
      s.categories.forEach(c => cats.add(c));
    }
    if (s.category) {
      cats.add(s.category);
    }
  });
  return Array.from(cats).filter(Boolean).sort();
}

function getLocalStates(): string[] {
  const states = new Set<string>();
  SCHEMES.forEach(s => {
    if (s.authorityName) {
      // Filter out common central authority names to keep only actual states/territories
      const name = s.authorityName.trim();
      const isCentral = name.toLowerCase().startsWith('ministry') || 
                        name.toLowerCase().startsWith('department') ||
                        name.toLowerCase() === 'central government' ||
                        name.toLowerCase() === 'central';
      if (!isCentral) {
        states.add(name);
      }
    }
  });
  return Array.from(states).sort();
}

function getLocalEligibleSchemes(profile: UserProfile): Scheme[] {
  // Collect user interests
  const interests = new Set<string>();
  if (profile.interests && Array.isArray(profile.interests)) {
    profile.interests.forEach(i => interests.add(i.toLowerCase()));
  }
  if (profile.profileTags && Array.isArray(profile.profileTags)) {
    profile.profileTags.forEach(i => interests.add(i.toLowerCase()));
  }

  // Add default demographic tags for robust relevance
  if (profile.occupation) interests.add(profile.occupation.toLowerCase());
  if (profile.gender === 'female') {
    interests.add('woman');
    interests.add('women');
  }
  if (profile.farmer === 'yes') {
    interests.add('farmer');
    interests.add('farmers');
    interests.add('agriculture');
  }
  if (profile.education) interests.add(profile.education.toLowerCase());

  const results: Scheme[] = [];

  SCHEMES.forEach(scheme => {
    let matchCount = 0;
    scheme.tags.forEach(t => {
      if (interests.has(t.toLowerCase())) {
        matchCount++;
      }
    });

    if (matchCount > 0) {
      results.push(enrichScheme({ ...scheme, matchScore: matchCount }));
    }
  });

  return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

const getActiveLang = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('schemesetu_lang') || 'en';
  }
  return 'en';
};

export const schemeService = {
  async getSchemes(filters?: { query?: string; category?: string; level?: string; sort?: string }): Promise<Scheme[]> {
    if (isMockMode) {
      return getLocalSchemes(filters);
    }
    try {
      const response = await axios.get(API_URL, {
        params: { ...filters, lang: getActiveLang() }
      });
      const raw = response.data?.data ?? response.data;
      return assertJsonArray<any>(raw, 'getSchemes');
    } catch (error) {
      console.warn('[schemeService.getSchemes] Backend not available — using local mock data.', (error as Error).message);
      return getLocalSchemes(filters);
    }
  },

  async getSchemeById(id: string): Promise<Scheme | null> {
    if (isMockMode) {
      return getLocalSchemeById(id);
    }
    try {
      const response = await axios.get(`${API_URL}/${id}`, {
        params: { lang: getActiveLang() }
      });
      const raw = response.data?.data ?? response.data;
      return raw ? (raw as Scheme) : null;
    } catch (error) {
      console.warn(`[schemeService.getSchemeById] Backend not available — finding scheme "${id}" locally.`, (error as Error).message);
      return getLocalSchemeById(id);
    }
  },

  async getFeaturedSchemes(): Promise<Scheme[]> {
    if (isMockMode) {
      return getLocalFeaturedSchemes();
    }
    try {
      const response = await axios.get(`${API_URL}/featured`, {
        params: { lang: getActiveLang() }
      });
      const raw = response.data?.data ?? response.data;
      return assertJsonArray<any>(raw, 'getFeaturedSchemes');
    } catch (error) {
      console.warn('[schemeService.getFeaturedSchemes] Backend not available — filtering featured schemes locally.', (error as Error).message);
      return getLocalFeaturedSchemes();
    }
  },

  async getCategories(): Promise<string[]> {
    if (isMockMode) {
      return getLocalCategories();
    }
    try {
      const response = await axios.get(`${API_URL.replace('/schemes', '')}/categories`);
      const raw = response.data?.data ?? response.data;
      // Backend returns [{ id, name }] — flatten to string[] that FilterSidebar expects
      if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && 'name' in raw[0]) {
        return raw.map((c: { id: string; name: string }) => c.name);
      }
      return assertJsonArray<string>(raw, 'getCategories');
    } catch (error) {
      console.warn('[schemeService.getCategories] Backend not available — deriving categories locally.', (error as Error).message);
      return getLocalCategories();
    }
  },

  async getEligibleSchemes(profile: UserProfile): Promise<Scheme[]> {
    if (isMockMode) {
      return getLocalEligibleSchemes(profile);
    }
    try {
      const response = await axios.get(`${API_URL}/recommended`, {
        params: { lang: getActiveLang() }
      });
      const raw = response.data?.data ?? response.data;
      return assertJsonArray<any>(raw, 'getEligibleSchemes');
    } catch (error) {
      console.warn('[schemeService.getEligibleSchemes] Backend not available — running local tag-based eligibility.', (error as Error).message);
      return getLocalEligibleSchemes(profile);
    }
  },

  async getStates(): Promise<string[]> {
    if (isMockMode) {
      return getLocalStates();
    }
    try {
      const response = await axios.get(`${API_URL}/states`, {
        params: { lang: getActiveLang() }
      });
      const raw = response.data?.data ?? response.data;
      return assertJsonArray<string>(raw, 'getStates');
    } catch (error) {
      console.warn('[schemeService.getStates] Backend not available — deriving states locally.', (error as Error).message);
      return getLocalStates();
    }
  },
};
