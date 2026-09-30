import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { UserProfile } from '../types';
import { AuthContext, AuthUser, DEFAULT_PROFILE } from './AuthContext';

axios.defaults.withCredentials = true;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem('schemesetu_user') || localStorage.getItem('schemesetu_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // True while the initial /api/auth/me check (below) is in flight, so callers
  // can avoid treating "not logged in yet" as "logged out" on first render.
  const [authLoading, setAuthLoading] = useState(true);

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

  // The session cookie is httpOnly (unreadable from JS by design), so on load we
  // ask the backend whether it's still valid rather than trusting the cached
  // `user` object in storage — that cache is a display convenience, not proof
  // of an active session.
  useEffect(() => {
    let cancelled = false;
    axios
      .get('/api/auth/me')
      .then((response) => {
        if (cancelled) return;
        const serverUser = response.data?.user;
        if (serverUser) {
          setUser({
            id: serverUser.id,
            name: serverUser.name || 'Citizen',
            email: serverUser.email,
            picture: serverUser.picture || '',
            sub: serverUser.id,
            role: 'user'
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetches (and, once, migrates) the server-side profile once we know who's
  // logged in. Runs whenever the logged-in user's id changes.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await axios.get('/api/profile');
        if (cancelled) return;
        const serverProfile = response.data?.profile as UserProfile | null;

        if (serverProfile) {
          setProfile(serverProfile);
          return;
        }

        let localData: UserProfile | null = null;
        try {
          const raw = localStorage.getItem('schemesetu_profile');
          localData = raw ? JSON.parse(raw) : null;
        } catch {
          localData = null;
        }

        if (localData) {
          const putResponse = await axios.put('/api/profile', localData);
          if (cancelled) return;
          const migrated = putResponse.data?.profile as UserProfile | null;
          setProfile(migrated ?? localData);
        } else {
          setProfile(DEFAULT_PROFILE);
        }
      } catch (error) {
        console.error('[Profile Fetch Error]:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const loginWithGoogle = useCallback(async (credential: string): Promise<{ success: boolean; isNewUser?: boolean }> => {
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
  }, []);

  const loginWithDemoAccount = useCallback(async (): Promise<{ success: boolean }> => {
    if (!import.meta.env.DEV) return { success: false };
    try {
      const response = await axios.post('/api/auth/demo-login');
      if (response.data && response.data.success) {
        const { user: serverUser } = response.data;
        const demoUser: AuthUser = {
          id: serverUser.id,
          name: serverUser.name || 'Citizen',
          email: serverUser.email,
          picture: serverUser.picture || '',
          sub: serverUser.id,
          role: 'user'
        };
        setUser(demoUser);
        sessionStorage.setItem('schemesetu_user', JSON.stringify(demoUser));
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('[Demo Login Error]:', error);
      return { success: false };
    }
  }, []);

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('[Logout Error]:', error);
    }
    setUser(null);
    sessionStorage.removeItem('schemesetu_user');
    localStorage.removeItem('schemesetu_user');
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const isAuthenticated = user !== null;

  const updateProfile = async (newProfile: Partial<UserProfile>): Promise<boolean> => {
    if (isAuthenticated) {
      try {
        const response = await axios.put('/api/profile', newProfile);
        const serverProfile = response.data?.profile as UserProfile | null;
        setProfile(serverProfile ?? { ...profile, ...newProfile });
        return true;
      } catch (error) {
        console.error('[Update Profile Error]:', error);
        return false;
      }
    }

    const updated = { ...profile, ...newProfile };
    setProfile(updated);
    localStorage.setItem('schemesetu_profile', JSON.stringify(updated));
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        authLoading,
        loginWithGoogle,
        ...(import.meta.env.DEV ? { loginWithDemoAccount } : {}),
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
