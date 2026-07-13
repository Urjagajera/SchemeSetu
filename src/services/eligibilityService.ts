import axios from 'axios';
import { Scheme, UserProfile } from '../types';
import { schemeService } from './schemeService';

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

      const income = parseInt(profile.income || '0');
      const age = parseInt(profile.age || '0');
      const occupation = (profile.occupation || '').toLowerCase();
      const gender = (profile.gender || '').toLowerCase();
      const land = (profile.land || '').toLowerCase();
      const category = (profile.category || '').toLowerCase();

      const passedCriteria: string[] = [];
      const failedCriteria: string[] = [];
      const reasons: string[] = [];
      const suggestions: string[] = [];

      let totalCriteriaCount = 3;
      let passedCount = 0;

      if (scheme.id === 'pm-kisan') {
        totalCriteriaCount = 4;

        if (occupation === 'farmer') {
          passedCount++;
          passedCriteria.push('Occupation: Farmer');
        } else {
          failedCriteria.push('Occupation must be Farmer');
          reasons.push('This scheme is exclusively for agricultural cultivators.');
          suggestions.push('Update your profile occupation if you are a practicing farmer.');
        }

        if (land === 'yes') {
          passedCount++;
          passedCriteria.push('Landownership: Cultivable land holder');
        } else {
          failedCriteria.push('Must own cultivable land');
          reasons.push('Direct benefit transfers require verified land ownership records.');
          suggestions.push('Provide Khasra/Khatauni land record documents to local revenue office.');
        }

        if (income <= 200000) {
          passedCount++;
          passedCriteria.push('Income: Under ₹2 Lakh/year');
        } else {
          failedCriteria.push('Annual income exceeds limit of ₹2 Lakh');
          reasons.push('Institutional farmers and high-income tax payers are excluded.');
          suggestions.push('Ensure your declared income aligns with standard non-taxpayer brackets.');
        }

        if (age >= 18) {
          passedCount++;
          passedCriteria.push('Age: Adult farmer');
        } else {
          failedCriteria.push('Must be 18 years or older');
          reasons.push('Minors cannot register as independent landholding beneficiaries.');
        }

      } else if (scheme.id === 'ayushman-bharat') {
        totalCriteriaCount = 3;

        if (income <= 500000) {
          passedCount++;
          passedCriteria.push('Income: Below ₹5 Lakh/year (BPL range)');
        } else {
          failedCriteria.push('Income exceeds standard healthcare subsidy cap');
          reasons.push('PM-JAY covers families registered under SECC socio-economic survey.');
          suggestions.push('If you belong to BPL category, obtain a verified BPL Ration Card.');
        }

        passedCount++;
        passedCriteria.push(`Location: Covered in state "${profile.state}"`);

        passedCount++;
        passedCriteria.push('Identity Verification: Aadhaar Card available');

      } else if (scheme.id === 'post-matric-scholarship-sc') {
        totalCriteriaCount = 4;

        if (category === 'sc') {
          passedCount++;
          passedCriteria.push('Social Category: Scheduled Caste (SC)');
        } else {
          failedCriteria.push('Category must be Scheduled Caste (SC)');
          reasons.push('This scholarship is constitutionally allocated for SC students.');
          suggestions.push('If you are eligible, check equivalent Post-Matric scholarships for OBC/ST/General EWS.');
        }

        if (income <= 250000) {
          passedCount++;
          passedCriteria.push('Income: Below ₹2.5 Lakh/year');
        } else {
          failedCriteria.push('Family income exceeds ₹2.5 Lakh/year');
          reasons.push('Merit-cum-means scholarships have strict parental income thresholds.');
        }

        if (['graduate', 'post-graduate', 'student', '12th'].includes((profile.education || '').toLowerCase())) {
          passedCount++;
          passedCriteria.push('Education: Studying at Class XI or higher');
        } else {
          failedCriteria.push('Must be class XI or higher');
          reasons.push('Pre-matric students are not eligible for this post-secondary scholarship.');
        }

        if (age < 30) {
          passedCount++;
          passedCriteria.push('Age: Eligible student range');
        } else {
          failedCriteria.push('Age exceeds normal student academic cap');
        }

      } else if (scheme.id === 'sukanya-samriddhi') {
        totalCriteriaCount = 2;

        if (gender === 'female') {
          passedCount++;
          passedCriteria.push('Gender: Female beneficiary');
        } else {
          failedCriteria.push('Beneficiary must be Female');
          reasons.push('SSY accounts are small savings schemes restricted to girls.');
          suggestions.push('Look into general public provident savings (PPF) for male children.');
        }

        if (age <= 10) {
          passedCount++;
          passedCriteria.push('Age: Below 10 years');
        } else {
          failedCriteria.push('Beneficiary age exceeds 10 years');
          reasons.push('Accounts can only be opened for girls under the age of 10.');
          suggestions.push('Consider alternate post-office schemes or recurring deposits.');
        }

      } else {
        // Generic rule solver for unrecognised schemes
        if (income <= 300000) {
          passedCount++;
          passedCriteria.push('Income: Under limit');
        } else {
          failedCriteria.push('Income: Exceeds standard limit');
          reasons.push('Welfare programs prioritize lower income groups.');
        }

        if (age >= 18) {
          passedCount++;
          passedCriteria.push('Age: Adult citizen');
        } else {
          failedCriteria.push('Age: Minor citizen');
        }

        passedCount++;
        passedCriteria.push('Demographic criteria match');
      }

      const overallMatch = Math.round((passedCount / totalCriteriaCount) * 100);
      const isEligible = passedCount === totalCriteriaCount;

      return {
        schemeId: scheme.id,
        schemeTitle: scheme.title,
        overallMatch,
        isEligible,
        passedCriteria,
        failedCriteria,
        reasons,
        suggestions,
      };
    }
  },

  async getAlternativeSchemes(profile: UserProfile, excludeSchemeId: string): Promise<Scheme[]> {
    const allEligible = await schemeService.getEligibleSchemes(profile);
    return allEligible.filter(s => s.id !== excludeSchemeId).slice(0, 3);
  }
};
