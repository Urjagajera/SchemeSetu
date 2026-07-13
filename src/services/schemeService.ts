import axios from 'axios';
import { Scheme, UserProfile } from '../types';
import { SCHEMES } from '../constants/schemesData';

const API_URL = '/api/schemes';

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

function mapDbSchemeToFrontend(dbScheme: any): Scheme {
  const tags = dbScheme.tags?.map((t: any) => t.tag?.name || t.name || t) || [];
  const categories = dbScheme.categories?.map((c: any) => c.category?.name || c.name || c) || [];
  const category = categories[0] || 'General';

  return {
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
  };
}

export const schemeService = {
  async getSchemes(filters?: { query?: string; category?: string; level?: string; sort?: string }): Promise<Scheme[]> {
    try {
      const response = await axios.get(API_URL, { params: filters });
      const data = assertJsonArray<any>(response.data, 'getSchemes');
      return data.map(mapDbSchemeToFrontend);
    } catch (error) {
      console.warn('[schemeService.getSchemes] Backend not available — using local mock data.', (error as Error).message);

      let result = [...SCHEMES];

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
  },

  async getSchemeById(id: string): Promise<Scheme | null> {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      const data = assertJsonObject<any>(response.data, 'getSchemeById');
      return mapDbSchemeToFrontend(data);
    } catch (error) {
      console.warn(`[schemeService.getSchemeById] Backend not available — finding scheme "${id}" locally.`, (error as Error).message);
      return SCHEMES.find(s => s.id === id) ?? null;
    }
  },

  async getFeaturedSchemes(): Promise<Scheme[]> {
    try {
      const response = await axios.get(`${API_URL}/featured`);
      const data = assertJsonArray<any>(response.data, 'getFeaturedSchemes');
      return data.map(mapDbSchemeToFrontend);
    } catch (error) {
      console.warn('[schemeService.getFeaturedSchemes] Backend not available — filtering featured schemes locally.', (error as Error).message);
      return SCHEMES.filter(s => s.featured);
    }
  },

  async getCategories(): Promise<string[]> {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      return assertJsonArray<string>(response.data, 'getCategories');
    } catch (error) {
      console.warn('[schemeService.getCategories] Backend not available — deriving categories locally.', (error as Error).message);
      return ['Student', 'Farmer', 'Woman'];
    }
  },

  async getEligibleSchemes(profile: UserProfile): Promise<Scheme[]> {
    try {
      const response = await axios.post(`${API_URL}/eligibility`, profile);
      const data = assertJsonArray<any>(response.data, 'getEligibleSchemes');
      return data.map(mapDbSchemeToFrontend);
    } catch (error) {
      console.warn('[schemeService.getEligibleSchemes] Backend not available — running local tag-based eligibility.', (error as Error).message);

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
          results.push({ ...scheme, matchScore: matchCount });
        }
      });

      return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
  },
};
