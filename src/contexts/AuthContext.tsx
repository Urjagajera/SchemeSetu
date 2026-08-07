import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { UserProfile } from '../types';

axios.defaults.withCredentials = true;

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  picture: string;
  role: 'user';
  sub: string;
}

interface AuthContextProps {
  user: AuthUser | null;
  profile: UserProfile;
  isAuthenticated: boolean;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  // TEMP-DEMO-AUTH: remove before production
  loginAsDemo: () => Promise<{ success: boolean; isNewUser?: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (newProfile: Partial<UserProfile>) => Promise<boolean>;
}

const DEFAULT_PROFILE: UserProfile = {
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

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem('schemesetu_user') || localStorage.getItem('schemesetu_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const raw = localStorage.getItem('schemesetu_profile');
      return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Keep localStorage sync'ed
  useEffect(() => {
    if (user) {
      localStorage.setItem('schemesetu_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('schemesetu_user');
    }
  }, [user]);

  const decodeJWT = (credential: string): any => {
    try {
      const base64 = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  };

  const loginWithGoogle = async (credential: string): Promise<{ success: boolean; isNewUser?: boolean }> => {
    try {
      const response = await axios.post('/api/auth/google', { idToken: credential });
      
      if (response.data && response.data.success) {
        const { user: serverUser, isNewUser } = response.data;
        const citizenUser: AuthUser = {
          id: serverUser.id,
          name: serverUser.name || 'Citizen',
          email: serverUser.email,
          picture: serverUser.picture || '',
          sub: serverUser.id,
          role: 'user'
        };

        setUser(citizenUser);
        sessionStorage.setItem('schemesetu_user', JSON.stringify(citizenUser));
        return { success: true, isNewUser };
      }
      return { success: false };
    } catch (error) {
      console.error('[Google Login Error]:', error);
      return { success: false };
    }
  };

  // TEMP-DEMO-AUTH: remove before production
  const loginAsDemo = async (): Promise<{ success: boolean; isNewUser?: boolean }> => {
    try {
      // TEMP-DEMO-AUTH: remove before production
      const response = await axios.post('/api/auth/demo-login');
      
      // TEMP-DEMO-AUTH: remove before production
      if (response.data && response.data.success) {
        // TEMP-DEMO-AUTH: remove before production
        const { user: serverUser, isNewUser } = response.data;
        // TEMP-DEMO-AUTH: remove before production
        const citizenUser: AuthUser = {
          id: serverUser.id,
          name: serverUser.name || 'Citizen',
          email: serverUser.email,
          picture: serverUser.picture || '',
          sub: serverUser.id,
          role: 'user'
        };

        // TEMP-DEMO-AUTH: remove before production
        setUser(citizenUser);
        // TEMP-DEMO-AUTH: remove before production
        sessionStorage.setItem('schemesetu_user', JSON.stringify(citizenUser));
        // TEMP-DEMO-AUTH: remove before production
        return { success: true, isNewUser };
      }
      // TEMP-DEMO-AUTH: remove before production
      return { success: false };
    } catch (error) {
      // TEMP-DEMO-AUTH: remove before production
      console.error('[Demo Login Error]:', error);
      // TEMP-DEMO-AUTH: remove before production
      return { success: false };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('[Logout Error]:', error);
    } finally {
      setUser(null);
      sessionStorage.removeItem('schemesetu_user');
      localStorage.removeItem('schemesetu_user');
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    }
  };

  const updateProfile = async (newProfile: Partial<UserProfile>): Promise<boolean> => {
    const updated = { ...profile, ...newProfile };
    setProfile(updated);
    localStorage.setItem('schemesetu_profile', JSON.stringify(updated));
    return true;
  };

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        loginWithGoogle,
        // TEMP-DEMO-AUTH: remove before production
        loginAsDemo,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
