import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, useLocation } from 'react-router-dom';

// Only the routing is under test: every page is a stub that names itself, and the login stub shows where it would send you back to.
const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

vi.mock('../layouts/MainLayout', () => ({ default: () => <Outlet /> }));
vi.mock('../layouts/DashboardLayout', () => ({ default: () => <Outlet /> }));

const stub = (name: string) => ({ default: () => <p>page: {name}</p> });
vi.mock('../pages/Home', () => stub('home'));
vi.mock('../pages/Dashboard', () => stub('dashboard'));
vi.mock('../pages/Search', () => stub('search'));
vi.mock('../pages/SchemeDetail', () => stub('scheme'));
vi.mock('../pages/Bookmarks', () => stub('bookmarks'));
vi.mock('../pages/Compare', () => stub('compare'));
vi.mock('../pages/Eligibility', () => stub('eligibility'));
vi.mock('../pages/AIAssistant', () => stub('ai'));
vi.mock('../pages/Profile', () => stub('profile'));
vi.mock('../pages/Settings', () => stub('settings'));
vi.mock('../pages/Help', () => stub('help'));
vi.mock('../pages/NotFound', () => stub('not found'));
vi.mock('../pages/Legal', () => ({ Privacy: () => <p>page: privacy</p>, Terms: () => <p>page: terms</p> }));
vi.mock('../pages/Login', () => ({
  default: () => {
    const { search } = useLocation();
    return <p>page: login {new URLSearchParams(search).get('redirect')}</p>;
  },
}));

import { AppRoutes } from './AppRoutes';

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

beforeEach(() => {
  auth.isAuthenticated = false;
});

describe('a guest can browse schemes without signing in', () => {
  it('opens Search', async () => {
    open('/search?q=farmer');
    expect(await screen.findByText('page: search')).toBeTruthy();
  });

  it('opens a shared scheme link directly, not via the login page', async () => {
    open('/schemes/5ed68276-ab5e-4cfe-843b-f19d985dd730');
    expect(await screen.findByText('page: scheme')).toBeTruthy();
  });
});

describe('a guest is asked to sign in for personal pages, and comes back to them', () => {
  it.each(['/bookmarks', '/compare', '/profile', '/dashboard', '/settings', '/help', '/ai'])('%s', async (path) => {
    open(path);
    expect(await screen.findByText(`page: login ${path}`)).toBeTruthy();
  });
});

describe('a signed-in user', () => {
  it.each([
    ['/search', 'search'],
    ['/schemes/abc', 'scheme'],
    ['/bookmarks', 'bookmarks'],
    ['/compare', 'compare'],
    ['/profile', 'profile'],
  ])('opens %s', async (path, name) => {
    auth.isAuthenticated = true;
    open(path);
    expect(await screen.findByText(`page: ${name}`)).toBeTruthy();
  });
});
