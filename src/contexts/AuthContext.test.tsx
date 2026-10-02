import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, renderHook, waitFor, act } from '@testing-library/react';
import type { UserProfile } from '../types';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('axios', () => ({ default: { defaults: {}, ...http } }));

import { AuthProvider, ProfileSaveError, useAuth } from './AuthContext';

const SERVER_USER = { id: 'u1', name: 'Asha Patel', email: 'asha@example.com', picture: 'https://example.com/a.png' };
const SERVER_PROFILE = { age: '30', gender: 'female', state: 'Gujarat', category: '', occupation: 'farmer', income: '', residence: '', land: '', education: '', minority: '', disability: '', farmer: '', widow: '', veteran: '', interests: [], profileTags: [] } as UserProfile;
const LOCAL_PROFILE = { ...SERVER_PROFILE, age: '41', state: 'Kerala' } as UserProfile;

/** What the fake backend answers. A missing entry behaves like a server that cannot be reached. */
function serve(answers: { me?: unknown; profile?: unknown; putProfile?: unknown }) {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/api/auth/me' && 'me' in answers) return { data: { user: answers.me } };
    if (url === '/api/profile' && 'profile' in answers) return { data: { profile: answers.profile } };
    throw new Error(`unreachable: ${url}`);
  });
  http.put.mockImplementation(async () => ({ data: { profile: answers.putProfile } }));
}

/** Runs an action that is expected to fail and returns what it threw. */
async function failureOf(action: () => Promise<unknown>): Promise<unknown> {
  let caught: unknown;
  await act(async () => {
    try {
      await action();
    } catch (e) {
      caught = e;
    }
  });
  return caught;
}

const mount = () => renderHook(() => useAuth(), { wrapper: AuthProvider });
const settled = async (result: { current: ReturnType<typeof useAuth> }) => waitFor(() => expect(result.current.authLoading).toBe(false));

