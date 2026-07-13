import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

export interface AuthUser {
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
  loginWithGoogle: (credential: string) => Promise<boolean>;
  logout: () => void;
  devLogin: () => void;
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
  veteran: 'no'
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

  const loginWithGoogle = async (credential: string): Promise<boolean> => {
    const payload = decodeJWT(credential);
    if (!payload) return false;

    const citizenUser: AuthUser = {
      name: payload.name || 'Citizen',
      email: payload.email || '',
      picture: payload.picture || '',
      sub: payload.sub || '',
      role: 'user'
    };

    setUser(citizenUser);
    sessionStorage.setItem('schemesetu_user', JSON.stringify(citizenUser));
    return true;
  };

  const devLogin = () => {
    const citizenUser: AuthUser = {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@gmail.com',
      picture: '',
      sub: 'demo_user',
      role: 'user'
    };
    setUser(citizenUser);
    sessionStorage.setItem('schemesetu_user', JSON.stringify(citizenUser));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('schemesetu_user');
    localStorage.removeItem('schemesetu_user');
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
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
        logout,
        devLogin,
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
