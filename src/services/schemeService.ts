import axios from 'axios';
import { Scheme, UserProfile } from '../types';
import { SCHEMES } from '../constants/schemesData';

const API_URL = '/api/schemes';

/**
 * Guards against Vite's SPA HTML fallback being mistaken for valid API data.
 * When the backend is not running, Vite returns index.html (200 OK) for any
 * unmatched path. Axios does NOT throw on 2xx — we must detect this ourselves.
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

export const schemeService = {
  async getSchemes(filters?: { query?: string; category?: string; level?: string; sort?: string }): Promise<Scheme[]> {
    try {
      const response = await axios.get(API_URL, { params: filters });
      return assertJsonArray<Scheme>(response.data, 'getSchemes');
    } catch (error) {
      console.warn('[schemeService.getSchemes] Backend not available — using local mock data.', (error as Error).message);

      let result = [...SCHEMES];

      if (filters?.category && filters.category !== '') {
        result = result.filter(s => s.category.toLowerCase() === filters.category!.toLowerCase());
      }

      if (filters?.query && filters.query !== '') {
        const q = filters.query.toLowerCase();
        result = result.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.shortDesc.toLowerCase().includes(q) ||
          s.ministry.toLowerCase().includes(q) ||
          s.tags.some(t => t.toLowerCase().includes(q))
        );
      }

      if (filters?.level && filters.level !== '') {
        result = result.filter(s => s.level.toLowerCase() === filters.level!.toLowerCase());
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
      return assertJsonObject<Scheme>(response.data, 'getSchemeById');
    } catch (error) {
      console.warn(`[schemeService.getSchemeById] Backend not available — finding scheme "${id}" locally.`, (error as Error).message);
      return SCHEMES.find(s => s.id === id) ?? null;
    }
  },

  async getFeaturedSchemes(): Promise<Scheme[]> {
    try {
      const response = await axios.get(`${API_URL}/featured`);
      return assertJsonArray<Scheme>(response.data, 'getFeaturedSchemes');
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
      return Array.from(new Set(SCHEMES.map(s => s.category)));
    }
  },

  async getEligibleSchemes(profile: UserProfile): Promise<Scheme[]> {
    try {
      const response = await axios.post(`${API_URL}/eligibility`, profile);
      return assertJsonArray<Scheme>(response.data, 'getEligibleSchemes');
    } catch (error) {
      console.warn('[schemeService.getEligibleSchemes] Backend not available — running local eligibility rules.', (error as Error).message);

      const results: Scheme[] = [];
      const income = parseInt(profile.income || '0');
      const age = parseInt(profile.age || '0');
      const occupation = (profile.occupation || '').toLowerCase();
      const gender = (profile.gender || '').toLowerCase();

      SCHEMES.forEach(scheme => {
        let score = 0;
        const s = scheme.id;

        if (occupation === 'farmer' && s === 'pm-kisan') score += 3;
        if (income < 500000 && s === 'ayushman-bharat') score += 2;
        if (s === 'post-matric-scholarship-sc' && income < 250000) score += 2;
        if (s === 'pm-awas-yojana-urban') score += 1;
        if (occupation === 'student' && s === 'nmmss') score += 3;
        if (occupation === 'student' && s === 'digital-india-internship') score += 2;
        if (gender === 'female' && ['pradhan-mantri-matru-vandana', 'sukanya-samriddhi'].includes(s)) score += 3;
        if (age >= 60 && s === 'indira-gandhi-national-old-age-pension') score += 5;
        if (occupation === 'entrepreneur' && ['startup-india-seed-fund', 'pmegp'].includes(s)) score += 3;
        if (s === 'solar-rooftop-subsidy') score += 1;

        if (score > 0) {
          results.push({ ...scheme, matchScore: score });
        }
      });

      return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }
  },
};