beforeEach(() => {
  for (const fn of Object.values(http)) fn.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('who is signed in when the page loads', () => {
  it('trusts the server, not the browser: a signed-in session is picked up from /api/auth/me', async () => {
    serve({ me: SERVER_USER, profile: SERVER_PROFILE });
    const { result } = mount();
    expect(result.current.authLoading).toBe(true);
    await settled(result);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toMatchObject({ id: 'u1', name: 'Asha Patel', email: 'asha@example.com', role: 'user' });
  });

  it('calls someone without a name "Citizen" and gives them an empty picture', async () => {
    serve({ me: { id: 'u2', name: '', email: 'x@example.com' }, profile: SERVER_PROFILE });
    const { result } = mount();
    await settled(result);
    expect(result.current.user).toMatchObject({ name: 'Citizen', picture: '' });
  });

  it('shows a cached user straight away (no flash of "signed out") while the server check is still running', () => {
    localStorage.setItem('schemesetu_user', JSON.stringify({ id: 'u1', name: 'Cached Asha', email: 'a@example.com', picture: '', role: 'user', sub: 'u1' }));
    http.get.mockImplementation(() => new Promise(() => {})); // never answers
    const { result } = mount();
    expect(result.current.user?.name).toBe('Cached Asha');
    expect(result.current.authLoading).toBe(true);
  });

  it('signs out a cached user when the server says the session is gone, and forgets the cache', async () => {
    localStorage.setItem('schemesetu_user', JSON.stringify({ id: 'u1', name: 'Cached Asha', email: 'a@example.com', picture: '', role: 'user', sub: 'u1' }));
    serve({}); // /api/auth/me fails
    const { result } = mount();
    await settled(result);
    expect(result.current.isAuthenticated).toBe(false);
    await waitFor(() => expect(localStorage.getItem('schemesetu_user')).toBeNull());
  });

  it('treats "no user" from the server as signed out', async () => {
    serve({ me: null });
    const { result } = mount();
    await settled(result);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('survives corrupt data in browser storage', async () => {
    localStorage.setItem('schemesetu_user', '{not json');
    localStorage.setItem('schemesetu_profile', '{not json');
    serve({ me: null });
    const { result } = mount();
    await settled(result);
    expect(result.current.user).toBeNull();
    expect(result.current.profile.age).toBe('');
  });
});

describe('which profile a signed-in user sees', () => {
  it('uses the saved profile from the server', async () => {
    serve({ me: SERVER_USER, profile: SERVER_PROFILE });
    const { result } = mount();
    await waitFor(() => expect(result.current.profile.age).toBe('30'));
    expect(result.current.profile.state).toBe('Gujarat');
    expect(http.put).not.toHaveBeenCalled();
  });

  it('uploads leftover browser data once when the account has no saved profile yet', async () => {
    localStorage.setItem('schemesetu_profile', JSON.stringify(LOCAL_PROFILE));
    serve({ me: SERVER_USER, profile: null, putProfile: LOCAL_PROFILE });
    const { result } = mount();
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(http.put).toHaveBeenCalledWith('/api/profile', LOCAL_PROFILE);
    await waitFor(() => expect(result.current.profile.age).toBe('41'));
  });

  it('starts a brand-new account with a completely blank profile (nothing pretends to be known)', async () => {
    serve({ me: SERVER_USER, profile: null });
    const { result } = mount();
    await settled(result);
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/profile'));
    expect(http.put).not.toHaveBeenCalled();
    expect(result.current.profile).toMatchObject({ age: '', gender: '', state: '', category: '', occupation: '', income: '', land: '', interests: [] });
  });

  it('keeps what it has when the profile cannot be fetched', async () => {
    localStorage.setItem('schemesetu_profile', JSON.stringify(LOCAL_PROFILE));
    http.get.mockImplementation(async (url: string) => {
      if (url === '/api/auth/me') return { data: { user: SERVER_USER } };
      throw new Error('server down');
    });
    const { result } = mount();
    await settled(result);
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/api/profile'));
    expect(result.current.profile.age).toBe('41');
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('signing in with Google', () => {
  it('sends the Google token, signs the user in, and reports whether the account is new', async () => {
    serve({}); // nobody signed in yet
    http.post.mockResolvedValue({ data: { success: true, isNewUser: true, user: SERVER_USER } });
    http.get.mockImplementation(async (url: string) => {
      if (url === '/api/profile') return { data: { profile: SERVER_PROFILE } };
      throw new Error('no session');
    });
    const { result } = mount();
    await settled(result);

    let outcome: { success: boolean; isNewUser?: boolean } | undefined;
    await act(async () => { outcome = await result.current.loginWithGoogle('google-id-token'); });
    expect(http.post).toHaveBeenCalledWith('/api/auth/google', { idToken: 'google-id-token' });
    expect(outcome).toEqual({ success: true, isNewUser: true });
    expect(result.current.user?.id).toBe('u1');
    expect(JSON.parse(sessionStorage.getItem('schemesetu_user')!)).toMatchObject({ id: 'u1' });
  });

  it.each([
    ['the server refuses', () => http.post.mockResolvedValue({ data: { success: false } })],
    ['the request fails', () => http.post.mockRejectedValue(new Error('network'))],
  ])('stays signed out when %s', async (_name, arrange) => {
    serve({});
    arrange();
    const { result } = mount();
    await settled(result);
    let outcome: { success: boolean } | undefined;
    await act(async () => { outcome = await result.current.loginWithGoogle('bad-token'); });
    expect(outcome).toEqual({ success: false });
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('saving the profile', () => {
  async function signedIn(putProfile?: unknown) {
    serve({ me: SERVER_USER, profile: SERVER_PROFILE, putProfile });
    const hook = mount();
    await waitFor(() => expect(hook.result.current.profile.age).toBe('30'));
    return hook;
  }

  it('saves to the server and shows what the server stored', async () => {
    const { result } = await signedIn({ ...SERVER_PROFILE, age: '31' });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.updateProfile({ age: '31' }); });
    expect(ok).toBe(true);
    expect(http.put).toHaveBeenCalledWith('/api/profile', { age: '31' });
    expect(result.current.profile.age).toBe('31');
  });

  it('throws a ProfileSaveError carrying the fields the server rejected', async () => {
    const { result } = await signedIn();
    http.put.mockRejectedValue({ response: { data: { error: { message: 'Some profile fields are not valid', fields: { age: 'Age must be a whole number between 1 and 120' } } } } });
    const failure = await failureOf(() => result.current.updateProfile({ age: '999' }));
    expect(failure).toBeInstanceOf(ProfileSaveError);
    expect((failure as ProfileSaveError).fields).toEqual({ age: 'Age must be a whole number between 1 and 120' });
    expect((failure as ProfileSaveError).message).toBe('Some profile fields are not valid');
    expect(result.current.profile.age).toBe('30'); // the screen does not pretend it saved
  });

  it('throws a plain "check your connection" error when the server cannot be reached', async () => {
    const { result } = await signedIn();
    http.put.mockRejectedValue(new Error('Network Error'));
    const failure = await failureOf(() => result.current.updateProfile({ age: '31' }));
    expect(failure).toBeInstanceOf(ProfileSaveError);
    expect((failure as ProfileSaveError).message).toContain('Check your connection');
    expect((failure as ProfileSaveError).fields).toEqual({});
  });

  it('keeps a guest profile in the browser only', async () => {
    serve({});
    const { result } = mount();
    await settled(result);
    await act(async () => { await result.current.updateProfile({ age: '22' }); });
    expect(http.put).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('schemesetu_profile')!).age).toBe('22');
  });
});

describe('signing out', () => {
  it('tells the server, clears the user and the browser copies', async () => {
    serve({ me: SERVER_USER, profile: SERVER_PROFILE });
    http.post.mockResolvedValue({ data: { success: true } });
    const { result } = mount();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    sessionStorage.setItem('schemesetu_user', '{"id":"u1"}');
    await act(async () => { await result.current.logout(); });
    expect(http.post).toHaveBeenCalledWith('/api/auth/logout');
    expect(result.current.isAuthenticated).toBe(false);
    expect(sessionStorage.getItem('schemesetu_user')).toBeNull();
    expect(localStorage.getItem('schemesetu_user')).toBeNull();
  });

  it('still signs out in the browser if the server cannot be reached', async () => {
    serve({ me: SERVER_USER, profile: SERVER_PROFILE });
    http.post.mockRejectedValue(new Error('offline'));
    const { result } = mount();
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => { await result.current.logout(); });
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('useAuth', () => {
  it('refuses to be used outside the provider', () => {
    // React 19 reports an uncaught render error instead of throwing it out of render(), so catch it with a boundary
    class Boundary extends React.Component<{ children: React.ReactNode }, { message: string | null }> {
      state = { message: null as string | null };
      static getDerivedStateFromError(error: Error) {
        return { message: error.message };
      }
      render() {
        return this.state.message ? <p>caught: {this.state.message}</p> : this.props.children;
      }
    }
    const Probe = () => {
      useAuth();
      return <p>rendered</p>;
    };
    const { container } = render(
      <Boundary>
        <Probe />
      </Boundary>,
    );
    expect(container.textContent).toContain('caught: useAuth must be used within an AuthProvider');
  });
});
