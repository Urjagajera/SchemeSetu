import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => ({ language: 'en' as 'en' | 'hi' | 'gu' }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});

import { Privacy, Terms } from './Legal';
import { TRANSLATIONS } from '../constants/translations';

const dict = TRANSLATIONS as unknown as Record<'en' | 'hi' | 'gu', Record<string, string>>;
const root = path.join(__dirname, '..', '..');
const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), 'utf8');
beforeEach(() => { mocks.language = 'en'; });

const page = (C: React.FC) => render(<MemoryRouter><C /></MemoryRouter>).container;

describe.each(['en', 'hi', 'gu'] as const)('Privacy and Terms pages in %s', (lang) => {
  beforeEach(() => { mocks.language = lang; });
  const d = dict[lang];

  it('Privacy shows every section heading and paragraph, in the language', () => {
    const container = page(Privacy);
    const text = container.textContent ?? '';
    const keys = Object.keys(dict.en).filter((k) => /^pv/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(20);
    for (const k of keys) expect(text, k).toContain(d[k]);
    expect(container.querySelector('h1')?.textContent).toBe(d.lgPrivacy);
  });

  it('Terms shows every section heading and paragraph, in the language', () => {
    const text = page(Terms).textContent ?? '';
    const keys = Object.keys(dict.en).filter((k) => /^tm/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(16);
    for (const k of keys) expect(text, k).toContain(d[k]);
  });

  it('each links to the other', () => {
    expect(page(Privacy).querySelector('a')?.getAttribute('href')).toBe('/terms');
    expect(page(Terms).querySelector('a')?.getAttribute('href')).toBe('/privacy');
  });
});

describe('the legal text says only what the code does', () => {
  const en = dict.en;
  const all = Object.entries(en).filter(([k]) => /^(pv|tm)/.test(k)).map(([, v]) => v).join(' ');

  it('invents no contact details, company or address', () => {
    expect(all).not.toMatch(/@|\bhttps?:|\+?\d[\d\s-]{8,}|Pvt|Ltd|LLP|registered office|toll/i);
  });

  it('says it is not a government website, in both documents, and that no password is stored', () => {
    expect(en.pvWho).toMatch(/not a government website/);
    expect(en.tmWhat).toMatch(/not a government website/);
    expect(en.pvSignIn).toMatch(/never see or store your Google password/);
  });

  it('the session cookie text matches the code (7 days, httpOnly)', () => {
    const auth = read('backend', 'src', 'routes', 'auth.ts');
    expect(auth).toMatch(/SESSION_MAX_AGE_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
    expect(auth).toMatch(/httpOnly: true/);
    expect(en.pvCookie).toMatch(/up to 7 days/);
  });

  it('what is said to reach Groq matches the code: only scheme text, no user data', () => {
    const dir = path.join(root, 'backend', 'src', 'translation');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/prisma\.(user|profile|bookmark)|requireAuth|googleId|profilePictureUrl/);
    }
    expect(en.pvThird).toMatch(/no user data to Groq/);
  });

  it('the "delete your data" paragraph is true: there is no delete-account or export route yet', () => {
    // If one of these routes is added, this fails: update the Privacy Policy (pvDelete) and this test together.
    const routes = ['auth', 'profile', 'bookmarks'].map((f) => read('backend', 'src', 'routes', f + '.ts')).join('\n');
    const deletes = [...routes.matchAll(/router\.delete\(\s*'([^']*)'/g)].map((m) => m[1]);
    expect(deletes).toEqual(['/:schemeId']); // only "remove one bookmark"
    expect(routes).not.toMatch(/router\.\w+\(\s*'[^']*(export|download)/i);
    expect(en.pvDelete).toMatch(/no button to delete your account/);
  });

  it('the data it lists as collected is what the database holds, and nothing more', () => {
    const schema = read('backend', 'prisma', 'schema.prisma');
    for (const field of ['googleId', 'email', 'name', 'profilePictureUrl', 'age', 'dob', 'gender', 'occupation', 'education', 'income', 'category', 'state', 'district', 'residence', 'minority', 'disability', 'farmer', 'widow', 'veteran', 'land', 'profileTags']) {
      expect(schema, field).toContain(field);
    }
    const userAndProfile = schema.slice(schema.indexOf('model User'), schema.indexOf('model Scheme {')) + schema.slice(schema.indexOf('model Profile'), schema.indexOf('model Bookmark'));
    expect(userAndProfile).not.toMatch(/phone|mobile|aadhaar|address|pan\b/i);
  });

  it('the pages exist as routes and are linked from the footer and the sign-in page', () => {
    const routes = read('src', 'routes', 'AppRoutes.tsx');
    expect(routes).toContain('path="/privacy"');
    expect(routes).toContain('path="/terms"');
    expect(read('src', 'components', 'Footer.tsx')).toMatch(/to="\/privacy"[\s\S]*to="\/terms"/);
    expect(read('src', 'pages', 'Login.tsx')).toMatch(/to="\/privacy"[\s\S]*to="\/terms"/);
  });
});
