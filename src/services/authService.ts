import axios from 'axios';
import { UserProfile } from '../types';

const API_URL = '/api/auth';

function assertJsonObject<T>(data: unknown, context: string): T {
  if (
    data === null ||
    data === undefined ||
    typeof data === 'string' ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error(
      `[authService.${context}] Expected JSON object, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T;
}

export const authService = {
  async loginWithGoogle(credential: string) {
    try {
      const response = await axios.post(`${API_URL}/google`, { credential });
      return assertJsonObject<{ token: string; user: any }>(response.data, 'loginWithGoogle');
    } catch (error) {
      console.warn('[authService.loginWithGoogle] Backend not available — using mock Google sign-in.', (error as Error).message);
      return {
        token: 'mock-jwt-token',
        user: {
          name: 'Citizen User',
          email: 'user@schemesetu.gov.in',
          picture: '',
          role: 'user',
        }
      };
    }
  },

  async getProfile() {
    try {
      const response = await axios.get(`${API_URL}/profile`);
      return assertJsonObject<UserProfile>(response.data, 'getProfile');
    } catch (error) {
      console.warn('[authService.getProfile] Backend not available — loading profile from localStorage.', (error as Error).message);
      try {
        const raw = localStorage.getItem('schemesetu_profile');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  },

  async updateProfile(profileData: Partial<UserProfile>) {
    try {
      const response = await axios.put(`${API_URL}/profile`, profileData);
      return assertJsonObject<{ success: boolean; profile: Partial<UserProfile> }>(response.data, 'updateProfile');
    } catch (error) {
      console.warn('[authService.updateProfile] Backend not available — persisting profile to localStorage.', (error as Error).message);
      localStorage.setItem('schemesetu_profile', JSON.stringify(profileData));
      return { success: true, profile: profileData };
    }
  }
};
