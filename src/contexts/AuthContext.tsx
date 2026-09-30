import { createContext, useContext } from 'react';
import { UserProfile } from '../types';

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  picture: string;
  role: 'user';
  sub: string;
}

export interface AuthContextProps {
  user: AuthUser | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  authLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  loginWithDemoAccount?: () => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<boolean>;
}

export const DEFAULT_PROFILE: UserProfile = {
  age: '28',
  gender: 'male',
  state: 'Uttar Pradesh',
  category: 'general',
  occupation: 'farmer',
  income: '300000',
  residence: 'rural',
  land: 'yes',
  education: 'graduate',
  minority: 'no',
  disability: 'no',
  farmer: 'yes',
  widow: 'no',
  veteran: 'no',
  interests: ['Farmer', 'Agriculture'],
  profileTags: ['Farmer', 'Agriculture']
};

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
