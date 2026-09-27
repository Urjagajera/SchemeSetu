import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  authLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; isNewUser?: boolean }>;
  // DEV-ONLY: remove before production — demo login bypass.
  // Optional (not just internally guarded): kept out of the context value object
  // entirely in a production build via the conditional spread below, so Rollup
  // can actually tree-shake the implementation out of the bundle instead of
  // just leaving it present-but-inert.
  loginWithDemoAccount?: () => Promise<{ success: boolean }>;
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
  // logged in. Runs whenever the logged-in user's id changes — covers both
  // "already logged in on page load" (after the /api/auth/me effect above
  // resolves) and "just logged in via Google/demo" in this same tab.
  //
  // Server-side profile data was added specifically because the old
  // localStorage-only approach was a live correctness bug, not just a
  // "doesn't sync across devices" gap: 'schemesetu_profile' is a single
  // browser-scoped key with no per-account isolation at all, so two
  // different accounts signed in on the same browser saw each other's age,
  // income, category, etc. GET /api/profile is now the source of truth for
  // a logged-in user.
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

        // No server-side profile yet for this account. One-time migration:
        // if this browser has leftover data from before server-side
        // persistence existed, upload it now instead of silently losing it —
        // it becomes the authoritative server copy from here on. A brand new
        // account with no localStorage data either just gets the same
        // DEFAULT_PROFILE fallback as before.
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

  // useCallback keeps this reference stable across AuthProvider re-renders (e.g.
  // when authLoading flips after the /api/auth/me check settles). Login.tsx's
  // Google Identity Services effect depends on this function; without a stable
  // reference, every AuthProvider re-render re-ran google.accounts.id.initialize()
  // and renderButton() — confirmed live via the GSI SDK's own console warning
  // ("initialize() is called multiple times... unexpected behavior") and a
  // duplicate button iframe showing up after just switching tabs once.
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

  // DEV-ONLY: remove before production — demo login bypass.
  // The import.meta.env.DEV check here is a second, redundant guard: the real
  // gate is the backend 404ing this in production regardless of what the
  // frontend does (see POST /api/auth/demo-login), but there's no reason for
  // this function to even attempt the request if the button that calls it
  // shouldn't exist in this build in the first place.
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

  // Logged-in users: PUT to the backend, source of truth from here on.
  // Guests: unchanged localStorage behavior — there's no account to persist
  // to server-side (Profile.tsx itself is login-gated at the routing level,
  // so this branch is a defensive fallback, not the normal path today).
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
        // DEV-ONLY: remove before production — demo login bypass.
        // Only spread into the context value at all when import.meta.env.DEV is
        // true. Vite replaces that with the literal `false` in a production
        // build, which lets the bundler's dead-code elimination remove not just
        // this spread but the loginWithDemoAccount definition itself, instead of
        // leaving an unreachable-but-present function in the shipped bundle.
        ...(import.meta.env.DEV ? { loginWithDemoAccount } : {}),
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
