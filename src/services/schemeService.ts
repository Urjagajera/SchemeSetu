import axios from 'axios';
import { Scheme, UserProfile } from '../types';
import { MOCK_SCHEMES } from '../constants/mockSchemes';
const SCHEMES: Scheme[] = MOCK_SCHEMES;

const API_URL = '/api/schemes';
import { isMockMode } from '../config/mockMode';
import { ingestCardText } from './titleTranslations';

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
    featured: false,
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

  return result;
}

function getLocalMinistries(): string[] {
  return Array.from(new Set(SCHEMES.map((s: any) => s.authorityName).filter(Boolean))).sort() as string[];
}

function getLocalSchemeById(id: string): Scheme | null {
  const localScheme = SCHEMES.find((s: any) => s.id === id) ?? null;
  return localScheme ? enrichScheme(localScheme) : null;
}

function getLocalFeaturedSchemes(): Scheme[] {
  return SCHEMES.filter((s: any) => s.featured).map(enrichScheme);
}

function getLocalCategories(): string[] {
  const cats = new Set<string>();
  SCHEMES.forEach((s: any) => {
    if (s.categories) {
      s.categories.forEach((c: any) => cats.add(c));
    }
    if (s.category) {
      cats.add(s.category);
    }
  });
  return Array.from(cats).filter(Boolean).sort();
}

function getLocalStates(): string[] {
  const states = new Set<string>();
  SCHEMES.forEach((s: any) => {
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

  SCHEMES.forEach((scheme: any) => {
    let matchCount = 0;
    scheme.tags.forEach((t: any) => {
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

export interface SchemeListFilters {
  query?: string;
  category?: string;
  level?: string;
  ministry?: string;
  state?: string;
  /** male | female | other: schemes available to this gender (server-side, real mode only). */
  gender?: string;
  /** general | sc | st | obc: schemes available to this social category (server-side, real mode only). */
  socialCategory?: string;
  age?: number;
  /** Annual income in rupees. */
  income?: number;
  page?: number;
  limit?: number;
}

export interface SchemeListResult {
  data: Scheme[];
  /** Total schemes matching the filters across ALL pages — not just data.length. */
  total: number;
}

function localSchemeList(filters?: SchemeListFilters): SchemeListResult {
  const data = getLocalSchemes(filters);
  return { data, total: data.length };
}

/** How many matches one page of results holds. */
export const ELIGIBLE_PAGE_SIZE = 20;

export interface EligiblePage {
  data: Scheme[];
  /** Everything that fits, not just this page. */
  total: number;
  hasMore: boolean;
  page: number;
}

export const schemeService = {
  async getSchemes(filters?: SchemeListFilters): Promise<SchemeListResult> {
    if (isMockMode) {
      return localSchemeList(filters);
    }
    try {
      const response = await axios.get(API_URL, {
        params: { ...filters, lang: getActiveLang() }
      });
      const data = assertJsonArray<any>(response.data?.data ?? response.data, 'getSchemes') as Scheme[];
      const total = typeof response.data?.total === 'number' ? response.data.total : data.length;
      ingestCardText(getActiveLang(), response.data?.translation, data.map((s) => s.id));
      return { data, total };
    } catch (error) {
      console.warn('[schemeService.getSchemes] Backend not available — using local mock data.', (error as Error).message);
      return localSchemeList(filters);
    }
  },

  async getMinistries(): Promise<string[]> {
    if (isMockMode) {
      return getLocalMinistries();
    }
    try {
      const response = await axios.get(`${API_URL}/ministries`);
      return assertJsonArray<string>(response.data?.data ?? response.data, 'getMinistries');
    } catch (error) {
      console.warn('[schemeService.getMinistries] Backend not available — deriving ministries locally.', (error as Error).message);
      return getLocalMinistries();
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
      if (!raw) return null;
      // The server sends the translation state next to the English scheme; keep it on the scheme.
      return response.data?.translation ? ({ ...raw, translation: response.data.translation } as Scheme) : (raw as Scheme);
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
      const featured = assertJsonArray<any>(raw, 'getFeaturedSchemes');
      ingestCardText(getActiveLang(), response.data?.translation, featured.map((s: any) => s.id));
      return featured;
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

  /** The first page of the schemes that fit a profile (what the dashboard shows a few of). */
  async getEligibleSchemes(profile: UserProfile): Promise<Scheme[]> {
    return (await schemeService.getEligibleSchemesPage(profile, 1)).data;
  },

  /** One page of the schemes that fit a profile, best match first, with how many fit in all. */
  async getEligibleSchemesPage(profile: UserProfile, page = 1, limit = ELIGIBLE_PAGE_SIZE): Promise<EligiblePage> {
    const fromList = (all: Scheme[]): EligiblePage => ({
      data: all.slice((page - 1) * limit, page * limit),
      total: all.length,
      hasMore: page * limit < all.length,
      page,
    });
    if (isMockMode) {
      return fromList(getLocalEligibleSchemes(profile));
    }
    try {
      const response = await axios.post(
        `${API_URL}/recommended`,
        { profile, page, limit },
        { params: { lang: getActiveLang() } }
      );
      const raw = response.data?.data ?? response.data;
      const eligible = assertJsonArray<any>(raw, 'getEligibleSchemes');
      ingestCardText(getActiveLang(), response.data?.translation, eligible.map((s: any) => s.id));
      const total = typeof response.data?.total === 'number' ? response.data.total : eligible.length;
      return { data: eligible, total, hasMore: response.data?.hasMore === true, page };
    } catch (error) {
      console.warn('[schemeService.getEligibleSchemes] Backend not available — running local tag-based eligibility.', (error as Error).message);
      return fromList(getLocalEligibleSchemes(profile));
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
