import axios from 'axios';
import { Scheme, UserProfile } from '../types';
import { MOCK_SCHEMES } from '../constants/mockSchemes';
const SCHEMES: Scheme[] = MOCK_SCHEMES;

const API_URL = '/api/schemes';
import { isMockMode } from '../config/mockMode';
import { ingestCardText } from './titleTranslations';
import { applyLocalFilters, localFilterCounts } from './localFilters';
import { GENDER_IDS, SOCIAL_CATEGORY_IDS } from '../constants/searchFilters';

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

function getLocalSchemeById(id: string): Scheme | null {
  const localScheme = SCHEMES.find((s: any) => s.id === id) ?? null;
  return localScheme ? enrichScheme(localScheme) : null;
}

function getLocalFeaturedSchemes(): Scheme[] {
  return SCHEMES.filter((s: any) => s.featured).map(enrichScheme);
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

  // Highest match percentage first (the share of a scheme's tags matched, what its eligibility card shows), then more tags matched.
  const percent = (s: Scheme) => (s.matchScore || 0) / (s.tags.length || 1);
  return results.sort((a, b) => percent(b) - percent(a) || (b.matchScore || 0) - (a.matchScore || 0));
}

const getActiveLang = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('schemesetu_lang') || 'en';
  }
  return 'en';
};

export interface SchemeListFilters {
  query?: string;
  /** Comma-separated topic ids (constants/searchFilters.ts): schemes in ANY of them. */
  topic?: string;
  level?: string;
  ministry?: string;
  state?: string;
  /** student | farmer | entrepreneur | employee | unemployed | senior citizen: schemes meant for this occupation. */
  occupation?: string;
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

/** The local schemes that fit the filters, one page of them, with the real local total. */
function localSchemeList(filters?: SchemeListFilters): SchemeListResult {
  const all = applyLocalFilters(SCHEMES.map(enrichScheme), filters);
  const limit = filters?.limit ?? all.length;
  const page = filters?.page ?? 1;
  return { data: all.slice((page - 1) * limit, page * limit), total: all.length };
}

/** One option of a Search filter and how many schemes it has on its own (null when not known). */
export interface FilterOptionCount {
  id: string;
  count: number | null;
}

/** Everything the Search sidebar offers (GET /api/schemes/filters). */
export interface FilterOptions {
  topics: FilterOptionCount[];
  occupations: FilterOptionCount[];
  levels: FilterOptionCount[];
  states: string[];
  /** Central authorities only; a state's own schemes are reached through the State filter. */
  ministries: Array<{ name: string; count: number | null }>;
  genders: string[];
  socialCategories: string[];
}

function localFilterOptions(): FilterOptions {
  const schemes = SCHEMES.map(enrichScheme);
  const central = Array.from(new Set(schemes.filter((s) => s.level !== 'State').map((s) => s.authorityName).filter(Boolean))).sort();
  return {
    ...localFilterCounts(schemes),
    states: getLocalStates(),
    ministries: central.map((name) => ({ name, count: schemes.filter((s) => s.authorityName === name).length })),
    genders: [...GENDER_IDS],
    socialCategories: [...SOCIAL_CATEGORY_IDS],
  };
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
      // No sample schemes here: the page shows an error with Retry instead (LoadError).
      console.warn('[schemeService.getSchemes] Could not load schemes.', (error as Error).message);
      throw error;
    }
  },

  async getFilterOptions(): Promise<FilterOptions> {
    if (isMockMode) {
      return localFilterOptions();
    }
    try {
      const response = await axios.get(`${API_URL}/filters`);
      const data = assertJsonObject<FilterOptions>(response.data?.data, 'getFilterOptions');
      if (!Array.isArray(data.topics) || !Array.isArray(data.states)) throw new Error('[schemeService.getFilterOptions] Invalid response shape.');
      return data;
    } catch (error) {
      console.warn('[schemeService.getFilterOptions] Could not load the filter options.', (error as Error).message);
      throw error;
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
      // A 404 is the server saying there is no such scheme; anything else is a failure to load it.
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      console.warn(`[schemeService.getSchemeById] Could not load scheme "${id}".`, (error as Error).message);
      throw error;
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
      console.warn('[schemeService.getFeaturedSchemes] Could not load the featured schemes.', (error as Error).message);
      throw error;
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
