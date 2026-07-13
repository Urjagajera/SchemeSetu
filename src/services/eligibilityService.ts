import axios from 'axios';
import { Scheme, UserProfile } from '../types';

const API_URL = '/api/eligibility';

function assertJsonObject<T>(data: unknown, context: string): T {
  if (
    data === null ||
    data === undefined ||
    typeof data === 'string' ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error(
      `[eligibilityService.${context}] Expected JSON object, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T;
}

export interface EligibilityReport {
  schemeId: string;
  schemeTitle: string;
  overallMatch: number; // percentage 0-100
  isEligible: boolean;
  passedCriteria: string[];
  failedCriteria: string[];
  reasons: string[];
  suggestions: string[];
}

export const eligibilityService = {
  async getEligibilityReport(profile: UserProfile, scheme: Scheme): Promise<EligibilityReport> {
    try {
      const response = await axios.post(`${API_URL}/report`, { profile, schemeId: scheme.id });
      return assertJsonObject<EligibilityReport>(response.data, 'getEligibilityReport');
    } catch (error) {
      console.warn('[eligibilityService.getEligibilityReport] Backend not available — running client-side analysis.', (error as Error).message);

      // Collect user interests/profile tags
      const interests = new Set<string>();
      if (profile.interests && Array.isArray(profile.interests)) {
        profile.interests.forEach(i => interests.add(i.toLowerCase()));
      }
      if (profile.profileTags && Array.isArray(profile.profileTags)) {
        profile.profileTags.forEach(i => interests.add(i.toLowerCase()));
      }

      // Add default demographic tags
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

      const passedCriteria: string[] = [];
      const failedCriteria: string[] = [];
      
      const tags = scheme.tags || [];
      const totalTags = tags.length || 1;
      let passedCount = 0;

      tags.forEach(tag => {
        if (interests.has(tag.toLowerCase())) {
          passedCount++;
          passedCriteria.push(`Interest match: "${tag}"`);
        } else {
          failedCriteria.push(`Keyword mismatch: "${tag}"`);
        }
      });

      const overallMatch = Math.round((passedCount / totalTags) * 100);
      const isEligible = overallMatch >= 50;

      return {
        schemeId: scheme.id,
        schemeTitle: scheme.name || scheme.title,
        overallMatch,
        isEligible,
        passedCriteria,
        failedCriteria,
        reasons: [`Matches ${passedCount} of your profile interests out of ${tags.length} total scheme tags.`],
        suggestions: ['Add more tags to your profile settings matching your specific occupation, education, or requirements.']
      };
    }
  }
};
